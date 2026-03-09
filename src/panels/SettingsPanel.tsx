import { DwightCoach } from "../building/DwightCoach";
import { OperatorGuide } from "../building/OperatorGuide";
import { THE_OFFICE_CHARACTERS } from "../characters/registry";
import { applyCharacterAssignments } from "../gateway/useGatewayConnection";
import { useAgentStore } from "../store/useAgentStore";
import { useCharacterStore } from "../store/useCharacterStore";
import { useGatewayStore } from "../store/useGatewayStore";
import { useUIStore } from "../store/useUIStore";

export function SettingsPanel() {
  const closePanel = useUIStore((s) => s.closePanel);
  const openDesk = useUIStore((s) => s.openDesk);
  const easterEggsEnabled = useUIStore((s) => s.easterEggsEnabled);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const toggleEasterEggs = useUIStore((s) => s.toggleEasterEggs);
  const toggleSound = useUIStore((s) => s.toggleSound);
  const uiMode = useUIStore((s) => s.uiMode);
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
    <div className="max-h-full space-y-4 overflow-y-auto bg-dunder-blue p-4 text-dunder-paper">
      <div className="flex items-center justify-between">
        <h2 className="font-dunder text-lg font-bold text-dunder-paper">
          {uiMode === "idiot" ? "Pick Office Character" : "Settings"}
        </h2>
        <button
          onClick={closePanel}
          className="p-1 text-xl leading-none text-dunder-wall transition-colors hover:text-dunder-paper"
        >
          &times;
        </button>
      </div>

      {uiMode === "idiot" ? (
        <DwightCoach
          step="character"
          compact
          headline="Characters are costumes. Workers still do the actual work."
          detail="Pick who your worker sounds and looks like. Leave it on auto if you do not want to micromanage the casting department."
          nextActionLabel="Pick a worker, choose an Office character, then return to Start Chat."
        />
      ) : (
        <OperatorGuide
          eyebrow="Casting Call"
          title="Characters are visual assignments, not agent creation"
          summary="Use this panel to decide which Office character represents each real gateway agent. The underlying agent id, tools, and runtime stay the same. Session Desk is where you create work for those agents."
          steps={[
            {
              title: "Load agents from a gateway",
              body: "Connect a gateway first. Mission Control only maps characters onto agents that already exist there.",
            },
            {
              title: "Pick a character or stay on auto",
              body: "Auto assign lets Mission Control choose the cast. A manual override locks a specific Office character to that agent.",
            },
            {
              title: "Route work in Session Desk",
              body: "After the cast is set, use Session Desk to create sessions, choose models, and route work to the agent you want.",
            },
          ]}
          actions={(
            <button
              type="button"
              onClick={() => openDesk({ section: "sessions" })}
              className="rounded-md border border-dunder-paper/35 bg-dunder-paper/12 px-3 py-2 text-xs uppercase tracking-[0.18em] text-dunder-paper transition-colors hover:bg-dunder-paper/18"
            >
              Open Session Desk
            </button>
          )}
          compact
        />
      )}

      <div className="space-y-3 rounded-lg border border-dunder-carpet/20 bg-dunder-screen-off/55 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-dunder-carpet">
          {uiMode === "idiot" ? "Pick Office Character" : "Character Mapping"}
        </h3>
        <p className="text-sm text-dunder-wall">
          {uiMode === "idiot"
            ? "These dropdowns change the costume and personality. They do not create, rename, or delete the real worker."
            : "These dropdowns only change the Office character shown in Mission Control. They do not create, rename, or delete agents on the gateway."}
        </p>
        {allInstances.length === 0 ? (
          <p className="text-sm text-dunder-wall">
            {uiMode === "idiot" ? "Connect an office first." : "Connect a gateway to assign characters."}
          </p>
        ) : (
          allInstances.map((inst) => {
            const instAgents = Object.values(agents[inst.instanceId] ?? {});
            const instOverrides = overrides[inst.instanceId] ?? {};
            if (instAgents.length === 0) return null;
            return (
              <div key={inst.instanceId} className="space-y-2">
                <div className="font-dunder text-[10px] uppercase tracking-widest text-dunder-carpet">
                  {inst.label}
                </div>
                {instAgents.map((agent) => {
                  const currentCharId = agent.characterId ?? "__auto__";
                  const isOverridden = !!instOverrides[agent.agentId];
                  const charImageId = currentCharId !== "__auto__" ? currentCharId.split("-")[0] : null;
                  return (
                    <div
                      key={agent.agentId}
                      className="flex items-center gap-3 rounded-lg border border-dunder-carpet/20 bg-dunder-paper/6 p-2"
                    >
                      <div
                        className="h-8 w-8 shrink-0 overflow-hidden rounded bg-dunder-screen-off"
                        style={
                          charImageId
                            ? {
                                backgroundImage: `url(/chars/${charImageId}.png)`,
                                backgroundSize: "auto 150%",
                                backgroundPosition: "center 15%",
                                backgroundRepeat: "no-repeat",
                              }
                            : {}
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-dunder text-xs text-dunder-paper">
                          {agent.name}
                          {isOverridden ? (
                            <span className="ml-1 text-[9px] text-amber-400">manual</span>
                          ) : null}
                        </div>
                        <div className="truncate font-mono text-[10px] text-dunder-carpet">
                          {agent.agentId}
                        </div>
                        <select
                          value={currentCharId}
                          onChange={(event) => handleAssign(inst.instanceId, agent.agentId, event.target.value)}
                          className="mt-1 w-full rounded border border-dunder-carpet/25 bg-dunder-blue px-2 py-1 text-[10px] text-dunder-paper outline-none"
                        >
                          <option value="__auto__">Auto assign</option>
                          {THE_OFFICE_CHARACTERS.map((char) => (
                            <option key={char.id} value={char.id}>
                              {char.name}
                            </option>
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

      <div className="space-y-2 rounded-lg border border-dunder-carpet/20 bg-dunder-screen-off/55 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-dunder-carpet">
          {uiMode === "idiot" ? "Connected Offices" : "Connected Floors"}
        </h3>
        {allInstances.length === 0 ? (
          <p className="text-sm text-dunder-wall">No connections.</p>
        ) : (
          <div className="space-y-2">
            {allInstances.map((inst) => (
              <div key={inst.instanceId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      inst.status === "connected"
                        ? "bg-green-500"
                        : inst.status === "connecting"
                          ? "bg-amber-400"
                          : inst.status === "error"
                            ? "bg-red-500"
                            : "bg-gray-600"
                    }`}
                  />
                  <span className="text-dunder-paper">{inst.label}</span>
                </div>
                <span className="font-mono text-xs text-dunder-wall">
                  {inst.serverVersion ?? inst.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-dunder-carpet/20 bg-dunder-screen-off/55 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-dunder-carpet">Display</h3>
        <label className="flex cursor-pointer items-center justify-between">
          <span className="text-sm text-dunder-paper">Easter Eggs</span>
          <button
            onClick={toggleEasterEggs}
            className={`relative h-5 w-10 rounded-full transition-colors ${easterEggsEnabled ? "bg-dunder-screen-on" : "bg-gray-600"}`}
          >
            <div
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-dunder-paper transition-transform ${easterEggsEnabled ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </button>
        </label>
        <label className="flex cursor-pointer items-center justify-between">
          <span className="text-sm text-dunder-paper">Sound Effects</span>
          <button
            onClick={toggleSound}
            className={`relative h-5 w-10 rounded-full transition-colors ${soundEnabled ? "bg-dunder-screen-on" : "bg-gray-600"}`}
          >
            <div
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-dunder-paper transition-transform ${soundEnabled ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </button>
        </label>
      </div>

      <div className="pt-2 text-center text-xs text-dunder-wall">
        <p>"That's what she said."</p>
        <p className="mt-1">- Michael Scott</p>
      </div>
    </div>
  );
}
