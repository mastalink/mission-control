// Gateway WebSocket protocol types (matching OpenClaw gateway protocol v3)

export type EventFrame = {
  type: "event";
  event: string;
  payload?: unknown;
  seq?: number;
  stateVersion?: { presence: number; health: number };
};

export type RequestFrame = {
  type: "req";
  id: string;
  method: string;
  params?: unknown;
};

export type ResponseFrame = {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: GatewayError;
};

export type GatewayError = {
  code: string;
  message: string;
  details?: unknown;
};

export type GatewayHelloOk = {
  type: "hello-ok";
  protocol: number;
  server?: { version?: string; connId?: string };
  features?: { methods?: string[]; events?: string[] };
  snapshot?: GatewaySnapshot;
  auth?: {
    deviceToken?: string;
    role?: string;
    scopes?: string[];
  };
  policy?: { tickIntervalMs?: number };
};

export type GatewaySnapshot = {
  presence?: PresenceEntry[];
  health?: unknown;
  stateVersion?: { presence: number; health: number };
  uptimeMs?: number;
  configPath?: string;
  stateDir?: string;
  sessionDefaults?: {
    defaultAgentId: string;
    mainKey: string;
    mainSessionKey: string;
    scope?: string;
  };
  authMode?: "none" | "token" | "password" | "trusted-proxy";
  updateAvailable?: {
    currentVersion: string;
    latestVersion: string;
    channel: string;
  } | null;
};

export type PresenceEntry = {
  host?: string;
  ip?: string;
  version?: string;
  platform?: string;
  deviceFamily?: string;
  modelIdentifier?: string;
  mode?: string;
  lastInputSeconds?: number;
  reason?: string;
  tags?: string[];
  text?: string;
  ts: number;
  deviceId?: string;
  roles?: string[];
  scopes?: string[];
  instanceId?: string;
};

// Chat event from the "chat" gateway event
export type ChatEvent = {
  runId: string;
  sessionKey: string;
  seq: number;
  state: "delta" | "final" | "aborted" | "error";
  message?: unknown;
  errorMessage?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  stopReason?: string;
};

// Agent event from the "agent" gateway event
export type AgentEvent = {
  runId: string;
  seq: number;
  stream: string;
  ts: number;
  data: Record<string, unknown>;
};

// Agent identity from agent.identity.get
export type AgentIdentityResult = {
  agentId: string;
  name?: string;
  avatar?: string;
  emoji?: string;
};

// Agent list item from agents.list
export type AgentListItem = {
  id: string;
  name?: string;
  workspace?: string;
  model?: string;
  identity?: { name?: string; emoji?: string; avatar?: string };
};

export type AgentsListResult = {
  agents: AgentListItem[];
  defaultId?: string;
};

// Channel status
export type ChannelAccountSnapshot = {
  accountId: string;
  enabled?: boolean;
  configured?: boolean;
  linked?: boolean;
  running?: boolean;
  connected?: boolean;
  reconnectAttempts?: number;
  lastConnectedAt?: number;
  lastError?: string;
  lastStartAt?: number;
  lastStopAt?: number;
  lastInboundAt?: number;
  lastOutboundAt?: number;
  lastProbeAt?: number;
  mode?: string;
};

export type ChannelsStatusResult = {
  ts: number;
  channelOrder: string[];
  channelLabels: Record<string, string>;
  channelMeta?: Array<{
    id: string;
    label: string;
    detailLabel?: string;
    systemImage?: string;
  }>;
  channels: Record<string, unknown>;
  channelAccounts: Record<string, ChannelAccountSnapshot[]>;
  channelDefaultAccountId?: Record<string, string>;
};

// Session entry from sessions.list
export type SessionEntry = {
  key: string;
  kind?: "direct" | "group" | "global" | "unknown";
  displayName?: string;
  derivedTitle?: string;
  lastMessagePreview?: string;
  updatedAt?: number;
  abortedLastRun?: boolean;
  model?: string;
  thinkingLevel?: string;
};

// Chat history message from chat.history
export type ChatHistoryMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  ts?: number;
  runId?: string;
  agentId?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

// Cron job
export type CronJob = {
  id: string;
  label?: string;
  schedule: string;
  enabled: boolean;
  agentId?: string;
  message?: string;
  nextRunAt?: number;
  lastRunAt?: number;
  lastStatus?: string;
};

export type CronStatus = {
  enabled: boolean;
  jobs: CronJob[];
  nextWakeAtMs?: number;
};
