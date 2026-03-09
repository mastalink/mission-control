import { useState, useEffect } from "react";
import { useGatewayStore } from "../store/useGatewayStore";
import { useUIStore } from "../store/useUIStore";
import { describeOfficeVoice } from "../characters/officeVoice";

const MICHAEL_QUOTES = [
  '"Limitless paper in a paperless world"',
  '"You miss 100% of the shots you don\'t take. —Wayne Gretzky —Michael Scott"',
  '"I am Beyoncé, always."',
  '"I\'m not superstitious, but I am a little stitious."',
  '"Would I rather be feared or loved? Easy. Both."',
  '"BEARS. BEETS. BATTLESTAR GALACTICA."',
  '"Wikipedia is the best thing ever."',
  '"I declare BANKRUPTCY!"',
];

export function TopBar() {
  const instances = useGatewayStore((s) => s.instances);
  const activeId = useGatewayStore((s) => s.activeInstanceId);
  const openPanel = useUIStore((s) => s.openPanel);
  const uiMode = useUIStore((s) => s.uiMode);
  const officeVoiceMode = useUIStore((s) => s.officeVoiceMode);
  const setUIMode = useUIStore((s) => s.setUIMode);
  const setOfficeVoiceMode = useUIStore((s) => s.setOfficeVoiceMode);
  const hasConnections = Object.keys(instances).length > 0;

  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % MICHAEL_QUOTES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const activeInstance = activeId ? instances[activeId] : null;

  return (
    <div className="flex h-16 shrink-0 items-center gap-4 border-b border-dunder-carpet/20 bg-dunder-blue/90 px-4">
      {/* Recording indicator */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            hasConnections ? "bg-red-500 animate-pulse" : "bg-gray-600"
          }`}
        />
        <span
          className={`text-[10px] font-mono tracking-widest uppercase ${
            hasConnections ? "text-red-400" : "text-gray-600"
          }`}
        >
          {hasConnections ? "RECORDING" : "STANDBY"}
        </span>
      </div>

      {/* Cycling quote */}
      <div className="flex-1 text-center">
        <p
          key={quoteIndex}
          className="text-xs text-dunder-wall/70 italic font-dunder truncate transition-opacity duration-500"
        >
          {MICHAEL_QUOTES[quoteIndex]}
        </p>
        <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.22em] text-dunder-carpet">
          {uiMode === "idiot" ? "Idiot Mode active" : "Advanced operator view"} · {describeOfficeVoice(officeVoiceMode)}
        </p>
      </div>

      <div className="hidden shrink-0 gap-3 lg:flex">
        <div className="rounded-lg border border-dunder-carpet/25 bg-dunder-paper/6 px-2 py-2">
          <div className="px-1 text-[10px] font-mono uppercase tracking-[0.22em] text-dunder-carpet">
            UI Mode
          </div>
          <div className="mt-2 flex gap-1">
            <button
              type="button"
              onClick={() => setUIMode("idiot")}
              className={`rounded-md px-3 py-1.5 font-dunder text-xs transition-colors ${
                uiMode === "idiot"
                  ? "border border-dunder-wall bg-dunder-paper text-dunder-blue"
                  : "border border-dunder-carpet/25 bg-dunder-paper/8 text-dunder-paper hover:bg-dunder-paper/14"
              }`}
            >
              Idiot Mode
            </button>
            <button
              type="button"
              onClick={() => setUIMode("advanced")}
              className={`rounded-md px-3 py-1.5 font-dunder text-xs transition-colors ${
                uiMode === "advanced"
                  ? "border border-dunder-wall bg-dunder-paper text-dunder-blue"
                  : "border border-dunder-carpet/25 bg-dunder-paper/8 text-dunder-paper hover:bg-dunder-paper/14"
              }`}
            >
              Advanced
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-dunder-carpet/25 bg-dunder-paper/6 px-2 py-2">
          <div className="px-1 text-[10px] font-mono uppercase tracking-[0.22em] text-dunder-carpet">
            Office Voice
          </div>
          <div className="mt-2 flex gap-1">
            {(["off", "light", "full"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setOfficeVoiceMode(mode)}
                className={`rounded-md px-3 py-1.5 font-dunder text-xs transition-colors ${
                  officeVoiceMode === mode
                    ? "border border-dunder-wall bg-dunder-paper text-dunder-blue"
                    : "border border-dunder-carpet/25 bg-dunder-paper/8 text-dunder-paper hover:bg-dunder-paper/14"
                }`}
              >
                {mode === "off" ? "Off" : mode === "light" ? "Light" : "Full"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Manager / active instance */}
      <div className="shrink-0">
        {activeInstance ? (
          <button
            onClick={() =>
              openPanel({ type: "instance", instanceId: activeInstance.instanceId })
            }
            className="flex items-center gap-2 px-3 py-1.5 bg-dunder-paper/10 hover:bg-dunder-paper/20 border border-dunder-carpet/30 rounded transition-colors"
          >
            <div className="w-6 h-6 bg-dunder-desk rounded flex items-center justify-center">
              <span className="text-dunder-paper text-xs font-dunder font-bold">
                {activeInstance.label.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-dunder-wall font-dunder">
              {activeInstance.label}
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-dunder-paper/5 border border-dunder-carpet/20 rounded opacity-50">
            <div className="w-6 h-6 bg-dunder-desk/50 rounded flex items-center justify-center">
              <span className="text-dunder-paper text-xs font-dunder font-bold">M</span>
            </div>
            <span className="text-xs text-dunder-wall font-dunder">Manager</span>
          </div>
        )}
      </div>
    </div>
  );
}
