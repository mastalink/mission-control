import { useChannelStore } from "../store/useChannelStore";
import { useUIStore } from "../store/useUIStore";

type Props = {
  instanceId: string;
  channelId: string;
};

function timeAgo(ts: number | null): string {
  if (!ts) return "—";
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function ChannelPanel({ instanceId, channelId }: Props) {
  const channel = useChannelStore((s) => s.channels[instanceId]?.[channelId]);
  const closePanel = useUIStore((s) => s.closePanel);
  const openDesk = useUIStore((s) => s.openDesk);

  if (!channel) {
    return (
      <div className="p-4 text-gray-400">
        <p>Channel not found.</p>
        <button onClick={closePanel} className="mt-2 text-sm text-blue-400 hover:underline">Close</button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-white font-dunder">{channel.label}</h2>
          <p className="text-sm text-gray-400">Channel</p>
        </div>
        <button onClick={closePanel} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
      </div>

      <div className="bg-gray-800 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${channel.connected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-sm text-gray-200">{channel.connected ? "Connected" : "Disconnected"}</span>
        </div>
      </div>
      <button
        onClick={() => openDesk({ instanceId, section: "workbench", channelId })}
        className="w-full py-2.5 bg-dunder-paper/10 hover:bg-dunder-paper/20 text-dunder-paper text-sm font-dunder rounded-lg transition-colors border border-dunder-carpet/30"
      >
        Open Desk Workbench
      </button>

      <div className="bg-gray-800 rounded-lg p-3 space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Activity</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-gray-500">Last Inbound</span>
          <span className="text-gray-200">{timeAgo(channel.lastInboundAt)}</span>
          <span className="text-gray-500">Last Outbound</span>
          <span className="text-gray-200">{timeAgo(channel.lastOutboundAt)}</span>
        </div>
      </div>

      {/* Accounts */}
      <div className="bg-gray-800 rounded-lg p-3 space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Accounts ({channel.accounts.length})
        </h3>
        {channel.accounts.map((acct) => (
          <div key={acct.accountId} className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${acct.connected ? "bg-green-500" : "bg-gray-600"}`} />
            <span className="text-gray-300 font-mono text-xs">{acct.accountId.slice(0, 12)}</span>
            {acct.reconnectAttempts && acct.reconnectAttempts > 0 && (
              <span className="text-xs text-yellow-500">({acct.reconnectAttempts} retries)</span>
            )}
          </div>
        ))}
      </div>

      {channel.lastError && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider">Last Error</h3>
          <p className="text-sm text-red-300 mt-1">{channel.lastError}</p>
        </div>
      )}
    </div>
  );
}
