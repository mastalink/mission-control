import { useEffect, useRef, useCallback } from "react";
import { GatewayManager, type InstanceConfig } from "./GatewayManager";
import { setGatewayManager } from "./gatewayRef";
import { useGatewayStore } from "../store/useGatewayStore";
import { useAgentStore } from "../store/useAgentStore";
import { useChannelStore } from "../store/useChannelStore";
import { useCharacterStore } from "../store/useCharacterStore";
import { autoAssignCharacters } from "../characters/mapping";
import { getCharacterById } from "../characters/registry";
import { normalizeGatewayUrl } from "./connectionUtils";

/** Re-apply character assignments for an instance, respecting user overrides. */
export function applyCharacterAssignments(
  instanceId: string,
  agents: { id: string }[],
  defaultId?: string,
) {
  const agentStore = useAgentStore.getState();
  const overrides = useCharacterStore.getState().getOverridesForInstance(instanceId);
  const assignments = autoAssignCharacters(agents, defaultId, overrides, instanceId);
  for (const a of assignments) {
    const char = getCharacterById(a.characterId);
    if (char) {
      agentStore.setCharacterForAgent(instanceId, a.agentId, a.characterId, char.defaultLocation, 0);
    }
  }
}

/**
 * React hook that manages the GatewayManager lifecycle,
 * wiring WebSocket events into Zustand stores.
 *
 * Uses getState() for all store actions to avoid subscribing
 * to state changes (we only need actions, not reactive state).
 */
export function useGatewayConnection() {
  const managerRef = useRef<GatewayManager | null>(null);

  useEffect(() => {
    const manager = new GatewayManager({
      onConnected: (instanceId, hello) => {
        useGatewayStore.getState().setConnected(instanceId, hello);
      },
      onDisconnected: (instanceId, info) => {
        useGatewayStore.getState().setDisconnected(instanceId, info.code !== 1000 ? info.reason : undefined);
      },
      onAgentsList: (instanceId, result) => {
        const agentStore = useAgentStore.getState();
        agentStore.setAgents(instanceId, result.agents, result.defaultId);
        applyCharacterAssignments(instanceId, result.agents, result.defaultId);
      },
      onChannelsStatus: (instanceId, result) => {
        useChannelStore.getState().setChannels(instanceId, result);
      },
      onCronStatus: () => {
        // TODO: cron store
      },
      onSessionsList: () => {
        // TODO: sessions store
      },
      onChatEvent: (instanceId, event) => {
        useAgentStore.getState().updateFromChatEvent(instanceId, event);
      },
      onAgentEvent: (instanceId, event) => {
        useAgentStore.getState().updateFromAgentEvent(instanceId, event);
      },
      onPresence: () => {
        // TODO: presence store
      },
      onHealthEvent: () => {
        // TODO: health updates
      },
      onCronEvent: () => {
        // TODO: cron updates
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
    useGatewayStore.getState().removeInstance(instanceId);
    if (options?.forget) {
      useGatewayStore.getState().removeSavedConnection(instanceId);
    }
  }, []);

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
      managerRef.current?.connect(conn);
    }
  }, []);

  return { connect, disconnect, reconnectSaved, manager: managerRef };
}
