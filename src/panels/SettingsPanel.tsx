import { useUIStore } from "../store/useUIStore";
import { useGatewayStore } from "../store/useGatewayStore";
import { useAgentStore } from "../store/useAgentStore";
import { useCharacterStore } from "../store/useCharacterStore";
import { THE_OFFICE_CHARACTERS } from "../characters/registry";
import { applyCharacterAssignments } from "../gateway/useGatewayConnection";

export function SettingsPanel() {
  const closePanel = useUIStore((s) => s.closePanel);
  const easterEggsEnabled = useUIStore((s) => s.easterEggsEnabled);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const toggleEasterEggs = useUIStore((s) => s.toggleEasterEggs);
  const toggleSound = useUIStore((s) => s.toggleSound);
  const instances = useGatewayStore((s) => s.instances);
  const agents = useAgentStore((s) => s.agents);
  const { setOverride, clearOverride, overrides } = useCharacterStore();

  const allInstances = Object.values(instances);

  function handleAssign(instanceId: string, agentId: string, characterId: string) {
    if (characterId === "__auto__") {
      clearOverride(instanceId, agentId);
    } else {
      setOverride(instanceId, agentId, characterId);
    }
    const instAgents = Object.values(agents[instanceId] ?? {}).map((a) => ({ id: a.agentId }));
    const defaultId = useAgentStore.getState().defaultAgentIds[instanceId];
    applyCharacterAssignments(instanceId, instAgents, defaultId);
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto max-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white font-dunder">Settings</h2>
        <button onClick={closePanel} className="text-gray-400 hover:text-white text-xl leading-none p-1">&times;</button>
      </div>

      {/* Character Mapping */}
      <div className="bg-gray-800/50 rounded-lg p-3 space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Character Mapping</h3>
        {allInstances.length === 0 ? (
          <p className="text-sm text-gray-500">Connect a gateway to assign characters.</p>
        ) : (
          allInstances.map((inst) => {
            const instAgents = Object.values(agents[inst.instanceId] ?? {});
            const instOverrides = overrides[inst.instanceId] ?? {};
            if (instAgents.length === 0) return null;
            return (
              <div key={inst.instanceId} className="space-y-2">
                <div className="text-[10px] text-dunder-carpet uppercase tracking-widest font-dunder">{inst.label}</div>
                {instAgents.map((agent) => {
                  const currentCharId = agent.characterId ?? "__auto__";
                  const isOverridden = !!instOverrides[agent.agentId];
                  const charImageId = currentCharId !== "__auto__" ? currentCharId.split("-")[0] : null;
                  return (
                    <div key={agent.agentId} className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded shrink-0 bg-gray-700 overflow-hidden"
                        style={charImageId ? {
                          backgroundImage: `url(/chars/${charImageId}.png)`,
                          backgroundSize: "auto 150%",
                          backgroundPosition: "center 15%",
                          backgroundRepeat: "no-repeat",
                        } : {}}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-dunder-paper truncate font-dunder">
                          {agent.name}
                          {isOverridden && <span className="ml-1 text-amber-400 text-[9px]">★</span>}
                        </div>
                        <select
                          value={currentCharId}
                          onChange={(e) => handleAssign(inst.instanceId, agent.agentId, e.target.value)}
                          className="mt-0.5 w-full text-[10px] bg-gray-900 text-gray-300 border border-gray-700 rounded px-1 py-0.5 outline-none"
                        >
                          <option value="__auto__">— Auto assign —</option>
                          {THE_OFFICE_CHARACTERS.map((char) => (
                            <option key={char.id} value={char.id}>{char.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Connected Instances */}
      <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Connected Floors</h3>
        {allInstances.length === 0 ? (
          <p className="text-sm text-gray-500">No connections.</p>
        ) : (
          <div className="space-y-2">
            {allInstances.map((inst) => (
              <div key={inst.instanceId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    inst.status === "connected" ? "bg-green-500" :
                    inst.status === "connecting" ? "bg-yellow-500" :
                    inst.status === "error" ? "bg-red-500" : "bg-gray-600"
                  }`} />
                  <span className="text-gray-200">{inst.label}</span>
                </div>
                <span className="text-xs text-gray-500 font-mono">{inst.serverVersion ?? inst.status}</span>
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

      <div className="text-center text-xs text-gray-600 pt-2">
        <p>"That's what she said."</p>
        <p className="mt-1">- Michael Scott</p>
      </div>
    </div>
  );
}
