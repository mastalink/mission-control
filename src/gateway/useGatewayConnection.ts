import { useEffect, useRef, useCallback } from "react";
import { GatewayManager, type InstanceConfig } from "./GatewayManager";
import { setGatewayManager } from "./gatewayRef";
import { useGatewayStore } from "../store/useGatewayStore";
import { useAgentStore } from "../store/useAgentStore";
import { useChannelStore } from "../store/useChannelStore";
import { useOpsStore } from "../store/useOpsStore";
import { autoAssignCharacters } from "../characters/mapping";
import { getCharacterById } from "../characters/registry";
import { normalizeGatewayUrl } from "./connectionUtils";
import type { HealthStatusResult, SessionsListResult } from "./types";

/**
 * React hook that manages the GatewayManager lifecycle,
 * wiring WebSocket events into Zustand stores.
 *
 * Uses getState() for all store actions to avoid subscribing
 * to state changes (we only need actions, not reactive state).
 */
export function useGatewayConnection() {
  const managerRef = useRef<GatewayManager | null>(null);

  const cleanupInstanceState = useCallback((instanceId: string) => {
    useGatewayStore.getState().removeInstance(instanceId);
    useAgentStore.getState().removeInstance(instanceId);
    useChannelStore.getState().removeInstance(instanceId);
    useOpsStore.getState().removeInstance(instanceId);
  }, []);

  useEffect(() => {
    const manager = new GatewayManager({
      onConnected: (instanceId, hello) => {
        useGatewayStore.getState().setConnected(instanceId, hello);
        useOpsStore.getState().setGatewayCapabilities(instanceId, {
          methods: hello.features?.methods ?? [],
          events: hello.features?.events ?? [],
        });
      },
      onDisconnected: (instanceId, info) => {
        useGatewayStore.getState().setDisconnected(instanceId, info.code !== 1000 ? info.reason : undefined);
      },
      onAgentsList: (instanceId, result) => {
        const agentStore = useAgentStore.getState();
        agentStore.setAgents(instanceId, result.agents, result.defaultId);
        // Auto-assign characters
        const assignments = autoAssignCharacters(
          result.agents,
          result.defaultId,
          {}, // TODO: load user overrides from localStorage
          instanceId,
        );
        for (const a of assignments) {
          const char = getCharacterById(a.characterId);
          if (char) {
            agentStore.setCharacterForAgent(
              instanceId,
              a.agentId,
              a.characterId,
              char.defaultLocation,
              0,
            );
          }
        }
      },
      onChannelsStatus: (instanceId, result) => {
        useChannelStore.getState().setChannels(instanceId, result);
      },
      onCronStatus: (instanceId, result) => {
        useOpsStore.getState().setCron(instanceId, result);
      },
      onSessionsList: (instanceId, result) => {
        useOpsStore.getState().setSessions(instanceId, result as SessionsListResult);
      },
      onChatEvent: (instanceId, event) => {
        useAgentStore.getState().updateFromChatEvent(instanceId, event);
        useOpsStore.getState().updateFromChatEvent(instanceId, event);
      },
      onAgentEvent: (instanceId, event) => {
        useAgentStore.getState().updateFromAgentEvent(instanceId, event);
      },
      onPresence: (instanceId, entries) => {
        useOpsStore.getState().setPresence(
          instanceId,
          entries.map((entry) => ({ ...entry })),
        );
      },
      onHealthEvent: (instanceId, payload) => {
        useOpsStore.getState().setHealth(
          instanceId,
          payload && typeof payload === "object"
            ? ({ ...(payload as Record<string, unknown>) } as HealthStatusResult)
            : { ok: true },
        );
      },
      onCronEvent: () => {
        // TODO: cron updates
      },
      onExecApprovalRequested: (instanceId, payload) => {
        const approvalId =
          payload.approvalId ??
          (payload.raw?.approvalId as string | undefined) ??
          crypto.randomUUID();
        useOpsStore.getState().pushApprovalRequest(instanceId, {
          ...payload,
          approvalId,
        });
      },
      onNodePairUpdate: () => {
        // Session Desk polls node.pair.list when open; event routing can stay best-effort.
      },
    });

    managerRef.current = manager;
    setGatewayManager(manager);

    return () => {
      manager.disconnectAll();
    };
  }, []);

  /** Connect to a gateway and persist it for future sessions */
  const connect = useCallback((config: InstanceConfig & { token?: string; password?: string; autoConnect?: boolean }) => {
    const normalizedUrl = normalizeGatewayUrl(config.url);
    const gwStore = useGatewayStore.getState();
    gwStore.addInstance({ instanceId: config.instanceId, label: config.label, url: normalizedUrl });
    gwStore.setConnecting(config.instanceId);
    useOpsStore.getState().ensureInstance(config.instanceId);
    // Persist this connection so it auto-reconnects on next load
    gwStore.saveConnection({
      instanceId: config.instanceId,
      label: config.label,
      url: normalizedUrl,
      token: config.token,
      autoConnect: config.autoConnect ?? true,
    });
    managerRef.current?.connect({ ...config, url: normalizedUrl });
  }, []);

  /**
   * Disconnect an instance.
   * @param forget - if true, also removes from saved connections (won't auto-reconnect next session)
   */
  const disconnect = useCallback((instanceId: string, options?: { forget?: boolean }) => {
    managerRef.current?.disconnect(instanceId);
    cleanupInstanceState(instanceId);
    if (options?.forget) {
      useGatewayStore.getState().removeSavedConnection(instanceId);
    }
  }, [cleanupInstanceState]);

  /**
   * Reconnect all previously saved connections.
   * Called on app startup so the dashboard auto-connects to known gateways.
   */
  const reconnectSaved = useCallback(() => {
    const { savedConnections } = useGatewayStore.getState();
    if (savedConnections.length === 0) return;

    for (const conn of savedConnections) {
      // Respect per-connection auto-connect preference
      if (conn.autoConnect === false) continue;
      const gwStore = useGatewayStore.getState();
      if (gwStore.instances[conn.instanceId]?.status === "connected") continue;
      gwStore.addInstance({ instanceId: conn.instanceId, label: conn.label, url: conn.url });
      gwStore.setConnecting(conn.instanceId);
      useOpsStore.getState().ensureInstance(conn.instanceId);
      managerRef.current?.connect(conn);
    }
  }, []);

  return { connect, disconnect, reconnectSaved, manager: managerRef };
}
