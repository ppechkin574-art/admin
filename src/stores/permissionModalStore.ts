import { create } from "zustand";

// Global "no permission" modal, triggered from the axios request
// interceptor (api.ts) whenever a marketing-only account attempts a
// write action it isn't allowed to perform. A plain Zustand store (not
// React state) so it's reachable from outside the component tree.
//
// `message` lets the interceptor pass an action-specific explanation
// (e.g. "editing questions is admin-only") instead of NoPermissionModal's
// generic fallback text — see marketingWriteGate.blockedActionMessage.
interface PermissionModalState {
  isOpen: boolean;
  message: string | null;
  open: (message?: string) => void;
  close: () => void;
}

export const usePermissionModalStore = create<PermissionModalState>((set) => ({
  isOpen: false,
  message: null,
  open: (message) => set({ isOpen: true, message: message ?? null }),
  close: () => set({ isOpen: false, message: null }),
}));
