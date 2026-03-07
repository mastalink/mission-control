import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GatewayHelloOk } from "../gateway/types";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

/** A gateway connection config saved to localStorage for quick reconnect */
export type SavedConnection = {
  instanceId: string;
  label: string;
  url: string;
  token?: string;
  /** When false the connection is saved but won't auto-connect on startup */
  autoConnect?: boolean;
};

export type GatewayInstanceState = {
  instanceId: string;
  label: string;
  url: string;
  status: ConnectionStatus;
  connId: string | null;
  serverVersion: string | null;
  protocol: number;
  uptimeMs: number;
  authMode: string | null;
  defaultAgentId: string | null;
  error: string | null;
};

type GatewayStore = {
  // Live connection state - ephemeral (not persisted)
  instances: Record<string, GatewayInstanceState>;
  activeInstanceId: string | null;

  // Saved connection configs - persisted to localStorage
  savedConnections: SavedConnection[];

  // Live connection actions
  addInstance: (config: { instanceId: string; label: string; url: string }) => void;
  removeInstance: (instanceId: string) => void;
  setActiveInstance: (instanceId: string) => void;
  setConnecting: (instanceId: string) => void;
  setConnected: (instanceId: string, hello: GatewayHelloOk) => void;
  setDisconnected: (instanceId: string, error?: string) => void;

  // Saved connection management
  saveConnection: (conn: SavedConnection) => void;
  removeSavedConnection: (instanceId: string) => void;
  updateSavedConnection: (
    instanceId: string,
    updates: Partial<Omit<SavedConnection, "instanceId">>
  ) => void;
};

export const useGatewayStore = create<GatewayStore>()(
  persist(
    (set) => ({
      instances: {},
      activeInstanceId: null,
      savedConnections: [],

      addInstance: (config) =>
        set((state) => ({
          instances: {
            ...state.instances,
            [config.instanceId]: {
              instanceId: config.instanceId,
              label: config.label,
              url: config.url,
              status: "disconnected",
              connId: null,
              serverVersion: null,
              protocol: 3,
              uptimeMs: 0,
              authMode: null,
              defaultAgentId: null,
              error: null,
            },
          },
          activeInstanceId: state.activeInstanceId ?? config.instanceId,
        })),

      removeInstance: (instanceId) =>
        set((state) => {
          const { [instanceId]: _, ...rest } = state.instances;
          return {
            instances: rest,
            activeInstanceId:
              state.activeInstanceId === instanceId
                ? (Object.keys(rest)[0] ?? null)
                : state.activeInstanceId,
          };
        }),

      setActiveInstance: (instanceId) => set({ activeInstanceId: instanceId }),

      setConnecting: (instanceId) =>
        set((state) => ({
          instances: {
            ...state.instances,
            [instanceId]: state.instances[instanceId]
              ? { ...state.instances[instanceId], status: "connecting" as const, error: null }
              : state.instances[instanceId]!,
          },
        })),

      setConnected: (instanceId, hello) =>
        set((state) => {
          const existing = state.instances[instanceId];
          if (!existing) return state;
          const snapshot = hello.snapshot;
          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...existing,
                status: "connected",
                connId: hello.server?.connId ?? null,
                serverVersion: hello.server?.version ?? null,
                protocol: hello.protocol,
                uptimeMs: snapshot?.uptimeMs ?? 0,
                authMode: snapshot?.authMode ?? null,
                defaultAgentId: snapshot?.sessionDefaults?.defaultAgentId ?? null,
                error: null,
              },
            },
          };
        }),

      setDisconnected: (instanceId, error) =>
        set((state) => {
          const existing = state.instances[instanceId];
          if (!existing) return state;
          return {
            instances: {
              ...state.instances,
              [instanceId]: {
                ...existing,
                status: error ? "error" : "disconnected",
                error: error ?? null,
              },
            },
          };
        }),

      saveConnection: (conn) =>
        set((state) => ({
          savedConnections: [
            ...state.savedConnections.filter((c) => c.instanceId !== conn.instanceId),
            { autoConnect: true, ...conn },
          ],
        })),

      removeSavedConnection: (instanceId) =>
        set((state) => ({
          savedConnections: state.savedConnections.filter((c) => c.instanceId !== instanceId),
        })),

      updateSavedConnection: (instanceId, updates) =>
        set((state) => ({
          savedConnections: state.savedConnections.map((c) =>
            c.instanceId === instanceId ? { ...c, ...updates } : c
          ),
        })),
    }),
    {
      name: "mission-control-gateway",
      // Only persist saved connection configs - live state always starts fresh
      partialize: (state) => ({
        savedConnections: state.savedConnections,
      }),
    }
  )
);
