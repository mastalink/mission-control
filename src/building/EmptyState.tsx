import { motion } from "framer-motion";
import { useUIStore } from "../store/useUIStore";
import { loadDemoData } from "../demo/loadDemo";

type Props = {
  onConnect: (config: { instanceId: string; label: string; url: string }) => void;
};

export function EmptyState({ onConnect }: Props) {
  const handleQuickConnect = () => {
    onConnect({
      instanceId: "scranton-" + Date.now(),
      label: "Scranton",
      url: "ws://localhost:18789",
    });
  };

  return (
    <div className="h-full flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md w-full"
      >
        {/* Dunder Mifflin Logo */}
        <div className="mb-6 sm:mb-8">
          <div className="text-3xl sm:text-5xl font-bold text-dunder-paper font-dunder tracking-tight">
            DUNDER MIFFLIN
          </div>
          <div className="text-sm sm:text-lg text-gray-500 font-dunder mt-1">
            PAPER COMPANY, INC.
          </div>
          <div className="w-48 h-px bg-gray-700 mx-auto mt-3" />
          <div className="text-sm text-gray-400 mt-3 tracking-widest uppercase">
            Mission Control
          </div>
        </div>

        <p className="text-gray-400 text-sm mb-8">
          Connect to an OpenClaw gateway to begin monitoring your agents.
          Each gateway appears as a floor in the Dunder Mifflin office building.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleQuickConnect}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Quick Connect (localhost:18789)
          </button>
          <button
            onClick={() => useUIStore.getState().toggleAddInstance()}
            className="w-full px-6 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700"
          >
            Custom Connection...
          </button>
          <button
            onClick={loadDemoData}
            className="w-full px-6 py-3 bg-amber-900/50 text-amber-300 rounded-lg hover:bg-amber-900/70 transition-colors border border-amber-800/50 text-sm"
          >
            Demo Mode (No Gateway Required)
          </button>
        </div>

        <p className="text-gray-600 text-xs mt-8">
          "Would I rather be feared or loved? Easy. Both. I want people to be afraid of how much they love me."
        </p>
      </motion.div>
    </div>
  );
}
