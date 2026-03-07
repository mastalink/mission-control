import { motion } from "framer-motion";
import { useMemo } from "react";
import type { CharacterDef } from "../characters/types";
import type { AgentState } from "../store/useAgentStore";

type Props = {
  character: CharacterDef;
  agent: AgentState;
  onClick?: () => void;
};

// Derive short key: "michael-scott" -> "michael"
function shortId(id: string) {
  return id.split("-")[0]!;
}

const CHAR_IMAGES: Record<string, string> = {
  michael:  "/chars/michael.png",
  dwight:   "/chars/dwight.png",
  jim:      "/chars/jim.png",
  pam:      "/chars/pam.png",
  stanley:  "/chars/stanley.png",
  phyllis:  "/chars/phyllis.png",
  angela:   "/chars/angela.png",
  kevin:    "/chars/kevin.png",
  oscar:    "/chars/oscar.png",
  andy:     "/chars/andy.png",
  meredith: "/chars/meredith.png",
  creed:    "/chars/creed.png",
  ryan:     "/chars/ryan.png",
  kelly:    "/chars/kelly.png",
  toby:     "/chars/toby.png",
  darryl:   "/chars/darryl.png",
  erin:     "/chars/erin.png",
  roy:      "/chars/roy.png",
};

const STATUS_COLORS: Record<string, string> = {
  talking:     "#3b82f6",
  thinking:    "#f59e0b",
  tool_calling: "#a855f7",
  error:       "#ef4444",
  idle:        "#22c55e",
  offline:     "#6b7280",
};

export function BrickCharacter({ character, agent, onClick }: Props) {
  const key = shortId(character.id);
  const imgSrc = CHAR_IMAGES[key] ?? "/chars/sprite.png";
  const state = agent.visualState;
  const bobDuration = useMemo(
    () => 2 + (character.id.length % 5) * 0.3,
    [character.id]
  );

  const statusColor = STATUS_COLORS[state] ?? STATUS_COLORS.idle;
  const isActive = state !== "idle" && state !== "offline";

  const motionProps =
    state === "error"
      ? { animate: { x: [0, -3, 3, -3, 3, 0] }, transition: { duration: 0.5, repeat: Infinity, repeatDelay: 2 } }
      : state === "tool_calling"
      ? { animate: { y: [0, -5, -5, 0] }, transition: { duration: 1.2, repeat: Infinity } }
      : state === "talking"
      ? { animate: { y: [0, -4, 0, -3, 0] }, transition: { duration: bobDuration * 0.6, repeat: Infinity, ease: "easeInOut" as const } }
      : { animate: { y: [0, -2, 0] }, transition: { duration: bobDuration, repeat: Infinity, ease: "easeInOut" as const } };

  return (
    <div
      className="relative flex flex-col items-center cursor-pointer select-none"
      onClick={onClick}
    >
      {/* Speech bubble */}
      {state === "talking" && agent.lastDeltaText && (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-max max-w-[120px] bg-white/95 text-[#0b1120] text-[9px] font-mono px-2 py-1 rounded-lg shadow-lg pointer-events-none z-10 leading-tight">
          {agent.lastDeltaText.slice(0, 60)}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-white/95" />
        </div>
      )}

      {/* Tool indicator */}
      {state === "tool_calling" && agent.activeTool && (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-purple-900/90 border border-purple-500/50 text-purple-200 text-[8px] font-mono px-1.5 py-0.5 rounded z-10">
          ⚡ {agent.activeTool.slice(0, 18)}
        </div>
      )}

      {/* Thinking dots */}
      {state === "thinking" && (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 flex gap-0.5 z-10">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-amber-400"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      )}

      {/* Pulse ring */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: `0 0 0 6px ${statusColor}44` }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      )}

      {/* Character image */}
      <motion.div {...motionProps} className="relative">
        <div
          style={{
            width: 40,
            height: 60,
            backgroundImage: `url(${imgSrc})`,
            backgroundSize: "auto 170%",
            backgroundPosition: "center 20%",
            backgroundRepeat: "no-repeat",
            borderRadius: "6px",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2), 0 4px 6px rgba(0,0,0,0.4)",
            opacity: state === "offline" ? 0.4 : 1,
          }}
        />
        {/* Status dot */}
        <div
          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0b1120]"
          style={{ background: statusColor }}
        />
      </motion.div>

      {/* Name tag */}
      <div className="mt-0.5 text-[8px] font-mono text-gray-400 whitespace-nowrap max-w-[64px] truncate text-center">
        {character.name.split(" ")[0]}
      </div>
    </div>
  );
}
