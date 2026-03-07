import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useAgentStore, type AgentState } from "../store/useAgentStore";
import { useUIStore } from "../store/useUIStore";
import { getCharacterById } from "../characters/registry";
import type { CharacterDef } from "../characters/types";
import { BrickCharacter } from "./BrickCharacter";

type Props = { instanceId: string };

const EMPTY_AGENTS: Record<string, AgentState> = {};

/** Warehouse positions as % of image dimensions */
const WAREHOUSE_POSITIONS: Record<string, { x: number; y: number }> = {
  "darryl-philbin": { x: 30, y: 55 },
  "roy-anderson":   { x: 55, y: 55 },
};

const statusColor = (state: string) =>
  state === "error"        ? "#ef4444"
  : state === "talking"    ? "#3b82f6"
  : state === "tool_calling" ? "#a855f7"
  : state === "thinking"   ? "#f59e0b"
  : "#22c55e";

export function WarehouseView({ instanceId }: Props) {
  const agents = useAgentStore((s) => s.agents[instanceId]) ?? EMPTY_AGENTS;
  const openPanel = useUIStore((s) => s.openPanel);
  const [hovered, setHovered] = useState<string | null>(null);

  // Warehouse agents: those with loc === "warehouse" or character in WAREHOUSE_POSITIONS
  const warehouseAgents = Object.values(agents)
    .filter((a) => {
      if (!a.characterId) return false;
      const char = getCharacterById(a.characterId);
      const loc = a.location ?? char?.defaultLocation;
      return loc === "warehouse" || a.characterId in WAREHOUSE_POSITIONS;
    })
    .map((agent) => {
      const character = getCharacterById(agent.characterId!);
      if (!character) return null;
      const pos = WAREHOUSE_POSITIONS[character.id] ?? { x: 50, y: 60 };
      return { agent, character, pos };
    })
    .filter(Boolean) as Array<{ agent: AgentState; character: CharacterDef; pos: { x: number; y: number } }>;

  // Overflow: non-warehouse agents that spill in (up to 6 extra slots)
  const overflowSlots = [
    { x: 42, y: 68 }, { x: 65, y: 68 },
    { x: 30, y: 78 }, { x: 50, y: 78 }, { x: 70, y: 78 },
  ];
  const knownIds = new Set(warehouseAgents.map((e) => e.agent.agentId));
  const overflowAgents = Object.values(agents)
    .filter((a) => a.characterId && !knownIds.has(a.agentId) && (a.location ?? getCharacterById(a.characterId!)?.defaultLocation) === "warehouse")
    .slice(0, overflowSlots.length)
    .map((agent, i) => {
      const character = getCharacterById(agent.characterId!);
      if (!character) return null;
      return { agent, character, pos: overflowSlots[i]! };
    })
    .filter(Boolean) as Array<{ agent: AgentState; character: CharacterDef; pos: { x: number; y: number } }>;

  const allAgents = [...warehouseAgents, ...overflowAgents];

  const hoveredAgent = hovered ? agents[hovered] : null;
  const hoveredChar = hoveredAgent?.characterId ? getCharacterById(hoveredAgent.characterId) : null;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0b1120]">
      {/* Warehouse photo background */}
      <img
        src="/floor-warehouse.png"
        alt="Dunder Mifflin Warehouse"
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: 0.72,
          mixBlendMode: "luminosity",
          filter: "contrast(1.3) brightness(0.6) saturate(0.7)",
        }}
      />

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
        style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(11,17,32,0.8) 100%)" }}
      />

      {/* Characters */}
      {allAgents.map(({ agent, character, pos }) => (
        <div
          key={agent.agentId}
          className="absolute"
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: "translate(-50%, -100%)",
            zIndex: hovered === agent.agentId ? 50 : 10,
          }}
          onMouseEnter={() => setHovered(agent.agentId)}
          onMouseLeave={() => setHovered(null)}
        >
          <BrickCharacter
            character={character}
            agent={agent}
            onClick={() => openPanel({ type: "agent", instanceId, agentId: agent.agentId })}
          />
        </div>
      ))}

      {/* Hover detail card */}
      <AnimatePresence>
        {hoveredAgent && hoveredChar && (
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            className="absolute right-6 top-6 w-64 rounded-xl border border-white/10 shadow-2xl pointer-events-none z-50 overflow-hidden"
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
      {allAgents.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-600">
            <div className="text-4xl mb-2 opacity-20">📦</div>
            <div className="text-sm font-mono opacity-30">No agents in the warehouse</div>
          </div>
        </div>
      )}

      {/* Watermark */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-mono text-gray-600 opacity-40 tracking-widest whitespace-nowrap">
        DUNDER MIFFLIN PAPER COMPANY — SCRANTON DISTRIBUTION CENTER
      </div>
    </div>
  );
}
