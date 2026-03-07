import { useGatewayStore } from "../store/useGatewayStore";
import { useAgentStore } from "../store/useAgentStore";
import { useUIStore } from "../store/useUIStore";

export function Header() {
  const instances = useGatewayStore((s) => s.instances);
  const activeId = useGatewayStore((s) => s.activeInstanceId);
  const setActive = useGatewayStore((s) => s.setActiveInstance);
  const agents = useAgentStore((s) => s.agents);
  const toggleAddInstance = useUIStore((s) => s.toggleAddInstance);
  const openPanel = useUIStore((s) => s.openPanel);
  const instanceList = Object.values(instances);

  return (
    <header className="bg-dunder-blue border-b border-gray-700 px-2 sm:px-4 py-2 flex items-center justify-between gap-1 sm:gap-3">
      {/* Logo - compact on mobile */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-dunder-paper font-dunder">
          <div className="text-sm sm:text-base font-bold leading-tight">DUNDER MIFFLIN</div>
          <div className="text-[8px] sm:text-[10px] tracking-widest text-gray-400 hidden sm:block">MISSION CONTROL</div>
        </div>
      </div>

      {/* Floor Tabs - scrollable on mobile */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0">
        {instanceList.map((inst) => {
          const instanceAgents = agents[inst.instanceId] ?? {};
          const agentCount = Object.keys(instanceAgents).length;
          const activeAgents = Object.values(instanceAgents).filter((a) => a.visualState !== "idle" && a.visualState !== "offline").length;
          const isActive = inst.instanceId === activeId;

          return (
            <button
              key={inst.instanceId}
              onClick={() => {
                if (isActive) {
                  openPanel({ type: "instance", instanceId: inst.instanceId });
                } else {
                  setActive(inst.instanceId);
                }
              }}
              className={`px-2 sm:px-3 py-1.5 rounded-t text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-gray-800 text-white border-t border-x border-gray-600"
                  : "bg-gray-900 text-gray-400 hover:text-gray-200"
              }`}
            >
              {/* Connection status dot */}
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  inst.status === "connected"
                    ? "bg-green-500"
                    : inst.status === "connecting"
                    ? "bg-yellow-500 animate-pulse"
                    : inst.status === "error"
                    ? "bg-red-500"
                    : "bg-gray-600"
                }`}
              />
              <span className="font-medium">{inst.label}</span>
              <span className="text-xs text-gray-500">
                {activeAgents > 0 ? `${activeAgents}/` : ""}{agentCount}
              </span>
            </button>
          );
        })}

        {/* Add instance button */}
        <button
          onClick={toggleAddInstance}
          className="px-2 py-1.5 text-gray-500 hover:text-gray-300 text-lg leading-none shrink-0"
          title="Add Gateway Instance"
        >
          +
        </button>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          onClick={() => openPanel({ type: "settings" })}
          className="text-gray-400 hover:text-white text-xs sm:text-sm px-1.5 sm:px-2 py-1 rounded hover:bg-gray-700"
        >
          <span className="hidden sm:inline">Settings</span>
          <span className="sm:hidden">&#9881;</span>
        </button>
      </div>
    </header>
  );
}
