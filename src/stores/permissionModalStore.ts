import { create } from "zustand";

// Global "no permission" modal, triggered from the axios request
// interceptor (api.ts) whenever a marketing-only account attempts a
// write action it isn't allowed to perform. A plain Zustand store (not
// React state) so it's reachable from outside the component tree.
interface PermissionModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const usePermissionModalStore = create<PermissionModalState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
