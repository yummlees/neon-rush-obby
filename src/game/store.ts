import { create } from "zustand";
import type { GameUi } from "./types";

export const useGameUi = create<GameUi>(() => ({
  mode: "menu",
  stage: 1,
  stageName: "Warm-up",
  time: 0,
  deaths: 0,
  bestTime: null,
  muted: false,
  shareMsg: null,
  copied: false,
}));
