import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { createGame, type GameApi } from "@/game/engine";
import { loadSave } from "@/game/save";
import { useGameUi } from "@/game/store";
import { cn, formatTime } from "@/lib/utils";

export function GameShell() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<GameApi | null>(null);
  const ui = useGameUi();
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const saved = loadSave();
    useGameUi.setState({ bestTime: saved.bestTime, muted: saved.muted });
    const game = createGame(canvas);
    apiRef.current = game;
    return () => {
      game.destroy();
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse || window.innerWidth < 720) setTouch(true);
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "touch") setTouch(true);
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, []);

  const api = () => apiRef.current;
  const showTouch = touch && ui.mode === "play";

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full touch-none"
        aria-label="Neon Rush Obby game"
      />

      {ui.mode === "play" || ui.mode === "pause" ? (
        <Hud onPause={() => api()?.pause()} />
      ) : null}

      {ui.mode === "menu" ? <StartScreen onPlay={() => api()?.start()} /> : null}
      {ui.mode === "pause" ? (
        <PauseScreen
          onResume={() => api()?.resume()}
          onRestart={() => api()?.restart()}
          onMenu={() => api()?.toMenu()}
        />
      ) : null}
      {ui.mode === "win" ? (
        <WinScreen
          onAgain={() => api()?.playAgain()}
          onShare={() => void api()?.share()}
        />
      ) : null}

      {showTouch ? (
        <TouchPad
          setLeft={(v) => api()?.setTouchLeft(v)}
          setRight={(v) => api()?.setTouchRight(v)}
          setJump={(v) => api()?.setTouchJump(v)}
        />
      ) : null}

      <button
        type="button"
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] z-20 flex size-11 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface/80 text-muted backdrop-blur-sm hover:text-fg"
        aria-label={ui.muted ? "Unmute" : "Mute"}
        onClick={() => api()?.toggleMute()}
      >
        {ui.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
      </button>
    </main>
  );
}

function Hud({ onPause }: { onPause: () => void }) {
  const ui = useGameUi();
  return (
    <div className="pointer-events-none absolute top-[max(0.75rem,env(safe-area-inset-top))] left-[max(0.75rem,env(safe-area-inset-left))] z-20 flex max-w-[calc(100%-4.5rem)] flex-wrap items-center gap-2">
      <Chip>
        <span className="text-muted">Stage</span>{" "}
        <span className="font-display text-cyan">
          {ui.stage}/10 {ui.stageName}
        </span>
      </Chip>
      <Chip>
        <span className="text-muted">Time</span>{" "}
        <span className="font-display tabular-nums">{formatTime(ui.time)}</span>
      </Chip>
      <Chip>
        <span className="text-muted">Falls</span>{" "}
        <span className="font-display tabular-nums">{ui.deaths}</span>
      </Chip>
      {ui.bestTime != null ? (
        <Chip>
          <span className="text-muted">Best</span>{" "}
          <span className="font-display tabular-nums text-purple">
            {formatTime(ui.bestTime)}
          </span>
        </Chip>
      ) : null}
      {ui.mode === "play" ? (
        <button
          type="button"
          className="pointer-events-auto flex size-11 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface/80 text-fg backdrop-blur-sm"
          aria-label="Pause"
          onClick={onPause}
        >
          <Pause className="size-5" />
        </button>
      ) : null}
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface/80 px-3 py-2 text-xs font-medium backdrop-blur-sm">
      {children}
    </div>
  );
}

function StartScreen({ onPlay }: { onPlay: () => void }) {
  const best = useGameUi((s) => s.bestTime);
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-[linear-gradient(180deg,transparent_0%,rgb(7_7_18_/_0.4)_40%,rgb(7_7_18_/_0.88)_100%)] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-16 sm:items-center sm:bg-[rgb(7_7_18_/_0.45)] sm:pb-8">
      <section className="w-full max-w-md rounded-[var(--radius-xl)] border border-border bg-surface p-5 sm:p-8">
        <img
          src="/og.jpg"
          alt="Neon Rush Obby runner on glowing pads"
          className="mb-4 h-28 w-full rounded-[var(--radius-lg)] border border-border object-cover sm:h-36"
        />
        <p className="font-display text-xs tracking-[0.28em] text-cyan">FREE TO PLAY</p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-none tracking-tight text-fg sm:text-5xl">
          Neon Rush
          <span className="block text-purple">Obby</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Ten neon stages. Checkpoints save your place. Fall in lava or hit spikes
          and you restart at the last stage. No login. Finish for free.
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-fg">
          <li>Move with A / D or the on-screen arrows.</li>
          <li>Jump with Space, W, or the Jump button.</li>
          <li>Cyan pads bounce you. Moving bars carry you.</li>
        </ul>
        {best != null ? (
          <p className="mt-3 font-display text-sm text-cyan">
            Best time {formatTime(best)}
          </p>
        ) : null}
        <Button size="lg" className="mt-5 w-full font-display tracking-wide" onClick={onPlay}>
          <Play className="size-5" />
          Play
        </Button>
      </section>
    </div>
  );
}

function PauseScreen({
  onResume,
  onRestart,
  onMenu,
}: {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/70 px-4">
      <section className="w-full max-w-sm rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h2 className="font-display text-2xl text-fg">Paused</h2>
        <p className="mt-2 text-sm text-muted">Timer holds until you continue.</p>
        <div className="mt-6 flex flex-col gap-2">
          <Button size="lg" onClick={onResume}>
            Continue
          </Button>
          <Button variant="secondary" onClick={onRestart}>
            <RotateCcw className="size-4" />
            Restart run
          </Button>
          <Button variant="ghost" onClick={onMenu}>
            Back to title
          </Button>
        </div>
      </section>
    </div>
  );
}

function WinScreen({ onAgain, onShare }: { onAgain: () => void; onShare: () => void }) {
  const ui = useGameUi();
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/75 px-4">
      <section className="w-full max-w-sm rounded-[var(--radius-xl)] border border-border bg-surface p-6 text-center sm:p-8">
        <p className="font-display text-xs tracking-[0.28em] text-cyan">COURSE CLEAR</p>
        <h2 className="mt-2 font-display text-3xl text-fg">You finished</h2>
        <p className="mt-4 font-display text-4xl tabular-nums text-cyan">{formatTime(ui.time)}</p>
        {ui.bestTime != null ? (
          <p className="mt-2 text-sm text-muted">
            Best{" "}
            <span className="font-display tabular-nums text-purple">{formatTime(ui.bestTime)}</span>
            {" · "}
            {ui.deaths} fall{ui.deaths === 1 ? "" : "s"}
          </p>
        ) : null}
        {ui.shareMsg ? <p className="mt-3 text-sm text-cyan">{ui.shareMsg}</p> : null}
        <div className="mt-6 flex flex-col gap-2">
          <Button size="lg" onClick={onAgain}>
            <RotateCcw className="size-4" />
            Play again
          </Button>
          <Button variant="secondary" onClick={onShare}>
            <Share2 className="size-4" />
            Share best time
          </Button>
        </div>
      </section>
    </div>
  );
}

function TouchPad({
  setLeft,
  setRight,
  setJump,
}: {
  setLeft: (v: boolean) => void;
  setRight: (v: boolean) => void;
  setJump: (v: boolean) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.9rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex gap-2">
        <PadButton label="Left" onDown={() => setLeft(true)} onUp={() => setLeft(false)}>
          <ChevronLeft className="size-8" />
        </PadButton>
        <PadButton label="Right" onDown={() => setRight(true)} onUp={() => setRight(false)}>
          <ChevronRight className="size-8" />
        </PadButton>
      </div>
      <PadButton label="Jump" wide onDown={() => setJump(true)} onUp={() => setJump(false)}>
        <span className="font-display text-sm tracking-wider">JUMP</span>
      </PadButton>
    </div>
  );
}

function PadButton({
  children,
  label,
  onDown,
  onUp,
  wide,
}: {
  children: ReactNode;
  label: string;
  onDown: () => void;
  onUp: () => void;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "flex h-16 items-center justify-center rounded-[var(--radius-lg)] border border-cyan/40 bg-surface/75 text-cyan backdrop-blur-sm active:bg-cyan/20",
        wide ? "min-w-28 px-6" : "w-16",
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onDown();
      }}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onLostPointerCapture={onUp}
    >
      {children}
    </button>
  );
}
