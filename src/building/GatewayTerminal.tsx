import { useState, useEffect, useRef, useCallback } from "react";
import { getGatewayManager, gatewayConnect, gatewayDisconnect } from "../gateway/gatewayRef";
import { useGatewayStore } from "../store/useGatewayStore";
import { useAgentStore } from "../store/useAgentStore";
import { useCharacterStore } from "../store/useCharacterStore";
import { THE_OFFICE_CHARACTERS } from "../characters/registry";
import { applyCharacterAssignments } from "../gateway/useGatewayConnection";
import { normalizeGatewayUrl } from "../gateway/connectionUtils";

type LineType = "user" | "info" | "success" | "error" | "warning" | "data" | "header" | "dim";

type OutputLine = {
  id: number;
  type: LineType;
  text: string;
  ts: string;
};

const ALL_COMMANDS = [
  "help", "clear", "instances", "agents", "sessions", "health",
  "channels", "cron", "ping", "send", "assign", "map",
  "connect", "disconnect", "history",
];

function now() {
  const d = new Date();
  return `[${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}]`;
}

function fmtMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}

export function GatewayTerminal() {
  const [lines, setLines] = useState<OutputLine[]>([]);
  const [input, setInput] = useState("");
  const idRef = useRef(0);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const tabStateRef = useRef<{ prefix: string; matches: string[]; idx: number } | null>(null);

  const instances = useGatewayStore((s) => s.instances);
  const agents = useAgentStore((s) => s.agents);

  const push = useCallback((text: string, type: LineType = "info") => {
    setLines((prev) => [
      ...prev.slice(-500),
      { id: idRef.current++, type, text, ts: now() },
    ]);
  }, []);

  // Boot sequence
  useEffect(() => {
    const bootLines = [
      { t: "header", v: "╔══════════════════════════════════════════════════════════╗" },
      { t: "header", v: "║   DUNDER MIFFLIN MISSION CONTROL — SCRANTON GATEWAY TUI  ║" },
      { t: "header", v: "╚══════════════════════════════════════════════════════════╝" },
      { t: "dim",    v: "  SABRE_OS v3.2 | Protocol 3 | OpenClaw Gateway Interface" },
      { t: "info",   v: "  Type 'help' for available commands. Tab to autocomplete." },
      { t: "dim",    v: "──────────────────────────────────────────────────────────" },
    ];
    const timers = bootLines.map(({ t, v }, i) =>
      setTimeout(() => push(v, t as LineType), i * 60)
    );
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input on mount and on click anywhere in terminal
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /** Resolve first connected instance ID, or a named one */
  function resolveInstance(hint?: string): string | null {
    const all = useGatewayStore.getState().instances;
    if (hint) {
      // Match by partial label or instanceId
      const match = Object.values(all).find(
        (i) => i.instanceId === hint || i.label.toLowerCase().includes(hint.toLowerCase())
      );
      return match?.instanceId ?? null;
    }
    const connected = Object.values(all).find((i) => i.status === "connected");
    return connected?.instanceId ?? Object.keys(all)[0] ?? null;
  }

  /** Main command dispatcher */
  const runCommand = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    push(`> ${trimmed}`, "user");
    historyRef.current = [trimmed, ...historyRef.current.slice(0, 99)];
    historyIdxRef.current = -1;

    const [cmd, ...args] = trimmed.split(/\s+/);

    switch (cmd?.toLowerCase()) {

      case "help": {
        push("Available commands:", "header");
        const cmds: [string, string][] = [
          ["help",              "Show this help"],
          ["clear",             "Clear the terminal"],
          ["instances",         "List connected gateway instances"],
          ["agents [inst]",     "List agents (optionally for a specific instance)"],
          ["sessions [inst]",   "List recent sessions"],
          ["health [inst]",     "Gateway health summary"],
          ["channels [inst]",   "Channel connection status"],
          ["cron [inst]",       "Cron job status"],
          ["ping [inst]",       "Measure round-trip latency"],
          ["send <agent> <msg>","Send a message to an agent"],
          ["assign <a> <char>", "Assign a character to an agent"],
          ["map [inst]",        "Show current character assignments"],
          ["connect <url> [tok]","Connect a new gateway instance"],
          ["disconnect <inst>", "Disconnect and forget an instance"],
          ["history",           "Show command history"],
        ];
        cmds.forEach(([c, d]) => push(`  ${c.padEnd(24)} ${d}`, "dim"));
        break;
      }

      case "clear":
        setLines([]);
        break;

      case "history":
        if (historyRef.current.length === 0) {
          push("No history yet.", "dim");
        } else {
          historyRef.current.slice(0, 20).forEach((h, i) =>
            push(`  ${String(i + 1).padStart(2)}  ${h}`, "dim")
          );
        }
        break;

      case "instances": {
        const all = useGatewayStore.getState().instances;
        const list = Object.values(all);
        if (list.length === 0) {
          push("No connected instances. Use 'connect <url>' to add one.", "warning");
          break;
        }
        push(`${list.length} instance(s):`, "header");
        list.forEach((inst) => {
          const dot = inst.status === "connected" ? "●" : inst.status === "connecting" ? "○" : "✗";
          const col: LineType = inst.status === "connected" ? "success" : inst.status === "error" ? "error" : "warning";
          push(`  ${dot}  ${inst.label.padEnd(20)} ${inst.url}`, col);
          if (inst.serverVersion) push(`        version: ${inst.serverVersion}`, "dim");
        });
        break;
      }

      case "agents": {
        const instId = resolveInstance(args[0]);
        if (!instId) { push("No connected instance. Use 'connect <url>' first.", "warning"); break; }
        const inst = useGatewayStore.getState().instances[instId];
        push(`Fetching agents from ${inst?.label ?? instId}...`, "dim");
        try {
          const client = getGatewayManager()?.getClient(instId);
          if (!client) throw new Error("No client for instance");
          const result = await client.fetchAgentsList() as { agents: Array<{ id: string; name?: string; identity?: { name?: string; emoji?: string } }> };
          const agentList = result.agents ?? [];
          push(`${agentList.length} agent(s):`, "header");
          const storeAgents = useAgentStore.getState().agents[instId] ?? {};
          agentList.forEach((a) => {
            const sa = storeAgents[a.id];
            const charId = sa?.characterId ?? "—";
            const state = sa?.visualState ?? "unknown";
            const emoji = a.identity?.emoji ?? "🤖";
            const name = a.identity?.name ?? a.name ?? a.id;
            push(`  ${emoji}  ${a.id.padEnd(20)} ${name.padEnd(20)} char:${charId.padEnd(18)} [${state}]`, "data");
          });
        } catch (e) {
          push(`Error: ${e instanceof Error ? e.message : String(e)}`, "error");
        }
        break;
      }

      case "sessions": {
        const instId = resolveInstance(args[0]);
        if (!instId) { push("No connected instance.", "warning"); break; }
        const inst = useGatewayStore.getState().instances[instId];
        push(`Fetching sessions from ${inst?.label ?? instId}...`, "dim");
        try {
          const client = getGatewayManager()?.getClient(instId);
          if (!client) throw new Error("No client for instance");
          const result = await client.fetchSessionsList({ limit: 20, includeDerivedTitles: true });
          const sessions = result.sessions ?? [];
          push(`${sessions.length} session(s):`, "header");
          sessions.forEach((s) => {
            const ts = s.createdAt ? new Date(s.createdAt).toLocaleString() : "—";
            push(`  ${s.sessionKey?.padEnd(30) ?? "—"} ${(s.title ?? s.label ?? "untitled").slice(0, 40)}`, "data");
            push(`        created: ${ts}`, "dim");
          });
        } catch (e) {
          push(`Error: ${e instanceof Error ? e.message : String(e)}`, "error");
        }
        break;
      }

      case "health": {
        const instId = resolveInstance(args[0]);
        if (!instId) { push("No connected instance.", "warning"); break; }
        push("Checking health...", "dim");
        try {
          const client = getGatewayManager()?.getClient(instId);
          if (!client) throw new Error("No client");
          const health = await client.fetchHealth() as Record<string, unknown>;
          push("Health summary:", "header");
          Object.entries(health ?? {}).forEach(([k, v]) => {
            push(`  ${k.padEnd(20)} ${JSON.stringify(v)}`, "data");
          });
        } catch (e) {
          push(`Error: ${e instanceof Error ? e.message : String(e)}`, "error");
        }
        break;
      }

      case "channels": {
        const instId = resolveInstance(args[0]);
        if (!instId) { push("No connected instance.", "warning"); break; }
        push("Fetching channel status...", "dim");
        try {
          const client = getGatewayManager()?.getClient(instId);
          if (!client) throw new Error("No client");
          const result = await client.fetchChannelsStatus() as { channels?: Array<{ id?: string; status?: string; type?: string; error?: string }> };
          const channels = result.channels ?? [];
          if (channels.length === 0) { push("No channels configured.", "dim"); break; }
          push(`${channels.length} channel(s):`, "header");
          channels.forEach((ch) => {
            const ok = ch.status === "connected" || ch.status === "running";
            push(`  ${ok ? "●" : "○"}  ${(ch.id ?? "unknown").padEnd(25)} ${ch.type?.padEnd(15) ?? ""}  [${ch.status ?? "unknown"}]`, ok ? "success" : "warning");
            if (ch.error) push(`        error: ${ch.error}`, "error");
          });
        } catch (e) {
          push(`Error: ${e instanceof Error ? e.message : String(e)}`, "error");
        }
        break;
      }

      case "cron": {
        const instId = resolveInstance(args[0]);
        if (!instId) { push("No connected instance.", "warning"); break; }
        push("Fetching cron jobs...", "dim");
        try {
          const client = getGatewayManager()?.getClient(instId);
          if (!client) throw new Error("No client");
          const result = await client.fetchCronStatus() as { jobs?: Array<{ id?: string; schedule?: string; enabled?: boolean; lastRun?: string }> };
          const jobs = result.jobs ?? [];
          if (jobs.length === 0) { push("No cron jobs.", "dim"); break; }
          push(`${jobs.length} cron job(s):`, "header");
          jobs.forEach((job) => {
            push(`  ${job.enabled ? "●" : "○"}  ${(job.id ?? "?").padEnd(25)} ${job.schedule ?? ""}`, job.enabled ? "success" : "dim");
            if (job.lastRun) push(`        last run: ${job.lastRun}`, "dim");
          });
        } catch (e) {
          push(`Error: ${e instanceof Error ? e.message : String(e)}`, "error");
        }
        break;
      }

      case "ping": {
        const instId = resolveInstance(args[0]);
        if (!instId) { push("No connected instance.", "warning"); break; }
        push("Pinging...", "dim");
        try {
          const client = getGatewayManager()?.getClient(instId);
          if (!client) throw new Error("No client");
          const t0 = performance.now();
          await client.fetchHealth();
          const ms = Math.round(performance.now() - t0);
          push(`Pong! Latency: ${fmtMs(ms)}`, ms < 200 ? "success" : "warning");
        } catch (e) {
          push(`Ping failed: ${e instanceof Error ? e.message : String(e)}`, "error");
        }
        break;
      }

      case "send": {
        if (args.length < 2) {
          push("Usage: send <agentId> <message...>", "warning");
          break;
        }
        const agentId = args[0]!;
        const message = args.slice(1).join(" ");
        const instId = resolveInstance();
        if (!instId) { push("No connected instance.", "warning"); break; }
        push(`Sending to ${agentId}: "${message}"`, "dim");
        try {
          const client = getGatewayManager()?.getClient(instId);
          if (!client) throw new Error("No client");
          // Build session key: agentId:main
          const sessionKey = `${agentId}:main`;
          const result = await client.chatSend({ sessionKey, message }) as { runId?: string };
          push(`Message sent. runId: ${result.runId ?? "unknown"}`, "success");
          push(`Watch the floor plan for ${agentId}'s response.`, "dim");
        } catch (e) {
          push(`Error: ${e instanceof Error ? e.message : String(e)}`, "error");
        }
        break;
      }

      case "assign": {
        if (args.length < 2) {
          push("Usage: assign <agentId> <characterId>", "warning");
          push("Character IDs: " + THE_OFFICE_CHARACTERS.map((c) => c.id).join(", "), "dim");
          break;
        }
        const [agentId, charId] = args;
        const instId = resolveInstance();
        if (!instId) { push("No connected instance.", "warning"); break; }
        const char = THE_OFFICE_CHARACTERS.find((c) => c.id === charId || c.name.toLowerCase().replace(/\s+/g, "-") === charId?.toLowerCase());
        if (!char) {
          push(`Unknown character: ${charId}`, "error");
          push("Available: " + THE_OFFICE_CHARACTERS.map((c) => c.id).join(", "), "dim");
          break;
        }
        useCharacterStore.getState().setOverride(instId, agentId!, char.id);
        const instAgents = Object.values(useAgentStore.getState().agents[instId] ?? {}).map((a) => ({ id: a.agentId }));
        const defaultId = useAgentStore.getState().defaultAgentIds[instId];
        applyCharacterAssignments(instId, instAgents, defaultId);
        push(`Assigned ${agentId} → ${char.name} (${char.id})`, "success");
        break;
      }

      case "map": {
        const instId = resolveInstance(args[0]);
        if (!instId) { push("No connected instance.", "warning"); break; }
        const storeAgents = useAgentStore.getState().agents[instId] ?? {};
        const overrides = useCharacterStore.getState().overrides[instId] ?? {};
        push("Character assignments:", "header");
        Object.values(storeAgents).forEach((agent) => {
          const charName = THE_OFFICE_CHARACTERS.find((c) => c.id === agent.characterId)?.name ?? agent.characterId ?? "—";
          const tag = overrides[agent.agentId] ? " [override]" : " [auto]";
          push(`  ${agent.agentId.padEnd(25)} → ${charName}${tag}`, "data");
        });
        break;
      }

      case "connect": {
        if (!args[0]) { push("Usage: connect <url> [token] [label]", "warning"); break; }
        const url = normalizeGatewayUrl(args[0]);
        const token = args[1];
        const label = args.slice(2).join(" ") || new URL(url.replace(/^ws/, "http")).hostname;
        const instanceId = `gw-${Date.now()}`;
        push(`Connecting to ${url}...`, "dim");
        gatewayConnect({ instanceId, label, url, token });
        push(`Connection initiated. Instance ID: ${instanceId}`, "success");
        push(`Watch 'instances' for status.`, "dim");
        break;
      }

      case "disconnect": {
        if (!args[0]) {
          push("Usage: disconnect <instanceId|label>", "warning");
          break;
        }
        const instId = resolveInstance(args[0]);
        if (!instId) { push(`No instance matching '${args[0]}'.`, "error"); break; }
        const inst = useGatewayStore.getState().instances[instId];
        gatewayDisconnect(instId, { forget: true });
        push(`Disconnected from ${inst?.label ?? instId}.`, "success");
        break;
      }

      default:
        push(`Command not recognized: '${cmd}'. Type 'help' for available commands.`, "error");
        push(`Threat Level: MIDNIGHT. This incident has been reported to Toby.`, "dim");
    }
  }, [push]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = input.trim();
    setInput("");
    tabStateRef.current = null;
    if (val) runCommand(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const h = historyRef.current;
      if (h.length === 0) return;
      const nextIdx = Math.min(historyIdxRef.current + 1, h.length - 1);
      historyIdxRef.current = nextIdx;
      setInput(h[nextIdx] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = historyIdxRef.current - 1;
      if (nextIdx < 0) {
        historyIdxRef.current = -1;
        setInput("");
      } else {
        historyIdxRef.current = nextIdx;
        setInput(historyRef.current[nextIdx] ?? "");
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const parts = input.split(/\s+/);
      if (parts.length === 1) {
        // Complete command name
        const prefix = parts[0] ?? "";
        const prev = tabStateRef.current;
        if (prev?.prefix === prefix) {
          // Cycle through matches
          const nextIdx = (prev.idx + 1) % prev.matches.length;
          tabStateRef.current = { ...prev, idx: nextIdx };
          setInput(prev.matches[nextIdx] ?? prefix);
        } else {
          const matches = ALL_COMMANDS.filter((c) => c.startsWith(prefix));
          if (matches.length === 1) {
            setInput(matches[0] + " ");
            tabStateRef.current = null;
          } else if (matches.length > 1) {
            tabStateRef.current = { prefix, matches, idx: 0 };
            setInput(matches[0] ?? prefix);
            push(`  ${matches.join("  ")}`, "dim");
          }
        }
      } else if (parts[0] === "assign" && parts.length === 3) {
        // Complete character IDs
        const prefix = parts[2] ?? "";
        const matches = THE_OFFICE_CHARACTERS.map((c) => c.id).filter((id) => id.startsWith(prefix));
        if (matches.length === 1) {
          setInput(`assign ${parts[1]} ${matches[0]} `);
        } else if (matches.length > 1) {
          push(`  ${matches.join("  ")}`, "dim");
        }
      } else if ((parts[0] === "agents" || parts[0] === "sessions" || parts[0] === "health"
               || parts[0] === "channels" || parts[0] === "cron" || parts[0] === "ping"
               || parts[0] === "disconnect") && parts.length === 2) {
        // Complete instance label
        const prefix = parts[1] ?? "";
        const insts = Object.values(useGatewayStore.getState().instances);
        const matches = insts.filter((i) => i.label.startsWith(prefix) || i.instanceId.startsWith(prefix));
        if (matches.length === 1) {
          setInput(`${parts[0]} ${matches[0]!.label} `);
        }
      } else if (parts[0] === "send" && parts.length === 2) {
        // Complete agent ID
        const prefix = parts[1] ?? "";
        const instId = resolveInstance();
        if (instId) {
          const agentIds = Object.keys(useAgentStore.getState().agents[instId] ?? {});
          const matches = agentIds.filter((id) => id.startsWith(prefix));
          if (matches.length === 1) setInput(`send ${matches[0]} `);
          else if (matches.length > 1) push(`  ${matches.join("  ")}`, "dim");
        }
      }
    } else {
      tabStateRef.current = null;
    }
  };

  const lineColor: Record<LineType, string> = {
    user:    "text-dunder-paper",
    info:    "text-gray-300",
    success: "text-green-400",
    error:   "text-red-400",
    warning: "text-amber-400",
    data:    "text-blue-300",
    header:  "text-dunder-carpet",
    dim:     "text-gray-600",
  };

  const activeInstances = Object.values(instances).filter((i) => i.status === "connected");
  const allAgentsCount = Object.values(agents).reduce((s, inst) => s + Object.keys(inst).length, 0);

  return (
    <div className="h-full flex gap-0 overflow-hidden" onClick={() => inputRef.current?.focus()}>
      {/* Terminal panel */}
      <div className="flex-1 flex flex-col bg-gray-950 overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 border-b border-gray-800 shrink-0">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs text-gray-400 font-mono ml-2">SABRE_OS v3.2 — Gateway TUI</span>
          <div className="ml-auto flex items-center gap-3 text-[10px] font-mono">
            <span className={activeInstances.length > 0 ? "text-green-400" : "text-gray-600"}>
              {activeInstances.length > 0 ? `● ${activeInstances.length} connected` : "○ offline"}
            </span>
            {allAgentsCount > 0 && <span className="text-blue-400">{allAgentsCount} agents</span>}
          </div>
        </div>

        {/* Output */}
        <div ref={outputRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-0.5">
          {lines.map((line) => (
            <div key={line.id} className={`leading-5 ${lineColor[line.type]}`}>
              <span className="text-gray-700 select-none mr-1">{line.ts}</span>
              {line.text}
            </div>
          ))}
          <div className="text-green-500 animate-pulse inline-block">▊</div>
        </div>

        {/* Command input */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-4 py-3 border-t border-gray-800 bg-gray-950 shrink-0"
        >
          <span className="text-green-400 font-mono text-xs whitespace-nowrap select-none">
            admin@scranton:~#
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command ('help' to list all)..."
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-transparent text-dunder-paper font-mono text-xs outline-none placeholder-gray-700 caret-green-400"
          />
        </form>
      </div>

      {/* Right sidebar */}
      <div className="w-52 shrink-0 flex flex-col gap-3 p-3 overflow-y-auto bg-gray-950 border-l border-gray-800">
        {/* Instance status */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
          <h3 className="text-[10px] font-mono font-bold text-dunder-carpet uppercase tracking-wider mb-2">Gateways</h3>
          {Object.values(instances).length === 0 ? (
            <p className="text-[11px] text-gray-600 font-mono">No connections.</p>
          ) : (
            Object.values(instances).map((inst) => (
              <div key={inst.instanceId} className="flex items-center gap-2 py-1">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  inst.status === "connected" ? "bg-green-500" :
                  inst.status === "connecting" ? "bg-amber-400 animate-pulse" : "bg-red-500"
                }`} />
                <span className="text-[11px] text-gray-400 font-mono truncate">{inst.label}</span>
              </div>
            ))
          )}
          <button
            onClick={() => runCommand("connect ws://localhost:18789")}
            className="mt-2 text-[10px] text-gray-600 hover:text-gray-400 font-mono transition-colors block w-full text-left"
          >
            + connect localhost
          </button>
        </div>

        {/* Quick commands */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
          <h3 className="text-[10px] font-mono font-bold text-dunder-carpet uppercase tracking-wider mb-2">Quick Commands</h3>
          <div className="space-y-1">
            {[
              ["agents", "List agents"],
              ["sessions", "List sessions"],
              ["health", "Health check"],
              ["channels", "Channel status"],
              ["map", "Show mapping"],
              ["cron", "Cron jobs"],
            ].map(([cmd, label]) => (
              <button
                key={cmd}
                onClick={() => { setInput(cmd ?? ""); inputRef.current?.focus(); }}
                className="block w-full text-left text-[11px] text-gray-500 hover:text-green-400 font-mono py-0.5 transition-colors"
              >
                <span className="text-gray-700">›</span> {cmd}
                <span className="text-gray-700 ml-1">— {label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active agents */}
        {allAgentsCount > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex-1">
            <h3 className="text-[10px] font-mono font-bold text-dunder-carpet uppercase tracking-wider mb-2">Live Agents</h3>
            <div className="space-y-1.5 overflow-y-auto max-h-48">
              {Object.values(agents).flatMap((inst) =>
                Object.values(inst).map((agent) => {
                  const stateColor = {
                    idle: "text-gray-600",
                    thinking: "text-amber-400",
                    talking: "text-blue-400",
                    tool_calling: "text-purple-400",
                    error: "text-red-400",
                    offline: "text-gray-700",
                  }[agent.visualState] ?? "text-gray-600";
                  return (
                    <div key={agent.agentId} className="flex items-center gap-1.5">
                      <span className={`text-[9px] ${stateColor}`}>●</span>
                      <button
                        onClick={() => { setInput(`send ${agent.agentId} `); inputRef.current?.focus(); }}
                        className="text-[11px] text-gray-500 hover:text-green-400 font-mono truncate transition-colors text-left"
                        title={`send ${agent.agentId} <message>`}
                      >
                        {agent.agentId}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
