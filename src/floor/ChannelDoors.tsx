import { motion } from "framer-motion";
import type { ChannelState } from "../store/useChannelStore";
import { useUIStore } from "../store/useUIStore";

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "#25D366",
  telegram: "#0088cc",
  discord: "#5865F2",
  slack: "#4A154B",
  signal: "#3A76F0",
  imessage: "#34C759",
  matrix: "#0DBD8B",
  webchat: "#f59e0b",
};

type Props = {
  channels: Record<string, ChannelState>;
  instanceId: string;
};

export function ChannelDoors({ channels, instanceId }: Props) {
  const openPanel = useUIStore((s) => s.openPanel);
  const channelList = Object.values(channels).filter((c) => c.configured);

  if (channelList.length === 0) return null;

  const doorWidth = 30;
  const doorSpacing = 40;
  const startX = 680;
  const doorY = 5;

  return (
    <g>
      {/* Exterior wall label */}
      <text x={startX + (channelList.length * doorSpacing) / 2} y={doorY - 2} textAnchor="middle"
        fontSize="7" fill="#6b4c30" fontFamily="Georgia" opacity="0.6">
        Channels
      </text>

      {channelList.map((channel, i) => {
        const x = startX + i * doorSpacing;
        const color = CHANNEL_COLORS[channel.channelId.toLowerCase()] ?? "#6b7280";

        return (
          <g key={channel.channelId}
            style={{ cursor: "pointer" }}
            onClick={() => openPanel({ type: "channel", instanceId, channelId: channel.channelId })}
          >
            {/* Door frame */}
            <rect x={x} y={doorY} width={doorWidth} height={18} rx={2}
              fill={color} opacity={channel.connected ? 0.8 : 0.3}
              stroke={channel.connected ? color : "#94a3b8"} strokeWidth={1}
            />
            {/* Door label */}
            <text x={x + doorWidth / 2} y={doorY + 12} textAnchor="middle"
              fontSize="4.5" fill="white" fontFamily="sans-serif" fontWeight="bold">
              {channel.label.slice(0, 4).toUpperCase()}
            </text>
            {/* Connection pulse */}
            {channel.connected && (
              <motion.circle
                cx={x + doorWidth / 2} cy={doorY + 3} r={2}
                fill="#22c55e"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            {/* Error indicator */}
            {channel.lastError && (
              <circle cx={x + doorWidth - 3} cy={doorY + 3} r={2} fill="#ef4444" />
            )}
          </g>
        );
      })}
    </g>
  );
}
