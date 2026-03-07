import { useAgentStore } from "../store/useAgentStore";
import { useGatewayStore } from "../store/useGatewayStore";
import { useUIStore } from "../store/useUIStore";
import { getCharacterById } from "../characters/registry";

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-green-500",
  thinking: "bg-amber-400 animate-pulse",
  talking: "bg-blue-500",
  tool_calling: "bg-purple-500 animate-pulse",
  error: "bg-red-500",
  offline: "bg-gray-600",
};

const STATUS_LABELS: Record<string, string> = {
  idle: "IDLE",
  thinking: "THINKING",
  talking: "TALKING",
  tool_calling: "TOOL CALL",
  error: "ERROR",
  offline: "OFFLINE",
};

export function EmployeeRoster() {
  const agents = useAgentStore((s) => s.agents);
  const instances = useGatewayStore((s) => s.instances);
  const openPanel = useUIStore((s) => s.openPanel);
  const toggleAddInstance = useUIStore((s) => s.toggleAddInstance);

  const allAgents = Object.entries(agents).flatMap(([instanceId, instAgents]) =>
    Object.values(instAgents).map((agent) => ({ ...agent, instanceId }))
  );

  if (allAgents.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="text-5xl opacity-20">⊞</div>
        <h2 className="text-xl font-dunder font-bold text-dunder-paper">No Agents on Duty</h2>
        <p className="text-sm text-dunder-carpet font-dunder max-w-sm">
          Connect to a gateway to see your agents appear here as Dunder Mifflin employees.
        </p>
        <button
          onClick={toggleAddInstance}
          className="px-5 py-2.5 text-sm font-dunder text-dunder-paper bg-dunder-screen-on rounded hover:bg-blue-700 transition-colors"
        >
          Connect Gateway
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-dunder font-bold text-dunder-paper">Employee Roster</h1>
          <p className="text-sm text-dunder-carpet mt-1 font-dunder">Active Agents on Duty</p>
        </div>
        <button
          onClick={toggleAddInstance}
          className="px-4 py-2 text-xs font-dunder text-dunder-paper bg-dunder-screen-off border border-dunder-carpet/30 rounded hover:bg-dunder-paper/10 transition-colors"
        >
          + Add Agent
        </button>
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {allAgents.map((agent) => {
          const char = agent.characterId ? getCharacterById(agent.characterId) : null;
          const instanceLabel = instances[agent.instanceId]?.label ?? agent.instanceId;
          const sysId = agent.agentId.toUpperCase().slice(0, 10);

          return (
            <button
              key={`${agent.instanceId}-${agent.agentId}`}
              onClick={() =>
                openPanel({ type: "agent", instanceId: agent.instanceId, agentId: agent.agentId })
              }
              className="bg-dunder-screen-off/60 border border-dunder-carpet/20 rounded-lg p-4 text-left hover:border-dunder-carpet/50 hover:bg-dunder-screen-off/80 transition-all group"
            >
              {/* Avatar area */}
              <div className="relative mb-3 flex justify-center">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl border border-dunder-carpet/20"
                  style={{ backgroundColor: char?.bodyColor ?? "#334155" }}
                >
                  {char ? (
                    <span className="text-2xl">
                      {char.name.charAt(0)}
                    </span>
                  ) : (
                    <span className="text-dunder-wall text-xl font-dunder font-bold">
                      {agent.agentId.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Status dot */}
                <span
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-dunder-screen-off ${
                    STATUS_COLORS[agent.visualState] ?? "bg-gray-600"
                  }`}
                />
              </div>

              {/* Name + title */}
              <div className="text-center mb-3">
                <div className="text-sm font-dunder font-bold text-dunder-paper leading-tight">
                  {char?.name ?? agent.agentId}
                </div>
                <div className="text-[10px] text-dunder-carpet tracking-wider uppercase mt-0.5">
                  {char?.title ?? instanceLabel}
                </div>
              </div>

              {/* Status badge */}
              <div className="flex items-center justify-center mb-3">
                <span
                  className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                    agent.visualState === "error"
                      ? "bg-red-900/50 text-red-400"
                      : agent.visualState === "offline"
                      ? "bg-gray-800 text-gray-500"
                      : agent.visualState === "idle"
                      ? "bg-green-900/40 text-green-400"
                      : "bg-blue-900/40 text-blue-400"
                  }`}
                >
                  {STATUS_LABELS[agent.visualState] ?? agent.visualState.toUpperCase()}
                </span>
              </div>

              {/* SYS_ID footer */}
              <div className="flex items-center justify-between border-t border-dunder-carpet/10 pt-2 mt-1">
                <span className="text-[9px] text-dunder-carpet font-mono">SYS_ID</span>
                <span className="text-[9px] text-dunder-wall font-mono">{sysId}</span>
              </div>

              {/* Active tool or streaming text */}
              {agent.activeTool && (
                <div className="mt-1.5 text-[9px] text-purple-400 font-mono truncate">
                  ⚙ {agent.activeTool}
                </div>
              )}
              {agent.lastDeltaText && agent.visualState === "talking" && (
                <div className="mt-1 text-[9px] text-dunder-carpet truncate">
                  {agent.lastDeltaText}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
