export type OfficeLocation =
  | "michael-office"
  | "open-floor"
  | "conference-room"
  | "reception"
  | "annex"
  | "break-room"
  | "warehouse"
  | "accounting-corner";

export type AgentVisualState =
  | "idle"
  | "thinking"
  | "talking"
  | "tool_calling"
  | "error"
  | "offline";

export type OfficeVoiceUILines = {
  greeting: string;
  emptyState: string;
  success: string;
  correction: string;
  error: string;
  status: string;
};

export type DwightCoachLines = {
  intro: string;
  connect: string;
  worker: string;
  character: string;
  chat: string;
  correction: string;
  failureTip: string;
};

/** Personality traits that shape how the character's agent behaves */
export type CharacterPersonality = {
  /** Core personality in 1-2 sentences (injected as extraSystemPrompt) */
  systemPrompt: string;
  /** Light flavor that still behaves like a standard high-utility assistant */
  lightPrompt?: string;
  /** Stronger in-character voice that still stays helpful */
  fullPrompt?: string;
  /** UI copy variants for helper text and empty states */
  uiLines?: Partial<OfficeVoiceUILines>;
  /** Dwight-only coach script for Idiot Mode */
  coachLines?: Partial<DwightCoachLines>;
  /** Top 3 strengths this character excels at */
  strengths: [string, string, string];
  /** What they struggle with */
  weakness: string;
  /** How they greet people / conversation opener style */
  greeting: string;
  /** Emoji reactions they tend to use */
  favoriteEmojis: string[];
  /** Characters they work well with (ids) */
  allies: string[];
  /** Characters they clash with (ids) */
  rivals: string[];
};

export type CharacterDef = {
  id: string;
  name: string;
  title: string;
  quote: string;
  defaultLocation: OfficeLocation;
  deskPosition: { x: number; y: number };
  color: string;
  idleBehavior: string;
  bodyColor: string;
  headDetail: string;
  personality: CharacterPersonality;
};

export type CharacterAssignment = {
  agentId: string;
  characterId: string;
  instanceId: string;
  isUserAssigned: boolean;
};
