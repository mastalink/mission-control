export type AgentProvisioningDraft = {
  agentId: string;
  name: string;
  workspace: string;
  agentDir: string;
  setAsDefault: boolean;
  modelPrimary: string;
  modelFallbacks: string;
  identityName: string;
  identityTheme: string;
  identityEmoji: string;
  identityAvatar: string;
  mentionPatterns: string;
  sandboxMode: string;
  sandboxScope: string;
  workspaceAccess: string;
  toolProfile: string;
  toolAllow: string;
  toolDeny: string;
  bindingChannel: string;
  bindingAccountId: string;
  bindingPeerKind: string;
  bindingPeerId: string;
  bindingGuildId: string;
  bindingTeamId: string;
  bindingRoles: string;
  characterId: string;
  extraJson: string;
};

type ProvisioningResult = {
  config: Record<string, unknown>;
  warnings: string[];
};

function splitList(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function cloneConfig(config: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
}

function mergeRecords(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const targetValue = merged[key];
    const targetRecord = asRecord(targetValue);
    const sourceRecord = asRecord(value);
    if (targetRecord && sourceRecord) {
      merged[key] = mergeRecords(targetRecord, sourceRecord);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function parseExtraJson(input: string): Record<string, unknown> {
  if (!input.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (error) {
    throw new Error(
      `Advanced overrides must be valid JSON. ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const record = asRecord(parsed);
  if (!record) {
    throw new Error("Advanced overrides must be a JSON object.");
  }
  return record;
}

export function emptyProvisioningDraft(): AgentProvisioningDraft {
  return {
    agentId: "",
    name: "",
    workspace: "",
    agentDir: "",
    setAsDefault: false,
    modelPrimary: "",
    modelFallbacks: "",
    identityName: "",
    identityTheme: "",
    identityEmoji: "",
    identityAvatar: "",
    mentionPatterns: "",
    sandboxMode: "",
    sandboxScope: "",
    workspaceAccess: "",
    toolProfile: "",
    toolAllow: "",
    toolDeny: "",
    bindingChannel: "",
    bindingAccountId: "",
    bindingPeerKind: "",
    bindingPeerId: "",
    bindingGuildId: "",
    bindingTeamId: "",
    bindingRoles: "",
    characterId: "",
    extraJson: "",
  };
}

export function slugAgentId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseProvisioningBaseConfig(params: {
  rawText?: string;
  isDirty?: boolean;
  fallbackConfig?: Record<string, unknown>;
}): Record<string, unknown> {
  const { rawText, isDirty, fallbackConfig } = params;
  if (isDirty && rawText?.trim()) {
    try {
      const parsed = JSON.parse(rawText);
      const record = asRecord(parsed);
      if (!record) {
        throw new Error("Draft root must be an object.");
      }
      return record;
    } catch (error) {
      throw new Error(
        `The current config draft is not strict JSON. Apply or revert the raw draft before using the provisioning form. ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return cloneConfig(fallbackConfig ?? {});
}

export function listConfiguredAgentIds(config: Record<string, unknown>): string[] {
  const agentsNode = asRecord(config.agents);
  const list = Array.isArray(agentsNode?.list) ? agentsNode.list : [];
  return list
    .map((entry) => asRecord(entry)?.id)
    .filter((id): id is string => typeof id === "string")
    .sort((left, right) => left.localeCompare(right));
}

export function buildProvisionedConfig(
  baseConfig: Record<string, unknown>,
  draft: AgentProvisioningDraft,
): ProvisioningResult {
  const agentId = slugAgentId(draft.agentId);
  if (!agentId) {
    throw new Error("Agent ID is required.");
  }

  const nextConfig = cloneConfig(baseConfig);
  const warnings: string[] = [];
  const agentsNode = asRecord(nextConfig.agents) ?? {};
  const list = Array.isArray(agentsNode.list)
    ? agentsNode.list.map((entry) => (asRecord(entry) ? { ...entry } : entry))
    : [];

  if (
    list.some(
      (entry) => asRecord(entry)?.id === agentId,
    )
  ) {
    throw new Error(`Agent '${agentId}' already exists in this config.`);
  }

  const fallbacks = splitList(draft.modelFallbacks);
  const allowTools = splitList(draft.toolAllow);
  const denyTools = splitList(draft.toolDeny);
  const mentionPatterns = splitList(draft.mentionPatterns);
  const bindingRoles = splitList(draft.bindingRoles);

  const identity: Record<string, unknown> = {};
  if (draft.identityName.trim()) identity.name = draft.identityName.trim();
  if (draft.identityTheme.trim()) identity.theme = draft.identityTheme.trim();
  if (draft.identityEmoji.trim()) identity.emoji = draft.identityEmoji.trim();
  if (draft.identityAvatar.trim()) identity.avatar = draft.identityAvatar.trim();

  const agent: Record<string, unknown> = { id: agentId };
  if (draft.setAsDefault) agent.default = true;
  if (draft.name.trim()) agent.name = draft.name.trim();
  if (draft.workspace.trim()) agent.workspace = draft.workspace.trim();
  if (draft.agentDir.trim()) agent.agentDir = draft.agentDir.trim();
  if (draft.modelPrimary.trim()) {
    agent.model = fallbacks.length > 0
      ? { primary: draft.modelPrimary.trim(), fallbacks }
      : draft.modelPrimary.trim();
  }
  if (Object.keys(identity).length > 0) agent.identity = identity;
  if (mentionPatterns.length > 0) {
    agent.groupChat = { mentionPatterns };
  }

  const sandbox: Record<string, unknown> = {};
  if (draft.sandboxMode.trim()) sandbox.mode = draft.sandboxMode.trim();
  if (draft.sandboxScope.trim()) sandbox.scope = draft.sandboxScope.trim();
  if (draft.workspaceAccess.trim()) sandbox.workspaceAccess = draft.workspaceAccess.trim();
  if (Object.keys(sandbox).length > 0) agent.sandbox = sandbox;

  const tools: Record<string, unknown> = {};
  if (draft.toolProfile.trim()) tools.profile = draft.toolProfile.trim();
  if (allowTools.length > 0) tools.allow = allowTools;
  if (denyTools.length > 0) tools.deny = denyTools;
  if (Object.keys(tools).length > 0) agent.tools = tools;

  const extra = parseExtraJson(draft.extraJson);
  const mergedAgent = mergeRecords(agent, extra);

  if (draft.setAsDefault) {
    for (const entry of list) {
      const record = asRecord(entry);
      if (record && "default" in record) {
        delete record.default;
      }
    }
  } else if (list.length === 0) {
    warnings.push("This will be the only configured agent. OpenClaw will treat it as the default even without 'default: true'.");
  }

  list.push(mergedAgent);
  nextConfig.agents = { ...agentsNode, list };

  if (draft.bindingChannel.trim()) {
    const bindings = Array.isArray(nextConfig.bindings)
      ? nextConfig.bindings.map((entry) => (asRecord(entry) ? { ...entry } : entry))
      : [];

    const match: Record<string, unknown> = {
      channel: draft.bindingChannel.trim(),
    };
    if (draft.bindingAccountId.trim()) match.accountId = draft.bindingAccountId.trim();
    if (draft.bindingPeerKind.trim() || draft.bindingPeerId.trim()) {
      if (!draft.bindingPeerKind.trim() || !draft.bindingPeerId.trim()) {
        throw new Error("Peer bindings require both a peer kind and peer id.");
      }
      match.peer = {
        kind: draft.bindingPeerKind.trim(),
        id: draft.bindingPeerId.trim(),
      };
    }
    if (draft.bindingGuildId.trim()) match.guildId = draft.bindingGuildId.trim();
    if (draft.bindingTeamId.trim()) match.teamId = draft.bindingTeamId.trim();
    if (bindingRoles.length > 0) match.roles = bindingRoles;

    bindings.push({
      agentId,
      match,
    });
    nextConfig.bindings = bindings;
  }

  return { config: nextConfig, warnings };
}
