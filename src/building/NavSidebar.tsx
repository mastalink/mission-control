import { useGatewayStore } from "../store/useGatewayStore";
import { useAgentStore } from "../store/useAgentStore";
import { useUIStore, type ActivePage } from "../store/useUIStore";

const NAV_ITEMS: { id: ActivePage; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "floorplan", label: "Floor Plan", icon: "⌖" },
  { id: "roster", label: "Employee Roster", icon: "⊞" },
  { id: "ops", label: "AI Operations", icon: "⌁" },
];

export function NavSidebar() {
  const activePage = useUIStore((s) => s.activePage);
  const setActivePage = useUIStore((s) => s.setActivePage);
  const toggleAddInstance = useUIStore((s) => s.toggleAddInstance);
  const instances = useGatewayStore((s) => s.instances);
  const agents = useAgentStore((s) => s.agents);
  const hasConnections = Object.keys(instances).length > 0;

  const totalAgents = Object.values(agents).reduce(
    (sum, inst) => sum + Object.keys(inst).length,
    0
  );
  const activeAgents = Object.values(agents).reduce(
    (sum, inst) =>
      sum +
      Object.values(inst).filter(
        (a) => a.visualState !== "idle" && a.visualState !== "offline"
      ).length,
    0
  );

  return (
    <aside className="w-52 shrink-0 bg-dunder-blue border-r border-dunder-carpet/30 flex flex-col h-full">
      {/* Logo block */}
      <div className="px-4 py-5 border-b border-dunder-carpet/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-dunder-paper rounded flex items-center justify-center shrink-0">
            <span className="text-dunder-blue font-dunder font-bold text-sm leading-none">DM</span>
          </div>
          <div>
            <div className="text-dunder-paper font-dunder font-bold text-sm leading-tight">MISSION</div>
            <div className="text-dunder-carpet font-dunder text-xs tracking-widest">CONTROL</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors text-left ${
                isActive
                  ? "bg-dunder-paper/10 text-dunder-paper border border-dunder-carpet/30"
                  : "text-dunder-wall hover:text-dunder-paper hover:bg-dunder-paper/5"
              }`}
            >
              <span className="text-base w-5 text-center opacity-70">{item.icon}</span>
              <span className="font-dunder">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Connected gateways — shown when instances exist */}
      {hasConnections && (
        <div className="px-3 py-3 border-t border-dunder-carpet/20">
          <div className="text-[10px] text-dunder-carpet tracking-widest uppercase mb-2 flex items-center gap-1">
            <span>▸</span> Gateways
          </div>
          {Object.values(instances).map((inst) => {
            const instAgents = agents[inst.instanceId] ?? {};
            const count = Object.keys(instAgents).length;
            return (
              <div key={inst.instanceId} className="flex items-center gap-2 py-1 px-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    inst.status === "connected"
                      ? "bg-green-500"
                      : inst.status === "connecting"
                      ? "bg-amber-400 animate-pulse"
                      : inst.status === "error"
                      ? "bg-red-500"
                      : "bg-gray-600"
                  }`}
                />
                <span className="text-xs text-dunder-wall truncate flex-1">{inst.label}</span>
                <span className="text-[10px] text-dunder-carpet">{count}</span>
              </div>
            );
          })}
          <button
            onClick={toggleAddInstance}
            className="mt-1 w-full text-[10px] text-dunder-carpet hover:text-dunder-wall transition-colors text-left px-1 py-0.5"
          >
            + add gateway
          </button>
        </div>
      )}

      {/* System Status */}
      <div className="px-3 py-4 border-t border-dunder-carpet/30">
        <div className="text-[10px] text-dunder-carpet tracking-widest uppercase mb-2 flex items-center gap-1">
          <span className="font-mono">▸_</span> SYSTEM STATUS
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-dunder-wall font-dunder">Sabre Network:</span>
            <span
              className={`font-mono font-bold text-[11px] ${
                hasConnections ? "text-green-400" : "text-gray-500"
              }`}
            >
              {hasConnections ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-dunder-wall font-dunder">Threat Level:</span>
            <span className="font-mono font-bold text-[11px] text-amber-400">MIDNIGHT</span>
          </div>
          {totalAgents > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-dunder-wall font-dunder">Agents:</span>
              <span className="font-mono text-[11px] text-dunder-paper">
                {activeAgents}/{totalAgents}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
