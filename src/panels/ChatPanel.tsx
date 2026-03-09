import { useEffect, useState } from "react";
import { getGatewayManager } from "../gateway/gatewayRef";
import type { ChatHistoryMessage } from "../gateway/types";
import { getCharacterById } from "../characters/registry";
import { useAgentStore } from "../store/useAgentStore";
import { useGatewayStore } from "../store/useGatewayStore";
import { decodeHistoryPayload, useOpsStore } from "../store/useOpsStore";
import { useUIStore } from "../store/useUIStore";

type Props = {
  instanceId: string;
  agentId: string;
};

function resolveSessionAgentId(
  sessionKey: string | undefined,
  defaultAgentId: string | null | undefined,
): string | undefined {
  if (!sessionKey) return defaultAgentId ?? undefined;
  const [prefix] = sessionKey.split(":");
  if (!prefix || prefix === "main") return defaultAgentId ?? undefined;
  return prefix;
}

function textOf(content: ChatHistoryMessage["content"]): string {
  if (typeof content === "string") return content;
  return content
    .map((item) => (typeof item.text === "string" ? item.text : JSON.stringify(item)))
    .join("\n");
}

export function ChatPanel({ instanceId, agentId }: Props) {
  const agent = useAgentStore((state) => state.agents[instanceId]?.[agentId]);
  const gateway = useGatewayStore((state) => state.instances[instanceId]);
  const ops = useOpsStore((state) => state.instances[instanceId]);
  const setHistory = useOpsStore((state) => state.setHistory);
  const selectSession = useOpsStore((state) => state.selectSession);
  const closePanel = useUIStore((state) => state.closePanel);
  const openPanel = useUIStore((state) => state.openPanel);
  const openDesk = useUIStore((state) => state.openDesk);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultAgentId = gateway?.defaultAgentId ?? null;
  const sessionsForAgent = (ops?.sessions ?? []).filter(
    (session) => resolveSessionAgentId(session.key, defaultAgentId) === agentId,
  );
  const selectedSessionKey =
    (ops?.selectedSessionKey &&
    sessionsForAgent.some((session) => session.key === ops.selectedSessionKey)
      ? ops.selectedSessionKey
      : sessionsForAgent[0]?.key) ?? null;
  const history = selectedSessionKey ? ops?.histories[selectedSessionKey] ?? [] : [];
  const stream = selectedSessionKey ? ops?.sessionStreams[selectedSessionKey] : undefined;
  const needsRefresh =
    selectedSessionKey && ops?.historyNeedsRefresh[selectedSessionKey];
  const character = agent?.characterId ? getCharacterById(agent.characterId) : null;

  useEffect(() => {
    if (!selectedSessionKey) return;
    selectSession(instanceId, selectedSessionKey);
  }, [instanceId, selectSession, selectedSessionKey]);

  useEffect(() => {
    if (!selectedSessionKey) return;
    if (history.length > 0 && !needsRefresh) return;
    const client = getGatewayManager()?.getClient(instanceId);
    if (!client) return;

    let cancelled = false;
    void client.chatHistory(selectedSessionKey, 80).then((result) => {
      if (!cancelled) {
        setHistory(instanceId, selectedSessionKey, decodeHistoryPayload(result.messages));
      }
    }).catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [history.length, instanceId, needsRefresh, selectedSessionKey, setHistory]);

  async function sendMessage() {
    if (!selectedSessionKey || !input.trim()) return;
    const client = getGatewayManager()?.getClient(instanceId);
    if (!client) {
      setError("Gateway is not connected.");
      return;
    }

    const message = input.trim();
    setInput("");
    setBusy(true);
    setError(null);

    try {
      setHistory(instanceId, selectedSessionKey, [
        ...history,
        { role: "user", content: message, ts: Date.now() },
      ]);
      await client.chatSend({
        sessionKey: selectedSessionKey,
        message,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to send.");
    } finally {
      setBusy(false);
    }
  }

  if (!agent) {
    return (
      <div className="p-4 text-dunder-wall">
        <p>Agent not found.</p>
        <button type="button" onClick={closePanel} className="mt-2 text-sm text-dunder-paper underline">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-dunder-blue text-dunder-paper">
      <div className="border-b border-dunder-carpet/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <button type="button" onClick={() => openPanel({ type: "agent", instanceId, agentId })} className="text-xs uppercase tracking-[0.18em] text-dunder-carpet transition-colors hover:text-dunder-paper">
              Back To Agent
            </button>
            <div className="mt-2 font-dunder text-lg font-bold">
              {character?.name ?? agent.name}
            </div>
            <div className="text-xs text-dunder-wall">
              {selectedSessionKey ?? "No live session assigned"}
            </div>
          </div>
          <button type="button" onClick={closePanel} className="text-xl leading-none text-dunder-wall transition-colors hover:text-dunder-paper">
            &times;
          </button>
        </div>
        {selectedSessionKey ? (
          <div className="mt-3 rounded border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs text-green-200">
            Gateway-backed session chat is active.
          </div>
        ) : (
          <div className="mt-3 rounded border border-amber-400/20 bg-amber-400/10 px-3 py-3 text-sm text-amber-100">
            This panel no longer invents local sessions. Create or assign one in Session Desk first.
            <div className="mt-3">
              <button
                type="button"
                onClick={() => openDesk({ instanceId, section: "sessions", agentId })}
                className="rounded border border-amber-400/30 px-3 py-2 font-dunder text-xs uppercase tracking-[0.18em] text-amber-100 transition-colors hover:bg-amber-400/10"
              >
                Open Session Desk
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedSessionKey && (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {history.map((message, index) => (
              <div
                key={`${message.id ?? index}-${message.ts ?? index}`}
                className={`rounded-xl border px-3 py-3 ${
                  message.role === "user"
                    ? "ml-auto max-w-[88%] border-blue-500/30 bg-blue-950/40 text-blue-50"
                    : message.role === "system"
                      ? "border-amber-400/30 bg-amber-950/20 text-amber-100"
                      : "mr-auto max-w-[88%] border-dunder-carpet/20 bg-dunder-screen-off/70 text-dunder-paper"
                }`}
              >
                <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-dunder-carpet">
                  {message.role}
                </div>
                <div className="whitespace-pre-wrap text-sm leading-6">
                  {textOf(message.content)}
                </div>
              </div>
            ))}
            {stream && (
              <div className="mr-auto max-w-[88%] rounded-xl border border-green-500/30 bg-green-950/20 px-3 py-3 text-green-50">
                <div className="mb-1 text-[10px] uppercase tracking-[0.2em]">
                  {stream.state}
                </div>
                <div className="whitespace-pre-wrap text-sm leading-6">
                  {stream.text || "Streaming response..."}
                </div>
              </div>
            )}
            {history.length === 0 && !stream && (
              <div className="rounded border border-dashed border-dunder-carpet/20 px-3 py-4 text-sm text-dunder-wall">
                No transcript loaded yet.
              </div>
            )}
          </div>

          {error && (
            <div className="border-t border-red-500/20 bg-red-950/30 px-4 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="border-t border-dunder-carpet/20 p-4">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={`Message ${character?.name ?? agent.name}...`}
              className="min-h-24 w-full rounded border border-dunder-carpet/30 bg-dunder-screen-off/70 px-3 py-3 font-dunder text-sm text-dunder-paper outline-none transition-colors focus:border-dunder-wall"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => openDesk({ instanceId, section: "sessions", sessionKey: selectedSessionKey, agentId })}
                className="rounded border border-dunder-carpet/30 px-3 py-2 font-dunder text-xs uppercase tracking-[0.18em] text-dunder-paper transition-colors hover:bg-dunder-paper/10"
              >
                Open Full Desk
              </button>
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || busy}
                className="rounded border border-dunder-wall bg-dunder-paper px-3 py-2 font-dunder text-xs uppercase tracking-[0.18em] text-dunder-blue transition-colors hover:bg-dunder-wall disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
