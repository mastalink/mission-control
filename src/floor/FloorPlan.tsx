import { motion, AnimatePresence, useSpring } from "framer-motion";
import { useState, useMemo, useCallback } from "react";
import { useAgentStore, type AgentState } from "../store/useAgentStore";
import { useUIStore } from "../store/useUIStore";
import { getCharacterById } from "../characters/registry";
import type { CharacterDef } from "../characters/types";
import { BrickCharacter } from "./BrickCharacter";

const EMPTY_AGENTS: Record<string, AgentState> = {};

type Props = {
  instanceId: string;
};

const FLOOR_POSITIONS: Record<string, { x: number; y: number }> = {
  "michael-scott":   { x: 22, y: 32 },
  "dwight-schrute":  { x: 42, y: 42 },
  "jim-halpert":     { x: 50, y: 42 },
  "pam-beesly":      { x: 33, y: 56 },
  "stanley-hudson":  { x: 54, y: 58 },
  "andy-bernard":    { x: 63, y: 48 },
  "kevin-malone":    { x: 79, y: 66 },
  "angela-martin":   { x: 73, y: 66 },
  "oscar-martinez":  { x: 76, y: 74 },
  "phyllis-vance":   { x: 59, y: 58 },
  "meredith-palmer": { x: 47, y: 56 },
  "creed-bratton":   { x: 57, y: 50 },
  "ryan-howard":     { x: 65, y: 40 },
  "kelly-kapoor":    { x: 76, y: 40 },
  "toby-flenderson": { x: 70, y: 40 },
  "darryl-philbin":  { x: 44, y: 82 },
};

const MEMORABILIA = [
  { emoji: "🏆", label: "Dundie Award",          desc: "Regional Manager Award of Excellence",   x: 22, y: 35 },
  { emoji: "☕", label: "World's Best Boss Mug", desc: "Purchased at Spencer Gifts. Self-awarded.", x: 25, y: 25 },
  { emoji: "🌶️", label: "Kevin's Chili",         desc: "A recipe passed down from Nana Malone",  x: 78, y: 68 },
  { emoji: "📎", label: "Jell-O Stapler",         desc: "Jim's finest prank. Still in the Jell-O.", x: 48, y: 42 },
  { emoji: "🫖", label: "Asian Teapot",            desc: "Pam's gift from Jim. Contains a note.",  x: 35, y: 55 },
];

// Seeded random so paper sheets are stable per render
function seededRand(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const PAPER_SHEETS = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  startX: seededRand(i * 7.3) * 100,
  delay: seededRand(i * 3.1) * 3,
  duration: 2.5 + seededRand(i * 5.7) * 2,
  rotate: seededRand(i * 11.3) * 60 - 30,
  drift: seededRand(i * 2.9) * 40 - 20,
}));

const statusColor = (state: string) =>
  state === "error"          ? "#ef4444"
  : state === "talking"      ? "#3b82f6"
  : state === "tool_calling" ? "#a855f7"
  : state === "thinking"     ? "#f59e0b"
  : "#22c55e";

export function FloorPlan({ instanceId }: Props) {
  const agents = useAgentStore((s) => s.agents[instanceId]) ?? EMPTY_AGENTS;
  const openPanel = useUIStore((s) => s.openPanel);
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredMemo, setHoveredMemo] = useState<number | null>(null);
  const [fireDrill, setFireDrill] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Spring-animated scale for smooth zoom
  const scale = useSpring(zoom, { stiffness: 300, damping: 30 });

  const clampZoom = useCallback((delta: number) => {
    setZoom((z) => Math.min(2, Math.max(0.5, +(z + delta).toFixed(2))));
  }, []);

  // Random jitter offsets for fire drill mode (stable per agent)
  const jitterOffsets = useMemo(() =>
    Object.fromEntries(
      Object.keys(FLOOR_POSITIONS).map((id, i) => [
        id,
        {
          dx: (seededRand(i * 4.1) - 0.5) * 10,
          dy: (seededRand(i * 8.7) - 0.5) * 8,
        },
      ])
    ), []);

  const placedAgents = Object.values(agents)
    .filter((a) => a.characterId)
    .map((agent) => {
      const character = getCharacterById(agent.characterId!);
      if (!character) return null;
      const base = FLOOR_POSITIONS[character.id] ?? { x: 50, y: 50 };
      const jitter = fireDrill ? (jitterOffsets[character.id] ?? { dx: 0, dy: 0 }) : { dx: 0, dy: 0 };
      const pos = { x: base.x + jitter.dx, y: base.y + jitter.dy };
      return { agent, character, pos };
    })
    .filter(Boolean) as Array<{ agent: AgentState; character: CharacterDef; pos: { x: number; y: number } }>;

  const hoveredAgent = hovered ? agents[hovered] : null;
  const hoveredChar = hoveredAgent?.characterId ? getCharacterById(hoveredAgent.characterId) : null;

  const imgFilter = fireDrill
    ? "contrast(1.4) brightness(0.6) saturate(2) sepia(0.7) hue-rotate(320deg)"
    : "contrast(1.25) brightness(0.65) saturate(0.8)";

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0b1120]">
      {/* Zoomable map container */}
      <motion.div
        className="absolute inset-0 origin-center"
        style={{ scale }}
      >
        {/* Floor plan photo */}
        <img
          src="/floor-main-office.png"
          alt="Dunder Mifflin Office Floor Plan"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: 0.75,
            mixBlendMode: "luminosity",
            filter: imgFilter,
            transition: "filter 0.8s ease",
          }}
        />

        {/* Fire drill red tint overlay */}
        <AnimatePresence>
          {fireDrill && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
              style={{ background: "rgba(200, 30, 10, 0.18)", mixBlendMode: "screen" }}
            />
          )}
        </AnimatePresence>

        {/* Falling paper sheets during fire drill */}
        <AnimatePresence>
          {fireDrill && PAPER_SHEETS.map((sheet) => (
            <motion.div
              key={sheet.id}
              className="absolute pointer-events-none"
              style={{
                left: `${sheet.startX}%`,
                top: 0,
                width: 14,
                height: 18,
                background: "rgba(245,240,232,0.85)",
                borderRadius: 2,
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}
              initial={{ y: -30, rotate: sheet.rotate, x: 0 }}
              animate={{ y: "100vh", rotate: sheet.rotate + 180, x: sheet.drift }}
              exit={{ opacity: 0 }}
              transition={{
                duration: sheet.duration,
                delay: sheet.delay,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </AnimatePresence>

        {/* Dot-grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xNSkiLz48L3N2Zz4=")`,
          }}
        />

        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(11,17,32,0.75) 100%)" }}
        />

        {/* Memorabilia badges */}
        {MEMORABILIA.map((item, i) => (
          <div
            key={i}
            className="absolute cursor-default z-20"
            style={{ left: `${item.x}%`, top: `${item.y}%`, transform: "translate(-50%, -50%)" }}
            onMouseEnter={() => setHoveredMemo(i)}
            onMouseLeave={() => setHoveredMemo(null)}
          >
            <motion.div
              className="text-lg select-none"
              animate={fireDrill ? { rotate: [0, -10, 10, -10, 0] } : { rotate: 0 }}
              transition={fireDrill ? { duration: 0.5, repeat: Infinity } : {}}
              whileHover={{ scale: 1.4 }}
            >
              {item.emoji}
            </motion.div>
            <AnimatePresence>
              {hoveredMemo === i && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap z-30 pointer-events-none"
                >
                  <div
                    className="rounded-lg px-2.5 py-1.5 border border-white/10 shadow-xl"
                    style={{ background: "rgba(15,23,42,0.95)", backdropFilter: "blur(8px)" }}
                  >
                    <div className="text-[10px] font-bold text-white">{item.label}</div>
                    <div className="text-[9px] text-gray-400 italic mt-0.5">{item.desc}</div>
                  </div>
                  <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[rgba(15,23,42,0.95)] mx-auto" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {/* Characters */}
        {placedAgents.map(({ agent, character, pos }) => (
          <motion.div
            key={agent.agentId}
            className="absolute"
            animate={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            style={{ transform: "translate(-50%, -100%)", zIndex: hovered === agent.agentId ? 50 : 10 }}
            onMouseEnter={() => setHovered(agent.agentId)}
            onMouseLeave={() => setHovered(null)}
          >
            <BrickCharacter
              character={character}
              agent={agent}
              onClick={() => openPanel({ type: "agent", instanceId, agentId: agent.agentId })}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* ── Controls overlay (outside zoom container) ── */}

      {/* Zoom controls — top right */}
      <div className="absolute top-4 right-4 flex flex-col gap-1 z-40">
        <button
          onClick={() => clampZoom(0.1)}
          className="w-7 h-7 rounded bg-black/40 hover:bg-black/60 text-white text-sm border border-white/10 flex items-center justify-center transition-colors"
          title="Zoom in"
        >+</button>
        <button
          onClick={() => setZoom(1)}
          className="w-7 h-7 rounded bg-black/40 hover:bg-black/60 text-white text-[9px] border border-white/10 flex items-center justify-center transition-colors font-mono"
          title="Reset zoom"
        >{Math.round(zoom * 100)}%</button>
        <button
          onClick={() => clampZoom(-0.1)}
          className="w-7 h-7 rounded bg-black/40 hover:bg-black/60 text-white text-sm border border-white/10 flex items-center justify-center transition-colors"
          title="Zoom out"
        >−</button>
      </div>

      {/* Fire drill toggle — bottom right */}
      <div className="absolute bottom-10 right-4 z-40">
        <button
          onClick={() => setFireDrill((v) => !v)}
          className={`px-3 py-1.5 rounded text-[10px] font-mono border transition-all ${
            fireDrill
              ? "bg-red-600/80 border-red-400/50 text-white animate-pulse"
              : "bg-black/40 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
          }`}
          title="Toggle fire drill"
        >
          {fireDrill ? "🔥 FIRE DRILL" : "🚒 fire drill"}
        </button>
      </div>

      {/* Hover detail card */}
      <AnimatePresence>
        {hoveredAgent && hoveredChar && (
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            className="absolute right-16 top-6 w-64 rounded-xl border border-white/10 shadow-2xl pointer-events-none z-50 overflow-hidden"
            style={{ background: "rgba(15,23,42,0.92)", backdropFilter: "blur(12px)" }}
          >
            <div className="h-1 w-full" style={{ background: statusColor(hoveredAgent.visualState) }} />
            <div className="p-4">
              <div className="text-base font-bold text-white font-serif mb-0.5">{hoveredChar.name}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-3">{hoveredChar.title}</div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">STATUS</span>
                <span className="uppercase font-bold" style={{ color: statusColor(hoveredAgent.visualState) }}>
                  {hoveredAgent.visualState}
                </span>
              </div>
              {hoveredAgent.activeTool && (
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">TOOL</span>
                  <span className="text-purple-400 font-mono">{hoveredAgent.activeTool.slice(0, 22)}</span>
                </div>
              )}
              <div className="mt-3 text-[10px] text-gray-500 italic border-t border-white/5 pt-2">
                "{hoveredChar.quote}"
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {placedAgents.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-600">
            <div className="text-4xl mb-2 opacity-20">🏢</div>
            <div className="text-sm font-mono opacity-30">No agents on the floor</div>
          </div>
        </div>
      )}

      {/* Watermark */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-mono text-gray-600 opacity-40 tracking-widest whitespace-nowrap z-30">
        DUNDER MIFFLIN PAPER COMPANY — SCRANTON BRANCH
      </div>
    </div>
  );
}
