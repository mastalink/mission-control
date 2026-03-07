import type { GatewayError, GatewayHelloOk, ResponseFrame } from "./types";
import { buildConnectRequestParams, normalizeGatewayUrl } from "./connectionUtils";

export type TestGatewayConnectionInput = {
  url: string;
  token?: string;
  password?: string;
  timeoutMs?: number;
};

export type TestGatewayConnectionResult = {
  hello: GatewayHelloOk;
  normalizedUrl: string;
  latencyMs: number;
};

export async function testGatewayConnection(
  input: TestGatewayConnectionInput
): Promise<TestGatewayConnectionResult> {
  const normalizedUrl = normalizeGatewayUrl(input.url);
  if (!normalizedUrl) {
    throw new Error("Enter a gateway URL before testing.");
  }

  const timeoutMs = input.timeoutMs ?? 10_000;

  return new Promise<TestGatewayConnectionResult>((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const startedAt = performance.now();
    let settled = false;
    let socket: WebSocket | null = null;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      }
      fn();
    };

    const rejectWithError = (error: Error) => finish(() => reject(error));

    const timer = setTimeout(() => {
      rejectWithError(new Error(`Connection test timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    try {
      socket = new WebSocket(normalizedUrl);
    } catch (error) {
      rejectWithError(error instanceof Error ? error : new Error("Unable to open a WebSocket."));
      return;
    }

    socket.onmessage = (event) => {
      let frame: { type?: string; event?: string; payload?: unknown; id?: string; ok?: boolean; error?: GatewayError };
      try {
        frame = JSON.parse(event.data as string);
      } catch {
        return;
      }

      if (frame.type === "event" && frame.event === "connect.challenge") {
        const payload = frame.payload as { nonce?: string } | undefined;
        const params = buildConnectRequestParams({
          instanceId: `connection-test-${Date.now()}`,
          token: input.token,
          password: input.password,
        });

        // nonce belongs inside device{} for signed device-auth — browser UI has no key, skip it

        socket?.send(
          JSON.stringify({
            type: "req",
            id: requestId,
            method: "connect",
            params,
          })
        );
        return;
      }

      if (frame.type !== "res" || frame.id !== requestId) {
        return;
      }

      const response = frame as ResponseFrame;
      if (!response.ok) {
        const message = response.error?.message ?? "Gateway rejected the connection test.";
        rejectWithError(new Error(message));
        return;
      }

      const hello = response.payload as GatewayHelloOk | undefined;
      if (hello?.type !== "hello-ok") {
        rejectWithError(new Error("Gateway responded without a hello-ok handshake."));
        return;
      }

      finish(() =>
        resolve({
          hello,
          normalizedUrl,
          latencyMs: Math.round(performance.now() - startedAt),
        })
      );
    };

    socket.onerror = () => {
      rejectWithError(new Error("Unable to reach that gateway."));
    };

    socket.onclose = (event) => {
      if (!settled) {
        const reason = event.reason || "Gateway closed the connection during the test.";
        rejectWithError(new Error(reason));
      }
    };
  });
}
