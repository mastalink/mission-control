import { useAgentStore } from "../store/useAgentStore";
import { useGatewayStore } from "../store/useGatewayStore";
import { useUIStore, type ActivePage } from "../store/useUIStore";

const NAV_ITEMS: { id: ActivePage; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "DM" },
  { id: "floorplan", label: "Floor Plan", icon: "FP" },
  { id: "roster", label: "Employee Roster", icon: "ER" },
  { id: "desk", label: "Session Desk", icon: "SD" },
];

export function NavSidebar() {
  const activePage = useUIStore((state) => state.activePage);
  const setActivePage = useUIStore((state) => state.setActivePage);
  const setDeskFocus = useUIStore((state) => state.setDeskFocus);
  const toggleAddInstance = useUIStore((state) => state.toggleAddInstance);
  const uiMode = useUIStore((state) => state.uiMode);
  const instances = useGatewayStore((state) => state.instances);
  const agents = useAgentStore((state) => state.agents);
  const hasConnections = Object.keys(instances).length > 0;

  const totalAgents = Object.values(agents).reduce(
    (sum, instanceAgents) => sum + Object.keys(instanceAgents).length,
    0,
  );
  const activeAgents = Object.values(agents).reduce(
    (sum, instanceAgents) =>
      sum +
      Object.values(instanceAgents).filter(
        (agent) => agent.visualState !== "idle" && agent.visualState !== "offline",
      ).length,
    0,
  );

  return (
    <aside className="flex h-full w-52 shrink-0 flex-col border-r border-dunder-carpet/30 bg-dunder-blue">
      <div className="border-b border-dunder-carpet/30 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-dunder-paper">
            <span className="font-dunder text-sm font-bold leading-none text-dunder-blue">
              DM
            </span>
          </div>
          <div>
            <div className="font-dunder text-sm font-bold leading-tight text-dunder-paper">
              MISSION
            </div>
            <div className="font-dunder text-xs tracking-widest text-dunder-carpet">
              CONTROL
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const label =
            uiMode === "idiot"
              ? item.id === "dashboard"
                ? "Overview"
                : item.id === "floorplan"
                  ? "Office Map"
                  : item.id === "roster"
                    ? "Workers"
                    : "Start Chat"
              : item.label;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === "desk" && uiMode === "idiot") {
                  setDeskFocus({ section: "setup" });
                }
                setActivePage(item.id);
              }}
              className={`flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-sm transition-colors ${
                isActive
                  ? "border border-dunder-carpet/30 bg-dunder-paper/10 text-dunder-paper"
                  : "text-dunder-wall hover:bg-dunder-paper/5 hover:text-dunder-paper"
              }`}
            >
              <span className="w-5 text-center font-mono text-[11px] opacity-80">
                {item.icon}
              </span>
              <span className="font-dunder">{label}</span>
            </button>
          );
        })}
      </nav>

      {hasConnections && (
        <div className="border-t border-dunder-carpet/20 px-3 py-3">
          <div className="mb-2 flex items-center gap-1 text-[10px] uppercase tracking-widest text-dunder-carpet">
            <span className="font-mono">GW</span> Gateways
          </div>
          {Object.values(instances).map((instance) => {
            const instanceAgents = agents[instance.instanceId] ?? {};
            const count = Object.keys(instanceAgents).length;
            return (
              <div
                key={instance.instanceId}
                className="flex items-center gap-2 px-1 py-1"
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    instance.status === "connected"
                      ? "bg-green-500"
                      : instance.status === "connecting"
                        ? "bg-amber-400 animate-pulse"
                        : instance.status === "error"
                          ? "bg-red-500"
                          : "bg-gray-600"
                  }`}
                />
                <span className="flex-1 truncate text-xs text-dunder-wall">
                  {instance.label}
                </span>
                <span className="text-[10px] text-dunder-carpet">{count}</span>
              </div>
            );
          })}
          <button
            type="button"
            onClick={toggleAddInstance}
            className="mt-1 w-full px-1 py-0.5 text-left text-[10px] text-dunder-carpet transition-colors hover:text-dunder-wall"
          >
            {uiMode === "idiot" ? "+ connect office" : "+ add gateway"}
          </button>
        </div>
      )}

      <div className="border-t border-dunder-carpet/30 px-3 py-4">
        <div className="mb-2 flex items-center gap-1 text-[10px] uppercase tracking-widest text-dunder-carpet">
          <span className="font-mono">SYS</span> System Status
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-dunder text-dunder-wall">Sabre Network:</span>
            <span
              className={`font-mono text-[11px] font-bold ${
                hasConnections ? "text-green-400" : "text-gray-500"
              }`}
            >
              {hasConnections ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-dunder text-dunder-wall">Threat Level:</span>
            <span className="font-mono text-[11px] font-bold text-amber-400">
              MIDNIGHT
            </span>
          </div>
          {totalAgents > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="font-dunder text-dunder-wall">Agents:</span>
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
