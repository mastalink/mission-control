import { useGatewayStore } from "../store/useGatewayStore";
import { useAgentStore } from "../store/useAgentStore";
import { useOpsStore } from "../store/useOpsStore";
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
  const now = Date.now();

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
  const opsStore = useOpsStore.getState();

  // Set agents list
  const agentList = THE_OFFICE_CHARACTERS.map((char) => ({
    id: `agent-${char.id.split("-")[0]}`,
    name: char.name,
    identity: { name: char.name, emoji: "\u{1F3E2}" },
  }));

  agentStore.setAgents(instanceId, agentList, "agent-michael");
  opsStore.ensureInstance(instanceId);
  opsStore.setGatewayCapabilities(instanceId, {
    methods: [
      "sessions.list",
      "sessions.get",
      "sessions.patch",
      "chat.history",
      "chat.send",
      "status",
      "health",
      "models.list",
      "config.get",
      "logs.tail",
      "cron.status",
      "exec.approvals.get",
      "node.list",
      "node.pair.list",
      "system-presence",
    ],
    events: ["chat", "agent", "presence", "health", "exec.approval.requested"],
  });
  opsStore.setSessions(instanceId, {
    defaults: { model: "demo/gpt-office" },
    sessions: [
      {
        key: "main:mission-control-demo",
        label: "Quarterly Outlook",
        displayName: "Quarterly Outlook",
        model: "demo/gpt-office",
        updatedAt: now - 90_000,
        surface: "desk",
      },
      {
        key: "agent-dwight:threat-assessment",
        label: "Threat Assessment",
        displayName: "Threat Assessment",
        model: "demo/gpt-security",
        updatedAt: now - 240_000,
        surface: "operations",
      },
    ],
  });
  opsStore.setSessionDetail(instanceId, {
    key: "main:mission-control-demo",
    label: "Quarterly Outlook",
    displayName: "Quarterly Outlook",
    model: "demo/gpt-office",
    thinkingLevel: "medium",
    verboseLevel: "normal",
    sendPolicy: "inherit",
  });
  opsStore.setHistory(instanceId, "main:mission-control-demo", [
    { role: "system", content: "Demo session loaded for Mission Control.", ts: now - 180_000 },
    { role: "user", content: "Summarize branch performance and staffing risk.", ts: now - 150_000 },
    { role: "assistant", content: "Scranton is stable. Threat level remains MIDNIGHT because Michael added a second whiteboard.", ts: now - 120_000 },
  ]);
  opsStore.selectSession(instanceId, "main:mission-control-demo");
  opsStore.setModels(instanceId, {
    defaults: { model: "demo/gpt-office" },
    models: [
      { ref: "demo/gpt-office", label: "GPT Office" },
      { ref: "demo/gpt-security", label: "GPT Security" },
      { ref: "demo/gpt-sales", label: "GPT Sales Floor" },
    ],
  });
  opsStore.setStatus(instanceId, {
    ok: true,
    version: "demo-1.0.0",
    updateAvailable: null,
  });
  opsStore.setHealth(instanceId, {
    ok: true,
    summary: "All demo systems nominal.",
  });
  opsStore.setPresence(instanceId, [
    { host: "scranton-demo", platform: "demo", ts: now, text: "Mission Control kiosk" },
  ]);
  opsStore.setNodes(instanceId, {
    nodes: [
      { nodeId: "node-printer", displayName: "Warehouse Printer", platform: "demo", connected: true, version: "1.0" },
    ],
  });
  opsStore.setNodePairs(instanceId, {
    requests: [
      { requestId: "pair-demo-1", displayName: "New Scanner Cart", deviceFamily: "scanner", modelIdentifier: "SCN-24" },
    ],
  });
  opsStore.setApprovals(instanceId, {
    path: "demo/exec-approvals.json",
    exists: true,
    hash: "demo-hash",
    file: {},
  });
  opsStore.pushApprovalRequest(instanceId, {
    approvalId: "approval-demo-1",
    agentId: "agent-dwight",
    cwd: "C:\\demo",
    rawCommand: "inventory --reconcile --warehouse",
    host: "scranton-demo",
  });
  opsStore.setLogs(instanceId, {
    reset: true,
    lines: [
      "[info] Demo gateway online",
      "[info] Session Desk demo seeded",
      "[warn] Dwight escalated paper threat level to MIDNIGHT",
    ],
    cursor: 3,
    file: "demo.log",
  });
  opsStore.setCron(instanceId, {
    enabled: true,
    jobs: [
      { id: "demo-report", label: "Daily Branch Report", schedule: "0 9 * * 1-5", enabled: true, nextRunAt: now + 3_600_000 },
    ],
  });
  opsStore.setConfigSnapshot(instanceId, {
    hash: "demo-config",
    raw: JSON.stringify({ defaultModel: "demo/gpt-office", channelDefaults: { slack: "on" } }, null, 2),
    config: { defaultModel: "demo/gpt-office", channelDefaults: { slack: "on" } },
  });

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
