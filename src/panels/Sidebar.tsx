import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "../store/useUIStore";
import { useViewport } from "../hooks/useViewport";
import { AgentPanel } from "./AgentPanel";
import { ChatPanel } from "./ChatPanel";
import { ChannelPanel } from "./ChannelPanel";
import { SettingsPanel } from "./SettingsPanel";
import { InstancePanel } from "./InstancePanel";

export function Sidebar() {
  const panel = useUIStore((s) => s.sidebarPanel);
  const closePanel = useUIStore((s) => s.closePanel);
  const { bp } = useViewport();
  const isMobile = bp === "mobile";

  const desktopMotion = {
    initial: { x: 320 },
    animate: { x: 0 },
    exit: { x: 320 },
  };

  const mobileMotion = {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
  };

  const motion$ = isMobile ? mobileMotion : desktopMotion;

  return (
    <AnimatePresence>
      {panel && (
        <>
          {/* Backdrop on mobile */}
          {isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={closePanel}
            />
          )}
          <motion.div
            {...motion$}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={
              isMobile
                ? "fixed bottom-0 left-0 right-0 h-[70vh] bg-gray-900 border-t border-gray-700 shadow-2xl overflow-y-auto z-50 rounded-t-xl"
                : "fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-700 shadow-2xl overflow-y-auto z-50"
            }
          >
            {/* Swipe handle on mobile */}
            {isMobile && (
              <div className="sticky top-0 bg-gray-900 pt-2 pb-1 flex justify-center z-10">
                <div className="w-10 h-1 rounded-full bg-gray-600" />
              </div>
            )}
            {panel.type === "agent" && (
              <AgentPanel instanceId={panel.instanceId} agentId={panel.agentId} />
            )}
            {panel.type === "chat" && (
              <ChatPanel instanceId={panel.instanceId} agentId={panel.agentId} />
            )}
            {panel.type === "channel" && (
              <ChannelPanel instanceId={panel.instanceId} channelId={panel.channelId} />
            )}
            {panel.type === "instance" && (
              <InstancePanel instanceId={panel.instanceId} />
            )}
            {panel.type === "settings" && (
              <SettingsPanel />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
