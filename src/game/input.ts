import type { InputState } from "./types";

const GAME_KEYS = new Set([
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyS",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
  "KeyP",
  "Escape",
  "KeyR",
]);

function radialDeadzone(x: number, y: number, dz = 0.18) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}

export function createInput() {
  const keys = new Set<string>();
  const injected = new Set<string>();
  let touchLeft = false;
  let touchRight = false;
  let touchJump = false;
  let jumpHeldPrev = false;
  let pausePressed = false;
  let pausePrev = false;

  const onKeyDown = (e: KeyboardEvent) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    keys.add(e.code);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys.delete(e.code);
  };
  const clear = () => {
    keys.clear();
    jumpHeldPrev = false;
  };

  if (typeof window !== "undefined") {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clear();
    });
  }

  function codes(): Set<string> {
    const s = new Set(keys);
    for (const c of injected) s.add(c);
    return s;
  }

  function sample(): InputState & { pausePressed: boolean } {
    const c = codes();
    let moveX = 0;
    if (c.has("KeyA") || c.has("ArrowLeft") || touchLeft) moveX -= 1;
    if (c.has("KeyD") || c.has("ArrowRight") || touchRight) moveX += 1;

    let jumpHeld =
      c.has("Space") || c.has("KeyW") || c.has("ArrowUp") || touchJump;

    if (typeof navigator !== "undefined" && navigator.getGamepads) {
      const pads = navigator.getGamepads();
      for (const pad of pads) {
        if (!pad) continue;
        const stick = radialDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
        if (stick.x < -0.35) moveX -= 1;
        if (stick.x > 0.35) moveX += 1;
        if (pad.buttons[14]?.pressed) moveX -= 1;
        if (pad.buttons[15]?.pressed) moveX += 1;
        if (pad.buttons[0]?.pressed || pad.buttons[12]?.pressed) jumpHeld = true;
        if (pad.buttons[9]?.pressed) pausePressed = true;
      }
    }

    moveX = Math.max(-1, Math.min(1, moveX));
    const jumpPressed = jumpHeld && !jumpHeldPrev;
    jumpHeldPrev = jumpHeld;

    const pauseHeld = c.has("KeyP") || c.has("Escape") || pausePressed;
    const pauseEdge = pauseHeld && !pausePrev;
    pausePrev = pauseHeld;
    pausePressed = false;

    return { moveX, jumpHeld, jumpPressed, pausePressed: pauseEdge };
  }

  return {
    sample,
    setTouchLeft: (v: boolean) => {
      touchLeft = v;
    },
    setTouchRight: (v: boolean) => {
      touchRight = v;
    },
    setTouchJump: (v: boolean) => {
      touchJump = v;
    },
    setKeys: (list: string[]) => {
      injected.clear();
      for (const code of list) injected.add(code);
    },
    destroy: () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clear);
    },
  };
}

export type InputController = ReturnType<typeof createInput>;
