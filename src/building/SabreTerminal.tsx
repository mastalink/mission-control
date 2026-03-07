import { useState, useEffect, useRef } from "react";
import { useAgentStore } from "../store/useAgentStore";
import { useGatewayStore } from "../store/useGatewayStore";

const BOOT_LINES = [
  "> INITIALIZING MISSION CONTROL...",
  "> CONNECTING TO SABRE MAINFRAME...",
  "> AUTHENTICATING M. SCOTT...",
  "> WARNING: HIGH SHRINKAGE DETECTED IN SECTOR 7G",
  "> BEARS, BEETS, BATTLESTAR GALACTICA PROTOCOL ENGAGED",
  "> SYSTEM READY.",
];

const COMMAND_RESPONSES: Record<string, string[]> = {
  prank: [
    "> Locating Dwight's desk...",
    "> Wrapping items in gift paper: 47 objects",
    "> Jello mold status: IN PROGRESS",
    "> Jim has been notified. Excellent.",
  ],
  meeting: [
    "> Scheduling impromptu meeting...",
    "> Conference room: OCCUPIED (again)",
    "> Redirecting to Michael's office",
    "> Topic: Something that could've been an email",
  ],
  fire: [
    "> FIRE! OH MY GOD! EVERYBODY STAY CALM!",
    "> ...What is the procedure?",
    "> Kevin has grabbed the George Foreman grill.",
    "> Dwight has set the trash can on fire (intentionally).",
    "> Oscar has escaped through the ceiling.",
  ],
  help: [
    "> Available commands: prank, meeting, fire, status, dundies",
    "> Type a command and press Enter.",
  ],
  status: [
    "> SABRE_OS v3.1 — ALL SYSTEMS NOMINAL",
    "> Threat Level: MIDNIGHT",
    "> Toby Flenderson: proximity alert ACTIVE",
    "> Ryan started the fire: CONFIRMED",
  ],
  dundies: [
    "> 🏆 DUNDIE AWARD CEREMONY INITIATED",
    "> Best Boss In The World: M. SCOTT",
    "> Longest Engagement: JIM HALPERT & PAM BEESLY",
    "> Hottest in the Office: RYAN HOWARD",
  ],
};

type LogLine = {
  id: number;
  text: string;
  type: "boot" | "agent" | "user" | "warning" | "info";
  timestamp: string;
};

export function SabreTerminal() {
  const agents = useAgentStore((s) => s.agents);
  const instances = useGatewayStore((s) => s.instances);
  const [lines, setLines] = useState<LogLine[]>([]);
  const [input, setInput] = useState("");
  const [booted, setBooted] = useState(false);
  const idRef = useRef(0);
  const terminalRef = useRef<HTMLDivElement>(null);

  const addLine = (text: string, type: LogLine["type"] = "info") => {
    const now = new Date();
    const timestamp = `[${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}]`;
    setLines((prev) => [...prev.slice(-200), { id: idRef.current++, text, type, timestamp }]);
  };

  // Boot sequence
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      const line = BOOT_LINES[i];
      if (i < BOOT_LINES.length && line !== undefined) {
        addLine(line, i === 3 ? "warning" : "boot");
        i++;
      } else {
        clearInterval(timer);
        setBooted(true);
      }
    }, 300);
    return () => clearInterval(timer);
  }, []);

  // Live agent activity feed
  useEffect(() => {
    if (!booted) return;
    const allAgents = Object.values(agents).flatMap((inst) => Object.values(inst));
    for (const agent of allAgents) {
      if (agent.lastDeltaText && agent.visualState !== "idle") {
        const char = agent.characterId ?? agent.agentId;
        addLine(`> [${char.toUpperCase()}] ${agent.lastDeltaText.slice(0, 80)}...`, "agent");
      }
      if (agent.visualState === "error" && agent.lastError) {
        addLine(`> WARNING: ${agent.agentId} — ${agent.lastError}`, "warning");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(Object.values(agents).flatMap((i) => Object.values(i)).map((a) => a.lastDeltaText + a.visualState))]);

  // Auto-scroll
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim().toLowerCase();
    if (!cmd) return;
    addLine(`ADMIN@DunderMifflin:~# ${cmd}`, "user");
    const responses = COMMAND_RESPONSES[cmd] ?? [
      `> Command not recognized: '${cmd}'`,
      "> Type 'help' for available commands.",
    ];
    responses.forEach((r, i) => setTimeout(() => addLine(r, r.includes("WARNING") ? "warning" : "info"), i * 120));
    setInput("");
  };

  const hasConnections = Object.keys(instances).length > 0;

  return (
    <div className="h-full flex gap-4 p-4 overflow-hidden">
      {/* Terminal panel */}
      <div className="flex-1 flex flex-col bg-gray-950 rounded-lg border border-dunder-carpet/20 overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 border-b border-gray-800">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs text-gray-400 font-mono ml-2">$SABRE_OS_v3.1</span>
          <div className="ml-auto flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${hasConnections ? "bg-green-500" : "bg-gray-600"}`} />
            <span className="text-[10px] text-gray-500 font-mono">
              {hasConnections ? "SYS_OPT" : "OFFLINE"}
            </span>
            <span className="text-[10px] text-gray-600 font-mono">98%</span>
          </div>
        </div>

        {/* Output */}
        <div ref={terminalRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-0.5">
          {lines.map((line) => (
            <div
              key={line.id}
              className={`${
                line.type === "warning"
                  ? "text-amber-400"
                  : line.type === "user"
                  ? "text-dunder-paper"
                  : line.type === "agent"
                  ? "text-blue-400"
                  : line.type === "boot"
                  ? "text-green-400"
                  : "text-gray-400"
              }`}
            >
              <span className="text-gray-600 select-none">{line.timestamp} </span>
              {line.text}
            </div>
          ))}
          {/* Blinking cursor */}
          <div className="text-green-400 animate-pulse">▊</div>
        </div>

        {/* Command input */}
        <form
          onSubmit={handleCommand}
          className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-800 bg-gray-950"
        >
          <span className="text-green-400 font-mono text-xs whitespace-nowrap">
            ADMIN@DunderMifflin:~#
          </span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a command (try 'prank', 'meeting', 'fire')..."
            className="flex-1 bg-transparent text-dunder-paper font-mono text-xs outline-none placeholder-gray-600"
          />
        </form>
      </div>

      {/* Right sidebar */}
      <div className="w-56 shrink-0 flex flex-col gap-3 overflow-y-auto">
        {/* Threat Level */}
        <div className="bg-red-950/40 border border-red-900/40 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-red-400 text-sm">⚠</span>
            <h3 className="text-xs font-dunder font-bold text-dunder-paper uppercase tracking-wider">Threat Level</h3>
          </div>
          <div className="text-2xl font-dunder font-bold text-amber-400 tracking-widest">MIDNIGHT</div>
          <p className="text-[11px] text-red-300/70 mt-1 font-dunder">
            Toby Flenderson proximity alert active.
          </p>
        </div>

        {/* Active Alerts */}
        <div className="bg-dunder-screen-off/60 border border-dunder-carpet/20 rounded-lg p-4 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-400 text-sm">⚡</span>
            <h3 className="text-xs font-dunder font-bold text-dunder-paper uppercase tracking-wider">Active Alerts</h3>
          </div>
          <div className="space-y-2">
            {Object.values(agents).flatMap((inst) =>
              Object.values(inst)
                .filter((a) => a.visualState === "error" && a.lastError)
                .map((a) => (
                  <div key={a.agentId} className="bg-red-950/40 border border-red-900/30 rounded p-2">
                    <div className="text-[11px] font-dunder font-bold text-red-300">{a.agentId}</div>
                    <div className="text-[10px] text-red-300/70">{a.lastError}</div>
                  </div>
                ))
            )}
            {/* Static flavour alerts */}
            <div className="bg-amber-950/30 border border-amber-900/30 rounded p-2">
              <div className="text-[11px] font-dunder font-bold text-amber-300">Paper Shortage</div>
              <div className="text-[10px] text-amber-300/70">Low 8.5×11 stock in Accounting.</div>
            </div>
            <div className="bg-blue-950/30 border border-blue-900/30 rounded p-2">
              <div className="text-[11px] font-dunder font-bold text-blue-300">Productivity Surge</div>
              <div className="text-[10px] text-blue-300/70">Stanley&apos;s crossword: record time.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
