import type { Checkpoint, Hue, Platform, PlatKind } from "./types";

export const WORLD_H = 720;
export const LAVA_Y = 692;
export const STAGE_W = 1080;
export const STAGE_COUNT = 10;
export const WORLD_W = STAGE_W * STAGE_COUNT;

export const PLAYER_W = 26;
export const PLAYER_H = 38;

let seq = 0;

function plat(
  x: number,
  y: number,
  w: number,
  h: number,
  kind: PlatKind = "solid",
  hue: Hue = "cyan",
  extra: Partial<Platform> = {},
): Platform {
  return {
    id: `p${++seq}`,
    x,
    y,
    w,
    h,
    kind,
    hue,
    lastX: x,
    lastY: y,
    crumble: 0,
    gone: 0,
    shake: 0,
    ...extra,
  };
}

export const STAGE_NAMES = [
  "Warm-up",
  "Gap Run",
  "Spring Hop",
  "The Slider",
  "Spike Street",
  "Sky Climb",
  "Crumble",
  "Twin Rails",
  "Needle",
  "Neon Gate",
] as const;

export function stageIndexAt(x: number): number {
  return Math.max(0, Math.min(STAGE_COUNT - 1, Math.floor(x / STAGE_W)));
}

/**
 * Ten connected stages, easy → medium. Jump height is ~240px at a full tap,
 * so gaps stay under ~280px unless a jump pad is involved.
 */
export function buildWorld(): { platforms: Platform[]; checkpoints: Checkpoint[] } {
  seq = 0;
  const platforms: Platform[] = [];
  const checkpoints: Checkpoint[] = [];

  const spawn = (stage: number, floorTop: number, xOff = 70) => {
    const x = (stage - 1) * STAGE_W + xOff;
    checkpoints.push({
      stage,
      name: STAGE_NAMES[stage - 1] ?? `Stage ${stage}`,
      x,
      y: floorTop - PLAYER_H,
    });
  };

  // Stage 1 — Warm-up: walk, two easy hops.
  spawn(1, 560, 80);
  platforms.push(
    plat(20, 560, 340, 28),
    plat(400, 508, 150, 22),
    plat(590, 456, 160, 22),
    plat(790, 410, 180, 22),
    plat(1000, 410, 90, 22),
  );

  // Stage 2 — Gap Run.
  spawn(2, 410, 40);
  platforms.push(
    plat(1080, 410, 170, 22),
    plat(1340, 410, 120, 22),
    plat(1560, 368, 120, 22),
    plat(1780, 420, 130, 22),
    plat(1990, 370, 160, 22),
  );

  // Stage 3 — Spring Hop.
  spawn(3, 370, 40);
  platforms.push(
    plat(2160, 370, 150, 22),
    plat(2390, 530, 84, 16, "jump", "cyan"),
    plat(2580, 236, 170, 22, "solid", "purple"),
    plat(2840, 500, 84, 16, "jump"),
    plat(3040, 270, 190, 22, "solid", "purple"),
  );

  // Stage 4 — The Slider (horizontal mover).
  spawn(4, 270, 40);
  platforms.push(
    plat(3240, 270, 150, 22),
    plat(3480, 310, 140, 20, "moving", "purple", {
      ax: "x",
      a0: 3460,
      a1: 3980,
      speed: 1.05,
      phase: 0,
    }),
    plat(4140, 270, 180, 22),
  );

  // Stage 5 — Spike Street.
  spawn(5, 270, 40);
  platforms.push(
    plat(4320, 270, 140, 22),
    plat(4520, 330, 90, 22),
    plat(4660, 560, 300, 18, "spike", "purple"),
    plat(4660, 290, 72, 18),
    plat(4800, 246, 72, 18),
    plat(4940, 290, 72, 18),
    plat(5120, 340, 150, 22),
    plat(5320, 300, 140, 22),
  );

  // Stage 6 — Sky Climb.
  spawn(6, 300, 40);
  platforms.push(
    plat(5400, 300, 110, 22),
    plat(5570, 248, 90, 20),
    plat(5420, 196, 90, 20, "solid", "purple"),
    plat(5580, 144, 90, 20),
    plat(5740, 104, 190, 22, "solid", "purple"),
    plat(6000, 170, 90, 20),
    plat(6160, 236, 90, 20),
    plat(6320, 310, 150, 22),
  );

  // Stage 7 — Crumble.
  spawn(7, 310, 40);
  platforms.push(
    plat(6480, 310, 130, 22),
    plat(6680, 292, 100, 18, "crumble", "purple"),
    plat(6860, 260, 100, 18, "crumble", "purple"),
    plat(7040, 292, 100, 18, "crumble", "purple"),
    plat(7220, 248, 100, 18, "crumble", "purple"),
    plat(7420, 300, 150, 22),
  );

  // Stage 8 — Twin Rails (vertical + horizontal movers, jump pad).
  spawn(8, 300, 40);
  platforms.push(
    plat(7560, 300, 130, 22),
    plat(7750, 500, 76, 16, "jump"),
    plat(7940, 280, 110, 18, "moving", "purple", {
      ax: "y",
      a0: 150,
      a1: 420,
      speed: 1.15,
      phase: 0.4,
    }),
    plat(8160, 210, 110, 20),
    plat(8340, 270, 130, 18, "moving", "cyan", {
      ax: "x",
      a0: 8300,
      a1: 8480,
      speed: 1.25,
      phase: 1.2,
    }),
    plat(8520, 230, 120, 20),
  );

  // Stage 9 — Needle (thin platforms over spikes).
  spawn(9, 230, 40);
  platforms.push(
    plat(8640, 230, 100, 18),
    plat(8800, 196, 54, 16),
    plat(8960, 248, 54, 16, "solid", "purple"),
    plat(8880, 560, 420, 18, "spike", "purple"),
    plat(9120, 176, 54, 16),
    plat(9280, 220, 54, 16, "solid", "purple"),
    plat(9440, 270, 54, 16),
    plat(9600, 230, 110, 18),
  );

  // Stage 10 — Neon Gate (mix + finish).
  spawn(10, 230, 40);
  platforms.push(
    plat(9720, 230, 120, 20),
    plat(9900, 210, 84, 16, "crumble", "purple"),
    plat(10040, 470, 74, 16, "jump"),
    plat(10220, 190, 130, 18, "moving", "cyan", {
      ax: "x",
      a0: 10180,
      a1: 10480,
      speed: 1.05,
      phase: 0.6,
    }),
    plat(10540, 250, 90, 18),
    plat(10640, 250, 200, 22, "solid", "purple"),
    plat(10720, 154, 44, 96, "goal", "cyan"),
  );

  // Invisible side walls so you cannot run out of the world.
  platforms.push(
    plat(-36, 0, 36, WORLD_H, "solid", "purple"),
    plat(WORLD_W, 0, 36, WORLD_H, "solid", "purple"),
  );

  return { platforms, checkpoints };
}
