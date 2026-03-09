import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ActivePage = "splash" | "dashboard" | "floorplan" | "roster" | "desk";
export type FloorView = "main-office" | "warehouse" | "parking-lot";
export type UIMode = "idiot" | "advanced";
export type OfficeVoiceMode = "off" | "light" | "full";
export type CoachStep = "connect" | "worker" | "character" | "chat" | "done";

export type DeskSection = "sessions" | "setup" | "workbench" | "approvals" | "nodes" | "logs" | "cron";

export type DeskFocus = {
  instanceId?: string;
  sessionKey?: string | null;
  agentId?: string;
  channelId?: string;
  section?: DeskSection;
};

export type SidebarPanel =
  | { type: "agent"; instanceId: string; agentId: string }
  | { type: "chat"; instanceId: string; agentId: string }
  | { type: "channel"; instanceId: string; channelId: string }
  | { type: "instance"; instanceId: string }
  | { type: "settings" }
  | null;

type UIStore = {
  sidebarPanel: SidebarPanel;
  showAddInstance: boolean;
  easterEggsEnabled: boolean;
  soundEnabled: boolean;
  activePage: ActivePage;
  floorView: FloorView;
  deskFocus: DeskFocus;
  uiMode: UIMode;
  officeVoiceMode: OfficeVoiceMode;
  coachDismissed: boolean;
  coachStep: CoachStep;

  openPanel: (panel: SidebarPanel) => void;
  closePanel: () => void;
  toggleAddInstance: () => void;
  toggleEasterEggs: () => void;
  toggleSound: () => void;
  setActivePage: (page: ActivePage) => void;
  setFloorView: (view: FloorView) => void;
  setDeskFocus: (focus: Partial<DeskFocus>) => void;
  openDesk: (focus?: Partial<DeskFocus>) => void;
  setUIMode: (mode: UIMode) => void;
  setOfficeVoiceMode: (mode: OfficeVoiceMode) => void;
  dismissCoach: (dismissed: boolean) => void;
  setCoachStep: (step: CoachStep) => void;
};

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarPanel: null,
      showAddInstance: false,
      easterEggsEnabled: true,
      soundEnabled: false,
      activePage: "splash",
      floorView: "main-office",
      deskFocus: { section: "setup" },
      uiMode: "idiot",
      officeVoiceMode: "light",
      coachDismissed: false,
      coachStep: "connect",

      openPanel: (panel) => set({ sidebarPanel: panel }),
      closePanel: () => set({ sidebarPanel: null }),
      toggleAddInstance: () => set((s) => ({ showAddInstance: !s.showAddInstance })),
      toggleEasterEggs: () => set((s) => ({ easterEggsEnabled: !s.easterEggsEnabled })),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      setActivePage: (page) => set({ activePage: page }),
      setFloorView: (view) => set({ floorView: view }),
      setDeskFocus: (focus) =>
        set((state) => ({
          deskFocus: { ...state.deskFocus, ...focus },
        })),
      openDesk: (focus) =>
        set((state) => ({
          activePage: "desk",
          deskFocus: { ...state.deskFocus, ...focus },
          sidebarPanel: null,
        })),
      setUIMode: (uiMode) => set({ uiMode }),
      setOfficeVoiceMode: (officeVoiceMode) => set({ officeVoiceMode }),
      dismissCoach: (coachDismissed) => set({ coachDismissed }),
      setCoachStep: (coachStep) => set({ coachStep }),
    }),
    {
      name: "mission-control-ui",
      partialize: (state) => ({
        uiMode: state.uiMode,
        officeVoiceMode: state.officeVoiceMode,
        coachDismissed: state.coachDismissed,
        coachStep: state.coachStep,
      }),
    },
  ),
);
