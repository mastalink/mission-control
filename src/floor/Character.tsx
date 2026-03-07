import { motion } from "framer-motion";
import type { CharacterDef } from "../characters/types";
import type { AgentState } from "../store/useAgentStore";
import { useUIStore } from "../store/useUIStore";
import { EasterEgg } from "./EasterEggs";

type Props = {
  character: CharacterDef;
  agent: AgentState;
  x: number;
  y: number;
  onClick: () => void;
};

const stateAnimations = {
  idle: {
    y: [0, -1.5, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
  },
  thinking: {
    y: [0, -2, 0],
    rotate: [-0.5, 0.5, -0.5],
    transition: { duration: 0.6, repeat: Infinity },
  },
  talking: {
    y: [0, -3, 0],
    scale: [1, 1.03, 1],
    transition: { duration: 0.8, repeat: Infinity },
  },
  tool_calling: {
    x: [0, 3, 0],
    transition: { duration: 1, repeat: Infinity },
  },
  error: {
    x: [-2, 2, -2, 2, 0],
    transition: { duration: 0.4 },
  },
  offline: {
    opacity: 0.3,
    transition: { duration: 0.5 },
  },
};

const statusColors: Record<string, string> = {
  idle: "#22c55e",
  thinking: "#f59e0b",
  talking: "#3b82f6",
  tool_calling: "#a855f7",
  error: "#ef4444",
  offline: "#6b7280",
};

export function Character({ character, agent, x, y, onClick }: Props) {
  const anim = stateAnimations[agent.visualState] ?? stateAnimations.idle;
  const easterEggsEnabled = useUIStore((s) => s.easterEggsEnabled);

  return (
    <motion.g
      animate={{ x, y }}
      transition={{ type: "spring", stiffness: 40, damping: 12, mass: 1 }}
    >
      {/* Easter eggs render behind the character */}
      {easterEggsEnabled && agent.characterId && (
        <EasterEgg characterId={agent.characterId} agent={agent} />
      )}
      <motion.g
        animate={anim}
        style={{ cursor: "pointer" }}
        onClick={onClick}
        whileHover={{ scale: 1.1 }}
      >
        {/* Body */}
        <rect x={-8} y={8} width={16} height={18} rx={3} fill={character.bodyColor} />
        {/* Collar / shirt detail */}
        <path d="M-3,8 L0,12 L3,8" fill="none" stroke="white" strokeWidth={0.6} opacity={0.5} />
        {/* Arms */}
        <rect x={-12} y={10} width={5} height={12} rx={2} fill={character.bodyColor} opacity={0.8} />
        <rect x={7} y={10} width={5} height={12} rx={2} fill={character.bodyColor} opacity={0.8} />
        {/* Head */}
        <circle cx={0} cy={2} r={8} fill="#fbbf24" stroke={character.bodyColor} strokeWidth={1.5} />
        {/* Eyes */}
        <circle cx={-3} cy={0} r={1.2} fill="#1e293b" />
        <circle cx={3} cy={0} r={1.2} fill="#1e293b" />
        {/* Character detail (glasses for Dwight, etc.) */}
        {character.headDetail === "glasses" && (
          <>
            <circle cx={-3} cy={0} r={2.5} fill="none" stroke="#1e293b" strokeWidth={0.6} />
            <circle cx={3} cy={0} r={2.5} fill="none" stroke="#1e293b" strokeWidth={0.6} />
            <line x1={-0.5} y1={0} x2={0.5} y2={0} stroke="#1e293b" strokeWidth={0.5} />
          </>
        )}
        {character.headDetail === "mustache" && (
          <path d="M-3,4 Q0,6 3,4" fill="none" stroke="#1e293b" strokeWidth={1} />
        )}
        {character.headDetail === "ponytail" && (
          <path d="M4,-4 Q10,-2 6,4" fill="#fbbf24" stroke="#d97706" strokeWidth={0.8} />
        )}
        {character.headDetail === "bald" && (
          <ellipse cx={0} cy={-5} rx={5} ry={2} fill="#fbbf24" opacity={0.5} />
        )}
        {character.headDetail === "bun" && (
          <circle cx={0} cy={-7} r={3} fill="#d4a574" />
        )}
        {character.headDetail === "cap" && (
          <rect x={-7} y={-9} width={14} height={4} rx={1} fill="#0f766e" />
        )}
        {/* Michael's spiky hair */}
        {character.headDetail === "spiky-hair" && (
          <g>
            <line x1={-3} y1={-6} x2={-4} y2={-10} stroke="#1e293b" strokeWidth={0.8} />
            <line x1={0} y1={-6} x2={0} y2={-11} stroke="#1e293b" strokeWidth={0.8} />
            <line x1={3} y1={-6} x2={4} y2={-10} stroke="#1e293b" strokeWidth={0.8} />
          </g>
        )}
        {/* Jim's messy hair */}
        {character.headDetail === "messy-hair" && (
          <path d="M-6,-4 Q-4,-8 -1,-7 Q2,-9 5,-6 Q7,-8 6,-4" fill="#6b4c30" opacity={0.7} />
        )}
        {/* Andy's preppy hair */}
        {character.headDetail === "preppy" && (
          <path d="M-6,-3 Q-5,-7 0,-6 Q5,-7 6,-3" fill="#c2410c" opacity={0.6} />
        )}
        {/* Oscar's neat hair */}
        {character.headDetail === "neat" && (
          <path d="M-6,-3 Q-4,-7 0,-7 Q4,-7 6,-3" fill="#1e293b" opacity={0.5} />
        )}
        {/* Phyllis's curly hair */}
        {character.headDetail === "curly" && (
          <g opacity={0.6}>
            <circle cx={-5} cy={-4} r={2.5} fill="#d4a574" />
            <circle cx={0} cy={-6} r={2.5} fill="#d4a574" />
            <circle cx={5} cy={-4} r={2.5} fill="#d4a574" />
          </g>
        )}
        {/* Meredith's red hair */}
        {character.headDetail === "red-hair" && (
          <path d="M-7,-2 Q-6,-7 0,-7 Q6,-7 7,-2 L7,2 Q5,0 0,0 Q-5,0 -7,2 Z" fill="#b91c1c" opacity={0.6} />
        )}
        {/* Creed's white/thin hair */}
        {character.headDetail === "white-hair" && (
          <path d="M-5,-5 Q0,-8 5,-5" fill="none" stroke="#e5e7eb" strokeWidth={1.5} opacity={0.6} />
        )}
        {/* Ryan's beard/scruff */}
        {character.headDetail === "beard" && (
          <path d="M-4,4 Q-5,7 0,8 Q5,7 4,4" fill="#78716c" opacity={0.4} />
        )}
        {/* Kelly's long dark hair */}
        {character.headDetail === "long-dark" && (
          <g>
            <path d="M-7,-3 Q-6,-7 0,-7 Q6,-7 7,-3" fill="#1e293b" opacity={0.6} />
            <path d="M-7,-3 Q-8,4 -6,8" fill="none" stroke="#1e293b" strokeWidth={2} opacity={0.4} />
            <path d="M7,-3 Q8,4 6,8" fill="none" stroke="#1e293b" strokeWidth={2} opacity={0.4} />
          </g>
        )}
        {/* Toby's sad face markers */}
        {character.headDetail === "sad-face" && (
          <g>
            <path d="M-5,-5 Q0,-7 5,-5" fill="#c2a57a" opacity={0.5} />
            {/* Droopy eyebrows */}
            <line x1={-5} y1={-2} x2={-2} y2={-1.5} stroke="#1e293b" strokeWidth={0.6} />
            <line x1={2} y1={-1.5} x2={5} y2={-2} stroke="#1e293b" strokeWidth={0.6} />
          </g>
        )}
        {/* Mouth - changes with state */}
        {agent.visualState === "talking" ? (
          <ellipse cx={0} cy={5} rx={2} ry={1.5} fill="#1e293b" />
        ) : agent.visualState === "error" ? (
          <path d="M-2,6 Q0,4 2,6" fill="none" stroke="#1e293b" strokeWidth={0.8} />
        ) : (
          <path d="M-2,4 Q0,6 2,4" fill="none" stroke="#1e293b" strokeWidth={0.8} />
        )}
        {/* Status dot */}
        <circle cx={10} cy={-6} r={3} fill={statusColors[agent.visualState] ?? "#6b7280"} />
        {agent.visualState !== "idle" && agent.visualState !== "offline" && (
          <motion.circle
            cx={10}
            cy={-6}
            r={3}
            fill={statusColors[agent.visualState] ?? "#6b7280"}
            animate={{ r: [3, 5, 3], opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        {/* Name tag */}
        <text x={0} y={34} textAnchor="middle" fontSize={6} fill="#475569" fontFamily="sans-serif">
          {character.name.split(" ")[0]}
        </text>
        {/* Thought bubble when thinking */}
        {agent.visualState === "thinking" && (
          <g transform="translate(12, -18)">
            <circle cx={0} cy={8} r={1.5} fill="white" opacity={0.7} />
            <circle cx={3} cy={3} r={2} fill="white" opacity={0.8} />
            <rect x={3} y={-8} width={22} height={14} rx={7} fill="white" stroke="#e2e8f0" strokeWidth={0.5} />
            <motion.g animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}>
              <circle cx={10} cy={-1} r={1.5} fill="#94a3b8" />
              <circle cx={15} cy={-1} r={1.5} fill="#94a3b8" />
              <circle cx={20} cy={-1} r={1.5} fill="#94a3b8" />
            </motion.g>
          </g>
        )}
        {/* Speech bubble when talking */}
        {agent.visualState === "talking" && agent.lastDeltaText && (
          <g transform="translate(15, -20)">
            <rect x={0} y={0} width={80} height={24} rx={6} fill="white" stroke="#e2e8f0" strokeWidth={0.5} />
            <polygon points="-3,12 0,8 0,16" fill="white" />
            <text x={4} y={15} fontSize={5} fill="#334155" fontFamily="sans-serif">
              {agent.lastDeltaText.slice(-40)}
            </text>
          </g>
        )}
        {/* Tool overlay when calling tools */}
        {agent.visualState === "tool_calling" && agent.activeTool && (
          <g transform="translate(15, -15)">
            <rect x={0} y={0} width={60} height={16} rx={4} fill="#f5f3ff" stroke="#a855f7" strokeWidth={0.5} />
            <text x={4} y={11} fontSize={5} fill="#7c3aed" fontFamily="sans-serif">
              {agent.activeTool.slice(0, 20)}
            </text>
          </g>
        )}
        {/* Error bubble */}
        {agent.visualState === "error" && agent.lastError && (
          <g transform="translate(15, -20)">
            <rect x={0} y={0} width={80} height={24} rx={6} fill="#fef2f2" stroke="#fca5a5" strokeWidth={0.5} />
            <text x={4} y={15} fontSize={5} fill="#dc2626" fontFamily="sans-serif">
              {agent.lastError.slice(0, 40)}
            </text>
          </g>
        )}
      </motion.g>
    </motion.g>
  );
}
