import { motion } from "framer-motion";
import type { AgentState } from "../store/useAgentStore";
import type { CharacterDef, OfficeLocation } from "../characters/types";

type PlacedAgent = {
  agent: AgentState;
  character: CharacterDef;
};

type Props = {
  agentsByLocation: Record<OfficeLocation, PlacedAgent[]>;
  /** Lookup an agent's rendered (x,y) position on the SVG canvas */
  getAgentPosition: (agentId: string) => { x: number; y: number } | null;
};

/**
 * Draws animated connection arcs between active agents that share
 * a room, visualizing multi-agent coordination on the floor plan.
 */
export function CoordinationOverlay({ agentsByLocation, getAgentPosition }: Props) {
  const connections: Array<{
    id: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    intensity: number;
  }> = [];

  // For each room, find pairs of active agents and create connections
  for (const placed of Object.values(agentsByLocation)) {
    const active = placed.filter(
      (p) => p.agent.visualState === "thinking" || p.agent.visualState === "talking" || p.agent.visualState === "tool_calling"
    );

    if (active.length < 2) continue;

    // Create pairwise connections
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i]!;
        const b = active[j]!;
        const posA = getAgentPosition(a.agent.agentId);
        const posB = getAgentPosition(b.agent.agentId);
        if (!posA || !posB) continue;

        // Determine connection strength/color based on relationship
        const isAlly = a.character.personality.allies.includes(b.character.id);
        const isRival = a.character.personality.rivals.includes(b.character.id);

        connections.push({
          id: `${a.agent.agentId}-${b.agent.agentId}`,
          x1: posA.x,
          y1: posA.y,
          x2: posB.x,
          y2: posB.y,
          color: isAlly ? "#22d3ee" : isRival ? "#f97316" : "#818cf8",
          intensity: isAlly ? 1.0 : isRival ? 0.7 : 0.5,
        });
      }
    }
  }

  if (connections.length === 0) return null;

  return (
    <g className="coordination-overlay">
      <defs>
        <filter id="glow-coord">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {connections.map((conn) => {
        // Draw a curved arc between the two agents
        const midX = (conn.x1 + conn.x2) / 2;
        const midY = (conn.y1 + conn.y2) / 2;
        // Curve upward by offsetting the control point
        const dx = conn.x2 - conn.x1;
        const dy = conn.y2 - conn.y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const curveOffset = Math.min(dist * 0.3, 40);
        const ctrlX = midX - (dy / dist) * curveOffset;
        const ctrlY = midY + (dx / dist) * curveOffset;

        const pathD = `M ${conn.x1} ${conn.y1} Q ${ctrlX} ${ctrlY} ${conn.x2} ${conn.y2}`;

        return (
          <g key={conn.id}>
            {/* Glow background */}
            <motion.path
              d={pathD}
              fill="none"
              stroke={conn.color}
              strokeWidth={3}
              opacity={0.15}
              filter="url(#glow-coord)"
              animate={{ opacity: [0.1, 0.25, 0.1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Main line */}
            <motion.path
              d={pathD}
              fill="none"
              stroke={conn.color}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              animate={{
                strokeDashoffset: [0, -20],
                opacity: [0.4 * conn.intensity, 0.8 * conn.intensity, 0.4 * conn.intensity],
              }}
              transition={{
                strokeDashoffset: { duration: 1.5, repeat: Infinity, ease: "linear" },
                opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              }}
            />
            {/* Midpoint indicator */}
            <motion.circle
              cx={midX}
              cy={midY}
              r={3}
              fill={conn.color}
              animate={{ r: [2, 4, 2], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </g>
        );
      })}
    </g>
  );
}
