type Beep = {
  freq: number;
  dur: number;
  type: OscillatorType;
  gain?: number;
  slide?: number;
  delay?: number;
};

export function createAudio() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let sfx: GainNode | null = null;
  let muted = false;

  function ensure(gesture = false) {
    if (typeof window === "undefined") return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    if (!ctx) {
      ctx = new AC({ latencyHint: "interactive" });
      master = ctx.createGain();
      sfx = ctx.createGain();
      sfx.connect(master);
      master.connect(ctx.destination);
      master.gain.value = muted ? 0 : 0.85;
      sfx.gain.value = 0.7;
    }
    if (gesture && ctx.state === "suspended") {
      void ctx.resume();
    }
  }

  function unlock() {
    ensure(true);
  }

  function setMuted(next: boolean) {
    muted = next;
    if (master && ctx) {
      master.gain.setTargetAtTime(next ? 0 : 0.85, ctx.currentTime, 0.04);
    }
  }

  function beep(opts: Beep) {
    if (!ctx || !sfx || muted) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.slide) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(40, opts.slide),
        t0 + opts.dur,
      );
    }
    const amp = opts.gain ?? 0.12;
    g.gain.setValueAtTime(amp, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(g);
    g.connect(sfx);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (!ctx) return;
      if (document.hidden) {
        void ctx.suspend();
      } else if (!muted) {
        void ctx.resume();
      }
    });
  }

  return {
    unlock,
    setMuted,
    jump: () => beep({ freq: 420, dur: 0.12, type: "square", gain: 0.08, slide: 680 }),
    land: () => beep({ freq: 180, dur: 0.08, type: "triangle", gain: 0.07 }),
    bounce: () =>
      beep({ freq: 520, dur: 0.16, type: "square", gain: 0.1, slide: 920 }),
    checkpoint: () => {
      beep({ freq: 660, dur: 0.1, type: "sine", gain: 0.08 });
      beep({ freq: 880, dur: 0.14, type: "sine", gain: 0.07, delay: 0.08 });
    },
    crumble: () =>
      beep({ freq: 140, dur: 0.18, type: "sawtooth", gain: 0.05, slide: 70 }),
    death: () => {
      beep({ freq: 280, dur: 0.22, type: "sawtooth", gain: 0.1, slide: 70 });
      beep({ freq: 180, dur: 0.28, type: "triangle", gain: 0.08, delay: 0.04 });
    },
    win: () => {
      const notes = [523, 659, 784, 1046];
      notes.forEach((freq, i) => {
        beep({ freq, dur: 0.22, type: "sine", gain: 0.09, delay: i * 0.1 });
      });
    },
  };
}

export type AudioBus = ReturnType<typeof createAudio>;
