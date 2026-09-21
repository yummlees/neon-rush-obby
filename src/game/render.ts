import type { GameMode, Particle, Platform, Player } from "./types";
import { STAGE_NAMES, STAGE_W } from "./levels";

export interface DrawFrame {
  viewW: number;
  viewH: number;
  camX: number;
  camY: number;
  scale: number;
  platforms: Platform[];
  player: Player;
  px: number;
  py: number;
  particles: Particle[];
  trail: { x: number; y: number; a: number }[];
  time: number;
  stage: number;
  mode: GameMode;
  lavaY: number;
  worldW: number;
  worldH: number;
}

const CYAN = "#22f0ff";
const PURPLE = "#c84dff";
const HOT = "#ff3d8a";
const SKIN = "#f3d7b5";
const HAIR = "#b44dff";
const NAVY = "#0a1024";

function hueColor(h: Platform["hue"]) {
  return h === "purple" ? PURPLE : CYAN;
}

function hexAlpha(hex: string, a: number) {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawWorld(ctx: CanvasRenderingContext2D, f: DrawFrame) {
  const { viewW, viewH, camX, camY, scale } = f;
  ctx.clearRect(0, 0, viewW, viewH);

  const g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, "#050510");
  g.addColorStop(0.4, "#0b0730");
  g.addColorStop(0.75, "#14082c");
  g.addColorStop(1, "#2a0a28");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);

  drawCityBackdrop(ctx, f);

  ctx.save();
  ctx.translate(-camX * scale, -camY * scale);
  ctx.scale(scale, scale);

  drawWorldGrid(ctx, f);
  drawStageSigns(ctx, f);
  drawLava(ctx, f);

  for (const p of f.platforms) {
    if (p.x + p.w < camX - 40 || p.x > camX + f.viewW / scale + 40) continue;
    if (p.y + p.h < camY - 40 || p.y > camY + f.viewH / scale + 40) continue;
    drawPlatform(ctx, p, f.time);
  }

  drawTrail(ctx, f);
  if (!f.player.dead) drawPlayer(ctx, f);
  drawParticles(ctx, f.particles);

  ctx.restore();

  const vg = ctx.createRadialGradient(
    viewW / 2,
    viewH * 0.42,
    viewH * 0.12,
    viewW / 2,
    viewH / 2,
    viewH * 0.92,
  );
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(4,0,14,0.38)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, viewW, viewH);
}

function drawCityBackdrop(ctx: CanvasRenderingContext2D, f: DrawFrame) {
  const { viewW, viewH, camX, time } = f;
  const shift = (camX * 0.18) % 280;

  ctx.save();
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 18; i++) {
    const x = ((i * 163 + time * 6) % (viewW + 80)) - 40;
    const y = 18 + ((i * 47) % (viewH * 0.45));
    ctx.fillStyle = i % 4 === 0 ? CYAN : i % 4 === 1 ? PURPLE : "#ffffff";
    ctx.fillRect(x, y, i % 5 === 0 ? 3 : 1.5, i % 5 === 0 ? 3 : 1.5);
  }
  ctx.restore();

  // Far neon towers (cover-art city, not gameplay).
  for (let layer = 0; layer < 2; layer++) {
    const par = layer === 0 ? 0.12 : 0.22;
    const baseY = viewH * (layer === 0 ? 0.58 : 0.64);
    const alpha = layer === 0 ? 0.16 : 0.28;
    const off = (camX * par) % 160;
    for (let i = -2; i < 16; i++) {
      const x = i * 160 - off;
      const w = 36 + ((i + layer * 3) % 5) * 14;
      const h = 70 + ((i * 17 + layer * 9) % 8) * 18;
      const color = (i + layer) % 2 === 0 ? CYAN : PURPLE;
      ctx.fillStyle = hexAlpha(color, alpha);
      ctx.fillRect(x, baseY - h, w, h);
      ctx.fillStyle = hexAlpha(color, alpha + 0.12);
      ctx.fillRect(x, baseY - h, w, 3);
      ctx.fillStyle = hexAlpha("#ffffff", 0.08 + layer * 0.04);
      const cols = 2 + (i % 3);
      const rows = Math.max(3, Math.floor(h / 18));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r + c + i) % 3 === 0) continue;
          ctx.fillRect(x + 6 + c * 10, baseY - h + 10 + r * 16, 5, 7);
        }
      }
    }
  }

  // Soft horizon glow like the cover floor.
  const hg = ctx.createLinearGradient(0, viewH * 0.62, 0, viewH);
  hg.addColorStop(0, "rgba(34,240,255,0)");
  hg.addColorStop(0.4, "rgba(34,240,255,0.05)");
  hg.addColorStop(1, "rgba(200,77,255,0.08)");
  ctx.fillStyle = hg;
  ctx.fillRect(0, viewH * 0.62, viewW, viewH * 0.38);

  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 1;
  const vanishX = viewW * 0.5 - shift * 0.15;
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(vanishX + i * 90, viewH * 0.62);
    ctx.lineTo(vanishX + i * 220, viewH);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWorldGrid(ctx: CanvasRenderingContext2D, f: DrawFrame) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 1;
  const grid = 80;
  const x0 = Math.floor(f.camX / grid) * grid;
  for (let x = x0; x < f.camX + f.viewW / f.scale + grid; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, f.worldH);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStageSigns(ctx: CanvasRenderingContext2D, f: DrawFrame) {
  ctx.save();
  ctx.font = "600 16px Orbitron, sans-serif";
  for (let i = 0; i < STAGE_NAMES.length; i++) {
    const x = i * STAGE_W + 48;
    if (x < f.camX - 200 || x > f.camX + f.viewW / f.scale + 40) continue;
    ctx.fillStyle = i + 1 === f.stage ? CYAN : "rgba(232,247,255,0.32)";
    ctx.fillText(`${String(i + 1).padStart(2, "0")}  ${STAGE_NAMES[i]}`, x, 86);
  }
  ctx.restore();
}

function drawLava(ctx: CanvasRenderingContext2D, f: DrawFrame) {
  const y = f.lavaY;
  const x0 = f.camX - 20;
  const x1 = f.camX + f.viewW / f.scale + 20;
  const grad = ctx.createLinearGradient(0, y, 0, f.worldH + 40);
  grad.addColorStop(0, HOT);
  grad.addColorStop(0.28, PURPLE);
  grad.addColorStop(1, "#2a0418");
  ctx.fillStyle = grad;
  ctx.fillRect(x0, y + 8, x1 - x0, f.worldH);

  ctx.save();
  ctx.shadowColor = HOT;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = HOT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 10) {
    const w = Math.sin(x * 0.04 + f.time * 3.2) * 5 + Math.sin(x * 0.01 + f.time) * 3;
    const yy = y + 8 + w;
    if (x === x0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.stroke();
  ctx.restore();
}

function drawPlatform(ctx: CanvasRenderingContext2D, p: Platform, time: number) {
  if (p.x < 0 || (p.x >= 10800 && p.kind === "solid" && p.w <= 36)) return;

  let dx = 0;
  if (p.kind === "crumble" && p.shake > 0) {
    dx = Math.sin(time * 40) * p.shake * 3;
  }

  const x = p.x + dx;
  const y = p.y;

  if (p.kind === "goal") {
    drawGoal(ctx, p, time);
    return;
  }

  if (p.kind === "spike") {
    drawSpikes(ctx, x, y, p.w, p.h);
    return;
  }

  const color = p.kind === "jump" ? CYAN : hueColor(p.hue);
  const depth = Math.min(12, Math.max(7, p.h * 0.45));

  // Ground glow under the block.
  ctx.save();
  ctx.fillStyle = hexAlpha(color, 0.16);
  ctx.beginPath();
  ctx.ellipse(x + p.w / 2, y + p.h + 6, p.w * 0.48, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Right side face.
  ctx.beginPath();
  ctx.moveTo(x + p.w, y);
  ctx.lineTo(x + p.w + depth * 0.7, y + depth * 0.45);
  ctx.lineTo(x + p.w + depth * 0.7, y + p.h + depth * 0.45);
  ctx.lineTo(x + p.w, y + p.h);
  ctx.closePath();
  ctx.fillStyle = hexAlpha(color, 0.28);
  ctx.fill();

  // Front face.
  ctx.fillStyle = hexAlpha(NAVY, 0.92);
  roundRect(ctx, x, y, p.w, p.h, 4);
  ctx.fill();
  ctx.strokeStyle = hexAlpha(color, 0.85);
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, p.w, p.h, 4);
  ctx.stroke();

  // Top slab (reads as a 3D pad).
  ctx.fillStyle = hexAlpha(color, p.kind === "jump" ? 0.55 : 0.38);
  roundRect(ctx, x + 1, y - 3, p.w - 2, Math.max(8, p.h * 0.42), 4);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  roundRect(ctx, x + 1, y - 3, p.w - 2, Math.max(8, p.h * 0.42), 4);
  ctx.stroke();

  // Tile seams on wide pads.
  if (p.w > 70) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "#061018";
    ctx.lineWidth = 1;
    const tiles = Math.floor(p.w / 36);
    for (let i = 1; i < tiles; i++) {
      const tx = x + (p.w * i) / tiles;
      ctx.beginPath();
      ctx.moveTo(tx, y - 2);
      ctx.lineTo(tx, y + p.h - 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (p.kind === "jump") {
    const pulse = 0.55 + Math.sin(time * 8) * 0.25;
    const cx = x + p.w / 2;
    const cy = y + p.h * 0.28;
    ctx.save();
    ctx.shadowColor = CYAN;
    ctx.shadowBlur = 16;
    ctx.strokeStyle = hexAlpha(CYAN, pulse);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(p.w * 0.28, 16), 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(p.w * 0.14, 8), 0, Math.PI * 2);
    ctx.fillStyle = hexAlpha(CYAN, 0.35 + pulse * 0.25);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = hexAlpha(CYAN, 0.8);
    ctx.beginPath();
    ctx.moveTo(cx, y - 16);
    ctx.lineTo(cx - 6, y - 8);
    ctx.lineTo(cx + 6, y - 8);
    ctx.closePath();
    ctx.fill();
  }

  if (p.kind === "moving") {
    ctx.fillStyle = hexAlpha(color, 0.7);
    ctx.fillRect(x + 10, y + p.h / 2 - 1, p.w - 20, 2);
    ctx.fillRect(x + 8, y + 4, 4, p.h - 6);
    ctx.fillRect(x + p.w - 12, y + 4, 4, p.h - 6);
  }
}

function drawSpikes(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const n = Math.max(2, Math.floor(w / 16));
  const tw = w / n;
  ctx.save();
  ctx.shadowColor = HOT;
  ctx.shadowBlur = 10;
  for (let i = 0; i < n; i++) {
    const sx = x + i * tw;
    ctx.beginPath();
    ctx.moveTo(sx, y + h);
    ctx.lineTo(sx + tw / 2, y);
    ctx.lineTo(sx + tw, y + h);
    ctx.closePath();
    ctx.fillStyle = HOT;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + tw * 0.28, y + h);
    ctx.lineTo(sx + tw / 2, y + 3);
    ctx.lineTo(sx + tw * 0.5, y + h);
    ctx.closePath();
    ctx.fillStyle = "#ff8ab8";
    ctx.fill();
  }
  ctx.restore();
}

function drawGoal(ctx: CanvasRenderingContext2D, p: Platform, time: number) {
  ctx.save();
  const pulse = 0.55 + Math.sin(time * 4) * 0.25;
  const grd = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
  grd.addColorStop(0, `rgba(34,240,255,${0.18 * pulse})`);
  grd.addColorStop(1, `rgba(200,77,255,${0.32 * pulse})`);
  ctx.fillStyle = grd;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 22;
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 4;
  ctx.strokeRect(p.x, p.y, p.w, p.h);
  ctx.shadowColor = PURPLE;
  ctx.fillStyle = PURPLE;
  ctx.fillRect(p.x - 8, p.y - 4, 10, p.h + 8);
  ctx.fillRect(p.x + p.w - 2, p.y - 4, 10, p.h + 8);
  ctx.fillStyle = CYAN;
  ctx.fillRect(p.x - 8, p.y - 8, p.w + 16, 6);
  ctx.restore();
}

function drawTrail(ctx: CanvasRenderingContext2D, f: DrawFrame) {
  ctx.save();
  for (const t of f.trail) {
    ctx.globalAlpha = t.a * 0.4;
    ctx.fillStyle = CYAN;
    ctx.beginPath();
    ctx.arc(t.x, t.y + 6, 6 * t.a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function box(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  edge?: string,
) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  if (edge) {
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, f: DrawFrame) {
  const p = f.player;
  const flash = p.invuln > 0 && Math.floor(f.time * 20) % 2 === 0;
  if (flash) ctx.globalAlpha = 0.35;

  const feetX = f.px + p.w / 2;
  const feetY = f.py + p.h;
  const run = p.grounded && Math.abs(p.vx) > 18;
  const swing = Math.sin(f.time * (run ? 14 : 0)) * (run ? 8 : 0);
  const airKick = p.grounded ? 0 : -10;

  ctx.save();
  ctx.translate(feetX, feetY);
  ctx.scale(p.facing, 1);
  ctx.scale(p.squash, p.stretch);

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 3, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 14;

  // Back arm.
  ctx.shadowBlur = 0;
  box(ctx, 8, -28 + swing * 0.35, 7, 16, "#1a2a44", CYAN);
  box(ctx, 8, -14 + swing * 0.35, 7, 7, SKIN);

  // Legs.
  box(ctx, -11, -16 - airKick * 0.2, 9, 16 + swing * 0.15, "#151a33", PURPLE);
  box(ctx, 1, -16 + airKick * 0.15, 9, 16 - swing * 0.15, "#101628", PURPLE);
  box(ctx, -12, -2 - airKick * 0.2, 11, 5, CYAN);
  box(ctx, 1, -2 + airKick * 0.15, 11, 5, CYAN);

  // Torso.
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 12;
  box(ctx, -12, -38, 24, 24, "#10243a", CYAN);
  ctx.shadowBlur = 0;
  box(ctx, -8, -22, 16, 4, PURPLE);
  box(ctx, -3, -36, 6, 8, hexAlpha(CYAN, 0.35));

  // Front arm.
  box(ctx, -16, -30 - swing * 0.4, 7, 16, "#1a2a44", CYAN);
  box(ctx, -16, -16 - swing * 0.4, 7, 7, SKIN);

  // Head.
  ctx.shadowColor = PURPLE;
  ctx.shadowBlur = 10;
  box(ctx, -11, -58, 22, 22, SKIN, hexAlpha(CYAN, 0.5));
  ctx.shadowBlur = 0;

  // Spiky purple hair like the cover runner.
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.moveTo(-12, -52);
  ctx.lineTo(-16, -68);
  ctx.lineTo(-6, -58);
  ctx.lineTo(-2, -72);
  ctx.lineTo(4, -58);
  ctx.lineTo(10, -70);
  ctx.lineTo(12, -52);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-11, -58, 22, 8);

  // Face.
  ctx.fillStyle = "#1a1020";
  ctx.fillRect(-6, -48, 4, 5);
  ctx.fillRect(3, -48, 4, 5);
  ctx.fillStyle = "#fff";
  ctx.fillRect(-5, -48, 2, 2);
  ctx.fillRect(4, -48, 2, 2);
  ctx.strokeStyle = "#1a1020";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, -40, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawParticles(ctx: CanvasRenderingContext2D, parts: Particle[]) {
  ctx.save();
  for (const p of parts) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.glow;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.restore();
}
