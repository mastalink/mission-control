import { useAgentStore } from "../store/useAgentStore";
import { useUIStore } from "../store/useUIStore";
import { getCharacterById } from "../characters/registry";

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

  if (!agent) {
    return (
      <div className="p-4 text-gray-400">
        <p>Agent not found.</p>
        <button onClick={closePanel} className="mt-2 text-sm text-blue-400 hover:underline">Close</button>
      </div>
    );
  }

  const character = agent.characterId ? getCharacterById(agent.characterId) : null;
  const personality = character?.personality;
  const fallback = { label: "Offline", color: "#6b7280", bg: "bg-gray-900/20" };
  const stateInfo = STATE_LABELS[agent.visualState] ?? fallback;

  const openChat = () => {
    openPanel({ type: "chat", instanceId, agentId });
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto max-h-full">
      {/* Character Portrait */}
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Character portrait — real LEGO PNG */}
            <div
              style={{
                width: 48,
                height: 72,
                backgroundImage: character
                  ? `url(/chars/${character.id.split("-")[0]}.png)`
                  : "none",
                backgroundColor: character ? "transparent" : "#374151",
                backgroundSize: "auto 170%",
                backgroundPosition: "center 20%",
                backgroundRepeat: "no-repeat",
                borderRadius: "8px",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15), 0 4px 8px rgba(0,0,0,0.5)",
              }}
            />
            <div>
              <h2 className="text-lg font-bold text-white font-dunder">
                {character?.name ?? agent.name}
              </h2>
              <p className="text-sm text-gray-400">{character?.title ?? "Agent"}</p>
            </div>
          </div>
          <button onClick={closePanel} className="text-gray-400 hover:text-white text-xl leading-none p-1">&times;</button>
        </div>
        {character && (
          <p className="text-xs text-gray-500 italic mt-2 pl-1 border-l-2 border-gray-700 ml-1">
            &ldquo;{character.quote}&rdquo;
          </p>
        )}
      </div>

      {/* Chat Button */}
      <button
        onClick={openChat}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <span>💬</span>
        Chat with {character?.name ?? agent.name}
      </button>

      {/* Status Banner */}
      <div className={`rounded-lg p-3 ${stateInfo.bg} border border-gray-700/50`}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: stateInfo.color }} />
          <span className="text-sm font-medium" style={{ color: stateInfo.color }}>{stateInfo.label}</span>
        </div>
        {agent.activeRunId && (
          <p className="text-xs text-gray-500 mt-1 font-mono">Run: {agent.activeRunId.slice(0, 12)}...</p>
        )}
        {agent.visualState === "talking" && agent.lastDeltaText && (
          <p className="text-xs text-gray-300 mt-2 bg-gray-900/50 rounded p-2 font-mono">
            {agent.lastDeltaText.slice(-120)}
          </p>
        )}
        {agent.visualState === "tool_calling" && agent.activeTool && (
          <p className="text-xs text-purple-300 mt-2">
            Tool: <span className="font-mono">{agent.activeTool}</span>
          </p>
        )}
      </div>

      {/* Personality & Strengths */}
      {personality && (
        <div className="bg-gray-800/50 rounded-lg p-3 space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Personality Profile</h3>

          {/* Strengths */}
          <div>
            <div className="text-xs text-gray-500 mb-1.5">Strengths</div>
            <div className="flex flex-wrap gap-1.5">
              {personality.strengths.map((s) => (
                <span key={s} className="text-xs px-2 py-0.5 bg-emerald-900/30 text-emerald-300 rounded-full border border-emerald-800/40">
                  ✦ {s}
                </span>
              ))}
            </div>
          </div>

          {/* Weakness */}
          <div>
            <div className="text-xs text-gray-500 mb-1">Weakness</div>
            <span className="text-xs px-2 py-0.5 bg-red-900/20 text-red-300 rounded-full border border-red-800/30">
              ⚠ {personality.weakness}
            </span>
          </div>

          {/* Favorite Emojis */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Vibe:</span>
            <span className="text-base tracking-wider">{personality.favoriteEmojis.join(" ")}</span>
          </div>
        </div>
      )}

      {/* Relationships */}
      {personality && (personality.allies.length > 0 || personality.rivals.length > 0) && (
        <div className="bg-gray-800/50 rounded-lg p-3 space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Relationships</h3>

          {personality.allies.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-1.5">Works well with</div>
              <div className="flex flex-wrap gap-1.5">
                {personality.allies.map((id) => (
                  <span key={id} className="text-xs px-2 py-0.5 bg-blue-900/30 text-blue-300 rounded-full border border-blue-800/40">
                    🤝 {resolveCharacterName(id)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {personality.rivals.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-1.5">Clashes with</div>
              <div className="flex flex-wrap gap-1.5">
                {personality.rivals.map((id) => (
                  <span key={id} className="text-xs px-2 py-0.5 bg-amber-900/30 text-amber-300 rounded-full border border-amber-800/40">
                    ⚡ {resolveCharacterName(id)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Agent Identity */}
      <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Agent Identity</h3>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          <span className="text-gray-500">Agent ID</span>
          <span className="text-gray-200 font-mono text-xs truncate">{agent.agentId}</span>
          <span className="text-gray-500">Name</span>
          <span className="text-gray-200">{agent.name}</span>
          {agent.emoji && (
            <>
              <span className="text-gray-500">Emoji</span>
              <span className="text-gray-200 text-lg leading-none">{agent.emoji}</span>
            </>
          )}
        </div>
      </div>

      {/* Location & Character */}
      {character && (
        <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Office Details</h3>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            <span className="text-gray-500">Location</span>
            <span className="text-gray-200 capitalize">{agent.location.replace(/-/g, " ")}</span>
            <span className="text-gray-500">When Idle</span>
            <span className="text-gray-200 text-xs">{character.idleBehavior}</span>
          </div>
        </div>
      )}

      {/* Token Usage */}
      <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Stats</h3>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          <span className="text-gray-500">Tokens</span>
          <span className="text-gray-200 font-mono">{agent.totalTokens.toLocaleString()}</span>
          <span className="text-gray-500">Last Active</span>
          <span className="text-gray-200">
            {agent.lastActivityTs ? new Date(agent.lastActivityTs).toLocaleTimeString() : "\u2014"}
          </span>
        </div>
      </div>

      {/* Active error */}
      {agent.lastError && (
        <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Error</h3>
          <p className="text-sm text-red-300">{agent.lastError}</p>
        </div>
      )}
    </div>
  );
}
