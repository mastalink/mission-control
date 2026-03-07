import { useState, useRef, useEffect, useCallback } from "react";
import { useAgentStore } from "../store/useAgentStore";
import { useGatewayStore } from "../store/useGatewayStore";
import { useUIStore } from "../store/useUIStore";
import { getCharacterById } from "../characters/registry";
import { getGatewayManager } from "../gateway/gatewayRef";

type Props = {
  instanceId: string;
  agentId: string;
};

type LocalMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  ts: number;
  pending?: boolean;
};

export function ChatPanel({ instanceId, agentId }: Props) {
  const agent = useAgentStore((s) => s.agents[instanceId]?.[agentId]);
  const gwStatus = useGatewayStore((s) => s.instances[instanceId]?.status);
  const defaultAgentId = useGatewayStore((s) => s.instances[instanceId]?.defaultAgentId);
  const closePanel = useUIStore((s) => s.closePanel);
  const openPanel = useUIStore((s) => s.openPanel);

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const character = agent?.characterId ? getCharacterById(agent.characterId) : null;
  const isConnected = gwStatus === "connected";

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Build session key for this agent
  useEffect(() => {
    if (!agentId) return;
    // Use agent-specific session key: "agentId:mission-control-chat"
    const key = agentId === defaultAgentId
      ? "main:mission-control-chat"
      : `${agentId}:mission-control-chat`;
    setSessionKey(key);
  }, [agentId, defaultAgentId]);

  // Watch for streaming deltas from the agent store
  useEffect(() => {
    if (!agent || agent.visualState !== "talking") return;
    if (!agent.lastDeltaText) return;

    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant" && last.pending) {
        // Update streaming message
        return [
          ...prev.slice(0, -1),
          { ...last, content: agent.lastDeltaText, ts: Date.now() },
        ];
      }
      return prev;
    });
  }, [agent?.lastDeltaText, agent?.visualState]);

  // When agent goes from talking to idle, finalize the message
  useEffect(() => {
    if (!agent) return;
    if (agent.visualState === "idle" || agent.visualState === "error") {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.pending) {
          return [
            ...prev.slice(0, -1),
            { ...last, pending: false },
          ];
        }
        return prev;
      });
      setSending(false);
    }
  }, [agent?.visualState]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !sessionKey || !isConnected || sending) return;

    const manager = getGatewayManager();
    const client = manager?.getClient(instanceId);
    if (!client) {
      setError("No gateway connection available");
      return;
    }

    const userMsg = input.trim();
    setInput("");
    setError(null);
    setSending(true);

    // Add user message
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMsg, ts: Date.now() },
    ]);

    // Add pending assistant message
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", ts: Date.now(), pending: true },
    ]);

    try {
      // Use agentInvoke with personality injection
      await client.agentInvoke({
        message: userMsg,
        agentId: agentId !== defaultAgentId ? agentId : undefined,
        sessionKey,
        extraSystemPrompt: character?.personality.systemPrompt,
      });
    } catch (err) {
      setSending(false);
      setError(err instanceof Error ? err.message : "Failed to send");
      // Remove the pending message
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.pending) return prev.slice(0, -1);
        return prev;
      });
    }
  }, [input, sessionKey, isConnected, sending, instanceId, agentId, defaultAgentId, character]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const goBack = () => {
    openPanel({ type: "agent", instanceId, agentId });
  };

  if (!agent) {
    return (
      <div className="p-4 text-gray-400">
        <p>Agent not found.</p>
        <button onClick={closePanel} className="mt-2 text-sm text-blue-400 hover:underline">Close</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-gray-700 shrink-0">
        <button onClick={goBack} className="text-gray-400 hover:text-white text-sm">
          &#8592; Back
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Mini avatar */}
          <svg width="28" height="28" viewBox="-10 -10 20 25" className="shrink-0">
            <rect x={-6} y={5} width={12} height={14} rx={2} fill={character?.bodyColor ?? "#6b7280"} />
            <circle cx={0} cy={0} r={6} fill="#fbbf24" stroke={character?.bodyColor ?? "#6b7280"} strokeWidth={1} />
            <circle cx={-2} cy={-1} r={0.9} fill="#1e293b" />
            <circle cx={2} cy={-1} r={0.9} fill="#1e293b" />
          </svg>
          <div className="truncate">
            <div className="text-sm font-bold text-white font-dunder truncate">
              Chat with {character?.name ?? agent.name}
            </div>
            <div className="text-xs text-gray-500">{character?.title ?? "Agent"}</div>
          </div>
        </div>
        <button onClick={closePanel} className="text-gray-400 hover:text-white text-xl leading-none p-1 shrink-0">
          &times;
        </button>
      </div>

      {/* Character greeting (if no messages) */}
      {messages.length === 0 && character && (
        <div className="p-4 text-center">
          <div className="text-4xl mb-2">{character.personality.favoriteEmojis[0] ?? "💬"}</div>
          <p className="text-sm text-gray-300 italic">"{character.personality.greeting}"</p>
          <div className="mt-3 flex flex-wrap gap-1 justify-center">
            {character.personality.strengths.map((s) => (
              <span key={s} className="text-xs px-2 py-0.5 bg-blue-900/30 text-blue-300 rounded-full border border-blue-800/40">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-gray-800 text-gray-200 rounded-bl-sm border border-gray-700"
              }`}
            >
              {msg.content || (msg.pending && (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              ))}
              {msg.content && (
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-3 py-1.5 bg-red-900/30 border-t border-red-800/50 text-xs text-red-300 shrink-0">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-700 p-3 shrink-0">
        {!isConnected ? (
          <div className="text-sm text-gray-500 text-center py-2">
            Not connected to gateway
          </div>
        ) : (
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${character?.name ?? agent.name}...`}
              className="flex-1 bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 outline-none resize-none"
              rows={1}
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition-colors shrink-0 text-sm font-medium"
            >
              {sending ? "..." : "Send"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
