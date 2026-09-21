export type Hue = "cyan" | "purple";

export type PlatKind =
  | "solid"
  | "jump"
  | "moving"
  | "spike"
  | "crumble"
  | "goal";

export type GameMode = "menu" | "play" | "pause" | "win";

export interface Platform {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: PlatKind;
  hue: Hue;
  ax?: "x" | "y";
  a0?: number;
  a1?: number;
  speed?: number;
  phase?: number;
  lastX: number;
  lastY: number;
  crumble: number;
  gone: number;
  shake: number;
}

export interface Checkpoint {
  stage: number;
  name: string;
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  glow: number;
}

export interface Player {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  grounded: boolean;
  coyote: number;
  jumpBuf: number;
  jumping: boolean;
  facing: 1 | -1;
  ride: string | null;
  dead: boolean;
  deadT: number;
  invuln: number;
  squash: number;
  stretch: number;
}

export interface InputState {
  moveX: number;
  jumpHeld: boolean;
  jumpPressed: boolean;
}

export interface GameUi {
  mode: GameMode;
  stage: number;
  stageName: string;
  time: number;
  deaths: number;
  bestTime: number | null;
  muted: boolean;
  shareMsg: string | null;
  copied: boolean;
}

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  getX: () => number;
  setSteer?: (v: number) => void;
  setKeys?: (codes: string[]) => void;
};
