import { create } from "zustand";

interface AppState {
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Active page
  activePage: string;
  setActivePage: (page: string) => void;

  // Command palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Chat
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;

  // Notifications
  notificationCount: number;
  setNotificationCount: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  activePage: "dashboard",
  setActivePage: (page) => set({ activePage: page }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  chatOpen: false,
  setChatOpen: (open) => set({ chatOpen: open }),

  notificationCount: 3,
  setNotificationCount: (count) => set({ notificationCount: count }),
}));
