"use client";

import { modeColor, modeLabel } from "@/lib/modes";
import type { Mode } from "@/lib/types";

interface Props {
  mode: Mode;
  model: string;
  online: boolean;
  now: string;
}

export function StatusBar({ mode, model, online, now }: Props) {
  return (
    <div className="flex items-center gap-6 px-4 py-2 border-b border-nox-line text-[11px] uppercase tracking-[0.18em] text-nox-dim font-mono">
      <div className="flex items-center gap-2">
        <span className="text-nox-accent">NOX</span>
        <span className="text-nox-dim">v0.1</span>
      </div>
      <div className={`flex items-center gap-2 ${modeColor(mode)}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
        <span>{modeLabel(mode)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span>backend</span>
        <span className={online ? "text-nox-ok" : "text-nox-alert"}>
          {online ? "ollama up" : "ollama offline"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span>model</span>
        <span className="text-nox-ink normal-case">{model}</span>
      </div>
      <div className="ml-auto text-nox-dim">{now}</div>
    </div>
  );
}
