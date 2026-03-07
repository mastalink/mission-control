import { motion } from "framer-motion";

type Props = {
  x: number;
  y: number;
  active: boolean;
  hasError: boolean;
};

export function Desk({ x, y, active, hasError }: Props) {
  const screenColor = hasError ? "#ef4444" : active ? "#3b82f6" : "#1e293b";

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Desk surface */}
      <rect x={0} y={18} width={60} height={30} rx={2} fill="#92400e" opacity={0.7} />
      <rect x={2} y={20} width={56} height={26} rx={1} fill="#a16207" opacity={0.5} />
      {/* Monitor */}
      <rect x={18} y={4} width={24} height={16} rx={1.5} fill="#334155" />
      <motion.rect
        x={20}
        y={6}
        width={20}
        height={12}
        rx={0.5}
        fill={screenColor}
        animate={active ? { opacity: [0.7, 1, 0.7] } : {}}
        transition={active ? { duration: 2, repeat: Infinity } : {}}
      />
      {/* Monitor stand */}
      <rect x={27} y={20} width={6} height={3} fill="#475569" />
      {/* Keyboard */}
      <rect x={20} y={26} width={20} height={6} rx={1} fill="#64748b" opacity={0.6} />
      {/* Coffee cup (small detail) */}
      <rect x={48} y={22} width={6} height={8} rx={1} fill="#d1d5db" />
      <rect x={54} y={24} width={3} height={4} rx={1} fill="#d1d5db" />
    </g>
  );
}
