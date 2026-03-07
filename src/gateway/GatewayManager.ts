import { GatewayClient } from "./GatewayClient";
import type {
  AgentEvent,
  AgentsListResult,
  ChannelsStatusResult,
  ChatEvent,
  CronStatus,
  EventFrame,
  GatewayHelloOk,
  PresenceEntry,
} from "./types";

export type InstanceConfig = {
  instanceId: string;
  label: string;
  url: string;
  token?: string;
  password?: string;
};

export type GatewayEventHandlers = {
  onConnected: (instanceId: string, hello: GatewayHelloOk) => void;
  onDisconnected: (instanceId: string, info: { code: number; reason: string }) => void;
  onAgentsList: (instanceId: string, result: AgentsListResult) => void;
  onChannelsStatus: (instanceId: string, result: ChannelsStatusResult) => void;
  onCronStatus: (instanceId: string, result: CronStatus) => void;
  onSessionsList: (instanceId: string, sessions: unknown) => void;
  onChatEvent: (instanceId: string, event: ChatEvent) => void;
  onAgentEvent: (instanceId: string, event: AgentEvent) => void;
  onPresence: (instanceId: string, entries: PresenceEntry[]) => void;
  onHealthEvent: (instanceId: string, payload: unknown) => void;
  onCronEvent: (instanceId: string, payload: unknown) => void;
};

/**
 * Manages multiple gateway connections, routing events to the appropriate stores.
 */
export class GatewayManager {
  private clients = new Map<string, GatewayClient>();

  constructor(private handlers: GatewayEventHandlers) {}

  connect(config: InstanceConfig): void {
    if (this.clients.has(config.instanceId)) {
      this.disconnect(config.instanceId);
    }

    const client = new GatewayClient({
      url: config.url,
      token: config.token,
      password: config.password,
      instanceId: config.instanceId,
      onHello: (hello) => this.handleHello(config.instanceId, hello, client),
      onEvent: (evt) => this.routeEvent(config.instanceId, evt),
      onClose: (info) => this.handlers.onDisconnected(config.instanceId, info),
    });

    this.clients.set(config.instanceId, client);
    client.start();
  }

  disconnect(instanceId: string): void {
    const client = this.clients.get(instanceId);
    if (client) {
      client.stop();
      this.clients.delete(instanceId);
    }
  }

  disconnectAll(): void {
    for (const [id] of this.clients) {
      this.disconnect(id);
    }
  }

  getClient(instanceId: string): GatewayClient | undefined {
    return this.clients.get(instanceId);
  }

  private async handleHello(instanceId: string, hello: GatewayHelloOk, client: GatewayClient): Promise<void> {
    this.handlers.onConnected(instanceId, hello);

    // Fetch initial data in parallel
    try {
      const [agentsResult, channelsResult, cronResult, sessionsResult] = await Promise.allSettled([
        client.fetchAgentsList(),
        client.fetchChannelsStatus(),
        client.fetchCronStatus(),
        client.fetchSessionsList(),
      ]);

      if (agentsResult.status === "fulfilled") {
        this.handlers.onAgentsList(instanceId, agentsResult.value);
      }
      if (channelsResult.status === "fulfilled") {
        this.handlers.onChannelsStatus(instanceId, channelsResult.value);
      }
      if (cronResult.status === "fulfilled") {
        this.handlers.onCronStatus(instanceId, cronResult.value);
      }
      if (sessionsResult.status === "fulfilled") {
        this.handlers.onSessionsList(instanceId, sessionsResult.value);
      }
    } catch {
      // Initial data fetch failures are non-fatal
    }
  }

  private routeEvent(instanceId: string, evt: EventFrame): void {
    switch (evt.event) {
      case "chat":
        this.handlers.onChatEvent(instanceId, evt.payload as ChatEvent);
        break;
      case "agent":
        this.handlers.onAgentEvent(instanceId, evt.payload as AgentEvent);
        break;
      case "presence": {
        const p = evt.payload as { presence?: PresenceEntry[] } | undefined;
        if (p?.presence) this.handlers.onPresence(instanceId, p.presence);
        break;
      }
      case "health":
        this.handlers.onHealthEvent(instanceId, evt.payload);
        break;
      case "cron":
        this.handlers.onCronEvent(instanceId, evt.payload);
        break;
      case "tick":
        // Heartbeat - no-op for now
        break;
      case "shutdown":
        this.handlers.onDisconnected(instanceId, { code: 1000, reason: "Gateway shutdown" });
        break;
    }
  }
}
