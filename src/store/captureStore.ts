import { create } from 'zustand';

import type { ImportSource } from '@/features/capture/captureService';

type CaptureDraftState = {
  source?: ImportSource | undefined;
  textMode: boolean;
  pastedText: string;
  setSource: (source?: ImportSource) => void;
  setTextMode: (enabled: boolean) => void;
  setPastedText: (value: string) => void;
  clear: () => void;
};

export const useCaptureStore = create<CaptureDraftState>((set) => ({
  source: undefined,
  textMode: false,
  pastedText: '',
  setSource: (source) => set({ source }),
  setTextMode: (textMode) => set({ textMode }),
  setPastedText: (pastedText) => set({ pastedText }),
  clear: () => set({ source: undefined, textMode: false, pastedText: '' }),
}));
