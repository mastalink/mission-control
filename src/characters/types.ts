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

/** Personality traits that shape how the character's agent behaves */
export type CharacterPersonality = {
  /** Core personality in 1-2 sentences (injected as extraSystemPrompt) */
  systemPrompt: string;
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
