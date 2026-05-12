"use client";

import { useEffect, useState } from "react";
import type { Mode } from "@/lib/types";

interface Props {
  mode: Mode;
  changed: boolean;
}

export function CrisisBanner({ mode, changed }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (mode === "crisis" && changed) {
      setVisible(true);
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const beep = (freq: number, start: number, dur: number) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.value = freq;
          o.connect(g);
          g.connect(ctx.destination);
          g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
          g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + start + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
          o.start(ctx.currentTime + start);
          o.stop(ctx.currentTime + start + dur);
        };
        beep(880, 0, 0.18);
        beep(660, 0.22, 0.18);
        beep(880, 0.44, 0.18);
        setTimeout(() => ctx.close().catch(() => {}), 1200);
      } catch { /* audio not allowed */ }
    } else if (mode !== "crisis") {
      setVisible(false);
    }
  }, [mode, changed]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="border-y border-nox-alert bg-nox-alert/10 px-4 py-2 flex items-center gap-4 font-mono text-xs"
    >
      <span className="text-nox-alert uppercase tracking-[0.25em] font-semibold">Crisis mode</span>
      <span className="text-nox-ink">Honorifics dropped. One thought per sentence. Lead with action.</span>
      <button
        onClick={() => setVisible(false)}
        className="ml-auto text-nox-dim hover:text-nox-ink uppercase tracking-wider text-[10px]"
        aria-label="Dismiss crisis banner"
      >
        dismiss
      </button>
    </div>
  );
}
