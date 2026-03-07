import { create } from "zustand";
import type { AgentEvent, AgentListItem, ChatEvent } from "../gateway/types";
import type { AgentVisualState, OfficeLocation } from "../characters/types";
import { getCharacterById } from "../characters/registry";

export type AgentState = {
  agentId: string;
  name: string;
  emoji?: string;
  avatar?: string;
  visualState: AgentVisualState;
  activeRunId: string | null;
  lastDeltaText: string;
  activeTool: string | null;
  lastError: string | null;
  lastActivityTs: number;
  characterId: string | null;
  location: OfficeLocation;
  deskIndex: number;
  totalTokens: number;
};

type AgentStore = {
  // instanceId -> agentId -> AgentState
  agents: Record<string, Record<string, AgentState>>;
  defaultAgentIds: Record<string, string>; // instanceId -> defaultAgentId

  setAgents: (instanceId: string, agents: AgentListItem[], defaultAgentId?: string) => void;
  setCharacterForAgent: (instanceId: string, agentId: string, characterId: string, location: OfficeLocation, deskIndex: number) => void;
  updateFromChatEvent: (instanceId: string, event: ChatEvent) => void;
  updateFromAgentEvent: (instanceId: string, event: AgentEvent) => void;
  resetAgentState: (instanceId: string, agentId: string) => void;
  removeInstance: (instanceId: string) => void;
};

function resolveLocation(visualState: AgentVisualState, agent: AgentState): OfficeLocation {
  // Active states → conference room (unless in Michael's office)
  if (visualState === "talking" || visualState === "thinking" || visualState === "tool_calling") {
    return agent.location === "michael-office" ? "michael-office" : "conference-room";
  }
  // Idle/error → return to default desk
  const char = agent.characterId ? getCharacterById(agent.characterId) : null;
  return char?.defaultLocation ?? agent.location;
}

function resolveAgentIdFromSessionKey(sessionKey: string): string | null {
  // Session key format: "agentId:label" or just "main"
  const parts = sessionKey.split(":");
  return parts.length > 1 ? (parts[0] ?? null) : null;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: {},
  defaultAgentIds: {},

  setAgents: (instanceId, agentList, defaultAgentId) =>
    set((state) => {
      const existing = state.agents[instanceId] ?? {};
      const updated: Record<string, AgentState> = {};

      for (const agent of agentList) {
        const prev = existing[agent.id];
        updated[agent.id] = {
          agentId: agent.id,
          name: agent.identity?.name ?? agent.name ?? agent.id,
          emoji: agent.identity?.emoji,
          avatar: agent.identity?.avatar,
          visualState: prev?.visualState ?? "idle",
          activeRunId: prev?.activeRunId ?? null,
          lastDeltaText: prev?.lastDeltaText ?? "",
          activeTool: prev?.activeTool ?? null,
          lastError: prev?.lastError ?? null,
          lastActivityTs: prev?.lastActivityTs ?? 0,
          characterId: prev?.characterId ?? null,
          location: prev?.location ?? "open-floor",
          deskIndex: prev?.deskIndex ?? 0,
          totalTokens: prev?.totalTokens ?? 0,
        };
      }

      return {
        agents: { ...state.agents, [instanceId]: updated },
        defaultAgentIds: defaultAgentId
          ? { ...state.defaultAgentIds, [instanceId]: defaultAgentId }
          : state.defaultAgentIds,
      };
    }),

  setCharacterForAgent: (instanceId, agentId, characterId, location, deskIndex) =>
    set((state) => {
      const instanceAgents = state.agents[instanceId];
      if (!instanceAgents) return state;
      const agent = instanceAgents[agentId];
      if (!agent) return state;
      return {
        agents: {
          ...state.agents,
          [instanceId]: {
            ...instanceAgents,
            [agentId]: { ...agent, characterId, location, deskIndex },
          },
        },
      };
    }),

  updateFromChatEvent: (instanceId, event) =>
    set((state) => {
      const instanceAgents = state.agents[instanceId];
      if (!instanceAgents) return state;

      // Find which agent this event belongs to
      const agentId = resolveAgentIdFromSessionKey(event.sessionKey);
      // Fall back to default agent if we can't resolve from session key
      const targetId = agentId ?? state.defaultAgentIds[instanceId];
      if (!targetId) return state;

      const agent = instanceAgents[targetId];
      if (!agent) return state;

      let visualState: AgentVisualState;
      let lastDeltaText = agent.lastDeltaText;
      let lastError = agent.lastError;
      let activeRunId: string | null = event.runId;
      let totalTokens = agent.totalTokens;

      switch (event.state) {
        case "delta":
          visualState = "talking";
          if (event.message && typeof event.message === "string") {
            lastDeltaText = (lastDeltaText + event.message).slice(-200);
          }
          break;
        case "final":
          visualState = "idle";
          lastDeltaText = "";
          activeRunId = null;
          if (event.usage?.totalTokens) {
            totalTokens += event.usage.totalTokens;
          }
          break;
        case "aborted":
        case "error":
          visualState = "error";
          lastError = event.errorMessage ?? "Unknown error";
          activeRunId = null;
          break;
        default:
          return state;
      }

      // Move character based on state transition
      const location = resolveLocation(visualState, agent);

      return {
        agents: {
          ...state.agents,
          [instanceId]: {
            ...instanceAgents,
            [targetId]: {
              ...agent,
              visualState,
              activeRunId,
              lastDeltaText,
              lastError,
              lastActivityTs: Date.now(),
              totalTokens,
              location,
            },
          },
        },
      };
    }),

  updateFromAgentEvent: (instanceId, event) =>
    set((state) => {
      const instanceAgents = state.agents[instanceId];
      if (!instanceAgents) return state;

      // Try to resolve agent from the runId - check all agents for matching activeRunId
      let targetId: string | undefined;
      for (const [id, agent] of Object.entries(instanceAgents)) {
        if (agent.activeRunId === event.runId) {
          targetId = id;
          break;
        }
      }
      // Fall back to default agent
      if (!targetId) targetId = state.defaultAgentIds[instanceId];
      if (!targetId) return state;

      const agent = instanceAgents[targetId];
      if (!agent) return state;

      // Map agent event streams to visual states
      let visualState = agent.visualState;
      let activeTool = agent.activeTool;

      const stream = event.stream;
      if (stream === "thinking" || stream === "thinking_delta") {
        visualState = "thinking";
      } else if (stream === "tool_use" || stream === "tool_call" || stream === "tool_use_start") {
        visualState = "tool_calling";
        const name = event.data?.name ?? event.data?.tool;
        if (typeof name === "string") activeTool = name;
      } else if (stream === "tool_result" || stream === "tool_use_end") {
        // Tool finished, back to thinking
        visualState = "thinking";
        activeTool = null;
      }

      if (visualState === agent.visualState && activeTool === agent.activeTool) return state;

      return {
        agents: {
          ...state.agents,
          [instanceId]: {
            ...instanceAgents,
            [targetId]: {
              ...agent,
              visualState,
              activeTool,
              activeRunId: event.runId,
              lastActivityTs: Date.now(),
            },
          },
        },
      };
    }),

  resetAgentState: (instanceId, agentId) =>
    set((state) => {
      const instanceAgents = state.agents[instanceId];
      if (!instanceAgents?.[agentId]) return state;
      return {
        agents: {
          ...state.agents,
          [instanceId]: {
            ...instanceAgents,
            [agentId]: {
              ...instanceAgents[agentId],
              visualState: "idle" as const,
              activeRunId: null,
              lastDeltaText: "",
              activeTool: null,
              lastError: null,
            },
          },
        },
      };
    }),

  removeInstance: (instanceId) =>
    set((state) => {
      const { [instanceId]: _, ...rest } = state.agents;
      return { agents: rest };
    }),
}));
