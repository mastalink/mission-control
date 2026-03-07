import { useGatewayStore } from "../store/useGatewayStore";
import { useAgentStore } from "../store/useAgentStore";
import { useUIStore, type FloorView } from "../store/useUIStore";
import { FloorPlan } from "../floor/FloorPlan";
import { WarehouseView } from "../floor/WarehouseView";
import { ParkingLot } from "../floor/ParkingLot";
import { loadDemoData } from "../demo/loadDemo";

const FLOOR_TABS: { id: FloorView; label: string; icon: string }[] = [
  { id: "main-office", label: "Main Office", icon: "⌖" },
  { id: "warehouse",   label: "Warehouse",   icon: "⬚" },
  { id: "parking-lot", label: "Parking Lot", icon: "⊡" },
];

export function FloorPlanPage() {
  const instances    = useGatewayStore((s) => s.instances);
  const activeId     = useGatewayStore((s) => s.activeInstanceId);
  const setActive    = useGatewayStore((s) => s.setActiveInstance);
  const agents       = useAgentStore((s) => s.agents);
  const toggleAddInstance = useUIStore((s) => s.toggleAddInstance);
  const floorView    = useUIStore((s) => s.floorView);
  const setFloorView = useUIStore((s) => s.setFloorView);

  const instanceList = Object.values(instances);
  const hasInstances = instanceList.length > 0;

  // Render the SVG against a real instance or an empty string (no agents = empty office)
  const displayId = activeId ?? "";

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar — only rendered when instances exist */}
      {hasInstances && (
        <div className="shrink-0 bg-dunder-blue border-b border-dunder-carpet/30 flex items-center px-3 gap-0">
          {/* Gateway instance tabs */}
          {instanceList.map((inst) => {
            const instAgents  = agents[inst.instanceId] ?? {};
            const agentCount  = Object.keys(instAgents).length;
            const activeCount = Object.values(instAgents).filter(
              (a) => a.visualState !== "idle" && a.visualState !== "offline"
            ).length;
            const isActive = inst.instanceId === activeId;

            return (
              <button
                key={inst.instanceId}
                onClick={() => setActive(inst.instanceId)}
                className={`flex items-center gap-2 px-3 py-2.5 text-xs font-dunder border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-dunder-screen-on text-dunder-paper"
                    : "border-transparent text-dunder-carpet hover:text-dunder-wall"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    inst.status === "connected"
                      ? "bg-green-500"
                      : inst.status === "connecting"
                      ? "bg-amber-400 animate-pulse"
                      : inst.status === "error"
                      ? "bg-red-500"
                      : "bg-gray-600"
                  }`}
                />
                {inst.label}
                {agentCount > 0 && (
                  <span className="text-[10px] text-dunder-carpet">
                    {activeCount > 0 ? `${activeCount}/` : ""}{agentCount}
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={toggleAddInstance}
            className="px-2 py-2.5 text-dunder-carpet hover:text-dunder-wall text-sm transition-colors"
            title="Add Gateway"
          >
            +
          </button>

          <div className="flex-1" />

          {/* Floor view tabs */}
          <div className="flex items-center border border-dunder-carpet/20 rounded overflow-hidden mr-1">
            {FLOOR_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFloorView(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-dunder transition-colors ${
                  floorView === tab.id
                    ? "bg-dunder-paper/10 text-dunder-paper"
                    : "text-dunder-carpet hover:text-dunder-wall hover:bg-dunder-paper/5"
                }`}
              >
                <span className="opacity-70">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floor SVG — always rendered, even without a connection */}
      <div className="flex-1 overflow-hidden relative">
        {floorView === "main-office"  && <FloorPlan instanceId={displayId} />}
        {floorView === "warehouse"    && <WarehouseView instanceId={displayId} />}
        {floorView === "parking-lot"  && <ParkingLot instanceId={displayId} />}

        {/* Floating connect overlay when not connected */}
        {!hasInstances && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto bg-dunder-blue/90 backdrop-blur-sm border border-dunder-carpet/30 rounded-xl p-6 text-center max-w-xs shadow-2xl">
              <div className="text-3xl mb-3 opacity-40">⌖</div>
              <h3 className="text-base font-dunder font-bold text-dunder-paper mb-1">No Agents on Duty</h3>
              <p className="text-xs text-dunder-carpet mb-4">
                Connect a gateway to populate the office with your agents.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={toggleAddInstance}
                  className="px-4 py-2 text-xs font-dunder text-dunder-paper bg-dunder-screen-on rounded hover:bg-blue-700 transition-colors"
                >
                  Connect Gateway
                </button>
                <button
                  onClick={loadDemoData}
                  className="px-4 py-2 text-xs font-dunder text-amber-300 bg-amber-900/40 border border-amber-800/40 rounded hover:bg-amber-900/60 transition-colors"
                >
                  Demo Mode
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
