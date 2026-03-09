import { useGatewayStore } from "../store/useGatewayStore";
import { useAgentStore } from "../store/useAgentStore";
import { useChannelStore } from "../store/useChannelStore";
import { useUIStore } from "../store/useUIStore";
import { getCharacterById } from "../characters/registry";

type Props = {
  instanceId: string;
};

const STATUS_STYLE: Record<string, { dot: string; label: string }> = {
  connected: { dot: "bg-green-500", label: "Connected" },
  connecting: { dot: "bg-yellow-500 animate-pulse", label: "Connecting..." },
  error: { dot: "bg-red-500", label: "Error" },
  disconnected: { dot: "bg-gray-600", label: "Disconnected" },
};

function formatUptime(ms: number): string {
  if (!ms) return "--";
  const seconds = Math.floor(ms / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function InstancePanel({ instanceId }: Props) {
  const instance = useGatewayStore((s) => s.instances[instanceId]);
  const agents = useAgentStore((s) => s.agents[instanceId]);
  const channels = useChannelStore((s) => s.channels[instanceId]);
  const closePanel = useUIStore((s) => s.closePanel);
  const openPanel = useUIStore((s) => s.openPanel);
  const openDesk = useUIStore((s) => s.openDesk);

  if (!instance) {
    return (
      <div className="p-4 text-gray-400">
        <p>Instance not found.</p>
        <button onClick={closePanel} className="mt-2 text-sm text-blue-400 hover:underline">Close</button>
      </div>
    );
  }

  const fallbackStatus = { dot: "bg-gray-600", label: "Disconnected" };
  const statusInfo = STATUS_STYLE[instance.status] ?? fallbackStatus;
  const agentList = agents ? Object.values(agents) : [];
  const channelList = channels ? Object.values(channels) : [];
  const activeAgents = agentList.filter((a) => a.visualState !== "idle" && a.visualState !== "offline");
  const errorAgents = agentList.filter((a) => a.visualState === "error");

  return (
    <div className="p-4 space-y-4 overflow-y-auto max-h-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-white font-dunder">{instance.label}</h2>
          <p className="text-sm text-gray-400">Floor Overview</p>
        </div>
        <button onClick={closePanel} className="text-gray-400 hover:text-white text-xl leading-none p-1">&times;</button>
      </div>

      {/* Connection Status */}
      <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${statusInfo.dot}`} />
          <span className="text-sm font-medium text-gray-200">{statusInfo.label}</span>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          <span className="text-gray-500">URL</span>
          <span className="text-gray-300 font-mono text-xs truncate">{instance.url}</span>
          {instance.serverVersion && (
            <>
              <span className="text-gray-500">Version</span>
              <span className="text-gray-300 font-mono text-xs">{instance.serverVersion}</span>
            </>
          )}
          {instance.connId && (
            <>
              <span className="text-gray-500">Conn ID</span>
              <span className="text-gray-300 font-mono text-xs truncate">{instance.connId}</span>
            </>
          )}
          <span className="text-gray-500">Uptime</span>
          <span className="text-gray-300">{formatUptime(instance.uptimeMs)}</span>
          <span className="text-gray-500">Auth</span>
          <span className="text-gray-300 capitalize">{instance.authMode ?? "none"}</span>
        </div>
        {instance.error && (
          <p className="text-xs text-red-400 mt-1">{instance.error}</p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-white">{agentList.length}</p>
          <p className="text-xs text-gray-500">Agents</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{activeAgents.length}</p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <p className={`text-2xl font-bold ${errorAgents.length > 0 ? "text-red-400" : "text-gray-400"}`}>
            {errorAgents.length}
          </p>
          <p className="text-xs text-gray-500">Errors</p>
        </div>
      </div>
      <button
        onClick={() => openDesk({ instanceId, section: "sessions" })}
        className="w-full py-2.5 bg-dunder-paper/10 hover:bg-dunder-paper/20 text-dunder-paper text-sm font-dunder rounded-lg transition-colors border border-dunder-carpet/30"
      >
        Open Session Desk
      </button>

      {/* Agent Roster */}
      <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Agent Roster ({agentList.length})
        </h3>
        {agentList.length === 0 ? (
          <p className="text-sm text-gray-500">No agents loaded.</p>
        ) : (
          <div className="space-y-1">
            {agentList.map((agent) => {
              const char = agent.characterId ? getCharacterById(agent.characterId) : null;
              const stateColor =
                agent.visualState === "idle" ? "bg-green-500" :
                agent.visualState === "talking" ? "bg-blue-500" :
                agent.visualState === "thinking" ? "bg-yellow-500" :
                agent.visualState === "tool_calling" ? "bg-purple-500" :
                agent.visualState === "error" ? "bg-red-500" : "bg-gray-600";
              return (
                <button
                  key={agent.agentId}
                  onClick={() => openPanel({ type: "agent", instanceId, agentId: agent.agentId })}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700/50 transition-colors text-left"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${stateColor}`} />
                  <span className="text-sm text-gray-200 truncate">
                    {char?.name ?? agent.name}
                  </span>
                  <span className="text-xs text-gray-500 ml-auto flex-shrink-0 capitalize">
                    {agent.visualState}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Channels */}
      <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Channels ({channelList.length})
        </h3>
        {channelList.length === 0 ? (
          <p className="text-sm text-gray-500">No channels.</p>
        ) : (
          <div className="space-y-1">
            {channelList.map((ch) => (
              <button
                key={ch.channelId}
                onClick={() => openPanel({ type: "channel", instanceId, channelId: ch.channelId })}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700/50 transition-colors text-left"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ch.connected ? "bg-green-500" : "bg-gray-600"}`} />
                <span className="text-sm text-gray-200">{ch.label}</span>
                {ch.lastError && (
                  <span className="text-xs text-red-400 ml-auto truncate max-w-[120px]">{ch.lastError}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
