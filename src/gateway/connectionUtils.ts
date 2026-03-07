export type GatewayConnectionInput = {
  instanceId: string;
  token?: string;
  password?: string;
};

const DEFAULT_GATEWAY_PORT = "18789";

export function normalizeGatewayUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  if (/^wss?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^http/i, "ws");
  }

  if (/^[a-z0-9.-]+:\d+(\/.*)?$/i.test(trimmed)) {
    return `ws://${trimmed}`;
  }

  if (/^[a-z0-9.-]+(\/.*)?$/i.test(trimmed)) {
    return `ws://${trimmed}${trimmed.includes(":") ? "" : `:${DEFAULT_GATEWAY_PORT}`}`;
  }

  return trimmed;
}

export function buildConnectRequestParams(input: GatewayConnectionInput): Record<string, unknown> {
  return {
    minProtocol: 3,
    maxProtocol: 3,
    client: {
      id: "webchat-ui",
      displayName: "Dunder Mifflin Mission Control",
      version: "0.1.0",
      platform: "web",
      mode: "webchat",
      instanceId: input.instanceId,
    },
    role: "operator",
    scopes: ["operator.admin", "operator.approvals", "operator.pairing"],
    caps: [],
    locale: navigator.language,
    userAgent: navigator.userAgent,
    auth: {
      token: input.token,
      password: input.password,
    },
  };
}
