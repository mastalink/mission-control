import { useEffect, useRef } from "react";
import { useUIStore } from "../store/useUIStore";
import { useAgentStore } from "../store/useAgentStore";
import { useGatewayStore } from "../store/useGatewayStore";
import {
  playConnectSound,
  playDisconnectSound,
  playTalkingSound,
  playThinkingSound,
  playToolCallSound,
  playErrorSound,
  playCompleteSound,
} from "./SoundManager";

/**
 * Subscribes to store changes and plays sounds when soundEnabled is true.
 * Uses Zustand's subscribe() to avoid re-renders.
 */
export function useSoundEffects() {
  const prevStatesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    // Subscribe to agent state changes for per-agent sounds
    const unsubAgent = useAgentStore.subscribe((state) => {
      if (!useUIStore.getState().soundEnabled) return;

      const prev = prevStatesRef.current;
      const next: Record<string, string> = {};

      for (const [instId, agents] of Object.entries(state.agents)) {
        for (const [agentId, agent] of Object.entries(agents)) {
          const key = `${instId}:${agentId}`;
          next[key] = agent.visualState;
          const prevState = prev[key];
          if (!prevState || prevState === agent.visualState) continue;

          // State transition happened
          switch (agent.visualState) {
            case "talking":
              playTalkingSound();
              break;
            case "thinking":
              playThinkingSound();
              break;
            case "tool_calling":
              playToolCallSound();
              break;
            case "error":
              playErrorSound();
              break;
            case "idle":
              if (prevState === "talking" || prevState === "tool_calling") {
                playCompleteSound();
              }
              break;
          }
        }
      }

      prevStatesRef.current = next;
    });

    // Subscribe to gateway connection changes
    const unsubGateway = useGatewayStore.subscribe((state, prevState) => {
      if (!useUIStore.getState().soundEnabled) return;

      for (const [id, inst] of Object.entries(state.instances)) {
        const prevInst = prevState.instances[id];
        if (!prevInst) continue;
        if (prevInst.status !== inst.status) {
          if (inst.status === "connected") playConnectSound();
          else if (inst.status === "disconnected" || inst.status === "error") {
            if (prevInst.status === "connected") playDisconnectSound();
          }
        }
      }
    });

    return () => {
      unsubAgent();
      unsubGateway();
    };
  }, []);
}
