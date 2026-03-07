import { useUIStore } from "../store/useUIStore";
import { useGatewayStore } from "../store/useGatewayStore";

export function SettingsPanel() {
  const closePanel = useUIStore((s) => s.closePanel);
  const easterEggsEnabled = useUIStore((s) => s.easterEggsEnabled);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const toggleEasterEggs = useUIStore((s) => s.toggleEasterEggs);
  const toggleSound = useUIStore((s) => s.toggleSound);
  const instances = useGatewayStore((s) => s.instances);

  return (
    <div className="p-4 space-y-4 overflow-y-auto max-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white font-dunder">Settings</h2>
        <button onClick={closePanel} className="text-gray-400 hover:text-white text-xl leading-none p-1">&times;</button>
      </div>

      {/* Connected Instances */}
      <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Connected Floors</h3>
        {Object.values(instances).length === 0 ? (
          <p className="text-sm text-gray-500">No connections.</p>
        ) : (
          <div className="space-y-2">
            {Object.values(instances).map((inst) => (
              <div key={inst.instanceId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    inst.status === "connected" ? "bg-green-500" :
                    inst.status === "connecting" ? "bg-yellow-500" :
                    inst.status === "error" ? "bg-red-500" : "bg-gray-600"
                  }`} />
                  <span className="text-gray-200">{inst.label}</span>
                </div>
                <span className="text-xs text-gray-500 font-mono">
                  {inst.serverVersion ?? inst.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Display Options */}
      <div className="bg-gray-800/50 rounded-lg p-3 space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Display</h3>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-gray-300">Easter Eggs</span>
          <button
            onClick={toggleEasterEggs}
            className={`w-10 h-5 rounded-full transition-colors relative ${easterEggsEnabled ? "bg-blue-600" : "bg-gray-600"}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${easterEggsEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-gray-300">Sound Effects</span>
          <button
            onClick={toggleSound}
            className={`w-10 h-5 rounded-full transition-colors relative ${soundEnabled ? "bg-blue-600" : "bg-gray-600"}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${soundEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </label>
      </div>

      {/* About */}
      <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">About</h3>
        <div className="text-sm space-y-1">
          <p className="text-gray-300">Dunder Mifflin Mission Control</p>
          <p className="text-gray-500 text-xs">v0.1.0</p>
          <p className="text-gray-500 text-xs mt-2">
            A visual dashboard for monitoring OpenClaw agent instances.
            Each gateway connection appears as a floor in the Scranton branch.
          </p>
        </div>
      </div>

      {/* Theme Credit */}
      <div className="text-center text-xs text-gray-600 pt-2">
        <p>"That's what she said."</p>
        <p className="mt-1">- Michael Scott</p>
      </div>
    </div>
  );
}
