import { getVoiceLine } from "../characters/officeVoice";
import { getCharacterById } from "../characters/registry";
import { useAgentStore } from "../store/useAgentStore";
import { useUIStore } from "../store/useUIStore";

type Props = {
  instanceId: string;
  agentId: string;
};

const STATE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  idle: { label: "Idle", color: "#22c55e", bg: "bg-green-900/20" },
  thinking: { label: "Thinking...", color: "#f59e0b", bg: "bg-yellow-900/20" },
  talking: { label: "Speaking", color: "#3b82f6", bg: "bg-blue-900/20" },
  tool_calling: { label: "Using Tools", color: "#a855f7", bg: "bg-purple-900/20" },
  error: { label: "Error!", color: "#ef4444", bg: "bg-red-900/20" },
  offline: { label: "Offline", color: "#6b7280", bg: "bg-gray-900/20" },
};

function resolveCharacterName(id: string): string {
  const c = getCharacterById(id);
  return c ? c.name : id;
}

export function AgentPanel({ instanceId, agentId }: Props) {
  const agent = useAgentStore((s) => s.agents[instanceId]?.[agentId]);
  const closePanel = useUIStore((s) => s.closePanel);
  const openPanel = useUIStore((s) => s.openPanel);
  const openDesk = useUIStore((s) => s.openDesk);
  const uiMode = useUIStore((s) => s.uiMode);
  const officeVoiceMode = useUIStore((s) => s.officeVoiceMode);

  if (!agent) {
    return (
      <div className="p-4 text-dunder-wall">
        <p>Agent not found.</p>
        <button onClick={closePanel} className="mt-2 text-sm text-dunder-paper underline">
          Close
        </button>
      </div>
    );
  }

  const character = agent.characterId ? getCharacterById(agent.characterId) : null;
  const personality = character?.personality;
  const fallback = { label: "Offline", color: "#6b7280", bg: "bg-gray-900/20" };
  const stateInfo = STATE_LABELS[agent.visualState] ?? fallback;
  const statusVoice = getVoiceLine(character, officeVoiceMode, "status", "Worker status is live.");
  const emptyVoice = getVoiceLine(character, officeVoiceMode, "emptyState", "No work yet.");

  return (
    <div className="max-h-full space-y-4 overflow-y-auto bg-dunder-blue p-4 text-dunder-paper">
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 48,
                height: 72,
                backgroundImage: character ? `url(/chars/${character.id.split("-")[0]}.png)` : "none",
                backgroundColor: character ? "transparent" : "#374151",
                backgroundSize: "auto 170%",
                backgroundPosition: "center 20%",
                backgroundRepeat: "no-repeat",
                borderRadius: "8px",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15), 0 4px 8px rgba(0,0,0,0.5)",
              }}
            />
            <div>
              <h2 className="font-dunder text-lg font-bold text-dunder-paper">
                {character?.name ?? agent.name}
              </h2>
              <p className="text-sm text-dunder-wall">
                {character?.title ?? (uiMode === "idiot" ? "Worker" : "Agent")}
              </p>
            </div>
          </div>
          <button
            onClick={closePanel}
            className="p-1 text-xl leading-none text-dunder-wall transition-colors hover:text-dunder-paper"
          >
            &times;
          </button>
        </div>
        {character ? (
          <p className="ml-1 mt-2 border-l-2 border-dunder-carpet/30 pl-2 text-xs italic text-dunder-wall">
            "{character.quote}"
          </p>
        ) : null}
      </div>

      <button
        onClick={() => openPanel({ type: "chat", instanceId, agentId })}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        <span>Chat</span>
        {uiMode === "idiot" ? `Start chat with ${character?.name ?? agent.name}` : `Chat with ${character?.name ?? agent.name}`}
      </button>
      <button
        onClick={() => openDesk({ instanceId, section: uiMode === "idiot" ? "setup" : "sessions", agentId })}
        className="w-full rounded-lg border border-dunder-carpet/30 bg-dunder-paper/10 py-2.5 text-sm font-dunder text-dunder-paper transition-colors hover:bg-dunder-paper/20"
      >
        {uiMode === "idiot" ? "Open Start Chat" : "Open Session Desk"}
      </button>
      <button
        onClick={() => openPanel({ type: "settings" })}
        className="w-full rounded-lg border border-dunder-carpet/30 bg-dunder-screen-off/70 py-2.5 text-sm font-dunder text-dunder-paper transition-colors hover:bg-dunder-screen-off"
      >
        {uiMode === "idiot" ? "Pick Office Character" : "Character Mapping"}
      </button>

      <div className="rounded-lg border border-dunder-carpet/20 bg-dunder-paper/5 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-dunder-carpet">
          {uiMode === "idiot" ? "What This Worker Is" : "How This Works"}
        </h3>
        <div className="mt-2 space-y-2 text-sm text-dunder-wall">
          <p>
            <span className="font-dunder font-bold text-dunder-paper">
              {uiMode === "idiot" ? "Real worker:" : "Real agent:"}
            </span>{" "}
            <span className="font-mono text-xs">{agent.agentId}</span>
          </p>
          <p>
            <span className="font-dunder font-bold text-dunder-paper">Office character:</span>{" "}
            {character?.name ?? "No character override yet"}
          </p>
          <p>
            {uiMode === "idiot"
              ? "Workers do the actual job. Characters change the face and voice. Start Chat is where you give the work."
              : "Gateway Workbench provisions real agents. Session Desk creates and routes work for them. Character Mapping only changes how the agent appears in Mission Control."}
          </p>
        </div>
      </div>

      <div className={`rounded-lg border border-gray-700/50 p-3 ${stateInfo.bg}`}>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 animate-pulse rounded-full" style={{ backgroundColor: stateInfo.color }} />
          <span className="text-sm font-medium" style={{ color: stateInfo.color }}>
            {stateInfo.label}
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-300">{statusVoice}</p>
        {agent.activeRunId ? (
          <p className="mt-1 font-mono text-xs text-gray-500">Run: {agent.activeRunId.slice(0, 12)}...</p>
        ) : null}
        {agent.visualState === "talking" && agent.lastDeltaText ? (
          <p className="mt-2 rounded bg-gray-900/50 p-2 font-mono text-xs text-gray-300">
            {agent.lastDeltaText.slice(-120)}
          </p>
        ) : null}
        {agent.visualState === "tool_calling" && agent.activeTool ? (
          <p className="mt-2 text-xs text-purple-300">
            Tool: <span className="font-mono">{agent.activeTool}</span>
          </p>
        ) : null}
      </div>

      {personality ? (
        <div className="space-y-3 rounded-lg bg-gray-800/50 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {uiMode === "idiot" ? "Worker Personality" : "Personality Profile"}
          </h3>
          <div>
            <div className="mb-1.5 text-xs text-gray-500">Strengths</div>
            <div className="flex flex-wrap gap-1.5">
              {personality.strengths.map((strength) => (
                <span
                  key={strength}
                  className="rounded-full border border-emerald-800/40 bg-emerald-900/30 px-2 py-0.5 text-xs text-emerald-300"
                >
                  {strength}
                </span>
              ))}
            </div>
          </div>
          {uiMode !== "idiot" ? (
            <>
              <div>
                <div className="mb-1 text-xs text-gray-500">Weakness</div>
                <span className="rounded-full border border-red-800/30 bg-red-900/20 px-2 py-0.5 text-xs text-red-300">
                  {personality.weakness}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Vibe:</span>
                <span className="text-base tracking-wider">{personality.favoriteEmojis.join(" ")}</span>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dunder-carpet/20 bg-dunder-paper/5 p-3 text-sm text-dunder-wall">
              {emptyVoice}
            </div>
          )}
        </div>
      ) : null}

      {uiMode !== "idiot" && personality && (personality.allies.length > 0 || personality.rivals.length > 0) ? (
        <div className="space-y-3 rounded-lg bg-gray-800/50 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Relationships</h3>
          {personality.allies.length > 0 ? (
            <div>
              <div className="mb-1.5 text-xs text-gray-500">Works well with</div>
              <div className="flex flex-wrap gap-1.5">
                {personality.allies.map((id) => (
                  <span
                    key={id}
                    className="rounded-full border border-blue-800/40 bg-blue-900/30 px-2 py-0.5 text-xs text-blue-300"
                  >
                    {resolveCharacterName(id)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {personality.rivals.length > 0 ? (
            <div>
              <div className="mb-1.5 text-xs text-gray-500">Clashes with</div>
              <div className="flex flex-wrap gap-1.5">
                {personality.rivals.map((id) => (
                  <span
                    key={id}
                    className="rounded-full border border-amber-800/40 bg-amber-900/30 px-2 py-0.5 text-xs text-amber-300"
                  >
                    {resolveCharacterName(id)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2 rounded-lg bg-gray-800/50 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {uiMode === "idiot" ? "Worker Details" : "Agent Identity"}
        </h3>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          <span className="text-gray-500">{uiMode === "idiot" ? "Worker ID" : "Agent ID"}</span>
          <span className="truncate font-mono text-xs text-gray-200">{agent.agentId}</span>
          <span className="text-gray-500">Name</span>
          <span className="text-gray-200">{agent.name}</span>
          {agent.emoji ? (
            <>
              <span className="text-gray-500">Emoji</span>
              <span className="text-lg leading-none text-gray-200">{agent.emoji}</span>
            </>
          ) : null}
          {uiMode !== "idiot" && character ? (
            <>
              <span className="text-gray-500">Location</span>
              <span className="capitalize text-gray-200">{agent.location.replace(/-/g, " ")}</span>
              <span className="text-gray-500">When Idle</span>
              <span className="text-xs text-gray-200">{character.idleBehavior}</span>
            </>
          ) : null}
          {uiMode !== "idiot" ? (
            <>
              <span className="text-gray-500">Tokens</span>
              <span className="font-mono text-gray-200">{agent.totalTokens.toLocaleString()}</span>
              <span className="text-gray-500">Last Active</span>
              <span className="text-gray-200">
                {agent.lastActivityTs ? new Date(agent.lastActivityTs).toLocaleTimeString() : "-"}
              </span>
            </>
          ) : null}
        </div>
      </div>

      {agent.lastError ? (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-3">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-red-400">Error</h3>
          <p className="text-sm text-red-300">{agent.lastError}</p>
        </div>
      ) : null}
    </div>
  );
}
