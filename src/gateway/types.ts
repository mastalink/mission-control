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
  sessionId?: string;
  kind?: "direct" | "group" | "global" | "unknown";
  displayName?: string;
  label?: string;
  surface?: string;
  subject?: string;
  room?: string;
  space?: string;
  derivedTitle?: string;
  lastMessagePreview?: string;
  updatedAt?: number;
  systemSent?: boolean;
  abortedLastRun?: boolean;
  model?: string;
  thinkingLevel?: string;
  verboseLevel?: string;
  sendPolicy?: string;
  groupActivation?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  contextTokens?: number;
};

// Chat history message from chat.history
export type ChatHistoryMessage = {
  role: "user" | "assistant" | "system";
  content: string | Array<Record<string, unknown>>;
  ts?: number;
  timestamp?: number;
  id?: string;
  runId?: string;
  agentId?: string;
  toolCallId?: string;
  toolName?: string;
  model?: string;
  state?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  stopReason?: string;
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

export type SessionDefaults = {
  model?: string;
  contextTokens?: number;
};

export type SessionsListResult = {
  ts?: number;
  path?: string;
  count?: number;
  defaults?: SessionDefaults;
  sessions: SessionEntry[];
};

export type SessionPreviewItem = {
  role: string;
  text: string;
};

export type SessionPreviewEntry = {
  key: string;
  status: string;
  items: SessionPreviewItem[];
};

export type SessionsPreviewResult = {
  ts: number;
  previews: SessionPreviewEntry[];
};

export type SessionDetail = {
  key: string;
  sessionId?: string;
  thinkingLevel?: string;
  verboseLevel?: string;
  model?: string;
  sendPolicy?: string;
  groupActivation?: string;
  label?: string;
  displayName?: string;
  derivedTitle?: string;
  contextTokens?: number;
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  origin?: Record<string, unknown>;
  delivery?: Record<string, unknown>;
  session?: Record<string, unknown>;
  raw?: Record<string, unknown>;
};

export type ChatHistoryResult = {
  sessionKey: string;
  sessionId?: string;
  messages?: Array<Record<string, unknown>>;
  thinkingLevel?: string;
};

export type ChatSendResult = {
  runId: string;
  status: string;
};

export type ChatInjectResult = {
  ok?: boolean;
  sessionKey?: string;
  messageId?: string;
};

export type ModelCatalogEntry = {
  ref: string;
  alias?: string;
  provider?: string;
  label?: string;
  reasoning?: boolean;
  available?: boolean;
  multimodal?: boolean;
  deprecated?: boolean;
  raw?: Record<string, unknown>;
};

export type ModelsListResult = {
  defaults?: {
    model?: string;
  };
  models?: ModelCatalogEntry[];
  refs?: string[];
  snapshot?: Record<string, unknown>;
  raw?: Record<string, unknown>;
};

export type GatewayStatusResult = {
  ok?: boolean;
  ts?: number;
  version?: string;
  build?: string;
  uptimeMs?: number;
  updateAvailable?: {
    currentVersion?: string;
    latestVersion?: string;
    channel?: string;
  } | null;
  raw?: Record<string, unknown>;
};

export type HealthStatusResult = {
  ok?: boolean;
  checks?: Record<string, unknown>;
  summary?: string;
  raw?: Record<string, unknown>;
};

export type ConfigSnapshotResult = {
  path?: string;
  hash?: string;
  format?: string;
  config?: Record<string, unknown>;
  redactedPaths?: string[];
  raw?: string;
};

export type ConfigSchemaResult = {
  schema: Record<string, unknown>;
};

export type ConfigMutationResult = {
  ok?: boolean;
  path?: string;
  hash?: string;
  restartScheduled?: boolean;
  restartDelayMs?: number;
  note?: string;
  changedPaths?: string[];
  raw?: Record<string, unknown>;
};

export type ConfigSchemaLookupResult = {
  path: string;
  node: Record<string, unknown>;
};

export type NodeState = {
  nodeId: string;
  displayName?: string;
  platform?: string;
  version?: string;
  coreVersion?: string;
  uiVersion?: string;
  deviceFamily?: string;
  modelIdentifier?: string;
  remoteIp?: string;
  caps?: string[];
  commands?: string[];
  permissions?: Record<string, boolean>;
  paired?: boolean;
  connected?: boolean;
};

export type NodeListResult = {
  ts?: number;
  nodes: NodeState[];
};

export type NodePairRequest = {
  requestId: string;
  nodeId?: string;
  displayName?: string;
  deviceFamily?: string;
  modelIdentifier?: string;
  createdAt?: number;
  status?: string;
  raw?: Record<string, unknown>;
};

export type NodePairListResult = {
  ts?: number;
  requests?: NodePairRequest[];
  nodes?: NodeState[];
  raw?: Record<string, unknown>;
};

export type ExecApprovalDecision = "allow-once" | "allow-always" | "deny";

export type ExecApprovalRequest = {
  approvalId: string;
  agentId?: string;
  sessionKey?: string;
  host?: string;
  cwd?: string;
  rawCommand?: string;
  argv?: string[];
  status?: string;
  createdAt?: number;
  systemRunPlan?: Record<string, unknown>;
  raw?: Record<string, unknown>;
};

export type ExecApprovalsSnapshot = {
  path: string;
  exists: boolean;
  hash: string;
  file: Record<string, unknown>;
};

export type LogsTailResult = {
  file?: string;
  cursor?: number;
  size?: number;
  lines?: string[];
  truncated?: boolean;
  reset?: boolean;
};
