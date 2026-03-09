import { useCallback, useEffect, useRef } from "react";
import { GatewayManager, type InstanceConfig } from "./GatewayManager";
import { normalizeGatewayUrl } from "./connectionUtils";
import { setGatewayManager } from "./gatewayRef";
import type { HealthStatusResult, SessionsListResult } from "./types";
import { autoAssignCharacters } from "../characters/mapping";
import { getCharacterById } from "../characters/registry";
import { useAgentStore } from "../store/useAgentStore";
import { useChannelStore } from "../store/useChannelStore";
import { useCharacterStore } from "../store/useCharacterStore";
import { useGatewayStore } from "../store/useGatewayStore";
import { useOpsStore } from "../store/useOpsStore";

export function applyCharacterAssignments(
  instanceId: string,
  agents: { id: string }[],
  defaultId?: string,
) {
  const agentStore = useAgentStore.getState();
  const overrides = useCharacterStore.getState().getOverridesForInstance(instanceId);
  const assignments = autoAssignCharacters(agents, defaultId, overrides, instanceId);

  for (const assignment of assignments) {
    const character = getCharacterById(assignment.characterId);
    if (!character) continue;
    agentStore.setCharacterForAgent(
      instanceId,
      assignment.agentId,
      assignment.characterId,
      character.defaultLocation,
      0,
    );
  }
}

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
        useGatewayStore.getState().setDisconnected(
          instanceId,
          info.code !== 1000 ? info.reason : undefined,
        );
      },
      onAgentsList: (instanceId, result) => {
        const agentStore = useAgentStore.getState();
        agentStore.setAgents(instanceId, result.agents, result.defaultId);
        applyCharacterAssignments(instanceId, result.agents, result.defaultId);
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

  const connect = useCallback(
    (config: InstanceConfig & { token?: string; password?: string; autoConnect?: boolean }) => {
      const normalizedUrl = normalizeGatewayUrl(config.url);
      const gatewayStore = useGatewayStore.getState();

      gatewayStore.addInstance({
        instanceId: config.instanceId,
        label: config.label,
        url: normalizedUrl,
      });
      gatewayStore.setConnecting(config.instanceId);
      useOpsStore.getState().ensureInstance(config.instanceId);

      gatewayStore.saveConnection({
        instanceId: config.instanceId,
        label: config.label,
        url: normalizedUrl,
        token: config.token,
        autoConnect: config.autoConnect ?? true,
      });

      managerRef.current?.connect({ ...config, url: normalizedUrl });
    },
    [],
  );

  const disconnect = useCallback(
    (instanceId: string, options?: { forget?: boolean }) => {
      managerRef.current?.disconnect(instanceId);
      cleanupInstanceState(instanceId);
      if (options?.forget) {
        useGatewayStore.getState().removeSavedConnection(instanceId);
      }
    },
    [cleanupInstanceState],
  );

  const reconnectSaved = useCallback(() => {
    const { savedConnections } = useGatewayStore.getState();
    if (savedConnections.length === 0) return;

    for (const connection of savedConnections) {
      if (connection.autoConnect === false) continue;
      const gatewayStore = useGatewayStore.getState();
      if (gatewayStore.instances[connection.instanceId]?.status === "connected") continue;

      gatewayStore.addInstance({
        instanceId: connection.instanceId,
        label: connection.label,
        url: connection.url,
      });
      gatewayStore.setConnecting(connection.instanceId);
      useOpsStore.getState().ensureInstance(connection.instanceId);
      managerRef.current?.connect(connection);
    }
  }, []);

  return { connect, disconnect, reconnectSaved, manager: managerRef };
}
