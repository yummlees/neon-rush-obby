import type { AudioBus } from "./audio";
import { createAudio } from "./audio";
import { createInput, type InputController } from "./input";
import {
  buildWorld,
  LAVA_Y,
  PLAYER_H,
  PLAYER_W,
  STAGE_NAMES,
  stageIndexAt,
  WORLD_H,
  WORLD_W,
} from "./levels";
import { loadSave, recordBest, writeSave } from "./save";
import { useGameUi } from "./store";
import type {
  Checkpoint,
  GameMode,
  Particle,
  Platform,
  Player,
} from "./types";
import { formatTime } from "@/lib/utils";
import { drawWorld } from "./render";

const STEP = 1 / 60;
const GRAV_UP = 1850;
const GRAV_FALL = 3400;
const APEX = 90;
const JUMP = -960;
const JUMP_CUT = 0.46;
const JUMP_PAD = -1320;
const MAX_FALL = 1450;
const MAX_SPEED = 355;
const ACCEL_G = 3200;
const ACCEL_A = 2100;
const FRICTION = 2600;
const AIR_DRAG = 700;
const COYOTE = 0.12;
const JUMP_BUF = 0.14;

function aabb(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  b: { x: number; y: number; w: number; h: number },
) {
  return ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y;
}

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function createGame(canvas: HTMLCanvasElement) {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("Canvas 2D is not available");
  const ctx: CanvasRenderingContext2D = maybeCtx;

  const input: InputController = createInput();
  const audio: AudioBus = createAudio();
  let world = buildWorld();
  let platforms = world.platforms;
  let checkpoints = world.checkpoints;

  const player: Player = {
    x: checkpoints[0]?.x ?? 80,
    y: checkpoints[0]?.y ?? 520,
    prevX: checkpoints[0]?.x ?? 80,
    prevY: checkpoints[0]?.y ?? 520,
    vx: 0,
    vy: 0,
    w: PLAYER_W,
    h: PLAYER_H,
    grounded: false,
    coyote: 0,
    jumpBuf: 0,
    jumping: false,
    facing: 1,
    ride: null,
    dead: false,
    deadT: 0,
    invuln: 0,
    squash: 1,
    stretch: 1,
  };

  let mode: GameMode = "menu";
  let time = 0;
  let deaths = 0;
  let stage = 1;
  let checkpoint = checkpoints[0]!;
  let last = performance.now();
  let acc = 0;
  let raf = 0;
  let camX = 0;
  let camY = 80;
  let look = 0;
  let trauma = 0;
  let simTime = 0;
  let hudTick = 0;
  let particles: Particle[] = [];
  let trail: { x: number; y: number; a: number }[] = [];
  let viewW = 1280;
  let viewH = 720;
  let dpr = 1;
  let copiedTimer = 0;
  let lastLanded = false;
  let running = true;
  const quiet = reducedMotion();

  function syncUi(extra: Partial<ReturnType<typeof useGameUi.getState>> = {}) {
    useGameUi.setState({
      mode,
      stage,
      stageName: STAGE_NAMES[stage - 1] ?? `Stage ${stage}`,
      time,
      deaths,
      bestTime: loadSave().bestTime,
      muted: loadSave().muted,
      ...extra,
    });
  }

  function spawnAt(cp: Checkpoint) {
    player.x = cp.x;
    player.y = cp.y;
    player.prevX = cp.x;
    player.prevY = cp.y;
    player.vx = 0;
    player.vy = 0;
    player.grounded = true;
    player.coyote = COYOTE;
    player.jumpBuf = 0;
    player.jumping = false;
    player.ride = null;
    player.dead = false;
    player.deadT = 0;
    player.invuln = 0.45;
    player.squash = 1;
    player.stretch = 1;
    camX = Math.max(0, cp.x - 220);
    camY = cp.y - 240;
  }

  function resetRun(keepMenu: boolean) {
    world = buildWorld();
    platforms = world.platforms;
    checkpoints = world.checkpoints;
    checkpoint = checkpoints[0]!;
    stage = 1;
    time = 0;
    deaths = 0;
    particles = [];
    trail = [];
    trauma = 0;
    simTime = 0;
    spawnAt(checkpoint);
    mode = keepMenu ? "menu" : "play";
    syncUi({ shareMsg: null, copied: false });
  }

  function burst(
    x: number,
    y: number,
    color: string,
    n = 16,
    speed = 220,
  ) {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const s = speed * (0.4 + Math.random() * 0.8);
      particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        life: 0.35 + Math.random() * 0.35,
        max: 0.7,
        size: 2 + Math.random() * 3,
        color,
        glow: 10,
      });
    }
  }

  function die() {
    if (player.dead || player.invuln > 0 || mode !== "play") return;
    player.dead = true;
    player.deadT = 0.55;
    player.vx = 0;
    player.vy = 0;
    deaths += 1;
    trauma = Math.min(1, trauma + (quiet ? 0.15 : 0.55));
    audio.death();
    burst(player.x + player.w / 2, player.y + player.h / 2, "#22f0ff", 22, 280);
    burst(player.x + player.w / 2, player.y + player.h / 2, "#c84dff", 12, 180);
    syncUi();
  }

  function win() {
    if (mode !== "play") return;
    mode = "win";
    audio.win();
    trauma = quiet ? 0.1 : 0.35;
    const best = recordBest(time);
    burst(player.x + player.w / 2, player.y, "#22f0ff", 28, 320);
    burst(player.x + player.w / 2, player.y, "#c84dff", 20, 260);
    syncUi({ bestTime: best });
  }

  function maybeCheckpoint() {
    const idx = stageIndexAt(player.x + player.w / 2);
    const next = idx + 1;
    if (next > stage) {
      stage = next;
      const cp = checkpoints[idx];
      if (cp) {
        checkpoint = cp;
        audio.checkpoint();
        burst(player.x + player.w / 2, player.y + player.h, "#22f0ff", 10, 140);
      }
      syncUi();
    }
  }

  function solidsNow(): Platform[] {
    return platforms.filter((p) => {
      if (p.kind === "spike" || p.kind === "goal") return false;
      if (p.kind === "crumble" && p.gone > 0) return false;
      return true;
    });
  }

  function stepMovers(dt: number) {
    for (const p of platforms) {
      p.lastX = p.x;
      p.lastY = p.y;
      if (p.kind === "moving" && p.ax && p.a0 != null && p.a1 != null) {
        const u = (Math.sin(simTime * (p.speed ?? 1) + (p.phase ?? 0)) + 1) / 2;
        const v = p.a0 + (p.a1 - p.a0) * u;
        if (p.ax === "x") p.x = v;
        else p.y = v;
      }
      if (p.kind === "crumble") {
        if (p.gone > 0) {
          p.gone -= dt;
          if (p.gone <= 0) {
            p.gone = 0;
            p.crumble = 0;
            p.shake = 0;
          }
        } else if (p.crumble > 0) {
          p.shake = Math.min(1, p.crumble / 0.28);
        }
      }
    }
  }

  function resolveAxis(nx: number, ny: number, axis: "x" | "y"): number {
    let pos = axis === "x" ? nx : ny;
    const boxW = player.w;
    const boxH = player.h;
    for (const p of solidsNow()) {
      const px = axis === "x" ? pos : player.x;
      const py = axis === "y" ? pos : player.y;
      if (!aabb(px, py, boxW, boxH, p)) continue;
      if (axis === "x") {
        if (player.vx > 0) pos = p.x - boxW;
        else if (player.vx < 0) pos = p.x + p.w;
        player.vx = 0;
      } else {
        if (player.vy > 0) {
          pos = p.y - boxH;
          player.vy = 0;
          player.grounded = true;
          player.ride = p.kind === "moving" || p.kind === "crumble" ? p.id : null;
          if (p.kind === "jump") {
            player.vy = JUMP_PAD;
            player.grounded = false;
            player.ride = null;
            player.jumping = true;
            player.stretch = 1.28;
            player.squash = 0.82;
            audio.bounce();
            burst(player.x + player.w / 2, p.y, "#22f0ff", 10, 160);
          } else if (p.kind === "crumble") {
            p.crumble += STEP;
            if (p.crumble > 0.3 && p.gone <= 0) {
              p.gone = 2.1;
              p.crumble = 0;
              audio.crumble();
              burst(p.x + p.w / 2, p.y, "#c84dff", 8, 90);
            }
          }
        } else if (player.vy < 0) {
          pos = p.y + p.h;
          player.vy = 0;
        }
      }
    }
    return pos;
  }

  function step(dt: number) {
    simTime += dt;
    if (copiedTimer > 0) copiedTimer -= dt;

    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 520 * dt;
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);

    const inp = input.sample();
    if (mode === "pause") {
      if (inp.pausePressed) {
        mode = "play";
        syncUi();
      }
      return;
    }
    if (mode === "win") return;
    if (mode === "menu") {
      stepMovers(dt);
      return;
    }

    stepMovers(dt);

    if (mode === "play" && inp.pausePressed && !player.dead) {
      mode = "pause";
      syncUi();
      return;
    }

    if (player.dead) {
      player.deadT -= dt;
      if (player.deadT <= 0) spawnAt(checkpoint);
      return;
    }

    if (mode === "play") time += dt;
    if (player.invuln > 0) player.invuln -= dt;

    player.grounded = false;
    player.ride = null;

    const accel = lastLanded ? ACCEL_G : ACCEL_A;
    if (inp.moveX !== 0) {
      player.vx += inp.moveX * accel * dt;
      player.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, player.vx));
      player.facing = inp.moveX > 0 ? 1 : -1;
    } else {
      const fr = lastLanded ? FRICTION : AIR_DRAG;
      const s = Math.sign(player.vx);
      player.vx -= s * fr * dt;
      if (Math.sign(player.vx) !== s) player.vx = 0;
    }

    if (lastLanded) player.coyote = COYOTE;
    else player.coyote -= dt;
    if (inp.jumpPressed) player.jumpBuf = JUMP_BUF;
    else player.jumpBuf -= dt;

    if (player.jumpBuf > 0 && player.coyote > 0) {
      player.vy = JUMP;
      player.coyote = 0;
      player.jumpBuf = 0;
      player.jumping = true;
      player.stretch = 1.22;
      player.squash = 0.84;
      lastLanded = false;
      audio.jump();
    }
    if (player.jumping && !inp.jumpHeld && player.vy < 0) {
      player.vy *= JUMP_CUT;
      player.jumping = false;
    }
    if (player.vy >= 0) player.jumping = false;

    let g = player.vy < 0 ? GRAV_UP : GRAV_FALL;
    if (player.vy < 0 && Math.abs(player.vy) < APEX) g *= 0.55;
    player.vy += g * dt;
    player.vy = Math.min(player.vy, MAX_FALL);

    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(player.vx), Math.abs(player.vy)) * dt / 18));
    const sdt = dt / steps;
    for (let i = 0; i < steps; i++) {
      player.x += player.vx * sdt;
      player.x = resolveAxis(player.x, player.y, "x");
      player.y += player.vy * sdt;
      player.y = resolveAxis(player.x, player.y, "y");
    }

    if (player.ride) {
      const plat = platforms.find((p) => p.id === player.ride);
      if (plat) {
        player.x += plat.x - plat.lastX;
        player.y += plat.y - plat.lastY;
        player.x = resolveAxis(player.x, player.y, "x");
      }
    }

    const wasGround = lastLanded;
    lastLanded = player.grounded;
    if (player.grounded && !wasGround && player.vy >= 0) {
      player.squash = 1.18;
      player.stretch = 0.86;
      audio.land();
    }

    player.squash += (1 - player.squash) * Math.min(1, 12 * dt);
    player.stretch += (1 - player.stretch) * Math.min(1, 12 * dt);

    trail.push({
      x: player.x + player.w / 2,
      y: player.y + player.h / 2,
      a: 1,
    });
    if (trail.length > 10) trail.shift();
    for (const t of trail) t.a *= 0.86;

    if (player.y + player.h > LAVA_Y) die();
    if (player.y > WORLD_H + 40) die();

    for (const p of platforms) {
      if (p.kind === "spike" && aabb(player.x, player.y, player.w, player.h, p)) {
        die();
        break;
      }
      if (p.kind === "goal" && aabb(player.x, player.y, player.w, player.h, p)) {
        win();
        break;
      }
    }

    maybeCheckpoint();
    player.x = Math.max(0, Math.min(WORLD_W - player.w, player.x));
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewW = Math.max(1, rect.width);
    viewH = Math.max(1, rect.height);
    canvas.width = Math.floor(viewW * dpr);
    canvas.height = Math.floor(viewH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  function camera(dt: number) {
    const viewWorldH = 560;
    const scale = viewH / viewWorldH;
    const viewWorldW = viewW / scale;
    look += (player.facing * 90 - look) * (1 - Math.exp(-4 * dt));
    const targetX = player.x + player.w / 2 + look - viewWorldW * 0.38;
    const targetY = player.y + player.h / 2 - viewWorldH * 0.55;
    camX += (targetX - camX) * (1 - Math.exp(-6 * dt));
    camY += (targetY - camY) * (1 - Math.exp(-5 * dt));
    camX = Math.max(0, Math.min(WORLD_W - viewWorldW, camX));
    camY = Math.max(0, Math.min(WORLD_H - viewWorldH, camY));
    trauma = Math.max(0, trauma - dt * 1.8);
    return { scale, viewWorldW, viewWorldH };
  }

  function frame(now: number) {
    if (!running) return;
    const raw = (now - last) / 1000;
    last = now;
    const dt = Math.min(raw, 0.1);
    acc += dt;
    let steps = 0;
    player.prevX = player.x;
    player.prevY = player.y;
    while (acc >= STEP && steps < 8) {
      step(STEP);
      acc -= STEP;
      steps++;
    }
    const alpha = acc / STEP;
    const cam = camera(dt);
    const shake = quiet ? 0 : trauma * trauma;
    const ox = shake ? (Math.random() * 2 - 1) * 14 * shake : 0;
    const oy = shake ? (Math.random() * 2 - 1) * 10 * shake : 0;

    const rx = player.prevX + (player.x - player.prevX) * alpha;
    const ry = player.prevY + (player.y - player.prevY) * alpha;

    drawWorld(ctx, {
      viewW,
      viewH,
      camX: camX + ox,
      camY: camY + oy,
      scale: cam.scale,
      platforms,
      player,
      px: rx,
      py: ry,
      particles,
      trail,
      time: simTime,
      stage,
      mode,
      lavaY: LAVA_Y,
      worldW: WORLD_W,
      worldH: WORLD_H,
    });

    hudTick += dt;
    if (hudTick > 0.12 && (mode === "play" || mode === "pause")) {
      hudTick = 0;
      syncUi();
    }

    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);

  const probe = {
    getYaw: () => 0,
    getSpeed: () => player.vx,
    getX: () => player.x,
    setKeys: (codes: string[]) => input.setKeys(codes),
    setSteer: (v: number) => {
      if (v > 0.2) input.setKeys(["KeyA"]);
      else if (v < -0.2) input.setKeys(["KeyD"]);
      else input.setKeys([]);
    },
  };
  window.__controlsTest = probe;
  window.__gameQa = {
    finish: () => {
      if (mode === "menu") {
        mode = "play";
      }
      time = Math.max(time, 12.34);
      win();
    },
    die: () => die(),
    getState: () => ({
      x: player.x,
      y: player.y,
      vx: player.vx,
      stage,
      mode,
      time,
      deaths,
    }),
    start: () => api.start(),
  };

  const api = {
    start: () => {
      audio.unlock();
      resetRun(false);
      mode = "play";
      syncUi();
    },
    pause: () => {
      if (mode === "play") {
        mode = "pause";
        syncUi();
      }
    },
    resume: () => {
      if (mode === "pause") {
        mode = "play";
        syncUi();
      }
    },
    restart: () => {
      audio.unlock();
      resetRun(false);
    },
    toMenu: () => {
      resetRun(true);
    },
    playAgain: () => {
      audio.unlock();
      resetRun(false);
    },
    toggleMute: () => {
      const next = !loadSave().muted;
      writeSave({ muted: next });
      audio.setMuted(next);
      if (!next) audio.unlock();
      syncUi({ muted: next });
    },
    setTouchLeft: input.setTouchLeft,
    setTouchRight: input.setTouchRight,
    setTouchJump: input.setTouchJump,
    share: async () => {
      const best = loadSave().bestTime;
      const t = formatTime(time);
      const b = formatTime(best ?? time);
      const text = `I finished Neon Rush Obby in ${t}. Best: ${b}. Can you beat it?`;
      const url = window.location.href;
      try {
        if (navigator.share) {
          await navigator.share({ title: "Neon Rush Obby", text, url });
          return;
        }
      } catch {
        // fall through to copy
      }
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        copiedTimer = 2;
        syncUi({ copied: true, shareMsg: "Copied to clipboard" });
        window.setTimeout(() => syncUi({ copied: false, shareMsg: null }), 1800);
      } catch {
        syncUi({ shareMsg: "Copy failed — screenshot your time instead" });
      }
    },
    destroy: () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      input.destroy();
      if (window.__controlsTest === probe) delete window.__controlsTest;
      delete window.__gameQa;
    },
  };

  resetRun(true);
  audio.setMuted(loadSave().muted);
  return api;
}

export type GameApi = ReturnType<typeof createGame>;

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getX: () => number;
      setSteer?: (v: number) => void;
      setKeys?: (codes: string[]) => void;
    };
    __gameQa?: {
      finish: () => void;
      die: () => void;
      getState: () => {
        x: number;
        y: number;
        vx: number;
        stage: number;
        mode: string;
        time: number;
        deaths: number;
      };
      start: () => void;
    };
  }
}
