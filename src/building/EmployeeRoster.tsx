import { getConceptLabels } from "../characters/officeVoice";
import { getCharacterById } from "../characters/registry";
import { useAgentStore } from "../store/useAgentStore";
import { useGatewayStore } from "../store/useGatewayStore";
import { useUIStore } from "../store/useUIStore";
import { OperatorGuide } from "./OperatorGuide";

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
  const openDesk = useUIStore((s) => s.openDesk);
  const toggleAddInstance = useUIStore((s) => s.toggleAddInstance);
  const uiMode = useUIStore((s) => s.uiMode);
  const agentLabel = getConceptLabels(uiMode, "agent");
  const gatewayLabel = getConceptLabels(uiMode, "gateway");

  const allAgents = Object.entries(agents).flatMap(([instanceId, instAgents]) =>
    Object.values(instAgents).map((agent) => ({ ...agent, instanceId })),
  );

  if (allAgents.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-5xl opacity-20">⊞</div>
        <h2 className="font-dunder text-xl font-bold text-dunder-paper">
          {uiMode === "idiot" ? "No Workers Yet" : "No Agents on Duty"}
        </h2>
        <p className="max-w-sm font-dunder text-sm text-dunder-carpet">
          {uiMode === "idiot"
            ? `Connect an ${gatewayLabel.primary.toLowerCase()} to make workers show up here.`
            : "Connect to a gateway to see your agents appear here as Dunder Mifflin employees."}
        </p>
        <button
          onClick={toggleAddInstance}
          className="rounded bg-dunder-screen-on px-5 py-2.5 text-sm font-dunder text-dunder-paper transition-colors hover:bg-blue-700"
        >
          {uiMode === "idiot" ? "Connect Office" : "Connect Gateway"}
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-dunder text-3xl font-bold text-dunder-paper">
            {uiMode === "idiot" ? "Workers" : "Employee Roster"}
          </h1>
          <p className="mt-1 font-dunder text-sm text-dunder-carpet">
            {uiMode === "idiot"
              ? "Real workers, dressed as Office people."
              : "OpenClaw agents with Office character assignments"}
          </p>
        </div>
        <button
          onClick={toggleAddInstance}
          className="rounded border border-dunder-carpet/30 bg-dunder-screen-off px-4 py-2 text-xs font-dunder text-dunder-paper transition-colors hover:bg-dunder-paper/10"
        >
          {uiMode === "idiot" ? "+ Connect Office" : "+ Add Gateway"}
        </button>
      </div>

      <div className="mb-6">
        <OperatorGuide
          eyebrow="Roster Primer"
          title="What you are looking at"
          summary={
            uiMode === "idiot"
              ? "The big name is the Office character. The real worker is still underneath. Workers do the work. Characters add the flavor."
              : "The roster shows real agents from your connected gateways, but it presents them as Office employees when a character is assigned. The big name is the character. The system identity stays with the underlying agent."
          }
          terms={[
            {
              term: uiMode === "idiot" ? agentLabel.primary : "OpenClaw Agent",
              definition:
                uiMode === "idiot"
                  ? `The real worker that does the job. Technical label: ${agentLabel.technical}.`
                  : "The real runtime worker loaded from a gateway. Its identity is preserved even when you give it an Office character.",
            },
            {
              term: "Office Character",
              definition:
                uiMode === "idiot"
                  ? "This is the costume and personality layer. It changes how the worker looks and sounds here."
                  : "A visual and thematic role like Dwight or Pam. This affects the floor plan and roster presentation only.",
            },
          ]}
          steps={[
            {
              title: uiMode === "idiot" ? "Connect an office" : "Connect or provision",
              body:
                uiMode === "idiot"
                  ? `A connected ${gatewayLabel.primary.toLowerCase()} gives you real workers.`
                  : "Connected gateways contribute existing agents, and Gateway Workbench can provision new ones directly into that roster.",
            },
            {
              title: uiMode === "idiot" ? "Pick a costume" : "Assign an Office character",
              body:
                uiMode === "idiot"
                  ? "Use Settings if you want a worker to sound and look like Dwight, Pam, Jim, or someone else."
                  : "Open Settings and use Character Mapping to cast an agent as Dwight, Pam, Jim, or another employee.",
            },
            {
              title: uiMode === "idiot" ? "Start a chat" : "Create work in Session Desk",
              body:
                uiMode === "idiot"
                  ? "Session Desk is where you tell a worker what to do."
                  : "Use Session Desk when you want to create a session, choose the agent that runs it, and select the model or channel routing.",
            },
          ]}
          actions={(
            <>
              <button
                type="button"
                onClick={() => openPanel({ type: "settings" })}
                className="rounded-md border border-dunder-carpet/25 bg-dunder-paper/8 px-3 py-2 text-xs uppercase tracking-[0.18em] text-dunder-paper transition-colors hover:bg-dunder-paper/14"
              >
                {uiMode === "idiot" ? "Pick Character" : "Character Mapping"}
              </button>
              <button
                type="button"
                onClick={() => openDesk({ section: uiMode === "idiot" ? "setup" : "sessions" })}
                className="rounded-md border border-dunder-paper/35 bg-dunder-paper/12 px-3 py-2 text-xs uppercase tracking-[0.18em] text-dunder-paper transition-colors hover:bg-dunder-paper/18"
              >
                {uiMode === "idiot" ? "Start Chat" : "Open Session Desk"}
              </button>
            </>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
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
              className="group rounded-lg border border-dunder-carpet/20 bg-dunder-screen-off/60 p-4 text-left transition-all hover:border-dunder-carpet/50 hover:bg-dunder-screen-off/80"
            >
              <div className="relative mb-3 flex justify-center">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-lg border border-dunder-carpet/20 text-3xl"
                  style={{ backgroundColor: char?.bodyColor ?? "#334155" }}
                >
                  {char ? (
                    <span className="text-2xl">{char.name.charAt(0)}</span>
                  ) : (
                    <span className="font-dunder text-xl font-bold text-dunder-wall">
                      {agent.agentId.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span
                  className={`absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-dunder-screen-off ${
                    STATUS_COLORS[agent.visualState] ?? "bg-gray-600"
                  }`}
                />
              </div>

              <div className="mb-3 text-center">
                <div className="text-sm font-dunder font-bold leading-tight text-dunder-paper">
                  {char?.name ?? agent.agentId}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-dunder-carpet">
                  {char?.title ?? instanceLabel}
                </div>
                <div className="mt-1 font-mono text-[10px] text-dunder-wall">
                  {uiMode === "idiot" ? `Worker ${agent.name}` : `Agent ${agent.name}`}
                </div>
              </div>

              <div className="mb-3 flex items-center justify-center">
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[9px] ${
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

              {uiMode !== "idiot" ? (
                <>
                  <div className="mt-1 flex items-center justify-between border-t border-dunder-carpet/10 pt-2">
                    <span className="font-mono text-[9px] text-dunder-carpet">SYS_ID</span>
                    <span className="font-mono text-[9px] text-dunder-wall">{sysId}</span>
                  </div>
                  {agent.activeTool ? (
                    <div className="mt-1.5 truncate font-mono text-[9px] text-purple-400">
                      Tool {agent.activeTool}
                    </div>
                  ) : null}
                  {agent.lastDeltaText && agent.visualState === "talking" ? (
                    <div className="mt-1 truncate text-[9px] text-dunder-carpet">
                      {agent.lastDeltaText}
                    </div>
                  ) : null}
                </>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
