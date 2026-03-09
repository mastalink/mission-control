import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ChatEvent,
  ChatHistoryMessage,
  ConfigSchemaLookupResult,
  ConfigSchemaResult,
  ConfigSnapshotResult,
  CronStatus,
  ExecApprovalRequest,
  ExecApprovalsSnapshot,
  GatewayStatusResult,
  HealthStatusResult,
  LogsTailResult,
  ModelsListResult,
  NodeListResult,
  NodePairListResult,
  SessionDetail,
  SessionEntry,
  SessionsListResult,
  SessionsPreviewResult,
} from "../gateway/types";

export type GatewayCapabilities = {
  methods: string[];
  events: string[];
};

export type RoutingProfile = {
  id: string;
  label: string;
  instanceId?: string;
  agentId?: string;
  channelId?: string;
  preferredModel?: string;
  preferredThinkingLevel?: string;
  preferredVerboseLevel?: string;
  preferredSendPolicy?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

export type ConfigDraft = {
  path?: string;
  baseHash?: string;
  rawText: string;
  dirty: boolean;
  lastLoadedAt?: number;
  lastAppliedAt?: number;
  lastError?: string | null;
};

export type SessionStreamState = {
  runId: string;
  state: "delta" | "final" | "aborted" | "error";
  text: string;
  errorMessage?: string;
};

type OpsInstanceState = {
  capabilities: GatewayCapabilities;
  sessions: SessionEntry[];
  sessionDefaults?: SessionsListResult["defaults"];
  sessionPreviews: Record<string, SessionsPreviewResult["previews"][number]>;
  selectedSessionKey: string | null;
  sessionDetails: Record<string, SessionDetail>;
  histories: Record<string, ChatHistoryMessage[]>;
  sessionStreams: Record<string, SessionStreamState>;
  historyNeedsRefresh: Record<string, boolean>;
  models?: ModelsListResult;
  status?: GatewayStatusResult;
  health?: HealthStatusResult;
  presence: Array<Record<string, unknown>>;
  nodes?: NodeListResult;
  nodePairs?: NodePairListResult;
  approvals?: ExecApprovalsSnapshot;
  approvalRequests: ExecApprovalRequest[];
  logs: {
    cursor?: number;
    file?: string;
    lines: string[];
    truncated?: boolean;
    lastLoadedAt?: number;
  };
  cron?: CronStatus;
  config?: ConfigSnapshotResult;
  configSchema?: ConfigSchemaResult;
  configSchemaLookups: Record<string, ConfigSchemaLookupResult>;
  configDraft?: ConfigDraft;
};

type OpsStore = {
  instances: Record<string, OpsInstanceState>;
  routingProfiles: RoutingProfile[];

  ensureInstance: (instanceId: string) => void;
  removeInstance: (instanceId: string) => void;
  setGatewayCapabilities: (instanceId: string, capabilities: GatewayCapabilities) => void;
  setSessions: (instanceId: string, result: SessionsListResult) => void;
  setSessionPreviews: (instanceId: string, result: SessionsPreviewResult) => void;
  selectSession: (instanceId: string, sessionKey: string | null) => void;
  setSessionDetail: (instanceId: string, detail: SessionDetail) => void;
  setHistory: (instanceId: string, sessionKey: string, messages: ChatHistoryMessage[]) => void;
  markHistoryFresh: (instanceId: string, sessionKey: string) => void;
  updateFromChatEvent: (instanceId: string, event: ChatEvent) => void;
  clearSessionStream: (instanceId: string, sessionKey: string) => void;
  setModels: (instanceId: string, models: ModelsListResult) => void;
  setStatus: (instanceId: string, status: GatewayStatusResult) => void;
  setHealth: (instanceId: string, health: HealthStatusResult) => void;
  setPresence: (instanceId: string, presence: Array<Record<string, unknown>>) => void;
  setNodes: (instanceId: string, nodes: NodeListResult) => void;
  setNodePairs: (instanceId: string, nodePairs: NodePairListResult) => void;
  setApprovals: (instanceId: string, approvals: ExecApprovalsSnapshot) => void;
  pushApprovalRequest: (instanceId: string, approval: ExecApprovalRequest) => void;
  resolveApprovalRequest: (instanceId: string, approvalId: string) => void;
  setLogs: (instanceId: string, result: LogsTailResult) => void;
  setCron: (instanceId: string, cron: CronStatus) => void;
  setConfigSnapshot: (instanceId: string, config: ConfigSnapshotResult) => void;
  setConfigDraftText: (instanceId: string, rawText: string) => void;
  setConfigDraftError: (instanceId: string, error: string | null) => void;
  setConfigDraftApplied: (instanceId: string, snapshot: ConfigSnapshotResult) => void;
  setConfigSchema: (instanceId: string, schema: ConfigSchemaResult) => void;
  setConfigSchemaLookup: (instanceId: string, lookup: ConfigSchemaLookupResult) => void;
  upsertRoutingProfile: (profile: Omit<RoutingProfile, "createdAt" | "updatedAt"> & { createdAt?: number; updatedAt?: number }) => void;
  removeRoutingProfile: (profileId: string) => void;
};

const EMPTY_CAPABILITIES: GatewayCapabilities = { methods: [], events: [] };

function createInstanceState(): OpsInstanceState {
  return {
    capabilities: EMPTY_CAPABILITIES,
    sessions: [],
    sessionDefaults: undefined,
    sessionPreviews: {},
    selectedSessionKey: null,
    sessionDetails: {},
    histories: {},
    sessionStreams: {},
    historyNeedsRefresh: {},
    models: undefined,
    status: undefined,
    health: undefined,
    presence: [],
    nodes: undefined,
    nodePairs: undefined,
    approvals: undefined,
    approvalRequests: [],
    logs: { lines: [] },
    cron: undefined,
    config: undefined,
    configSchema: undefined,
    configSchemaLookups: {},
    configDraft: undefined,
  };
}

function contentToText(content: unknown): string | Array<Record<string, unknown>> {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content.filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null);
  }
  if (content && typeof content === "object") {
    return [content as Record<string, unknown>];
  }
  return "";
}

function decodeHistoryMessage(raw: Record<string, unknown>): ChatHistoryMessage {
  return {
    id: typeof raw.id === "string" ? raw.id : undefined,
    role:
      raw.role === "assistant" || raw.role === "system"
        ? raw.role
        : "user",
    content: contentToText(raw.content),
    ts: typeof raw.ts === "number" ? raw.ts : undefined,
    timestamp: typeof raw.timestamp === "number" ? raw.timestamp : undefined,
    runId: typeof raw.runId === "string" ? raw.runId : undefined,
    agentId: typeof raw.agentId === "string" ? raw.agentId : undefined,
    toolCallId: typeof raw.toolCallId === "string" ? raw.toolCallId : undefined,
    toolName: typeof raw.toolName === "string" ? raw.toolName : undefined,
    model: typeof raw.model === "string" ? raw.model : undefined,
    state: typeof raw.state === "string" ? raw.state : undefined,
    stopReason: typeof raw.stopReason === "string" ? raw.stopReason : undefined,
    usage:
      raw.usage && typeof raw.usage === "object"
        ? {
            inputTokens:
              typeof (raw.usage as Record<string, unknown>).inputTokens === "number"
                ? ((raw.usage as Record<string, unknown>).inputTokens as number)
                : undefined,
            outputTokens:
              typeof (raw.usage as Record<string, unknown>).outputTokens === "number"
                ? ((raw.usage as Record<string, unknown>).outputTokens as number)
                : undefined,
            totalTokens:
              typeof (raw.usage as Record<string, unknown>).totalTokens === "number"
                ? ((raw.usage as Record<string, unknown>).totalTokens as number)
                : undefined,
          }
        : undefined,
  };
}

function stringifyConfig(config?: ConfigSnapshotResult): string {
  if (!config) {
    return "{}";
  }
  if (typeof config.raw === "string" && config.raw.trim()) {
    return config.raw;
  }
  return JSON.stringify(config.config ?? {}, null, 2);
}

function upsertUniqueProfile(
  profiles: RoutingProfile[],
  profile: Omit<RoutingProfile, "createdAt" | "updatedAt"> & { createdAt?: number; updatedAt?: number },
): RoutingProfile[] {
  const now = Date.now();
  const next: RoutingProfile = {
    ...profile,
    createdAt: profile.createdAt ?? now,
    updatedAt: profile.updatedAt ?? now,
  };
  return [...profiles.filter((entry) => entry.id !== profile.id), next].sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

function ensureOpsInstance(state: Record<string, OpsInstanceState>, instanceId: string): OpsInstanceState {
  return state[instanceId] ?? createInstanceState();
}

export const useOpsStore = create<OpsStore>()(
  persist(
    (set) => ({
      instances: {},
      routingProfiles: [],

      ensureInstance: (instanceId) =>
        set((state) => ({
          instances: {
            ...state.instances,
            [instanceId]: ensureOpsInstance(state.instances, instanceId),
          },
        })),

      removeInstance: (instanceId) =>
        set((state) => {
          const { [instanceId]: _, ...rest } = state.instances;
          return { instances: rest };
        }),

      setGatewayCapabilities: (instanceId, capabilities) =>
        set((state) => ({
          instances: {
            ...state.instances,
            [instanceId]: {
              ...ensureOpsInstance(state.instances, instanceId),
              capabilities,
            },
          },
        })),

      setSessions: (instanceId, result) =>
        set((state) => {
          const current = ensureOpsInstance(state.instances, instanceId);
          const selectedExists = result.sessions.some((session) => session.key === current.selectedSessionKey);
          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...current,
                sessions: result.sessions,
                sessionDefaults: result.defaults,
                selectedSessionKey:
                  current.selectedSessionKey && selectedExists
                    ? current.selectedSessionKey
                    : (result.sessions[0]?.key ?? null),
              },
            },
          };
        }),

      setSessionPreviews: (instanceId, result) =>
        set((state) => {
          const current = ensureOpsInstance(state.instances, instanceId);
          const nextPreviews = { ...current.sessionPreviews };
          for (const preview of result.previews) {
            nextPreviews[preview.key] = preview;
          }
          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...current,
                sessionPreviews: nextPreviews,
              },
            },
          };
        }),

      selectSession: (instanceId, sessionKey) =>
        set((state) => ({
          instances: {
            ...state.instances,
            [instanceId]: {
              ...ensureOpsInstance(state.instances, instanceId),
              selectedSessionKey: sessionKey,
            },
          },
        })),

      setSessionDetail: (instanceId, detail) =>
        set((state) => {
          const current = ensureOpsInstance(state.instances, instanceId);
          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...current,
                sessionDetails: {
                  ...current.sessionDetails,
                  [detail.key]: detail,
                },
              },
            },
          };
        }),

      setHistory: (instanceId, sessionKey, messages) =>
        set((state) => {
          const current = ensureOpsInstance(state.instances, instanceId);
          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...current,
                histories: {
                  ...current.histories,
                  [sessionKey]: messages,
                },
                historyNeedsRefresh: {
                  ...current.historyNeedsRefresh,
                  [sessionKey]: false,
                },
              },
            },
          };
        }),

      markHistoryFresh: (instanceId, sessionKey) =>
        set((state) => {
          const current = ensureOpsInstance(state.instances, instanceId);
          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...current,
                historyNeedsRefresh: {
                  ...current.historyNeedsRefresh,
                  [sessionKey]: false,
                },
              },
            },
          };
        }),

      updateFromChatEvent: (instanceId, event) =>
        set((state) => {
          const current = ensureOpsInstance(state.instances, instanceId);
          const existing = current.sessionStreams[event.sessionKey];
          const nextStream: SessionStreamState = {
            runId: event.runId,
            state: event.state,
            text:
              event.state === "delta"
                ? `${existing?.runId === event.runId ? existing.text : ""}${typeof event.message === "string" ? event.message : ""}`
                : existing?.text ?? "",
            errorMessage: event.errorMessage,
          };

          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...current,
                sessionStreams: {
                  ...current.sessionStreams,
                  [event.sessionKey]: nextStream,
                },
                historyNeedsRefresh:
                  event.state === "final" || event.state === "aborted" || event.state === "error"
                    ? {
                        ...current.historyNeedsRefresh,
                        [event.sessionKey]: true,
                      }
                    : current.historyNeedsRefresh,
              },
            },
          };
        }),

      clearSessionStream: (instanceId, sessionKey) =>
        set((state) => {
          const current = ensureOpsInstance(state.instances, instanceId);
          const { [sessionKey]: _, ...rest } = current.sessionStreams;
          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...current,
                sessionStreams: rest,
              },
            },
          };
        }),

      setModels: (instanceId, models) =>
        set((state) => ({
          instances: {
            ...state.instances,
            [instanceId]: {
              ...ensureOpsInstance(state.instances, instanceId),
              models,
            },
          },
        })),

      setStatus: (instanceId, status) =>
        set((state) => ({
          instances: {
            ...state.instances,
            [instanceId]: {
              ...ensureOpsInstance(state.instances, instanceId),
              status,
            },
          },
        })),

      setHealth: (instanceId, health) =>
        set((state) => ({
          instances: {
            ...state.instances,
            [instanceId]: {
              ...ensureOpsInstance(state.instances, instanceId),
              health,
            },
          },
        })),

      setPresence: (instanceId, presence) =>
        set((state) => ({
          instances: {
            ...state.instances,
            [instanceId]: {
              ...ensureOpsInstance(state.instances, instanceId),
              presence,
            },
          },
        })),

      setNodes: (instanceId, nodes) =>
        set((state) => ({
          instances: {
            ...state.instances,
            [instanceId]: {
              ...ensureOpsInstance(state.instances, instanceId),
              nodes,
            },
          },
        })),

      setNodePairs: (instanceId, nodePairs) =>
        set((state) => ({
          instances: {
            ...state.instances,
            [instanceId]: {
              ...ensureOpsInstance(state.instances, instanceId),
              nodePairs,
            },
          },
        })),

      setApprovals: (instanceId, approvals) =>
        set((state) => ({
          instances: {
            ...state.instances,
            [instanceId]: {
              ...ensureOpsInstance(state.instances, instanceId),
              approvals,
            },
          },
        })),

      pushApprovalRequest: (instanceId, approval) =>
        set((state) => {
          const current = ensureOpsInstance(state.instances, instanceId);
          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...current,
                approvalRequests: [
                  approval,
                  ...current.approvalRequests.filter(
                    (entry) => entry.approvalId !== approval.approvalId,
                  ),
                ],
              },
            },
          };
        }),

      resolveApprovalRequest: (instanceId, approvalId) =>
        set((state) => {
          const current = ensureOpsInstance(state.instances, instanceId);
          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...current,
                approvalRequests: current.approvalRequests.filter(
                  (entry) => entry.approvalId !== approvalId,
                ),
              },
            },
          };
        }),

      setLogs: (instanceId, result) =>
        set((state) => {
          const current = ensureOpsInstance(state.instances, instanceId);
          const nextLines = result.reset
            ? (result.lines ?? [])
            : [...current.logs.lines, ...(result.lines ?? [])].slice(-500);
          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...current,
                logs: {
                  cursor: result.cursor,
                  file: result.file,
                  lines: nextLines,
                  truncated: result.truncated,
                  lastLoadedAt: Date.now(),
                },
              },
            },
          };
        }),

      setCron: (instanceId, cron) =>
        set((state) => ({
          instances: {
            ...state.instances,
            [instanceId]: {
              ...ensureOpsInstance(state.instances, instanceId),
              cron,
            },
          },
        })),

      setConfigSnapshot: (instanceId, config) =>
        set((state) => {
          const current = ensureOpsInstance(state.instances, instanceId);
          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...current,
                config,
                configDraft: {
                  path: config.path,
                  baseHash: config.hash,
                  rawText: stringifyConfig(config),
                  dirty: false,
                  lastLoadedAt: Date.now(),
                  lastAppliedAt: current.configDraft?.lastAppliedAt,
                  lastError: null,
                },
              },
            },
          };
        }),

      setConfigDraftText: (instanceId, rawText) =>
        set((state) => {
          const current = ensureOpsInstance(state.instances, instanceId);
          const existingDraft = current.configDraft ?? {
            path: current.config?.path,
            baseHash: current.config?.hash,
            rawText: stringifyConfig(current.config),
            dirty: false,
          };
          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...current,
                configDraft: {
                  ...existingDraft,
                  rawText,
                  dirty: true,
                },
              },
            },
          };
        }),

      setConfigDraftError: (instanceId, error) =>
        set((state) => {
          const current = ensureOpsInstance(state.instances, instanceId);
          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...current,
                configDraft: current.configDraft
                  ? {
                      ...current.configDraft,
                      lastError: error,
                    }
                  : current.configDraft,
              },
            },
          };
        }),

      setConfigDraftApplied: (instanceId, snapshot) =>
        set((state) => {
          const current = ensureOpsInstance(state.instances, instanceId);
          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...current,
                config: snapshot,
                configDraft: {
                  path: snapshot.path,
                  baseHash: snapshot.hash,
                  rawText: stringifyConfig(snapshot),
                  dirty: false,
                  lastLoadedAt: Date.now(),
                  lastAppliedAt: Date.now(),
                  lastError: null,
                },
              },
            },
          };
        }),

      setConfigSchema: (instanceId, schema) =>
        set((state) => ({
          instances: {
            ...state.instances,
            [instanceId]: {
              ...ensureOpsInstance(state.instances, instanceId),
              configSchema: schema,
            },
          },
        })),

      setConfigSchemaLookup: (instanceId, lookup) =>
        set((state) => {
          const current = ensureOpsInstance(state.instances, instanceId);
          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...current,
                configSchemaLookups: {
                  ...current.configSchemaLookups,
                  [lookup.path]: lookup,
                },
              },
            },
          };
        }),

      upsertRoutingProfile: (profile) =>
        set((state) => ({
          routingProfiles: upsertUniqueProfile(state.routingProfiles, profile),
        })),

      removeRoutingProfile: (profileId) =>
        set((state) => ({
          routingProfiles: state.routingProfiles.filter((profile) => profile.id !== profileId),
        })),
    }),
    {
      name: "mission-control-ops",
      partialize: (state) => ({
        routingProfiles: state.routingProfiles,
      }),
    },
  ),
);

export function decodeHistoryPayload(messages?: Array<Record<string, unknown>>): ChatHistoryMessage[] {
  return Array.isArray(messages) ? messages.map(decodeHistoryMessage) : [];
}
