/**
 * Synthesized sound effects for Mission Control using Web Audio API.
 * No external audio files - all sounds are generated programmatically.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.15) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

/** Two-note ascending chime (gateway connected) */
export function playConnectSound() {
  playTone(523, 0.15, "sine", 0.12); // C5
  setTimeout(() => playTone(659, 0.2, "sine", 0.12), 120); // E5
  setTimeout(() => playTone(784, 0.3, "sine", 0.1), 240); // G5
}

/** Descending two-note (gateway disconnected) */
export function playDisconnectSound() {
  playTone(523, 0.2, "sine", 0.1);
  setTimeout(() => playTone(392, 0.3, "sine", 0.1), 150);
}

/** Quick high ping (agent started talking) */
export function playTalkingSound() {
  playTone(880, 0.08, "sine", 0.06);
}

/** Soft low tone (agent thinking) */
export function playThinkingSound() {
  playTone(330, 0.15, "triangle", 0.05);
}

/** Mechanical click (tool call) */
export function playToolCallSound() {
  playTone(1200, 0.04, "square", 0.04);
  setTimeout(() => playTone(900, 0.03, "square", 0.03), 30);
}

/** Buzzy error sound */
export function playErrorSound() {
  playTone(200, 0.12, "sawtooth", 0.08);
  setTimeout(() => playTone(180, 0.15, "sawtooth", 0.08), 100);
}

/** Quick completion ding (agent finished run) */
export function playCompleteSound() {
  playTone(659, 0.1, "sine", 0.08);
  setTimeout(() => playTone(784, 0.15, "sine", 0.08), 80);
}

/** The Office theme - first 8 notes (do do do-do-do do do do) */
export function playOfficeTheme() {
  const notes = [
    { freq: 587, dur: 0.15 }, // D5
    { freq: 659, dur: 0.15 }, // E5
    { freq: 740, dur: 0.12 }, // F#5
    { freq: 659, dur: 0.12 }, // E5
    { freq: 587, dur: 0.15 }, // D5
    { freq: 494, dur: 0.15 }, // B4
    { freq: 440, dur: 0.15 }, // A4
    { freq: 494, dur: 0.3 },  // B4
  ];
  let time = 0;
  for (const n of notes) {
    setTimeout(() => playTone(n.freq, n.dur + 0.05, "sine", 0.1), time);
    time += n.dur * 1000;
  }
}
