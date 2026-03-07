import type {
  AgentIdentityResult,
  AgentsListResult,
  ChannelsStatusResult,
  ChatHistoryMessage,
  CronStatus,
  EventFrame,
  GatewayError,
  GatewayHelloOk,
  ResponseFrame,
  SessionEntry,
} from "./types";
import { buildConnectRequestParams, normalizeGatewayUrl } from "./connectionUtils";

type Pending = {
  resolve: (value: unknown) => void;
  reject: (err: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
};

export type GatewayClientOptions = {
  url: string;
  token?: string;
  password?: string;
  instanceId: string;
  onHello: (hello: GatewayHelloOk) => void;
  onEvent: (evt: EventFrame) => void;
  onClose: (info: { code: number; reason: string; error?: Error }) => void;
};

export class GatewayRequestError extends Error {
  readonly gatewayCode: string;
  constructor(error: GatewayError) {
    super(error.message);
    this.name = "GatewayRequestError";
    this.gatewayCode = error.code;
  }
}

/**
 * Browser WebSocket client for the OpenClaw gateway protocol v3.
 * Handles challenge/auth handshake, frame parsing, RPC calls, and reconnection.
 */
export class GatewayClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, Pending>();
  private connectSent = false;
  private backoffMs = 800;
  private closed = false;
  private lastSeq: number | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private opts: GatewayClientOptions) {}

  start(): void {
    this.closed = false;
    this.openSocket();
  }

  stop(): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error("Client stopped"));
    }
    this.pending.clear();
  }

  async request<T>(method: string, params?: unknown, timeoutMs = 15_000): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected");
    }
    const id = crypto.randomUUID();
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      this.ws!.send(JSON.stringify({ type: "req", id, method, params }));
    });
  }

  // Convenience RPC wrappers
  async fetchAgentsList(): Promise<AgentsListResult> {
    return this.request("agents.list", {});
  }

  async fetchAgentIdentity(agentId: string): Promise<AgentIdentityResult> {
    return this.request("agent.identity.get", { agentId });
  }

  async fetchChannelsStatus(probe = false): Promise<ChannelsStatusResult> {
    return this.request("channels.status", { probe }, 30_000);
  }

  async fetchSessionsList(params?: {
    limit?: number;
    includeDerivedTitles?: boolean;
    includeLastMessage?: boolean;
  }): Promise<{ sessions: SessionEntry[] }> {
    return this.request("sessions.list", { limit: 50, includeDerivedTitles: true, ...params });
  }

  async fetchCronStatus(): Promise<CronStatus> {
    return this.request("cron.status", {});
  }

  async fetchHealth(probe = false): Promise<unknown> {
    return this.request("health", { probe });
  }

  /** Send a chat message to an agent and receive streaming response via chat events */
  async chatSend(params: {
    sessionKey: string;
    message: string;
    idempotencyKey?: string;
  }): Promise<{ runId: string }> {
    return this.request("chat.send", {
      sessionKey: params.sessionKey,
      message: params.message,
      idempotencyKey: params.idempotencyKey ?? crypto.randomUUID(),
    });
  }

  /** Fetch chat history for a session */
  async chatHistory(sessionKey: string, limit = 50): Promise<{ messages: ChatHistoryMessage[] }> {
    return this.request("chat.history", { sessionKey, limit });
  }

  /** Invoke an agent with personality injection via extraSystemPrompt */
  async agentInvoke(params: {
    message: string;
    agentId?: string;
    sessionKey?: string;
    extraSystemPrompt?: string;
    idempotencyKey?: string;
  }): Promise<{ runId: string }> {
    return this.request("agent", {
      message: params.message,
      agentId: params.agentId,
      sessionKey: params.sessionKey,
      extraSystemPrompt: params.extraSystemPrompt,
      deliver: false,
      idempotencyKey: params.idempotencyKey ?? crypto.randomUUID(),
    }, 60_000);
  }

  // ── Private ────────────────────────────────────────────

  private openSocket(): void {
    if (this.closed) return;
    this.connectSent = false;

    const wsUrl = normalizeGatewayUrl(this.opts.url);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.backoffMs = 800;
    };

    this.ws.onmessage = (ev) => {
      try {
        const frame = JSON.parse(ev.data as string);
        this.handleFrame(frame);
      } catch {
        // ignore malformed frames
      }
    };

    this.ws.onclose = (ev) => {
      this.ws = null;
      this.opts.onClose({ code: ev.code, reason: ev.reason });
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror
    };
  }

  private handleFrame(frame: { type: string; [key: string]: unknown }): void {
    if (frame.type === "event") {
      this.handleEvent(frame as unknown as EventFrame);
    } else if (frame.type === "res") {
      this.handleResponse(frame as unknown as ResponseFrame);
    }
  }

  private connectNonce: string | null = null;

  private handleEvent(evt: EventFrame): void {
    if (evt.event === "connect.challenge") {
      // Extract nonce from challenge and proceed with connect handshake
      const payload = evt.payload as { nonce?: string } | undefined;
      this.connectNonce = payload?.nonce ?? null;
      this.sendConnect();
      return;
    }

    // Track sequence for gap detection
    if (evt.seq != null) {
      if (this.lastSeq != null && evt.seq > this.lastSeq + 1) {
        // gap detected - could request refresh
      }
      this.lastSeq = evt.seq;
    }

    this.opts.onEvent(evt);
  }

  private handleResponse(res: ResponseFrame): void {
    // Check if this is the connect response (hello-ok)
    if (!this.connectSent) return;
    const pending = this.pending.get(res.id);
    if (pending) {
      clearTimeout(pending.timer);
      this.pending.delete(res.id);
      if (res.ok) {
        // Check if it's the hello-ok response
        const payload = res.payload as { type?: string } | undefined;
        if (payload?.type === "hello-ok") {
          this.opts.onHello(payload as unknown as GatewayHelloOk);
        }
        pending.resolve(res.payload);
      } else {
        pending.reject(new GatewayRequestError(res.error ?? { code: "unknown", message: "Request failed" }));
      }
    }
  }

  private sendConnect(): void {
    if (!this.ws || this.connectSent) return;
    this.connectSent = true;

    const id = crypto.randomUUID();
    const params: Record<string, unknown> = buildConnectRequestParams({
      instanceId: this.opts.instanceId,
      token: this.opts.token,
      password: this.opts.password,
    });

    // nonce belongs inside device{} for signed device-auth — browser UI has no key, skip it

    const timer = setTimeout(() => {
      this.pending.delete(id);
    }, 15_000);

    this.pending.set(id, {
      resolve: () => {}, // hello-ok is handled in handleResponse
      reject: (err) => {
        this.opts.onClose({ code: 4001, reason: String(err), error: err instanceof Error ? err : undefined });
      },
      timer,
    });

    this.ws.send(JSON.stringify({ type: "req", id, method: "connect", params }));
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
    this.reconnectTimer = setTimeout(() => {
      this.openSocket();
    }, this.backoffMs);
    this.backoffMs = Math.min(this.backoffMs * 1.7, 15_000);
  }
}
