import { useGatewayStore } from "../store/useGatewayStore";
import { useAgentStore } from "../store/useAgentStore";
import { useUIStore } from "../store/useUIStore";
import { THE_OFFICE_CHARACTERS } from "../characters/registry";
import type { AgentVisualState } from "../characters/types";

/**
 * Populates the stores with mock data so the floor plan
 * can be previewed without a live gateway connection.
 */
export function loadDemoData() {
  const instanceId = "demo-scranton";
  const label = "Scranton (Demo)";

  // 1. Add a fake gateway instance
  const gwStore = useGatewayStore.getState();
  gwStore.addInstance({ instanceId, label, url: "ws://demo" });
  // Mark as connected
  gwStore.setConnected(instanceId, {
    type: "hello-ok",
    protocol: 3,
    server: { connId: "demo-conn", version: "0.0.0-demo" },
    snapshot: {
      uptimeMs: 86_400_000,
      authMode: "none",
      sessionDefaults: {
        defaultAgentId: "agent-michael",
        mainKey: "main",
        mainSessionKey: "agent-michael:main",
      },
    },
  });

  // 2. Create mock agents (one per character)
  const demoStates: AgentVisualState[] = [
    "talking",       // Michael - always talking
    "thinking",      // Dwight - always working
    "idle",          // Jim - classic idle
    "idle",          // Pam - at reception
    "idle",          // Stanley - crossword
    "talking",       // Andy - singing/talking
    "idle",          // Kevin - eating
    "tool_calling",  // Angela - crunching numbers
    "idle",          // Oscar - calm
    "idle",          // Phyllis - knitting
    "idle",          // Meredith - napping
    "idle",          // Creed - mysterious
    "thinking",      // Ryan - scheming
    "talking",       // Kelly - always talking
    "error",         // Toby - of course he's the error
    "idle",          // Darryl - warehouse
  ];

  const demoTexts: Record<string, string> = {
    "agent-michael": "That's what she said! No but seriously, the quarterly numbers are...",
    "agent-andy": "I will remember youuuuu... will you remember me?",
    "agent-kelly": "Oh my God, you guys, Ryan just looked at me. Did you see that?",
  };

  const demoTools: Record<string, string> = {
    "agent-angela": "spreadsheet_audit",
  };

  const demoErrors: Record<string, string> = {
    "agent-toby": "HR complaint filed incorrectly",
  };

  const agentStore = useAgentStore.getState();

  // Set agents list
  const agentList = THE_OFFICE_CHARACTERS.map((char) => ({
    id: `agent-${char.id.split("-")[0]}`,
    name: char.name,
    identity: { name: char.name, emoji: "\u{1F3E2}" },
  }));

  agentStore.setAgents(instanceId, agentList, "agent-michael");

  // Assign characters and set visual states
  for (let i = 0; i < THE_OFFICE_CHARACTERS.length; i++) {
    const char = THE_OFFICE_CHARACTERS[i]!;
    const agentId = `agent-${char.id.split("-")[0]}`;
    const state = demoStates[i] ?? ("idle" as AgentVisualState);

    agentStore.setCharacterForAgent(instanceId, agentId, char.id, char.defaultLocation, i);

    // Apply visual states for non-idle agents
    if (state === "idle") continue;

    useAgentStore.setState((s) => {
      const inst = s.agents[instanceId];
      const agent = inst?.[agentId];
      if (!inst || !agent) return s;
      return {
        agents: {
          ...s.agents,
          [instanceId]: {
            ...inst,
            [agentId]: {
              ...agent,
              visualState: state,
              lastDeltaText: demoTexts[agentId] ?? "",
              activeTool: demoTools[agentId] ?? null,
              lastError: demoErrors[agentId] ?? null,
              activeRunId: "demo-run",
              lastActivityTs: Date.now(),
            },
          },
        },
      };
    });
  }

  // Navigate to the floor plan so the graphics are immediately visible
  useUIStore.getState().setActivePage("floorplan");
  useGatewayStore.getState().setActiveInstance(instanceId);
}
