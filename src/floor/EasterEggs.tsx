import { motion } from "framer-motion";
import type { AgentState } from "../store/useAgentStore";

type Props = {
  characterId: string;
  agent: AgentState;
};

/**
 * Character-specific Easter egg overlays that render near their desk/character.
 * These are the little details that make The Office come alive.
 */
export function EasterEgg({ characterId, agent }: Props) {
  switch (characterId) {
    // Dwight's stapler in Jell-O — always visible on his desk
    case "dwight-schrute":
      return (
        <g>
          {/* Jell-O block with stapler inside */}
          <motion.g
            animate={{ opacity: [0.7, 0.9, 0.7] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <rect x={-20} y={28} width={14} height={10} rx={2} fill="#fbbf24" opacity={0.4} />
            <rect x={-18} y={30} width={10} height={6} rx={1} fill="#78716c" opacity={0.6} />
          </motion.g>
          {/* Bobblehead on desk */}
          <motion.g
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ originX: "18px", originY: "20px" }}
          >
            <circle cx={18} cy={14} r={3} fill="#fbbf24" />
            <rect x={17} y={17} width={2} height={4} fill="#78716c" />
          </motion.g>
        </g>
      );

    // Kevin drops chili on error
    case "kevin-malone":
      if (agent.visualState === "error") {
        return (
          <motion.g
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Chili pot */}
            <ellipse cx={0} cy={38} rx={8} ry={3} fill="#7c2d12" />
            {/* Chili spill */}
            <motion.ellipse
              cx={0}
              cy={42}
              rx={4}
              ry={2}
              fill="#dc2626"
              animate={{ rx: [4, 12, 16], ry: [2, 5, 8], opacity: [1, 0.8, 0.6] }}
              transition={{ duration: 2, ease: "easeOut" }}
            />
            <motion.ellipse
              cx={-5}
              cy={44}
              rx={3}
              ry={1}
              fill="#b91c1c"
              animate={{ rx: [3, 8, 10], ry: [1, 3, 5], opacity: [0.8, 0.6, 0.4] }}
              transition={{ duration: 2.5, ease: "easeOut", delay: 0.3 }}
            />
          </motion.g>
        );
      }
      return null;

    // Michael — "That's What She Said" popup when talking
    case "michael-scott":
      if (agent.visualState === "talking") {
        return (
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 2, duration: 0.3, type: "spring" }}
          >
            {/* World's Best Boss mug glow */}
            <motion.circle
              cx={-15}
              cy={30}
              r={6}
              fill="#fbbf24"
              animate={{ r: [6, 8, 6], opacity: [0.15, 0.3, 0.15] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.g>
        );
      }
      return null;

    // Creed — mysterious aura / strange shimmer
    case "creed-bratton":
      return (
        <motion.g>
          {/* Mysterious particles */}
          <motion.circle
            cx={-8}
            cy={-8}
            r={1}
            fill="#a78bfa"
            animate={{
              y: [-8, -20, -8],
              x: [-8, -12, -8],
              opacity: [0, 0.6, 0],
            }}
            transition={{ duration: 4, repeat: Infinity, delay: 0 }}
          />
          <motion.circle
            cx={8}
            cy={-5}
            r={0.8}
            fill="#c084fc"
            animate={{
              y: [-5, -18, -5],
              x: [8, 12, 8],
              opacity: [0, 0.5, 0],
            }}
            transition={{ duration: 3.5, repeat: Infinity, delay: 1.2 }}
          />
          <motion.circle
            cx={0}
            cy={-10}
            r={0.6}
            fill="#e9d5ff"
            animate={{
              y: [-10, -25, -10],
              opacity: [0, 0.4, 0],
            }}
            transition={{ duration: 5, repeat: Infinity, delay: 0.7 }}
          />
        </motion.g>
      );

    // Stanley — crossword puzzle
    case "stanley-hudson":
      if (agent.visualState === "idle") {
        return (
          <g>
            {/* Crossword paper on desk */}
            <rect x={-18} y={26} width={12} height={14} rx={1} fill="white" opacity={0.9} />
            <line x1={-16} y1={29} x2={-8} y2={29} stroke="#d1d5db" strokeWidth={0.3} />
            <line x1={-16} y1={31} x2={-8} y2={31} stroke="#d1d5db" strokeWidth={0.3} />
            <line x1={-16} y1={33} x2={-8} y2={33} stroke="#d1d5db" strokeWidth={0.3} />
            <line x1={-13} y1={27} x2={-13} y2={38} stroke="#d1d5db" strokeWidth={0.3} />
            <line x1={-10} y1={27} x2={-10} y2={38} stroke="#d1d5db" strokeWidth={0.3} />
            {/* Pencil */}
            <line x1={-5} y1={36} x2={-1} y2={28} stroke="#fbbf24" strokeWidth={1} />
            <line x1={-1} y1={28} x2={-0.5} y2={27} stroke="#1e293b" strokeWidth={0.5} />
          </g>
        );
      }
      return null;

    // Angela — cat figurine on desk
    case "angela-martin":
      return (
        <g>
          {/* Cat figurine */}
          <motion.g
            animate={{ rotate: [-2, 2, -2] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ originX: "-15px", originY: "30px" }}
          >
            <ellipse cx={-15} cy={30} rx={3} ry={2.5} fill="#f5f5f4" />
            <circle cx={-15} cy={27} r={2} fill="#f5f5f4" />
            {/* Ears */}
            <polygon points="-17,25.5 -16,23.5 -15,25.5" fill="#f5f5f4" />
            <polygon points="-15,25.5 -14,23.5 -13,25.5" fill="#f5f5f4" />
            {/* Eyes */}
            <circle cx={-16} cy={26.8} r={0.5} fill="#22c55e" />
            <circle cx={-14} cy={26.8} r={0.5} fill="#22c55e" />
          </motion.g>
        </g>
      );

    // Pam — art supplies / watercolor
    case "pam-beesly":
      if (agent.visualState === "idle") {
        return (
          <g>
            {/* Sketchbook */}
            <rect x={-20} y={28} width={10} height={13} rx={1} fill="#fefce8" opacity={0.9} />
            {/* Watercolor dots */}
            <circle cx={-17} cy={33} r={1.5} fill="#3b82f6" opacity={0.4} />
            <circle cx={-13} cy={35} r={1.2} fill="#ec4899" opacity={0.4} />
            <circle cx={-15} cy={31} r={1} fill="#22c55e" opacity={0.4} />
          </g>
        );
      }
      return null;

    // Andy — Cornell pennant
    case "andy-bernard":
      return (
        <g>
          {/* Tiny Cornell pennant behind monitor */}
          <polygon points="18,8 18,18 28,13" fill="#b91c1c" opacity={0.7} />
          <text x={20} y={14} fontSize={2.5} fill="white" fontFamily="sans-serif">C</text>
        </g>
      );

    // Ryan — phone always in hand / "Wuphf" reference
    case "ryan-howard":
      if (agent.visualState === "thinking") {
        return (
          <motion.g
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <rect x={12} y={-8} width={28} height={10} rx={3} fill="#1e40af" />
            <text x={16} y={-1} fontSize={4} fill="white" fontFamily="sans-serif" fontWeight="bold">
              WUPHF!
            </text>
          </motion.g>
        );
      }
      return null;

    // Toby — sad rain cloud when error
    case "toby-flenderson":
      if (agent.visualState === "error") {
        return (
          <motion.g>
            {/* Tiny rain cloud */}
            <ellipse cx={0} cy={-18} rx={8} ry={4} fill="#94a3b8" opacity={0.6} />
            <ellipse cx={-4} cy={-20} rx={4} ry={3} fill="#94a3b8" opacity={0.5} />
            <ellipse cx={4} cy={-20} rx={4} ry={3} fill="#94a3b8" opacity={0.5} />
            {/* Rain drops */}
            <motion.line x1={-3} y1={-14} x2={-3} y2={-10} stroke="#93c5fd" strokeWidth={0.5}
              animate={{ y1: [-14, -8], y2: [-10, -4], opacity: [0.8, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: 0 }} />
            <motion.line x1={0} y1={-14} x2={0} y2={-10} stroke="#93c5fd" strokeWidth={0.5}
              animate={{ y1: [-14, -8], y2: [-10, -4], opacity: [0.8, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }} />
            <motion.line x1={3} y1={-14} x2={3} y2={-10} stroke="#93c5fd" strokeWidth={0.5}
              animate={{ y1: [-14, -8], y2: [-10, -4], opacity: [0.8, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: 0.6 }} />
          </motion.g>
        );
      }
      return null;

    default:
      return null;
  }
}
