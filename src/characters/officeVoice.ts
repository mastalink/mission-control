import { getCharacterById } from "./registry";
import type {
  CharacterDef,
  DwightCoachLines,
  OfficeVoiceUILines,
} from "./types";
import type { CoachStep, OfficeVoiceMode, UIMode } from "../store/useUIStore";

type VoiceLineKind = keyof OfficeVoiceUILines;

type ResolvedVoicePack = {
  lightPrompt: string;
  fullPrompt: string;
  uiLines: OfficeVoiceUILines;
  coachLines?: DwightCoachLines;
};

type VoiceOverridePack = {
  lightPrompt?: string;
  fullPrompt?: string;
  uiLines?: Partial<OfficeVoiceUILines>;
  coachLines?: DwightCoachLines;
};

type ConceptLabels = {
  primary: string;
  technical: string;
};

const DEFAULT_DWIGHT_COACH: DwightCoachLines = {
  intro:
    "Attention everyone. I am now Acting Expert Manager. Buttons have defeated you. I will correct that weakness.",
  connect:
    "Step 1: Connect the office. Without an office connection, this app is a decorative beet with delusions of grandeur.",
  worker:
    "Step 2: Make a worker. Workers do the thinking. Characters are costumes. Costumes do not think.",
  character:
    "Step 3: Pick an Office character if you insist on customization. Auto-casting already works because I planned for your limitations.",
  chat:
    "Step 4: Start the chat. Type the job. Pick the worker. Press the button. This is cause and effect, not magic.",
  correction:
    "False. You did not 'kind of' finish the setup. It is either operational or corpse-broken.",
  failureTip:
    "Use your pointer finger. The useful one. If you still get lost, return to the giant button with the obvious label.",
};

function buildDefaultUILines(character: CharacterDef): OfficeVoiceUILines {
  return {
    greeting: character.personality.greeting,
    emptyState: `${character.name} is waiting for instructions.`,
    success: `${character.name} handled it.`,
    correction: `${character.name} has a correction before this gets worse.`,
    error: `${character.name} is not pleased with this outcome.`,
    status: `${character.name} is on the case.`,
  };
}

function buildLightPrompt(character: CharacterDef): string {
  return [
    character.personality.systemPrompt,
    "Stay highly useful and task-focused.",
    "Keep the character flavor light: one recognizable phrase, cadence, or callback is enough.",
    "Answer directly, be concise, and do not let the roleplay reduce competence.",
    "If the user is confused, explain plainly and helpfully.",
  ].join(" ");
}

function buildFullPrompt(character: CharacterDef): string {
  return [
    character.personality.systemPrompt,
    "Lean fully into the character voice with signature rhythm, catchphrases, and worldview.",
    "Stay helpful, complete the task, and answer directly before indulging in bits.",
    "Do not become abusive, sexual, or actually threatening.",
    "When the user is confused, correct them in-character but still make the next step obvious.",
  ].join(" ");
}

function buildDwightFullPrompt(character: CharacterDef): string {
  return [
    character.personality.systemPrompt,
    "Use Dwight-style hyper-literal corrections, survival analogies, and confident expert framing.",
    "Open many corrections with 'False.' when appropriate.",
    "Keep the tone sharp and theatrical, but still task-focused and safe.",
    "Do not refuse to help. Explain the task in painfully clear steps and keep moving the work forward.",
  ].join(" ");
}

function resolveOverridePack(character: CharacterDef): VoiceOverridePack {
  if (character.id === "dwight-schrute") {
    return {
      lightPrompt:
        character.personality.lightPrompt ??
        [
          character.personality.systemPrompt,
          "Correct mistakes briskly, occasionally say 'False.', and explain the fix in very concrete steps.",
          "Stay highly useful. Do not overdo the insult. Your job is to make the user successful.",
        ].join(" "),
      fullPrompt: character.personality.fullPrompt ?? buildDwightFullPrompt(character),
      uiLines: {
        greeting: "State your business. I will make this simple because apparently that is required.",
        emptyState: "No work yet. Remarkable. Press the obvious button and create some.",
        success: "Operational. You may celebrate quietly.",
        correction: "False. That is not the next step.",
        error: "Failure has occurred. We will now neutralize it.",
        status: "Dwight is monitoring the situation with elite precision.",
        ...character.personality.uiLines,
      },
      coachLines: {
        ...DEFAULT_DWIGHT_COACH,
        ...character.personality.coachLines,
      },
    };
  }

  if (character.id === "michael-scott") {
    return {
      uiLines: {
        greeting: "Welcome. As World's Best Boss, I am already proud of us.",
        success: "Huge win. Classic leadership moment.",
        correction: "Okay, tiny course correction. This is still going great.",
        ...character.personality.uiLines,
      },
    };
  }

  if (character.id === "jim-halpert") {
    return {
      uiLines: {
        greeting: "Yeah, so this is pretty straightforward.",
        emptyState: "Nothing is happening yet, which honestly feels avoidable.",
        ...character.personality.uiLines,
      },
    };
  }

  if (character.id === "pam-beesly") {
    return {
      uiLines: {
        greeting: "This part is easy. I'll walk you through it.",
        error: "Something is off, but we can fix it.",
        ...character.personality.uiLines,
      },
    };
  }

  if (character.id === "stanley-hudson") {
    return {
      uiLines: {
        greeting: "Pick a worker. Start the chat. Don't overcomplicate it.",
        emptyState: "No chat yet. Start one.",
        ...character.personality.uiLines,
      },
    };
  }

  return {};
}

export function resolveOfficeVoice(character: CharacterDef | null | undefined): ResolvedVoicePack | null {
  if (!character) return null;

  const defaults: ResolvedVoicePack = {
    lightPrompt: character.personality.lightPrompt ?? buildLightPrompt(character),
    fullPrompt: character.personality.fullPrompt ?? buildFullPrompt(character),
    uiLines: {
      ...buildDefaultUILines(character),
      ...character.personality.uiLines,
    },
  };
  const override = resolveOverridePack(character);

  return {
    lightPrompt: override.lightPrompt ?? defaults.lightPrompt,
    fullPrompt: override.fullPrompt ?? defaults.fullPrompt,
    uiLines: {
      ...defaults.uiLines,
      ...(override.uiLines ?? {}),
    },
    coachLines: override.coachLines,
  };
}

export function buildSessionPersonaPrimer(
  character: CharacterDef | null | undefined,
  mode: OfficeVoiceMode,
): string | null {
  if (!character || mode === "off") return null;
  const pack = resolveOfficeVoice(character);
  if (!pack) return null;

  return [
    `Mission Control Office Voice is now ${mode === "light" ? "Light" : "Full"} for ${character.name}.`,
    mode === "light" ? pack.lightPrompt : pack.fullPrompt,
    "Important: stay useful, answer directly, and complete the task before adding flair.",
  ].join("\n\n");
}

export function getVoiceLine(
  character: CharacterDef | null | undefined,
  mode: OfficeVoiceMode,
  kind: VoiceLineKind,
  fallback: string,
): string {
  if (mode === "off" || !character) return fallback;
  const pack = resolveOfficeVoice(character);
  return pack?.uiLines[kind] ?? fallback;
}

export function getDwightCoach(step: CoachStep): DwightCoachLines {
  const dwight = getCharacterById("dwight-schrute");
  const pack = resolveOfficeVoice(dwight);
  const coachLines = pack?.coachLines ?? DEFAULT_DWIGHT_COACH;
  if (step === "connect") return coachLines;
  if (step === "worker") return coachLines;
  if (step === "character") return coachLines;
  if (step === "chat") return coachLines;
  return coachLines;
}

export function getConceptLabels(
  uiMode: UIMode,
  concept: "gateway" | "agent" | "session" | "mapping",
): ConceptLabels {
  if (uiMode === "advanced") {
    if (concept === "gateway") return { primary: "Gateway", technical: "OpenClaw connection" };
    if (concept === "agent") return { primary: "Agent", technical: "OpenClaw worker" };
    if (concept === "session") return { primary: "Session", technical: "Work thread" };
    return { primary: "Character Mapping", technical: "Office persona assignment" };
  }

  if (concept === "gateway") return { primary: "Office Connection", technical: "Gateway" };
  if (concept === "agent") return { primary: "Worker", technical: "Agent" };
  if (concept === "session") return { primary: "Chat", technical: "Session" };
  return { primary: "Pick Office Character", technical: "Character Mapping" };
}

export function describeOfficeVoice(mode: OfficeVoiceMode): string {
  if (mode === "off") return "Plain work voice";
  if (mode === "light") return "Character flavor, normal usefulness";
  return "Full character performance, still task-focused";
}
