import { create } from "zustand";
import { persist } from "zustand/middleware";

type CharacterStore = {
  /** instanceId -> agentId -> characterId */
  overrides: Record<string, Record<string, string>>;
  setOverride: (instanceId: string, agentId: string, characterId: string) => void;
  clearOverride: (instanceId: string, agentId: string) => void;
  getOverridesForInstance: (instanceId: string) => Record<string, string>;
};

export const useCharacterStore = create<CharacterStore>()(
  persist(
    (set, get) => ({
      overrides: {},
      setOverride: (instanceId, agentId, characterId) =>
        set((state) => ({
          overrides: {
            ...state.overrides,
            [instanceId]: { ...(state.overrides[instanceId] ?? {}), [agentId]: characterId },
          },
        })),
      clearOverride: (instanceId, agentId) =>
        set((state) => {
          const inst = { ...(state.overrides[instanceId] ?? {}) };
          delete inst[agentId];
          return { overrides: { ...state.overrides, [instanceId]: inst } };
        }),
      getOverridesForInstance: (instanceId) => get().overrides[instanceId] ?? {},
    }),
    { name: "dm-character-overrides" },
  ),
);
