import { useEffect, useState, type ReactNode } from "react";
import { THE_OFFICE_CHARACTERS } from "../characters/registry";
import { loadDemoData } from "../demo/loadDemo";
import { getGatewayManager } from "../gateway/gatewayRef";
import type { ChatHistoryMessage, SessionDetail, SessionEntry } from "../gateway/types";
import { applyCharacterAssignments } from "../gateway/useGatewayConnection";
import { useCharacterStore } from "../store/useCharacterStore";
import { OperatorGuide, type GuideStep, type GuideTerm } from "./OperatorGuide";
import {
  buildProvisionedConfig,
  emptyProvisioningDraft,
  parseProvisioningBaseConfig,
  slugAgentId,
  type AgentProvisioningDraft,
} from "./agentProvisioning";
import { useAgentStore } from "../store/useAgentStore";
import { useChannelStore } from "../store/useChannelStore";
import { useGatewayStore } from "../store/useGatewayStore";
import { decodeHistoryPayload, useOpsStore } from "../store/useOpsStore";
import { useUIStore, type DeskSection } from "../store/useUIStore";

type SessionDraft = {
  label: string;
  model: string;
  thinkingLevel: string;
  verboseLevel: string;
  sendPolicy: string;
  groupActivation: string;
};

type ConfiguredAgentSummary = {
  id: string;
  name?: string;
  workspace?: string;
  agentDir?: string;
  model?: string;
  identityName?: string;
  isDefault: boolean;
};

type RouteBindingSummary = {
  agentId: string;
  summary: string;
};

const THINKING_LEVELS = ["", "minimal", "low", "medium", "high"];
const VERBOSE_LEVELS = ["", "brief", "normal", "detailed"];
const SEND_POLICIES = ["", "inherit", "on", "off"];
const GROUP_POLICIES = ["", "inherit", "always", "mentioned"];
const CUSTOM_MODEL_VALUE = "__custom__";

const DESK_TERMS: GuideTerm[] = [
  {
    term: "Gateway",
    definition: "A live OpenClaw connection. Gateways expose the real agents, channels, models, approvals, and config you can operate here.",
  },
  {
    term: "Agent",
    definition: "A real OpenClaw worker on the gateway. Mission Control can provision one from Gateway Workbench, then route sessions to it from Session Desk.",
  },
  {
    term: "Character",
    definition: "An Office-themed skin inside Mission Control. Character mapping changes the face and desk location you see on the floor. It does not rename or recreate the underlying agent.",
  },
  {
    term: "Session",
    definition: "A work thread routed through a gateway. This is what you create here, then assign to an agent, model, and optional channel context.",
  },
];

const DESK_STEPS: GuideStep[] = [
  {
    title: "Connect a gateway",
    body: "The gateway loads its existing OpenClaw agents. If there is no gateway, there are no agents to assign or route.",
  },
  {
    title: "Provision agents in Workbench",
    body: "Use Gateway Workbench when you need to create a real OpenClaw agent. That writes gateway config and refreshes the live roster.",
  },
  {
    title: "Create or open a session",
    body: "Use Open Case File to create a session. That creates a work thread, not a new agent. Pick the agent you want to run it or leave it on the gateway default.",
  },
  {
    title: "Cast the character",
    body: "Open Character Mapping to decide which Office employee represents each agent on the floor plan and roster.",
  },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is Record<string, unknown> =>
      typeof entry === "object" && entry !== null && !Array.isArray(entry),
  );
}

function defaultWorkspace(agentId: string): string {
  return agentId === "main"
    ? "~/.openclaw/workspace"
    : `~/.openclaw/workspace-${agentId}`;
}

function defaultAgentDir(agentId: string): string {
  return `~/.openclaw/agents/${agentId}/agent`;
}

function createProvisionDraft(agentId = ""): AgentProvisioningDraft {
  const normalizedId = slugAgentId(agentId);
  return {
    ...emptyProvisioningDraft(),
    agentId: normalizedId,
    workspace: normalizedId ? defaultWorkspace(normalizedId) : "",
    agentDir: normalizedId ? defaultAgentDir(normalizedId) : "",
  };
}

function readModelLabel(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  return record && typeof record.primary === "string" ? record.primary : undefined;
}

function modelOptionLabel(model: { ref: string; label?: string; alias?: string; provider?: string }): string {
  const parts = [model.label ?? model.alias ?? model.ref];
  if (model.provider && model.provider !== model.ref) {
    parts.push(model.provider);
  }
  if ((model.label ?? model.alias) && model.ref !== (model.label ?? model.alias)) {
    parts.push(model.ref);
  }
  return parts.join(" · ");
}

function extractConfiguredAgents(config: Record<string, unknown> | null): ConfiguredAgentSummary[] {
  const agentsRoot = asRecord(config?.agents);
  const entries = asRecordArray(agentsRoot?.list);
  return entries.map((entry) => {
    const identity = asRecord(entry.identity);
    return {
      id: typeof entry.id === "string" ? entry.id : "unknown",
      name: typeof entry.name === "string" ? entry.name : undefined,
      workspace: typeof entry.workspace === "string" ? entry.workspace : undefined,
      agentDir: typeof entry.agentDir === "string" ? entry.agentDir : undefined,
      model: readModelLabel(entry.model),
      identityName: typeof identity?.name === "string" ? identity.name : undefined,
      isDefault: entry.default === true,
    };
  });
}

function extractRouteBindings(config: Record<string, unknown> | null): RouteBindingSummary[] {
  const bindings = asRecordArray(config?.bindings);
  const routes: RouteBindingSummary[] = [];
  for (const entry of bindings) {
    const match = asRecord(entry.match);
    if (!match || typeof entry.agentId !== "string" || typeof match.channel !== "string") {
      continue;
    }
    if (entry.type && entry.type !== "route") {
      continue;
    }
    const bits = [match.channel];
    if (typeof match.accountId === "string") bits.push(`acct:${match.accountId}`);
    const peer = asRecord(match.peer);
    if (peer && typeof peer.kind === "string" && typeof peer.id === "string") {
      bits.push(`peer:${peer.kind}/${peer.id}`);
    }
    if (typeof match.guildId === "string") bits.push(`guild:${match.guildId}`);
    if (typeof match.teamId === "string") bits.push(`team:${match.teamId}`);
    if (Array.isArray(match.roles) && match.roles.length > 0) {
      bits.push(`roles:${match.roles.join(",")}`);
    }
    routes.push({
      agentId: entry.agentId,
      summary: bits.join(" · "),
    });
  }
  return routes;
}

function formatRelativeTime(ts?: number): string {
  if (!ts) return "No recent traffic";
  const seconds = Math.floor(Math.max(0, Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}

function sessionTitle(session?: Partial<SessionEntry> | Partial<SessionDetail>): string {
  const entry = session as Partial<SessionEntry> | undefined;
  return (
    session?.displayName ??
    session?.label ??
    session?.derivedTitle ??
    entry?.subject ??
    entry?.room ??
    entry?.space ??
    session?.key ??
    "Untitled session"
  );
}

function textOf(content: ChatHistoryMessage["content"]): string {
  if (typeof content === "string") return content;
  return content.map((item) => (typeof item.text === "string" ? item.text : JSON.stringify(item))).join("\n");
}

function sessionAgentId(sessionKey: string | null | undefined, defaultAgentId: string | null | undefined): string | undefined {
  if (!sessionKey) return defaultAgentId ?? undefined;
  const [prefix] = sessionKey.split(":");
  if (!prefix || prefix === "main") return defaultAgentId ?? undefined;
  return prefix;
}

function buildSessionKey(agentId: string | undefined, label: string): string {
  const prefix = agentId && agentId !== "main" ? agentId : "main";
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "session";
  return `${prefix}:mission-control-${slug}-${Date.now().toString(36)}`;
}

function canUse(methods: string[] | undefined, method: string): boolean {
  return !methods || methods.length === 0 || methods.includes(method);
}

function diffPreview(baseText: string, draftText: string): string[] {
  const before = baseText.split(/\r?\n/);
  const after = draftText.split(/\r?\n/);
  const preview: string[] = [];
  const max = Math.max(before.length, after.length);
  for (let index = 0; index < max; index += 1) {
    if (before[index] === after[index]) continue;
    if (typeof before[index] === "string") preview.push(`- ${before[index]}`);
    if (typeof after[index] === "string") preview.push(`+ ${after[index]}`);
    if (preview.length >= 20) break;
  }
  return preview.length > 0 ? preview : ["No changes staged."];
}

function deskPanel(title: string, eyebrow: string, children: ReactNode, action?: ReactNode) {
  return (
    <section className="rounded-xl border border-dunder-carpet/30 bg-dunder-blue/80 backdrop-blur-sm shadow-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-dunder-carpet/20 px-4 py-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-dunder-carpet">{eyebrow}</p>
          <h2 className="font-dunder text-lg font-bold uppercase tracking-[0.16em] text-dunder-paper">{title}</h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function field(label: string, control: ReactNode) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-dunder-carpet">{label}</span>
      {control}
    </label>
  );
}

function statusChip(label: string, tone: "neutral" | "good" | "warn" | "bad" | "live" = "neutral") {
  const tones: Record<"neutral" | "good" | "warn" | "bad" | "live", string> = {
    neutral: "border-dunder-carpet/25 bg-dunder-paper/8 text-dunder-paper",
    good: "border-green-500/30 bg-green-500/10 text-green-300",
    warn: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    bad: "border-red-500/30 bg-red-500/10 text-red-300",
    live: "border-blue-500/30 bg-blue-500/10 text-blue-200",
  };

  return (
    <span className={`rounded-full border px-2 py-1 text-[10px] font-mono uppercase tracking-[0.18em] ${tones[tone]}`}>
      {label}
    </span>
  );
}

function buttonClasses(kind: "primary" | "secondary" | "danger" = "secondary"): string {
  if (kind === "primary") {
    return "rounded-md border border-dunder-paper/35 bg-dunder-paper/12 px-3 py-2 text-xs uppercase tracking-[0.18em] text-dunder-paper transition-colors hover:bg-dunder-paper/18 disabled:cursor-not-allowed disabled:opacity-50";
  }
  if (kind === "danger") {
    return "rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-red-200 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50";
  }
  return "rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 text-xs uppercase tracking-[0.18em] text-dunder-paper transition-colors hover:bg-dunder-paper/14 disabled:cursor-not-allowed disabled:opacity-50";
}

export function SessionDesk() {
  const instances = useGatewayStore((state) => state.instances);
  const activeInstanceId = useGatewayStore((state) => state.activeInstanceId);
  const setActiveInstance = useGatewayStore((state) => state.setActiveInstance);
  const agentsByInstance = useAgentStore((state) => state.agents);
  const channelsByInstance = useChannelStore((state) => state.channels);
  const deskFocus = useUIStore((state) => state.deskFocus);
  const setDeskFocus = useUIStore((state) => state.setDeskFocus);
  const openPanel = useUIStore((state) => state.openPanel);
  const toggleAddInstance = useUIStore((state) => state.toggleAddInstance);

  const opsInstances = useOpsStore((state) => state.instances);
  const routingProfiles = useOpsStore((state) => state.routingProfiles);
  const ensureInstance = useOpsStore((state) => state.ensureInstance);
  const selectSession = useOpsStore((state) => state.selectSession);
  const setSessions = useOpsStore((state) => state.setSessions);
  const setSessionDetail = useOpsStore((state) => state.setSessionDetail);
  const setHistory = useOpsStore((state) => state.setHistory);
  const setModels = useOpsStore((state) => state.setModels);
  const setStatus = useOpsStore((state) => state.setStatus);
  const setHealth = useOpsStore((state) => state.setHealth);
  const setPresence = useOpsStore((state) => state.setPresence);
  const setNodes = useOpsStore((state) => state.setNodes);
  const setNodePairs = useOpsStore((state) => state.setNodePairs);
  const setApprovals = useOpsStore((state) => state.setApprovals);
  const resolveApprovalRequest = useOpsStore((state) => state.resolveApprovalRequest);
  const setLogs = useOpsStore((state) => state.setLogs);
  const setCron = useOpsStore((state) => state.setCron);
  const setConfigSnapshot = useOpsStore((state) => state.setConfigSnapshot);
  const setConfigDraftText = useOpsStore((state) => state.setConfigDraftText);
  const setConfigDraftError = useOpsStore((state) => state.setConfigDraftError);
  const setConfigDraftApplied = useOpsStore((state) => state.setConfigDraftApplied);
  const upsertRoutingProfile = useOpsStore((state) => state.upsertRoutingProfile);
  const removeRoutingProfile = useOpsStore((state) => state.removeRoutingProfile);

  const instanceIds = Object.keys(instances);
  const currentInstanceId = deskFocus.instanceId ?? activeInstanceId ?? instanceIds[0] ?? null;
  const currentInstance = currentInstanceId ? instances[currentInstanceId] : undefined;
  const currentOps = currentInstanceId ? opsInstances[currentInstanceId] : undefined;
  const currentSection: DeskSection = deskFocus.section ?? "sessions";
  const defaultAgentId = currentInstance?.defaultAgentId ?? null;
  const currentAgents = currentInstanceId ? Object.values(agentsByInstance[currentInstanceId] ?? {}) : [];
  const currentChannels = currentInstanceId ? Object.values(channelsByInstance[currentInstanceId] ?? {}) : [];
  const currentMethods = currentOps?.capabilities.methods ?? [];
  const selectedSessionKey = deskFocus.sessionKey ?? currentOps?.selectedSessionKey ?? null;
  const selectedSession = currentOps?.sessions.find((session) => session.key === selectedSessionKey);
  const selectedDetail = selectedSessionKey ? currentOps?.sessionDetails[selectedSessionKey] : undefined;
  const selectedHistory = selectedSessionKey ? currentOps?.histories[selectedSessionKey] ?? [] : [];
  const selectedStream = selectedSessionKey ? currentOps?.sessionStreams[selectedSessionKey] : undefined;

  const [search, setSearch] = useState("");
  const [composer, setComposer] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createLabel, setCreateLabel] = useState("");
  const [createAgentId, setCreateAgentId] = useState("main");
  const [createModel, setCreateModel] = useState("");
  const [createChannelId, setCreateChannelId] = useState("");
  const [profileLabel, setProfileLabel] = useState("");
  const [workbenchNote, setWorkbenchNote] = useState("");
  const [handoffGatewayId, setHandoffGatewayId] = useState("");
  const [handoffAgentId, setHandoffAgentId] = useState("main");
  const [handoffNote, setHandoffNote] = useState("");
  const [agentProvisionDrafts, setAgentProvisionDrafts] = useState<Record<string, AgentProvisioningDraft>>({});
  const [customProvisionModelByInstance, setCustomProvisionModelByInstance] = useState<Record<string, boolean>>({});
  const [sessionDraft, setSessionDraft] = useState<SessionDraft>({
    label: "",
    model: "",
    thinkingLevel: "",
    verboseLevel: "",
    sendPolicy: "",
    groupActivation: "",
  });

  const provisionDraft = currentInstanceId
    ? (agentProvisionDrafts[currentInstanceId] ?? createProvisionDraft())
    : createProvisionDraft();
  let configRecord: Record<string, unknown> | null = null;
  try {
    configRecord = parseProvisioningBaseConfig({
      rawText: currentOps?.configDraft?.rawText,
      isDirty: currentOps?.configDraft?.dirty,
      fallbackConfig: asRecord(currentOps?.config?.config) ?? undefined,
    });
  } catch {
    configRecord = asRecord(currentOps?.config?.config);
  }
  const configuredAgents = extractConfiguredAgents(configRecord);
  const configuredBindings = extractRouteBindings(configRecord);
  const runtimeAgentIds = new Set(currentAgents.map((agent) => agent.agentId));

  function setProvisionDraft(patch: Partial<AgentProvisioningDraft>) {
    if (!currentInstanceId) return;
    setAgentProvisionDrafts((state) => ({
      ...state,
      [currentInstanceId]: {
        ...(state[currentInstanceId] ?? createProvisionDraft()),
        ...patch,
      },
    }));
  }

  function resetProvisionDraft(agentId = "") {
    if (!currentInstanceId) return;
    setAgentProvisionDrafts((state) => ({
      ...state,
      [currentInstanceId]: createProvisionDraft(agentId),
    }));
    setCustomProvisionModelByInstance((state) => ({
      ...state,
      [currentInstanceId]: false,
    }));
  }

  const filteredSessions = (currentOps?.sessions ?? []).filter((session) => {
    const agentId = sessionAgentId(session.key, defaultAgentId);
    const focusAgent = deskFocus.agentId;
    const focusChannel = deskFocus.channelId;
    const haystack = [sessionTitle(session), session.key, session.model, session.surface, session.room, session.space, session.subject]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (focusAgent && agentId !== focusAgent) return false;
    if (focusChannel && !haystack.includes(focusChannel.toLowerCase())) return false;
    return !search.trim() || haystack.includes(search.trim().toLowerCase());
  });

  useEffect(() => {
    if (!currentInstanceId) return;
    ensureInstance(currentInstanceId);
    if (activeInstanceId !== currentInstanceId) setActiveInstance(currentInstanceId);
  }, [activeInstanceId, currentInstanceId, ensureInstance, setActiveInstance]);

  useEffect(() => {
    const defaultTarget = defaultAgentId ?? "main";
    setCreateAgentId((value) => value || defaultTarget);
    setHandoffAgentId((value) => value || defaultTarget);
    setHandoffGatewayId((value) => value || currentInstanceId || "");
  }, [currentInstanceId, defaultAgentId]);

  useEffect(() => {
    setSessionDraft({
      label: selectedDetail?.label ?? selectedSession?.label ?? "",
      model: selectedDetail?.model ?? selectedSession?.model ?? "",
      thinkingLevel: selectedDetail?.thinkingLevel ?? selectedSession?.thinkingLevel ?? "",
      verboseLevel: selectedDetail?.verboseLevel ?? selectedSession?.verboseLevel ?? "",
      sendPolicy: selectedDetail?.sendPolicy ?? selectedSession?.sendPolicy ?? "",
      groupActivation: selectedDetail?.groupActivation ?? selectedSession?.groupActivation ?? "",
    });
  }, [selectedDetail, selectedSession]);

  async function refreshDesk(instanceId = currentInstanceId, includeLogs = false) {
    if (!instanceId) return;
    const client = getGatewayManager()?.getClient(instanceId);
    if (!client) return;
    const methods = opsInstances[instanceId]?.capabilities.methods ?? [];
    const jobs: Array<Promise<void>> = [];
    if (canUse(methods, "sessions.list")) jobs.push(client.fetchSessionsList({ includeLastMessage: true, includeDerivedTitles: true, limit: 100 }).then((result) => setSessions(instanceId, result)));
    if (canUse(methods, "status")) jobs.push(client.fetchStatus().then((result) => setStatus(instanceId, result)));
    if (canUse(methods, "health")) jobs.push(client.fetchHealth().then((result) => setHealth(instanceId, result)));
    if (canUse(methods, "models.list")) jobs.push(client.fetchModelsList().then((result) => setModels(instanceId, result)));
    if (canUse(methods, "node.list")) jobs.push(client.fetchNodes().then((result) => setNodes(instanceId, result)));
    if (canUse(methods, "node.pair.list")) jobs.push(client.fetchNodePairList().then((result) => setNodePairs(instanceId, result)));
    if (canUse(methods, "exec.approvals.get")) jobs.push(client.fetchExecApprovals().then((result) => setApprovals(instanceId, result)));
    if (canUse(methods, "cron.status")) jobs.push(client.fetchCronStatus().then((result) => setCron(instanceId, result)));
    if (canUse(methods, "system-presence")) jobs.push(client.fetchSystemPresence().then((result) => setPresence(instanceId, result.presence ?? [])));
    if (canUse(methods, "config.get")) jobs.push(client.fetchConfig().then((result) => setConfigSnapshot(instanceId, result)));
    if (includeLogs && canUse(methods, "logs.tail")) jobs.push(client.fetchLogs(undefined).then((result) => setLogs(instanceId, { ...result, reset: true })));
    await Promise.allSettled(jobs);
  }

  async function refreshSelectedSession(instanceId = currentInstanceId, sessionKey = selectedSessionKey) {
    if (!instanceId || !sessionKey) return;
    const client = getGatewayManager()?.getClient(instanceId);
    if (!client) return;
    const methods = opsInstances[instanceId]?.capabilities.methods ?? [];
    const jobs: Array<Promise<void>> = [];
    if (canUse(methods, "sessions.get")) jobs.push(client.fetchSessionDetail(sessionKey).then((result) => setSessionDetail(instanceId, result)));
    if (canUse(methods, "chat.history")) jobs.push(client.chatHistory(sessionKey, 80).then((result) => setHistory(instanceId, sessionKey, decodeHistoryPayload(result.messages))));
    await Promise.allSettled(jobs);
  }

  useEffect(() => {
    if (!currentInstanceId) return;
    void refreshDesk(currentInstanceId, currentSection === "logs");
    const timer = window.setInterval(() => void refreshDesk(currentInstanceId, false), 20_000);
    return () => window.clearInterval(timer);
  }, [currentInstanceId, currentSection]);

  useEffect(() => {
    if (!currentInstanceId || !selectedSessionKey) return;
    selectSession(currentInstanceId, selectedSessionKey);
    void refreshSelectedSession(currentInstanceId, selectedSessionKey);
  }, [currentInstanceId, selectSession, selectedSessionKey]);

  useEffect(() => {
    if (!currentInstanceId || !selectedSessionKey || !currentOps?.historyNeedsRefresh[selectedSessionKey]) return;
    void refreshSelectedSession(currentInstanceId, selectedSessionKey);
  }, [currentInstanceId, currentOps?.historyNeedsRefresh, selectedSessionKey]);

  async function runAction(label: string, fn: () => Promise<void>) {
    setBusyAction(label);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await fn();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function createSession() {
    if (!currentInstanceId) return;
    const client = getGatewayManager()?.getClient(currentInstanceId);
    if (!client) return setErrorMessage("Connect a gateway before opening a new case file.");
    const agentId = createAgentId === "main" ? undefined : createAgentId;
    const label = createLabel.trim() || "New Case File";
    const sessionKey = buildSessionKey(agentId, label);
    await runAction("create-session", async () => {
      if (canUse(currentMethods, "sessions.patch")) {
        await client.patchSession({ key: sessionKey, label, model: createModel || null });
      }
      await refreshDesk(currentInstanceId);
      selectSession(currentInstanceId, sessionKey);
      setDeskFocus({ instanceId: currentInstanceId, sessionKey, section: "sessions", agentId: agentId ?? undefined, channelId: createChannelId || undefined });
      setCreateLabel("");
      setStatusMessage(`Opened ${label} on ${currentInstance?.label ?? currentInstanceId}.`);
    });
  }

  async function saveSession() {
    if (!currentInstanceId || !selectedSessionKey) return;
    const client = getGatewayManager()?.getClient(currentInstanceId);
    if (!client) return;
    await runAction("save-session", async () => {
      await client.patchSession({
        key: selectedSessionKey,
        label: sessionDraft.label || null,
        model: sessionDraft.model || null,
        thinkingLevel: sessionDraft.thinkingLevel || null,
        verboseLevel: sessionDraft.verboseLevel || null,
        sendPolicy: sessionDraft.sendPolicy || null,
        groupActivation: sessionDraft.groupActivation || null,
      });
      await refreshDesk(currentInstanceId);
      await refreshSelectedSession(currentInstanceId, selectedSessionKey);
      setStatusMessage("Session controls updated.");
    });
  }

  async function sendMessage() {
    if (!currentInstanceId || !selectedSessionKey || !composer.trim()) return;
    const client = getGatewayManager()?.getClient(currentInstanceId);
    if (!client) return;
    const message = composer.trim();
    setComposer("");
    await runAction("send-message", async () => {
      setHistory(currentInstanceId, selectedSessionKey, [...selectedHistory, { role: "user", content: message, ts: Date.now() }]);
      await client.chatSend({ sessionKey: selectedSessionKey, message, thinking: sessionDraft.thinkingLevel || undefined });
      setStatusMessage("Message dispatched to gateway.");
    });
  }

  async function handoffSession() {
    if (!currentInstanceId || !selectedSessionKey || !selectedSession) return;
    const targetInstanceId = handoffGatewayId || currentInstanceId;
    const targetClient = getGatewayManager()?.getClient(targetInstanceId);
    if (!targetClient) return setErrorMessage("Target gateway is not connected.");
    const agentId = handoffAgentId === "main" ? undefined : handoffAgentId;
    const targetKey = buildSessionKey(agentId, sessionTitle(selectedSession));
    const transcript = selectedHistory.slice(-8).map((message) => `${message.role.toUpperCase()}: ${textOf(message.content)}`).join("\n").slice(0, 1800);
    await runAction("handoff-session", async () => {
      if (canUse(opsInstances[targetInstanceId]?.capabilities.methods, "sessions.patch")) {
        await targetClient.patchSession({ key: targetKey, label: `${sessionTitle(selectedSession)} (handoff)`, model: sessionDraft.model || null });
      }
      if (canUse(opsInstances[targetInstanceId]?.capabilities.methods, "chat.send")) {
        await targetClient.chatSend({
          sessionKey: targetKey,
          message: [`[Mission Control Handoff from ${currentInstance?.label ?? currentInstanceId}]`, handoffNote.trim() || `Continue "${sessionTitle(selectedSession)}" with context preserved.`, transcript ? `Recent transcript:\n${transcript}` : ""].filter(Boolean).join("\n\n"),
        });
      }
      await refreshDesk(targetInstanceId);
      setDeskFocus({ instanceId: targetInstanceId, sessionKey: targetKey, section: "sessions", agentId: agentId ?? undefined });
      setHandoffNote("");
      setStatusMessage(`Handoff opened on ${instances[targetInstanceId]?.label ?? targetInstanceId}.`);
    });
  }

  async function saveRoutingProfile() {
    if (!currentInstanceId) return;
    upsertRoutingProfile({
      id: crypto.randomUUID(),
      label: profileLabel.trim() || `Desk routing ${routingProfiles.length + 1}`,
      instanceId: currentInstanceId,
      agentId: createAgentId === "main" ? defaultAgentId ?? undefined : createAgentId,
      channelId: createChannelId || undefined,
      preferredModel: createModel || sessionDraft.model || currentOps?.sessionDefaults?.model,
      preferredThinkingLevel: sessionDraft.thinkingLevel || undefined,
      preferredVerboseLevel: sessionDraft.verboseLevel || undefined,
      preferredSendPolicy: sessionDraft.sendPolicy || undefined,
      notes: "Saved from Session Desk.",
    });
    setProfileLabel("");
    setStatusMessage("Routing profile saved locally.");
  }

  function buildProvisioningTarget(): {
    agentId: string;
    nextConfig: Record<string, unknown>;
    patch: Record<string, unknown>;
    warnings: string[];
  } {
    if (!currentInstanceId || !currentOps?.configDraft) {
      throw new Error("Load a gateway config before provisioning an agent.");
    }

    const agentId = slugAgentId(provisionDraft.agentId);
    if (!agentId) {
      throw new Error("Agent Id is required.");
    }

    const baseConfig = parseProvisioningBaseConfig({
      rawText: currentOps.configDraft.rawText,
      isDirty: currentOps.configDraft.dirty,
      fallbackConfig: asRecord(currentOps.config?.config) ?? undefined,
    });
    const result = buildProvisionedConfig(baseConfig, {
      ...provisionDraft,
      agentId,
      workspace: provisionDraft.workspace.trim() || defaultWorkspace(agentId),
      agentDir: provisionDraft.agentDir.trim() || defaultAgentDir(agentId),
      setAsDefault:
        provisionDraft.setAsDefault ||
        extractConfiguredAgents(baseConfig).length === 0,
    });

    const nextConfig = result.config;
    const patch: Record<string, unknown> = {
      agents: asRecord(nextConfig.agents) ?? {},
    };
    if (provisionDraft.bindingChannel.trim()) {
      patch.bindings = Array.isArray(nextConfig.bindings) ? nextConfig.bindings : [];
    }

    return {
      agentId,
      nextConfig,
      patch,
      warnings: result.warnings,
    };
  }

  async function stageProvisioningDraft() {
    if (!currentInstanceId) return;
    try {
      const { agentId, nextConfig, warnings } = buildProvisioningTarget();
      setConfigDraftError(currentInstanceId, null);
      setConfigDraftText(currentInstanceId, JSON.stringify(nextConfig, null, 2));
      setStatusMessage(
        warnings.length > 0
          ? `Staged agent ${agentId} in the config draft. ${warnings.join(" ")}`
          : `Staged agent ${agentId} in the config draft.`,
      );
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to stage the provisioning draft.");
    }
  }

  function handleProvisionIdChange(value: string) {
    const normalized = slugAgentId(value);
    const nextPatch: Partial<AgentProvisioningDraft> = { agentId: normalized };
    if (!provisionDraft.workspace || provisionDraft.workspace === defaultWorkspace(provisionDraft.agentId || "draft")) {
      nextPatch.workspace = normalized ? defaultWorkspace(normalized) : "";
    }
    if (!provisionDraft.agentDir || provisionDraft.agentDir === defaultAgentDir(provisionDraft.agentId || "draft")) {
      nextPatch.agentDir = normalized ? defaultAgentDir(normalized) : "";
    }
    setProvisionDraft(nextPatch);
  }

  async function provisionAgent() {
    if (!currentInstanceId || !currentOps?.configDraft) return;
    const client = getGatewayManager()?.getClient(currentInstanceId);
    if (!client) return;

    let agentId = "";
    let nextConfig: Record<string, unknown> = {};
    let patch: Record<string, unknown> = {};
    let warnings: string[] = [];
    try {
      ({ agentId, nextConfig, patch, warnings } = buildProvisioningTarget());
    } catch (error) {
      return setErrorMessage(
        error instanceof Error ? error.message : "Failed to build the provisioning draft.",
      );
    }

    await runAction("provision-agent", async () => {
      setConfigDraftError(currentInstanceId, null);
      const note = workbenchNote.trim() || `Provision agent ${agentId}`;
      const nextRawText = JSON.stringify(nextConfig, null, 2);
      setConfigDraftText(currentInstanceId, nextRawText);

      if (canUse(currentMethods, "config.patch")) {
        await client.patchConfig({
          raw: JSON.stringify(patch, null, 2),
          baseHash: currentOps.configDraft?.baseHash,
          note,
        });
      } else if (canUse(currentMethods, "config.apply")) {
        await client.applyConfig({
          raw: nextRawText,
          baseHash: currentOps.configDraft?.baseHash,
          note,
        });
      } else {
        throw new Error("This gateway does not expose config.patch or config.apply.");
      }

      const snapshot = await client.fetchConfig();
      setConfigDraftApplied(currentInstanceId, snapshot);

      if (provisionDraft.characterId) {
        useCharacterStore.getState().setOverride(currentInstanceId, agentId, provisionDraft.characterId);
      }
      if (canUse(currentMethods, "agents.list")) {
        const result = await client.fetchAgentsList();
        useGatewayStore.getState().setDefaultAgentId(currentInstanceId, result.defaultId ?? null);
        useAgentStore.getState().setAgents(currentInstanceId, result.agents, result.defaultId);
        applyCharacterAssignments(currentInstanceId, result.agents, result.defaultId);
      }
      if (provisionDraft.bindingChannel.trim() && canUse(currentMethods, "channels.status")) {
        const channels = await client.fetchChannelsStatus();
        useChannelStore.getState().setChannels(currentInstanceId, channels);
      }
      await refreshDesk(currentInstanceId);

      resetProvisionDraft();
      setStatusMessage(
        warnings.length > 0
          ? `Provisioned agent ${agentId}. ${warnings.join(" ")}`
          : `Provisioned agent ${agentId}.`,
      );
    });
  }

  async function resolveApproval(approvalId: string, decision: "allow-once" | "deny") {
    if (!currentInstanceId) return;
    const client = getGatewayManager()?.getClient(currentInstanceId);
    if (!client) return;
    await runAction(`approval-${decision}`, async () => {
      await client.resolveExecApproval({ approvalId, decision });
      resolveApprovalRequest(currentInstanceId, approvalId);
      if (canUse(currentMethods, "exec.approvals.get")) {
        const snapshot = await client.fetchExecApprovals();
        setApprovals(currentInstanceId, snapshot);
      }
      setStatusMessage(decision === "deny" ? "Approval denied." : "Approval allowed once.");
    });
  }

  async function resolveNodePair(requestId: string, decision: "approve" | "reject") {
    if (!currentInstanceId) return;
    const client = getGatewayManager()?.getClient(currentInstanceId);
    if (!client) return;
    await runAction(`node-pair-${decision}`, async () => {
      if (decision === "approve") await client.approveNodePair(requestId);
      else await client.rejectNodePair(requestId);
      if (canUse(currentMethods, "node.pair.list")) {
        const result = await client.fetchNodePairList();
        setNodePairs(currentInstanceId, result);
      }
      setStatusMessage(`Node pairing ${decision}d.`);
    });
  }

  async function updateConfig(mode: "patch" | "apply") {
    if (!currentInstanceId || !currentOps?.configDraft) return;
    const client = getGatewayManager()?.getClient(currentInstanceId);
    if (!client) return;
    await runAction(`config-${mode}`, async () => {
      setConfigDraftError(currentInstanceId, null);
      const params = {
        raw: currentOps.configDraft?.rawText ?? "",
        baseHash: currentOps.configDraft?.baseHash,
        note: workbenchNote.trim() || undefined,
      };
      if (mode === "patch") await client.patchConfig(params);
      else await client.applyConfig(params);
      const snapshot = await client.fetchConfig();
      setConfigDraftApplied(currentInstanceId, snapshot);
      setStatusMessage(`Gateway config ${mode} succeeded.`);
    });
  }

  async function refreshLogs(reset = false) {
    if (!currentInstanceId) return;
    const client = getGatewayManager()?.getClient(currentInstanceId);
    if (!client) return;
    await runAction(reset ? "logs-reset" : "logs-tail", async () => {
      const result = await client.fetchLogs(reset ? undefined : currentOps?.logs.cursor);
      setLogs(currentInstanceId, { ...result, reset });
      setStatusMessage(reset ? "Log tail reloaded." : "Loaded more log lines.");
    });
  }

  async function runCron(jobId: string) {
    if (!currentInstanceId) return;
    const client = getGatewayManager()?.getClient(currentInstanceId);
    if (!client) return;
    await runAction("cron-run", async () => {
      await client.cronRun(jobId);
      const cron = await client.fetchCronStatus();
      setCron(currentInstanceId, cron);
      setStatusMessage("Cron job triggered.");
    });
  }

  const models = currentOps?.models?.models ?? [];
  const modelRefs = currentOps?.models?.refs ?? [];
  const knownProvisionModels = Array.from(
    new Map(
      [
        ...models.map((model) => [model.ref, model] as const),
        ...modelRefs.map((ref) => [ref, { ref }] as const),
      ],
    ).values(),
  );
  const knownProvisionModelRefs = new Set(knownProvisionModels.map((model) => model.ref));
  const usesUnknownProvisionModel =
    provisionDraft.modelPrimary.trim().length > 0 &&
    !knownProvisionModelRefs.has(provisionDraft.modelPrimary.trim());
  const customProvisionModelOpen = currentInstanceId
    ? (customProvisionModelByInstance[currentInstanceId] ?? false) || usesUnknownProvisionModel
    : usesUnknownProvisionModel;
  const configDiff = diffPreview(currentOps?.config?.raw ?? JSON.stringify(currentOps?.config?.config ?? {}, null, 2), currentOps?.configDraft?.rawText ?? "");
  const noGatewaysView = (
    <div className="office-carpet flex h-full items-center justify-center p-6">
      <div className="max-w-xl rounded-2xl border border-dunder-carpet/30 bg-dunder-blue/90 p-8 text-center shadow-2xl">
        <div className="text-[11px] uppercase tracking-[0.35em] text-dunder-carpet">Session Desk</div>
        <h1 className="mt-3 font-dunder text-3xl font-bold text-dunder-paper">No gateways on the board</h1>
        <p className="mt-3 font-dunder text-sm text-dunder-wall">
          Connect a gateway to route real OpenClaw sessions, approvals, node events, and config changes from Mission Control.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={toggleAddInstance} className={buttonClasses("primary")}>Connect Gateway</button>
          <button type="button" onClick={loadDemoData} className={buttonClasses()}>Open Demo Desk</button>
        </div>
      </div>
    </div>
  );
  const sidebar = (
    <div className="space-y-4">
      {deskPanel(
        "Gateway Rail",
        "Connections",
        <div className="space-y-2 px-4 py-4">
          {instanceIds.map((instanceId) => {
            const instance = instances[instanceId];
            if (!instance) return null;
            const active = instanceId === currentInstanceId;
            return (
              <button key={instanceId} type="button" onClick={() => { setDeskFocus({ instanceId, section: currentSection }); setActiveInstance(instanceId); }} className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${active ? "border-dunder-wall bg-dunder-paper/10" : "border-dunder-carpet/20 bg-dunder-paper/5 hover:bg-dunder-paper/10"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-dunder text-sm text-dunder-paper">{instance.label}</span>
                  {statusChip(instance.status, instance.status === "connected" ? "good" : instance.status === "connecting" ? "warn" : instance.status === "error" ? "bad" : "neutral")}
                </div>
                <div className="mt-1 text-xs text-dunder-wall">{instance.url}</div>
              </button>
            );
          })}
          <button type="button" onClick={toggleAddInstance} className={`w-full ${buttonClasses()}`}>Add Gateway</button>
        </div>,
      )}
      {deskPanel(
        "Desk Sections",
        "Views",
        <div className="grid gap-2 px-4 py-4">
          {(["sessions", "workbench", "approvals", "nodes", "logs", "cron"] as DeskSection[]).map((section) => (
            <button key={section} type="button" onClick={() => setDeskFocus({ section })} className={`${currentSection === section ? buttonClasses("primary") : buttonClasses()}`}>
              {section}
            </button>
          ))}
        </div>,
      )}
      {deskPanel(
        "Open Case File",
        "Create",
        <div className="space-y-3 px-4 py-4">
          <div className="rounded-lg border border-dunder-carpet/20 bg-dunder-paper/5 px-3 py-3 text-sm leading-6 text-dunder-wall">
            Creating a case file opens a session. It does not create a new agent. Pick which existing gateway agent should run the work, then choose a model override only if you need one.
          </div>
          {field("Label", <input value={createLabel} onChange={(event) => setCreateLabel(event.target.value)} placeholder="Regional inventory follow-up" className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
          {field("Assigned Agent", <select value={createAgentId} onChange={(event) => setCreateAgentId(event.target.value)} className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall"><option value="main">Gateway Default Agent</option>{currentAgents.map((agent) => <option key={agent.agentId} value={agent.agentId}>{agent.name}</option>)}</select>)}
          {field("Model", <select value={createModel} onChange={(event) => setCreateModel(event.target.value)} className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall"><option value="">Use gateway/session default model</option>{models.map((model) => <option key={model.ref} value={model.ref}>{model.label ?? model.alias ?? model.ref}</option>)}</select>)}
          {field("Pinned Channel", <select value={createChannelId} onChange={(event) => setCreateChannelId(event.target.value)} className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall"><option value="">No channel pin</option>{currentChannels.map((channel) => <option key={channel.channelId} value={channel.channelId}>{channel.label}</option>)}</select>)}
          <button type="button" onClick={() => void createSession()} disabled={busyAction === "create-session"} className={`w-full ${buttonClasses("primary")}`}>{busyAction === "create-session" ? "Opening..." : "Create Session"}</button>
        </div>,
      )}
      {deskPanel(
        "Routing Profiles",
        "Saved",
        <div className="space-y-3 px-4 py-4">
          {field("Label", <input value={profileLabel} onChange={(event) => setProfileLabel(event.target.value)} placeholder="Pam social escalations" className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
          <button type="button" onClick={() => void saveRoutingProfile()} className={`w-full ${buttonClasses()}`}>Save Current Routing</button>
          <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
            {routingProfiles.filter((profile) => !currentInstanceId || !profile.instanceId || profile.instanceId === currentInstanceId).map((profile) => (
              <div key={profile.id} className="rounded-lg border border-dunder-carpet/20 bg-dunder-paper/5 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-dunder text-sm text-dunder-paper">{profile.label}</div>
                  <button type="button" onClick={() => removeRoutingProfile(profile.id)} className="font-mono text-[10px] uppercase tracking-[0.18em] text-red-200">Del</button>
                </div>
                <div className="mt-1 text-xs text-dunder-wall">{profile.agentId ?? "default agent"} · {profile.channelId ?? "all channels"}</div>
              </div>
            ))}
          </div>
        </div>,
      )}
    </div>
  );
  const ledger = deskPanel(
    currentInstance?.label ?? "Gateway",
    "Session Ledger",
    <div className="space-y-3 px-4 py-4">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, key, model, room" className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall" />
      {(deskFocus.agentId || deskFocus.channelId) && (
        <div className="flex flex-wrap gap-2">
          {deskFocus.agentId ? <button type="button" onClick={() => setDeskFocus({ agentId: undefined })}>{statusChip(`agent ${deskFocus.agentId}`, "live")}</button> : null}
          {deskFocus.channelId ? <button type="button" onClick={() => setDeskFocus({ channelId: undefined })}>{statusChip(`channel ${deskFocus.channelId}`, "warn")}</button> : null}
        </div>
      )}
      <div className="space-y-2">
        {filteredSessions.map((session) => (
          <button key={session.key} type="button" onClick={() => { selectSession(currentInstanceId ?? "", session.key); setDeskFocus({ sessionKey: session.key, section: "sessions" }); }} className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${session.key === selectedSessionKey ? "border-dunder-wall bg-dunder-paper/10" : "border-dunder-carpet/20 bg-dunder-paper/5 hover:bg-dunder-paper/10"}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-dunder text-sm font-bold text-dunder-paper">{sessionTitle(session)}</div>
                <div className="mt-1 text-xs text-dunder-wall">{session.key}</div>
              </div>
              {statusChip(session.model ?? "inherit", "neutral")}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-dunder-carpet">
              <span>{sessionAgentId(session.key, defaultAgentId) ?? "default agent"}</span>
              <span>{session.surface ?? session.room ?? session.kind ?? "desk"}</span>
              <span>{formatRelativeTime(session.updatedAt)}</span>
            </div>
          </button>
        ))}
        {filteredSessions.length === 0 ? <div className="rounded-lg border border-dashed border-dunder-carpet/20 px-3 py-4 text-sm text-dunder-wall">No sessions match the current desk filter.</div> : null}
      </div>
    </div>,
    <button type="button" onClick={() => void refreshDesk(currentInstanceId)} className={buttonClasses()}>Refresh</button>,
  );
  const sessionsView = deskPanel(
    sessionTitle(selectedDetail ?? selectedSession),
    "Active Case File",
    selectedSessionKey ? (
      <div className="space-y-4 px-4 py-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {field("Label", <input value={sessionDraft.label} onChange={(event) => setSessionDraft((current) => ({ ...current, label: event.target.value }))} className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
          {field("Model", <select value={sessionDraft.model} onChange={(event) => setSessionDraft((current) => ({ ...current, model: event.target.value }))} className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall"><option value="">Routing precedence</option>{models.map((model) => <option key={model.ref} value={model.ref}>{model.label ?? model.alias ?? model.ref}</option>)}</select>)}
          {field("Thinking", <select value={sessionDraft.thinkingLevel} onChange={(event) => setSessionDraft((current) => ({ ...current, thinkingLevel: event.target.value }))} className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall">{THINKING_LEVELS.map((option) => <option key={option || "inherit"} value={option}>{option || "inherit"}</option>)}</select>)}
          {field("Verbosity", <select value={sessionDraft.verboseLevel} onChange={(event) => setSessionDraft((current) => ({ ...current, verboseLevel: event.target.value }))} className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall">{VERBOSE_LEVELS.map((option) => <option key={option || "inherit"} value={option}>{option || "inherit"}</option>)}</select>)}
          {field("Send Policy", <select value={sessionDraft.sendPolicy} onChange={(event) => setSessionDraft((current) => ({ ...current, sendPolicy: event.target.value }))} className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall">{SEND_POLICIES.map((option) => <option key={option || "inherit"} value={option}>{option || "inherit"}</option>)}</select>)}
          {field("Group Activation", <select value={sessionDraft.groupActivation} onChange={(event) => setSessionDraft((current) => ({ ...current, groupActivation: event.target.value }))} className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall">{GROUP_POLICIES.map((option) => <option key={option || "inherit"} value={option}>{option || "inherit"}</option>)}</select>)}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void saveSession()} className={buttonClasses("primary")}>Save Controls</button>
          <button type="button" onClick={() => void refreshSelectedSession()} className={buttonClasses()}>Refresh History</button>
          {selectedStream?.runId ? <button type="button" onClick={() => { const client = getGatewayManager()?.getClient(currentInstanceId ?? ""); if (client && selectedSessionKey) void runAction("abort-run", async () => { await client.chatAbort(selectedSessionKey, selectedStream.runId); setStatusMessage("Run aborted."); }); }} className={buttonClasses("danger")}>Abort Run</button> : null}
        </div>
        <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-lg border border-dunder-carpet/20 bg-dunder-paper/5 p-4">
          {selectedHistory.map((message, index) => <div key={`${message.id ?? index}-${message.ts ?? index}`} className={`rounded-xl border px-3 py-3 ${message.role === "user" ? "ml-auto max-w-[88%] border-blue-500/30 bg-blue-950/40 text-blue-50" : message.role === "system" ? "border-amber-400/30 bg-amber-950/20 text-amber-100" : "mr-auto max-w-[88%] border-dunder-carpet/20 bg-dunder-blue/70 text-dunder-paper"}`}><div className="mb-1 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em]"><span>{message.role}</span><span className="font-mono text-dunder-carpet">{formatRelativeTime(message.ts ?? message.timestamp)}</span></div><div className="whitespace-pre-wrap text-sm leading-6">{textOf(message.content)}</div></div>)}
          {selectedStream ? <div className="mr-auto max-w-[88%] rounded-xl border border-green-500/30 bg-green-950/20 px-3 py-3 text-green-50"><div className="mb-1 text-[10px] uppercase tracking-[0.2em]">{selectedStream.state}</div><div className="whitespace-pre-wrap text-sm leading-6">{selectedStream.text || "Streaming response..."}</div></div> : null}
          {selectedHistory.length === 0 && !selectedStream ? <div className="rounded-lg border border-dashed border-dunder-carpet/20 px-3 py-4 text-sm text-dunder-wall">No transcript loaded yet.</div> : null}
        </div>
        <div className="space-y-3 rounded-lg border border-dunder-carpet/20 bg-dunder-paper/5 p-4">
          <textarea value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="Send through chat.send on the selected session..." className="min-h-28 w-full rounded-md border border-dunder-carpet/25 bg-dunder-blue/70 px-3 py-3 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-dunder-wall">Routed model: {sessionDraft.model || currentOps?.sessionDefaults?.model || currentOps?.models?.defaults?.model || "gateway default"}</div>
            <button type="button" onClick={() => void sendMessage()} disabled={!composer.trim() || busyAction === "send-message"} className={buttonClasses("primary")}>{busyAction === "send-message" ? "Dispatching..." : "Send Message"}</button>
          </div>
        </div>
      </div>
    ) : (
      <div className="px-4 py-8 text-center text-sm text-dunder-wall">The desk is live. Pick a session to drive a model, review history, or hand it to another gateway.</div>
    ),
    <div className="flex flex-wrap gap-2">{currentOps?.health?.ok ? statusChip("healthy", "good") : statusChip("awaiting health", "warn")}{statusChip(`${currentOps?.presence.length ?? 0} presence`, "live")}</div>,
  );
  const workbenchView = deskPanel(
    "Gateway Workbench",
    "Config Draft",
    <div className="space-y-3 px-4 py-4">
      {field("Workbench Note", <input value={workbenchNote} onChange={(event) => setWorkbenchNote(event.target.value)} placeholder="Document why this change exists." className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-3 rounded-lg border border-dunder-carpet/20 bg-dunder-paper/5 p-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-dunder-carpet">
              Agent Provisioning
            </div>
            <h3 className="mt-2 font-dunder text-lg font-bold text-dunder-paper">
              Create a real OpenClaw agent
            </h3>
            <p className="mt-2 text-sm leading-6 text-dunder-wall">
              This writes a new entry into <span className="font-mono text-xs">agents.list</span> and,
              if you provide a channel, a route binding into <span className="font-mono text-xs">bindings</span>.
              The gateway hot-applies agent and binding changes when supported.
            </p>
          </div>
          <div className="rounded-lg border border-dunder-carpet/20 bg-dunder-blue/40 px-3 py-3 text-sm leading-6 text-dunder-wall">
            Create the real OpenClaw agent here, then use Character Mapping only if you want to cast it as Dwight, Pam, or someone else in Mission Control. If the raw draft below contains custom JSON5 edits, this form can only proceed once that draft is back to strict JSON or reverted.
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {field("Agent Id", <input value={provisionDraft.agentId} onChange={(event) => handleProvisionIdChange(event.target.value)} placeholder="workspace-home" className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-mono text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
            {field("Display Name", <input value={provisionDraft.name} onChange={(event) => setProvisionDraft({ name: event.target.value })} placeholder="Workspace Home" className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
            {field("Workspace", <input value={provisionDraft.workspace} onChange={(event) => setProvisionDraft({ workspace: event.target.value })} placeholder="~/.openclaw/workspace-workspace-home" className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-mono text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
            {field("Agent Dir", <input value={provisionDraft.agentDir} onChange={(event) => setProvisionDraft({ agentDir: event.target.value })} placeholder="~/.openclaw/agents/workspace-home/agent" className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-mono text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
            {field(
              "Primary Model",
              knownProvisionModels.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={customProvisionModelOpen ? CUSTOM_MODEL_VALUE : provisionDraft.modelPrimary}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === CUSTOM_MODEL_VALUE) {
                        if (currentInstanceId) {
                          setCustomProvisionModelByInstance((state) => ({
                            ...state,
                            [currentInstanceId]: true,
                          }));
                        }
                        return;
                      }
                      if (currentInstanceId) {
                        setCustomProvisionModelByInstance((state) => ({
                          ...state,
                          [currentInstanceId]: false,
                        }));
                      }
                      setProvisionDraft({ modelPrimary: value });
                    }}
                    className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall"
                  >
                    <option value="">Gateway default model</option>
                    {knownProvisionModels.map((model) => (
                      <option key={model.ref} value={model.ref}>
                        {modelOptionLabel(model)}
                      </option>
                    ))}
                    <option value={CUSTOM_MODEL_VALUE}>Custom model ref...</option>
                  </select>
                  {!customProvisionModelOpen ? (
                    <div className="text-[11px] text-dunder-wall">
                      Gateway catalog loaded from <span className="font-mono text-xs">models.list</span>.
                    </div>
                  ) : null}
                  {customProvisionModelOpen ? (
                    <input
                      value={provisionDraft.modelPrimary}
                      onChange={(event) => setProvisionDraft({ modelPrimary: event.target.value })}
                      placeholder="custom/provider-model"
                      className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-blue/40 px-3 py-2 font-mono text-sm text-dunder-paper outline-none focus:border-dunder-wall"
                    />
                  ) : null}
                </div>
              ) : (
                <input
                  value={provisionDraft.modelPrimary}
                  onChange={(event) => setProvisionDraft({ modelPrimary: event.target.value })}
                  placeholder="openai/gpt-5"
                  className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-mono text-sm text-dunder-paper outline-none focus:border-dunder-wall"
                />
              ),
            )}
            {field("Fallback Models", <input value={provisionDraft.modelFallbacks} onChange={(event) => setProvisionDraft({ modelFallbacks: event.target.value })} placeholder="anthropic/claude-sonnet-4, openai/gpt-4.1" className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-mono text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {field("Identity Name", <input value={provisionDraft.identityName} onChange={(event) => setProvisionDraft({ identityName: event.target.value })} placeholder="Workspace Home" className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
            {field("Identity Theme", <input value={provisionDraft.identityTheme} onChange={(event) => setProvisionDraft({ identityTheme: event.target.value })} placeholder="dunder" className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
            {field("Identity Emoji", <input value={provisionDraft.identityEmoji} onChange={(event) => setProvisionDraft({ identityEmoji: event.target.value })} placeholder="🏢" className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
            {field("Avatar", <input value={provisionDraft.identityAvatar} onChange={(event) => setProvisionDraft({ identityAvatar: event.target.value })} placeholder="https://..." className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-mono text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
          </div>
          {field("Mention Patterns", <input value={provisionDraft.mentionPatterns} onChange={(event) => setProvisionDraft({ mentionPatterns: event.target.value })} placeholder="@workspace, workspace home" className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
          <div className="grid gap-3 md:grid-cols-3">
            {field("Sandbox Mode", <select value={provisionDraft.sandboxMode} onChange={(event) => setProvisionDraft({ sandboxMode: event.target.value })} className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall"><option value="">Gateway default</option><option value="danger-full-access">danger-full-access</option><option value="workspace-write">workspace-write</option><option value="read-only">read-only</option></select>)}
            {field("Sandbox Scope", <select value={provisionDraft.sandboxScope} onChange={(event) => setProvisionDraft({ sandboxScope: event.target.value })} className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall"><option value="">Gateway default</option><option value="agent">agent</option><option value="session">session</option></select>)}
            {field("Workspace Access", <select value={provisionDraft.workspaceAccess} onChange={(event) => setProvisionDraft({ workspaceAccess: event.target.value })} className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall"><option value="">Gateway default</option><option value="read-write">read-write</option><option value="read-only">read-only</option><option value="none">none</option></select>)}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {field("Tool Profile", <input value={provisionDraft.toolProfile} onChange={(event) => setProvisionDraft({ toolProfile: event.target.value })} placeholder="coding" className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
            {field("Allow Tools", <input value={provisionDraft.toolAllow} onChange={(event) => setProvisionDraft({ toolAllow: event.target.value })} placeholder="shell, search, fetch" className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-mono text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
            {field("Deny Tools", <input value={provisionDraft.toolDeny} onChange={(event) => setProvisionDraft({ toolDeny: event.target.value })} placeholder="browser" className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-mono text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {field("Office Character", <select value={provisionDraft.characterId} onChange={(event) => setProvisionDraft({ characterId: event.target.value })} className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall"><option value="">No Mission Control override</option>{THE_OFFICE_CHARACTERS.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select>)}
            <label className="flex items-center gap-3 rounded-lg border border-dunder-carpet/20 bg-dunder-blue/40 px-3 py-3">
              <input type="checkbox" checked={provisionDraft.setAsDefault} onChange={(event) => setProvisionDraft({ setAsDefault: event.target.checked })} className="h-4 w-4 rounded border border-dunder-carpet/30 bg-dunder-paper/10 accent-dunder-screen-on" />
              <span className="text-sm text-dunder-paper">Make this the default agent on the gateway</span>
            </label>
          </div>
          <div className="rounded-lg border border-dunder-carpet/20 bg-dunder-blue/40 p-3">
            <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-dunder-carpet">
              Optional Binding
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {field("Channel", <input value={provisionDraft.bindingChannel} onChange={(event) => setProvisionDraft({ bindingChannel: event.target.value })} placeholder={currentChannels[0]?.channelId ?? "whatsapp"} className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-mono text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
              {field("Account Id", <input value={provisionDraft.bindingAccountId} onChange={(event) => setProvisionDraft({ bindingAccountId: event.target.value })} placeholder="default" className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-mono text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
              {field("Peer Kind", <select value={provisionDraft.bindingPeerKind} onChange={(event) => setProvisionDraft({ bindingPeerKind: event.target.value })} className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall"><option value="">Any peer</option><option value="direct">direct</option><option value="group">group</option><option value="channel">channel</option></select>)}
              {field("Peer Id", <input value={provisionDraft.bindingPeerId} onChange={(event) => setProvisionDraft({ bindingPeerId: event.target.value })} placeholder="120363..." className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-mono text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
              {field("Guild Id", <input value={provisionDraft.bindingGuildId} onChange={(event) => setProvisionDraft({ bindingGuildId: event.target.value })} placeholder="discord guild" className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-mono text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
              {field("Team Id", <input value={provisionDraft.bindingTeamId} onChange={(event) => setProvisionDraft({ bindingTeamId: event.target.value })} placeholder="slack team" className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-mono text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
            </div>
            {field("Binding Roles", <input value={provisionDraft.bindingRoles} onChange={(event) => setProvisionDraft({ bindingRoles: event.target.value })} placeholder="ops, incident-response" className="mt-3 w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-mono text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
          </div>
          {field("Advanced Overrides (JSON)", <textarea value={provisionDraft.extraJson} onChange={(event) => setProvisionDraft({ extraJson: event.target.value })} placeholder={'{\n  "subagents": { "allowAgents": ["reviewer"] }\n}'} className="min-h-28 w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-3 font-mono text-xs text-dunder-paper outline-none focus:border-dunder-wall" />)}
          <div className="text-xs text-dunder-wall">
            Advanced overrides are merged last. Use them for config fields not covered by the simple form.
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void stageProvisioningDraft()} disabled={!currentOps?.configDraft || busyAction === "provision-agent"} className={buttonClasses()}>
              Stage In Draft
            </button>
            <button type="button" onClick={() => void provisionAgent()} disabled={!currentOps?.configDraft || busyAction === "provision-agent"} className={buttonClasses("primary")}>
              {busyAction === "provision-agent" ? "Provisioning..." : "Provision Agent"}
            </button>
            <button type="button" onClick={() => resetProvisionDraft()} className={buttonClasses()}>
              Reset Draft
            </button>
          </div>
        </div>
        <div className="space-y-3 rounded-lg border border-dunder-carpet/20 bg-dunder-paper/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-dunder-carpet">
                Configured Agents
              </div>
              <h3 className="mt-2 font-dunder text-lg font-bold text-dunder-paper">
                Gateway roster from config
              </h3>
            </div>
            {statusChip(`${configuredAgents.length} configured`, "neutral")}
          </div>
          <div className="space-y-3">
            {configuredAgents.map((agent) => (
              <div key={agent.id} className="rounded-lg border border-dunder-carpet/20 bg-dunder-blue/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-dunder text-lg font-bold text-dunder-paper">
                      {agent.identityName ?? agent.name ?? agent.id}
                    </div>
                    <div className="mt-1 font-mono text-xs text-dunder-carpet">
                      {agent.id}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {agent.isDefault ? statusChip("default", "good") : null}
                    {runtimeAgentIds.has(agent.id) ? statusChip("live", "live") : statusChip("config only", "warn")}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-dunder-wall md:grid-cols-2">
                  <div>workspace {agent.workspace ?? "OpenClaw default"}</div>
                  <div>agentDir {agent.agentDir ?? "OpenClaw default"}</div>
                  <div>model {agent.model ?? "gateway default"}</div>
                  <div>
                    binding {configuredBindings.filter((binding) => binding.agentId === agent.id).map((binding) => binding.summary).join(", ") || "none"}
                  </div>
                </div>
              </div>
            ))}
            {configuredAgents.length === 0 ? <div className="rounded-lg border border-dashed border-dunder-carpet/20 px-3 py-4 text-sm text-dunder-wall">No agents are configured yet. Provision the first one here.</div> : null}
          </div>
        </div>
      </div>
      <textarea value={currentOps?.configDraft?.rawText ?? ""} onChange={(event) => currentInstanceId && setConfigDraftText(currentInstanceId, event.target.value)} className="min-h-[360px] w-full rounded-lg border border-dunder-carpet/20 bg-dunder-paper/5 px-4 py-4 font-mono text-xs text-dunder-paper outline-none focus:border-dunder-wall" />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void refreshDesk(currentInstanceId)} className={buttonClasses()}>Reload</button>
        <button type="button" onClick={() => currentInstanceId && currentOps?.config && setConfigSnapshot(currentInstanceId, currentOps.config)} className={buttonClasses()}>Revert</button>
        <button type="button" onClick={() => void updateConfig("patch")} className={buttonClasses()}>Patch</button>
        <button type="button" onClick={() => void updateConfig("apply")} className={buttonClasses("primary")}>Apply</button>
      </div>
      <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-dunder-carpet/20 bg-dunder-paper/5 p-3 font-mono text-xs text-dunder-paper">
        {configDiff.map((line, index) => <div key={`${line}-${index}`} className="whitespace-pre-wrap">{line}</div>)}
      </div>
      <div className="text-xs text-dunder-wall">Base hash: {currentOps?.configDraft?.baseHash ?? "unknown"}</div>
    </div>,
  );
  const approvalsView = deskPanel(
    "Pending Approvals",
    "Exec Inbox",
    <div className="space-y-3 px-4 py-4">
      {(currentOps?.approvalRequests ?? []).map((approval) => (
        <div key={approval.approvalId} className="rounded-lg border border-dunder-carpet/20 bg-dunder-paper/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-dunder text-lg font-bold text-dunder-paper">{approval.agentId ?? "unassigned agent"}</div>
              <div className="mt-1 font-mono text-xs text-dunder-carpet">{approval.rawCommand ?? approval.argv?.join(" ") ?? approval.approvalId}</div>
              <div className="mt-2 text-xs text-dunder-wall">{approval.cwd ?? "No working directory"} · {approval.host ?? "unknown host"}</div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => void resolveApproval(approval.approvalId, "allow-once")} className={buttonClasses("primary")}>Allow Once</button>
              <button type="button" onClick={() => void resolveApproval(approval.approvalId, "deny")} className={buttonClasses("danger")}>Deny</button>
            </div>
          </div>
        </div>
      ))}
      {(currentOps?.approvalRequests.length ?? 0) === 0 ? <div className="rounded-lg border border-dashed border-dunder-carpet/20 px-3 py-4 text-sm text-dunder-wall">No live approval requests at the moment.</div> : null}
    </div>,
  );
  const nodesView = deskPanel(
    "Nodes And Pairing",
    "Fleet",
    <div className="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1.1fr)_320px]">
      <div className="space-y-3">{(currentOps?.nodes?.nodes ?? []).map((node) => <div key={node.nodeId} className="rounded-lg border border-dunder-carpet/20 bg-dunder-paper/5 p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-dunder text-lg font-bold text-dunder-paper">{node.displayName ?? node.nodeId}</div><div className="mt-1 text-xs text-dunder-wall">{node.platform ?? "unknown platform"} · {node.remoteIp ?? "no IP"}</div><div className="mt-2 text-xs text-dunder-carpet">{node.version ?? "no version"} · {node.deviceFamily ?? "unknown device"}</div></div>{node.connected ? statusChip("connected", "good") : statusChip("offline", "neutral")}</div></div>)}</div>
      <div className="space-y-3">{(currentOps?.nodePairs?.requests ?? []).map((request) => <div key={request.requestId} className="rounded-lg border border-dunder-carpet/20 bg-dunder-paper/5 p-4"><div className="font-dunder text-lg font-bold text-dunder-paper">{request.displayName ?? request.nodeId ?? request.requestId}</div><div className="mt-1 text-xs text-dunder-wall">{request.deviceFamily ?? "unknown family"} · {request.modelIdentifier ?? "unknown model"}</div><div className="mt-3 flex gap-2"><button type="button" onClick={() => void resolveNodePair(request.requestId, "approve")} className={buttonClasses("primary")}>Approve</button><button type="button" onClick={() => void resolveNodePair(request.requestId, "reject")} className={buttonClasses("danger")}>Reject</button></div></div>)}{(currentOps?.nodePairs?.requests?.length ?? 0) === 0 ? <div className="rounded-lg border border-dashed border-dunder-carpet/20 px-3 py-4 text-sm text-dunder-wall">No pending node pair requests.</div> : null}</div>
    </div>,
  );
  const logsView = deskPanel(
    "Gateway Logs",
    "Tail",
    <div className="space-y-3 px-4 py-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void refreshLogs(true)} className={buttonClasses()}>Reload</button>
        <button type="button" onClick={() => void refreshLogs(false)} className={buttonClasses("primary")}>Tail</button>
        {statusChip(`cursor ${currentOps?.logs.cursor ?? 0}`, "neutral")}
      </div>
      <div className="max-h-[560px] overflow-y-auto rounded-lg border border-dunder-carpet/20 bg-dunder-paper/5 p-4 font-mono text-xs leading-6 text-dunder-paper">
        {(currentOps?.logs.lines ?? []).map((line, index) => <div key={`${line}-${index}`} className="whitespace-pre-wrap">{line}</div>)}
        {(currentOps?.logs.lines.length ?? 0) === 0 ? <div className="text-dunder-wall">No log lines loaded yet.</div> : null}
      </div>
    </div>,
  );
  const cronView = deskPanel(
    "Cron Board",
    "Scheduler",
    <div className="space-y-3 px-4 py-4">
      <div className="flex flex-wrap gap-2">{currentOps?.cron?.enabled ? statusChip("enabled", "good") : statusChip("disabled", "warn")}{statusChip(`next wake ${formatRelativeTime(currentOps?.cron?.nextWakeAtMs)}`, "neutral")}</div>
      {(currentOps?.cron?.jobs ?? []).map((job) => <div key={job.id} className="rounded-lg border border-dunder-carpet/20 bg-dunder-paper/5 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-dunder text-lg font-bold text-dunder-paper">{job.label ?? job.id}</div><div className="mt-1 font-mono text-xs text-dunder-carpet">{job.schedule}</div><div className="mt-2 text-xs text-dunder-wall">last run {formatRelativeTime(job.lastRunAt)} · next run {formatRelativeTime(job.nextRunAt)}</div></div><button type="button" onClick={() => void runCron(job.id)} className={buttonClasses("primary")}>Run Now</button></div></div>)}
      {(currentOps?.cron?.jobs.length ?? 0) === 0 ? <div className="rounded-lg border border-dashed border-dunder-carpet/20 px-3 py-4 text-sm text-dunder-wall">No cron jobs exposed by this gateway.</div> : null}
    </div>,
  );
  const handoffView = deskPanel(
      "Controlled Handoff",
      "Routing",
      <div className="space-y-3 px-4 py-4">
        {field("Target Gateway", <select value={handoffGatewayId} onChange={(event) => setHandoffGatewayId(event.target.value)} className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall">{instanceIds.map((instanceId) => <option key={instanceId} value={instanceId}>{instances[instanceId]?.label ?? instanceId}</option>)}</select>)}
        {field("Target Agent", <select value={handoffAgentId} onChange={(event) => setHandoffAgentId(event.target.value)} className="w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall"><option value="main">Gateway Default Agent</option>{Object.values(agentsByInstance[handoffGatewayId] ?? {}).map((agent) => <option key={agent.agentId} value={agent.agentId}>{agent.name}</option>)}</select>)}
        {field("Operator Note", <textarea value={handoffNote} onChange={(event) => setHandoffNote(event.target.value)} placeholder="Brief the next gateway on what needs to happen." className="min-h-24 w-full rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-3 font-dunder text-sm text-dunder-paper outline-none focus:border-dunder-wall" />)}
        <button type="button" onClick={() => void handoffSession()} disabled={!selectedSessionKey} className={`w-full ${buttonClasses("primary")}`}>Create Handoff Session</button>
      </div>,
  );

  if (instanceIds.length === 0) return noGatewaysView;

  const mainView =
    currentSection === "sessions" ? (
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.3fr)_320px]">
        {sessionsView}
        {handoffView}
      </div>
    ) : currentSection === "workbench" ? (
      workbenchView
    ) : currentSection === "approvals" ? (
      approvalsView
    ) : currentSection === "nodes" ? (
      nodesView
    ) : currentSection === "logs" ? (
      logsView
    ) : (
      cronView
    );

  return (
    <div className="office-carpet h-full overflow-hidden bg-dunder-blue">
      <div className="flex h-full flex-col">
        <div className="border-b border-dunder-carpet/20 bg-dunder-blue/90 px-5 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.35em] text-dunder-carpet">Dunder Mifflin Operator Console</div>
              <h1 className="mt-2 font-dunder text-3xl font-bold text-dunder-paper">Session Desk</h1>
              <p className="mt-1 max-w-3xl font-dunder text-sm text-dunder-wall">
                Multi-gateway sessions, model routing, safe config workbench, approvals, node pairing, and log tailing without touching the Office floor-plan pages.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <div className="rounded-lg border border-dunder-carpet/20 bg-dunder-screen-off/60 p-3"><div className="text-[10px] uppercase tracking-[0.25em] text-dunder-carpet">Sessions</div><div className="mt-2 font-dunder text-2xl font-bold text-dunder-paper">{currentOps?.sessions.length ?? 0}</div></div>
              <div className="rounded-lg border border-dunder-carpet/20 bg-dunder-screen-off/60 p-3"><div className="text-[10px] uppercase tracking-[0.25em] text-dunder-carpet">Approvals</div><div className="mt-2 font-dunder text-2xl font-bold text-dunder-paper">{currentOps?.approvalRequests.length ?? 0}</div></div>
              <div className="rounded-lg border border-dunder-carpet/20 bg-dunder-screen-off/60 p-3"><div className="text-[10px] uppercase tracking-[0.25em] text-dunder-carpet">Nodes</div><div className="mt-2 font-dunder text-2xl font-bold text-dunder-paper">{currentOps?.nodes?.nodes.length ?? 0}</div></div>
              <div className="rounded-lg border border-dunder-carpet/20 bg-dunder-screen-off/60 p-3"><div className="text-[10px] uppercase tracking-[0.25em] text-dunder-carpet">Models</div><div className="mt-2 font-dunder text-2xl font-bold text-dunder-paper">{models.length}</div></div>
            </div>
          </div>
        </div>
        <div className="px-4 pt-4">
          <OperatorGuide
            eyebrow="How It Works"
            title="Agents, characters, and sessions are different things"
            summary="Mission Control sits on top of OpenClaw. Gateways provide the real agents. Character mapping only changes the Office persona you see. Session Desk is where you create the actual work threads and route them to an agent, model, and channel."
            terms={DESK_TERMS}
            steps={DESK_STEPS}
            actions={(
              <>
                <button type="button" onClick={() => openPanel({ type: "settings" })} className={buttonClasses()}>
                  Character Mapping
                </button>
                <button type="button" onClick={() => setDeskFocus({ section: "workbench" })} className={buttonClasses("primary")}>
                  Gateway Workbench
                </button>
              </>
            )}
          />
        </div>
        <div className="grid min-h-0 flex-1 gap-4 p-4 xl:grid-cols-[280px_320px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto">{sidebar}</aside>
          <section className="min-h-0 overflow-y-auto">{ledger}</section>
          <main className="min-h-0 overflow-y-auto">
            {statusMessage ? <div className="mb-3 rounded border border-green-500/30 bg-green-950/30 px-3 py-2 text-sm text-green-200">{statusMessage}</div> : null}
            {errorMessage ? <div className="mb-3 rounded border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">{errorMessage}</div> : null}
            {mainView}
          </main>
        </div>
      </div>
    </div>
  );
}
