import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useUIStore } from "../store/useUIStore";
import { BrickCharacter } from "../floor/BrickCharacter";
import { getCharacterById } from "../characters/registry";

const OFFICE_QUOTES = [
  { text: "I'm not superstitious, but I am a little stitious.", author: "Michael Scott" },
  { text: "Bears. Beets. Battlestar Galactica.", author: "Dwight Schrute" },
  { text: "I don't want any new friends. You mean too much to me already.", author: "Michael Scott" },
  { text: "I am fast. To give you a reference point, I'm somewhere between a snake and a mongoose.", author: "Dwight Schrute" },
  { text: "Would I rather be feared or loved? Easy. Both. I want people to be afraid of how much they love me.", author: "Michael Scott" },
  { text: "Identity theft is not a joke, Jim! Millions of families suffer every year!", author: "Dwight Schrute" },
  { text: "You miss 100% of the shots you don't take. —Wayne Gretzky", author: "Michael Scott" },
  { text: "I knew exactly what to do, but in a much more real sense I had no idea what to do.", author: "Michael Scott" },
  { text: "Through every dark night, there's a bright day after that.", author: "Michael Scott" },
  { text: "When you're a kid, you assume your parents are soulmates. My kids are going to be right about that.", author: "Jim Halpert" },
  { text: "I'm not a millionaire. I thought I would be by the time I was 30, but I wasn't even close.", author: "Michael Scott" },
  { text: "The worst thing about prison was the dementors.", author: "Michael Scott" },
];

/** Parade characters — first names only, mapped to their characterId */
const PARADE = [
  "michael-scott",
  "jim-halpert",
  "pam-beesly",
  "dwight-schrute",
  "andy-bernard",
];

const MOCK_IDLE_AGENT = {
  agentId: "splash-demo",
  name: "Demo",
  visualState: "idle" as const,
  location: "open-floor",
  characterId: null,
  lastDeltaText: null,
  activeTool: null,
  lastError: null,
  activeRunId: null,
  totalTokens: 0,
  lastActivityTs: null,
  emoji: null,
  sortOrder: 0,
};

export function SplashScreen() {
  const setActivePage = useUIStore((s) => s.setActivePage);
  const toggleAddInstance = useUIStore((s) => s.toggleAddInstance);

  const [quoteIndex, setQuoteIndex] = useState(0);

  // Cycle quotes every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % OFFICE_QUOTES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleDemo = async () => {
    const { loadDemoData } = await import("../demo/loadDemo");
    loadDemoData();
  };

  const handleConnect = () => {
    setActivePage("floorplan");
    toggleAddInstance();
  };

  const quote = OFFICE_QUOTES[quoteIndex]!;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        background: "#0b1120",
        backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wOCkiLz48L3N2Zz4=")`,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-2xl mx-4 rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
        style={{ background: "rgba(26,54,93,0.9)", backdropFilter: "blur(20px)" }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />

        {/* Banner image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src="/lego-splash.png"
            alt="Mission Control"
            className="w-full h-full object-cover"
            style={{ filter: "brightness(0.7) contrast(1.1)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(26,54,93,0.9)] to-transparent" />

          {/* Title over banner */}
          <div className="absolute bottom-0 left-0 right-0 px-8 pb-4">
            <div className="text-[10px] font-mono text-blue-300 tracking-[0.3em] uppercase mb-1">
              Dunder Mifflin Paper Company
            </div>
            <div className="text-2xl font-bold text-white font-serif leading-tight">
              MISSION CONTROL
            </div>
            <div className="text-sm text-blue-200 font-mono tracking-widest">
              BRICK EDITION
            </div>
          </div>
        </div>

        {/* Character parade */}
        <div className="flex items-end justify-center gap-6 py-5 px-8 border-b border-white/5">
          {PARADE.map((charId, i) => {
            const char = getCharacterById(charId);
            if (!char) return null;
            return (
              <motion.div
                key={charId}
                initial={{ x: -80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.12, duration: 0.5, ease: "easeOut" }}
              >
                <BrickCharacter
                  character={char}
                  agent={{ ...MOCK_IDLE_AGENT, agentId: `splash-${charId}`, characterId: charId }}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Quote rotator */}
        <div className="h-20 flex items-center justify-center px-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={quoteIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <p className="text-sm text-gray-300 italic">
                &ldquo;{quote.text}&rdquo;
              </p>
              <p className="text-[10px] text-gray-500 mt-1.5 uppercase tracking-widest">
                — {quote.author}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 px-8 pb-7">
          <button
            onClick={handleConnect}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors border border-blue-400/30"
          >
            Quick Connect
          </button>
          <button
            onClick={handleDemo}
            className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 text-sm font-medium transition-colors border border-white/10"
          >
            Demo Mode
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-[9px] font-mono text-gray-600 tracking-widest pb-3">
          DUNDER MIFFLIN PAPER COMPANY — SCRANTON BRANCH
        </div>
      </motion.div>
    </div>
  );
}
