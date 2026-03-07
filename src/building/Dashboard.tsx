import { useGatewayStore } from "../store/useGatewayStore";
import { useAgentStore } from "../store/useAgentStore";
import { useUIStore } from "../store/useUIStore";
import { EmptyState } from "./EmptyState";

type StatCardProps = {
  icon: string;
  value: string | number;
  label: string;
  delta?: string;
  deltaPositive?: boolean;
};

function StatCard({ icon, value, label, delta, deltaPositive }: StatCardProps) {
  return (
    <div className="bg-dunder-screen-off/60 border border-dunder-carpet/20 rounded-lg p-4 relative overflow-hidden">
      {/* Ghost icon background */}
      <div className="absolute top-3 right-3 text-3xl opacity-10 select-none">{icon}</div>

      {/* Delta badge */}
      {delta && (
        <div
          className={`absolute top-3 right-3 text-[10px] font-mono px-1.5 py-0.5 rounded ${
            deltaPositive
              ? "bg-green-900/60 text-green-400"
              : "bg-red-900/60 text-red-400"
          }`}
        >
          {deltaPositive ? "↑" : "↓"} {delta}
        </div>
      )}

      <div className="mt-2">
        <div className="text-3xl font-dunder font-bold text-dunder-paper">{value}</div>
        <div className="text-[11px] text-dunder-carpet tracking-widest uppercase mt-1">{label}</div>
      </div>
    </div>
  );
}

type AgentStatusRowProps = {
  label: string;
  count: number;
  color: string;
};

function AgentStatusRow({ label, count, color }: AgentStatusRowProps) {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-sm font-mono font-bold ${color}`}>{count}</span>
      <span className="text-xs text-dunder-wall font-dunder uppercase tracking-wider">{label}</span>
    </div>
  );
}

type Props = {
  onConnect: (config: { instanceId: string; label: string; url: string }) => void;
};

export function Dashboard({ onConnect }: Props) {
  const instances = useGatewayStore((s) => s.instances);
  const agents = useAgentStore((s) => s.agents);
  const setActivePage = useUIStore((s) => s.setActivePage);
  const hasConnections = Object.keys(instances).length > 0;

  if (!hasConnections) {
    return <EmptyState onConnect={onConnect} />;
  }

  // Aggregate real metrics across all connected gateways
  const allAgents = Object.values(agents).flatMap((inst) => Object.values(inst));
  const totalAgents = allAgents.length;
  const activeAgents = allAgents.filter(
    (a) => a.visualState !== "idle" && a.visualState !== "offline"
  );
  const thinkingAgents = allAgents.filter((a) => a.visualState === "thinking");
  const talkingAgents = allAgents.filter((a) => a.visualState === "talking");
  const errorAgents = allAgents.filter((a) => a.visualState === "error");
  const offlineAgents = allAgents.filter((a) => a.visualState === "offline");
  const totalTokens = allAgents.reduce((sum, a) => sum + (a.totalTokens ?? 0), 0);
  const connectedCount = Object.values(instances).filter(
    (i) => i.status === "connected"
  ).length;

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-3xl font-dunder font-bold text-dunder-paper">System Overview</h1>
        <p className="text-sm text-dunder-carpet mt-1 font-dunder">
          AI Operations & Logistics — Regional Branch
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon="⊞"
          value={totalAgents}
          label="Agents Online"
          delta={totalAgents > 0 ? `${connectedCount} gw` : undefined}
          deltaPositive
        />
        <StatCard
          icon="⌁"
          value={activeAgents.length}
          label="Active Tasks"
          delta={activeAgents.length > 0 ? "live" : undefined}
          deltaPositive={activeAgents.length > 0}
        />
        <StatCard
          icon="◈"
          value={formatTokens(totalTokens)}
          label="Tokens Used"
          delta={totalTokens > 0 ? "+now" : undefined}
          deltaPositive
        />
        <StatCard
          icon="⚠"
          value={errorAgents.length}
          label="Shrinkage Alerts"
          delta={errorAgents.length > 0 ? "!" : undefined}
          deltaPositive={false}
        />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {/* Staff Connectivity */}
        <div className="bg-dunder-screen-off/60 border border-dunder-carpet/20 rounded-lg p-4">
          <h2 className="text-sm font-dunder font-bold text-dunder-paper mb-4 uppercase tracking-wider">
            Staff Connectivity
          </h2>
          <div className="space-y-3">
            <AgentStatusRow label="Active" count={talkingAgents.length + thinkingAgents.length} color="text-green-400" />
            <AgentStatusRow label="Thinking" count={thinkingAgents.length} color="text-amber-400" />
            <AgentStatusRow label="Talking" count={talkingAgents.length} color="text-blue-400" />
            <AgentStatusRow label="Away / Offline" count={offlineAgents.length} color="text-gray-500" />
          </div>
        </div>

        {/* Gateways */}
        <div className="bg-dunder-screen-off/60 border border-dunder-carpet/20 rounded-lg p-4">
          <h2 className="text-sm font-dunder font-bold text-dunder-paper mb-4 uppercase tracking-wider">
            Connected Gateways
          </h2>
          <div className="space-y-2">
            {Object.values(instances).map((inst) => {
              const instAgents = agents[inst.instanceId] ?? {};
              const count = Object.keys(instAgents).length;
              return (
                <div
                  key={inst.instanceId}
                  className="flex items-center gap-3 py-1.5 border-b border-dunder-carpet/10 last:border-0"
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      inst.status === "connected"
                        ? "bg-green-500"
                        : inst.status === "connecting"
                        ? "bg-amber-400 animate-pulse"
                        : inst.status === "error"
                        ? "bg-red-500"
                        : "bg-gray-600"
                    }`}
                  />
                  <span className="text-sm text-dunder-paper font-dunder flex-1">{inst.label}</span>
                  <span className="text-xs text-dunder-carpet font-mono">{count} agents</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setActivePage("floorplan")}
          className="px-4 py-2 text-xs font-dunder text-dunder-paper bg-dunder-screen-off/60 border border-dunder-carpet/30 rounded hover:bg-dunder-paper/10 transition-colors"
        >
          ⌖ View Floor Plan
        </button>
        <button
          onClick={() => setActivePage("ops")}
          className="px-4 py-2 text-xs font-dunder text-dunder-paper bg-dunder-screen-off/60 border border-dunder-carpet/30 rounded hover:bg-dunder-paper/10 transition-colors"
        >
          ⌁ AI Operations
        </button>
        <button
          onClick={() => setActivePage("roster")}
          className="px-4 py-2 text-xs font-dunder text-dunder-paper bg-dunder-screen-off/60 border border-dunder-carpet/30 rounded hover:bg-dunder-paper/10 transition-colors"
        >
          ⊞ Employee Roster
        </button>
      </div>
    </div>
  );
}
