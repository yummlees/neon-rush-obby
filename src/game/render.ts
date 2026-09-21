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

function hueColor(h: Platform["hue"]) {
  return h === "purple" ? PURPLE : CYAN;
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
  g.addColorStop(0, "#070712");
  g.addColorStop(0.55, "#0c0a22");
  g.addColorStop(1, "#1a0830");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);

  ctx.save();
  ctx.translate(-camX * scale, -camY * scale);
  ctx.scale(scale, scale);

  drawParallax(ctx, f);
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
    viewH / 2,
    viewH * 0.2,
    viewW / 2,
    viewH / 2,
    viewH * 0.85,
  );
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(4,0,14,0.42)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, viewW, viewH);
}

function drawParallax(ctx: CanvasRenderingContext2D, f: DrawFrame) {
  const t = f.time;
  ctx.save();
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 48; i++) {
    const sx = ((i * 197 + t * 4) % (f.worldW + 400)) - 200;
    const sy = 40 + ((i * 53) % 280);
    ctx.fillStyle = i % 3 === 0 ? CYAN : "#ffffff";
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.12;
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

  // Distant blocks
  ctx.save();
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 18; i++) {
    const bx = i * 620 + 80;
    const bh = 80 + (i % 5) * 40;
    ctx.fillStyle = i % 2 ? PURPLE : CYAN;
    ctx.fillRect(bx, f.lavaY - bh - 40, 40 + (i % 3) * 18, bh);
  }
  ctx.restore();
}

function drawStageSigns(ctx: CanvasRenderingContext2D, f: DrawFrame) {
  ctx.save();
  ctx.font = "600 18px Orbitron, sans-serif";
  for (let i = 0; i < STAGE_NAMES.length; i++) {
    const x = i * STAGE_W + 48;
    if (x < f.camX - 200 || x > f.camX + f.viewW / f.scale + 40) continue;
    ctx.fillStyle = i + 1 === f.stage ? CYAN : "rgba(232,247,255,0.35)";
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
  grad.addColorStop(0.25, PURPLE);
  grad.addColorStop(1, "#2a0418");
  ctx.fillStyle = grad;
  ctx.fillRect(x0, y + 8, x1 - x0, f.worldH);

  ctx.save();
  ctx.shadowColor = HOT;
  ctx.shadowBlur = 18;
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
  if (p.x < 0 || p.x >= 10800 && p.kind === "solid" && p.w <= 36) return;

  let dx = 0;
  if (p.kind === "crumble" && p.shake > 0) {
    dx = Math.sin(time * 40) * p.shake * 3;
  }

  const x = p.x + dx;
  const y = p.y;
  const color = p.kind === "spike" ? HOT : p.kind === "jump" ? CYAN : hueColor(p.hue);

  if (p.kind === "goal") {
    drawGoal(ctx, p, time);
    return;
  }

  if (p.kind === "spike") {
    ctx.save();
    ctx.shadowColor = HOT;
    ctx.shadowBlur = 12;
    ctx.fillStyle = HOT;
    const n = Math.max(2, Math.floor(p.w / 16));
    const tw = p.w / n;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const sx = x + i * tw;
      ctx.moveTo(sx, y + p.h);
      ctx.lineTo(sx + tw / 2, y);
      ctx.lineTo(sx + tw, y + p.h);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = p.kind === "jump" ? 22 : 14;
  ctx.fillStyle = color;
  roundRect(ctx, x, y, p.w, p.h, 5);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(6,6,18,0.72)";
  roundRect(ctx, x + 2, y + 3, p.w - 4, p.h - 5, 4);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.globalAlpha = 0.95;
  ctx.fillRect(x + 3, y, p.w - 6, 3);

  if (p.kind === "jump") {
    ctx.globalAlpha = 0.55 + Math.sin(time * 8) * 0.25;
    ctx.font = "700 11px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PAD", x + p.w / 2, y - 6);
    ctx.beginPath();
    ctx.moveTo(x + p.w / 2, y - 18);
    ctx.lineTo(x + p.w / 2 - 6, y - 10);
    ctx.lineTo(x + p.w / 2 + 6, y - 10);
    ctx.closePath();
    ctx.fill();
  }

  if (p.kind === "moving") {
    ctx.globalAlpha = 0.7;
    ctx.fillRect(x + 8, y + p.h / 2 - 1, p.w - 16, 2);
  }

  if (p.kind === "crumble" && p.gone > 0) {
    ctx.restore();
    return;
  }
  ctx.restore();
}

function drawGoal(ctx: CanvasRenderingContext2D, p: Platform, time: number) {
  ctx.save();
  const pulse = 0.55 + Math.sin(time * 4) * 0.25;
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 24;
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 4;
  ctx.strokeRect(p.x, p.y, p.w, p.h);
  ctx.shadowBlur = 0;
  const grd = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
  grd.addColorStop(0, `rgba(34,240,255,${0.15 * pulse})`);
  grd.addColorStop(1, `rgba(200,77,255,${0.28 * pulse})`);
  ctx.fillStyle = grd;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = PURPLE;
  ctx.shadowColor = PURPLE;
  ctx.shadowBlur = 12;
  ctx.fillRect(p.x - 6, p.y, 6, p.h);
  ctx.fillRect(p.x + p.w, p.y, 6, p.h);
  ctx.restore();
}

function drawTrail(ctx: CanvasRenderingContext2D, f: DrawFrame) {
  ctx.save();
  for (const t of f.trail) {
    ctx.globalAlpha = t.a * 0.35;
    ctx.fillStyle = CYAN;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 7 * t.a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, f: DrawFrame) {
  const p = f.player;
  const flash = p.invuln > 0 && Math.floor(f.time * 20) % 2 === 0;
  if (flash) ctx.globalAlpha = 0.35;

  const cx = f.px + p.w / 2;
  const cy = f.py + p.h / 2;
  const w = p.w * p.squash;
  const h = p.h * p.stretch;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 18;
  ctx.fillStyle = CYAN;
  roundRect(ctx, -w / 2, -h / 2, w, h, 6);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#071018";
  roundRect(ctx, -w / 2 + 3, -h / 2 + 4, w - 6, h - 8, 4);
  ctx.fill();

  ctx.fillStyle = CYAN;
  const eye = p.facing > 0 ? 4 : -8;
  ctx.fillRect(eye, -8, 5, 5);
  ctx.fillRect(eye + (p.facing > 0 ? 8 : -8), -8, 5, 5);
  ctx.fillStyle = PURPLE;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(-w / 2 + 5, h / 2 - 10, w - 10, 3);
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
