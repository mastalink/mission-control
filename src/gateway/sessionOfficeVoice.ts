import { buildSessionPersonaPrimer } from "../characters/officeVoice";
import { getCharacterById } from "../characters/registry";
import type { OfficeVoiceMode } from "../store/useUIStore";
import type { SessionPersonaState } from "../store/useOpsStore";
import type { GatewayClient } from "./GatewayClient";

type Params = {
  client: GatewayClient;
  methods?: string[];
  sessionKey: string;
  characterId?: string | null;
  voiceMode: OfficeVoiceMode;
  currentState?: SessionPersonaState;
  onState: (state: SessionPersonaState) => void;
};

type EnsureSessionOfficeVoiceResult = {
  supported: boolean;
  applied: boolean;
  message?: string;
};

export async function ensureSessionOfficeVoice({
  client,
  methods,
  sessionKey,
  characterId,
  voiceMode,
  currentState,
  onState,
}: Params): Promise<EnsureSessionOfficeVoiceResult> {
  if (!characterId || voiceMode === "off") {
    return { supported: true, applied: false };
  }

  const character = getCharacterById(characterId);
  if (!character) {
    return { supported: true, applied: false };
  }

  if (
    currentState &&
    currentState.supported &&
    currentState.characterId === characterId &&
    currentState.voiceMode === voiceMode
  ) {
    return { supported: true, applied: false };
  }

  if (methods && methods.length > 0 && !methods.includes("chat.inject")) {
    onState({
      characterId,
      voiceMode,
      injectedAt: Date.now(),
      supported: false,
    });
    return {
      supported: false,
      applied: false,
      message: "This gateway does not expose chat.inject, so Office Voice stays in the UI only.",
    };
  }

  const primer = buildSessionPersonaPrimer(character, voiceMode);
  if (!primer) {
    return { supported: true, applied: false };
  }

  await client.chatInject({ sessionKey, text: primer });
  onState({
    characterId,
    voiceMode,
    injectedAt: Date.now(),
    supported: true,
  });
  return { supported: true, applied: true };
}
