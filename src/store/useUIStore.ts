import { create } from "zustand";

export type ActivePage = "splash" | "dashboard" | "floorplan" | "roster" | "ops";
export type FloorView = "main-office" | "warehouse" | "parking-lot";

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

  openPanel: (panel: SidebarPanel) => void;
  closePanel: () => void;
  toggleAddInstance: () => void;
  toggleEasterEggs: () => void;
  toggleSound: () => void;
  setActivePage: (page: ActivePage) => void;
  setFloorView: (view: FloorView) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  sidebarPanel: null,
  showAddInstance: false,
  easterEggsEnabled: true,
  soundEnabled: false,
  activePage: "splash",
  floorView: "main-office",

  openPanel: (panel) => set({ sidebarPanel: panel }),
  closePanel: () => set({ sidebarPanel: null }),
  toggleAddInstance: () => set((s) => ({ showAddInstance: !s.showAddInstance })),
  toggleEasterEggs: () => set((s) => ({ easterEggsEnabled: !s.easterEggsEnabled })),
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  setActivePage: (page) => set({ activePage: page }),
  setFloorView: (view) => set({ floorView: view }),
}));
