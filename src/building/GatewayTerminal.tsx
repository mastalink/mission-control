import { useMemo } from "react";
import { THE_OFFICE_CHARACTERS } from "../characters/registry";
import { useAgentStore } from "../store/useAgentStore";
import { useCharacterStore } from "../store/useCharacterStore";
import { useGatewayStore } from "../store/useGatewayStore";

type TerminalRowProps = {
  label: string;
  value: string;
};

function TerminalRow({ label, value }: TerminalRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dunder-carpet/10 py-2 text-xs font-mono text-dunder-wall last:border-b-0">
      <span>{label}</span>
      <span className="text-dunder-paper">{value}</span>
    </div>
  );
}

export function GatewayTerminal() {
  const instances = useGatewayStore((state) => state.instances);
  const agentsByInstance = useAgentStore((state) => state.agents);
  const overrides = useCharacterStore((state) => state.overrides);

  const instanceList = useMemo(() => Object.values(instances), [instances]);
  const connectedCount = instanceList.filter((instance) => instance.status === "connected").length;
  const agentRows = useMemo(
    () =>
      instanceList.flatMap((instance) =>
        Object.values(agentsByInstance[instance.instanceId] ?? {}).map((agent) => ({
          instanceId: instance.instanceId,
          instanceLabel: instance.label,
          agentId: agent.agentId,
          visualState: agent.visualState,
          characterId: agent.characterId,
          overrideId: overrides[instance.instanceId]?.[agent.agentId] ?? null,
        })),
      ),
    [agentsByInstance, instanceList, overrides],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-dunder-blue">
      <div className="border-b border-dunder-carpet/20 bg-dunder-blue/90 px-6 py-4">
        <div className="font-dunder text-xs font-bold uppercase tracking-[0.35em] text-dunder-carpet">
          Sabre Ops Console
        </div>
        <h1 className="mt-2 font-dunder text-3xl font-bold text-dunder-paper">
          Gateway Terminal Preview
        </h1>
        <p className="mt-2 max-w-3xl font-dunder text-sm text-dunder-wall">
          This view is parked as a read-only operator console while Mission Control routes
          active work through the Session Desk. It remains Office-themed and build-safe during
          the merge.
        </p>
      </div>

      <div className="grid flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-dunder-carpet/20 bg-dunder-blue/80 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.3)] backdrop-blur-sm">
          <div className="font-dunder text-lg font-bold text-dunder-paper">Gateway Summary</div>
          <div className="mt-4 space-y-2">
            <TerminalRow label="Connected gateways" value={String(connectedCount)} />
            <TerminalRow label="Known gateways" value={String(instanceList.length)} />
            <TerminalRow label="Tracked agents" value={String(agentRows.length)} />
          </div>

          <div className="mt-6 font-dunder text-sm font-bold uppercase tracking-[0.25em] text-dunder-carpet">
            Instances
          </div>
          <div className="mt-3 space-y-3">
            {instanceList.map((instance) => (
              <div
                key={instance.instanceId}
                className="rounded-xl border border-dunder-carpet/20 bg-dunder-paper/5 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-dunder text-base font-bold text-dunder-paper">
                      {instance.label}
                    </div>
                    <div className="mt-1 text-xs font-mono text-dunder-wall">
                      {instance.instanceId}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-mono uppercase ${
                      instance.status === "connected"
                        ? "bg-green-500/15 text-green-400"
                        : instance.status === "connecting"
                          ? "bg-amber-400/15 text-amber-300"
                          : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    {instance.status}
                  </span>
                </div>
                <div className="mt-3 text-xs font-mono text-dunder-wall">{instance.url}</div>
                {instance.serverVersion ? (
                  <div className="mt-2 text-xs font-mono text-dunder-carpet">
                    v{instance.serverVersion}
                  </div>
                ) : null}
              </div>
            ))}
            {instanceList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-dunder-carpet/20 px-3 py-6 text-center font-dunder text-sm text-dunder-wall">
                No gateways connected yet.
              </div>
            ) : null}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-dunder-carpet/20 bg-dunder-screen-off shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between border-b border-dunder-carpet/20 px-4 py-3">
            <div className="font-dunder text-lg font-bold text-dunder-paper">
              Assignment Readout
            </div>
            <div className="font-mono text-xs text-dunder-wall">
              Session creation and model routing now live in Session Desk
            </div>
          </div>

          <div className="h-full overflow-y-auto px-4 py-3 font-mono text-xs text-dunder-paper">
            {agentRows.map((row) => {
              const character = THE_OFFICE_CHARACTERS.find((entry) => entry.id === row.characterId);
              const characterLabel = character?.name ?? row.characterId ?? "Unassigned";
              return (
                <div
                  key={`${row.instanceId}:${row.agentId}`}
                  className="border-b border-dunder-carpet/10 py-3 last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-dunder-paper">{row.agentId}</div>
                    <div className="text-dunder-wall">{row.instanceLabel}</div>
                  </div>
                  <div className="mt-1 text-dunder-carpet">
                    {characterLabel}
                    {row.overrideId ? " [override]" : " [auto]"}
                  </div>
                  <div className="mt-1 text-dunder-wall">state={row.visualState}</div>
                </div>
              );
            })}
            {agentRows.length === 0 ? (
              <div className="py-8 text-center font-dunder text-sm text-dunder-wall">
                No agents available. Connect a gateway, then use the Session Desk for live work.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
