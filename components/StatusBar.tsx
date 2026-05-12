"use client";

import { modeColor, modeLabel } from "@/lib/modes";
import type { Mode } from "@/lib/types";
import { SessionSwitcher } from "./SessionSwitcher";

interface Props {
  mode: Mode;
  model: string;
  models: string[];
  online: boolean;
  now: string;
  sessionId: string;
  onSessionChange: (id: string) => void;
  onModelChange: (m: string) => void;
}

export function StatusBar({
  mode, model, models, online, now, sessionId, onSessionChange, onModelChange,
}: Props) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b border-nox-line text-[11px] uppercase tracking-[0.18em] text-nox-dim font-mono">
      <div className="flex items-center gap-2">
        <span className="text-nox-accent">NOX</span>
        <span className="text-nox-dim">v0.2</span>
      </div>
      <div className={`flex items-center gap-2 ${modeColor(mode)}`} aria-label={`Mode: ${modeLabel(mode)}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" aria-hidden />
        <span>{modeLabel(mode)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span>backend</span>
        <span className={online ? "text-nox-ok" : "text-nox-alert"} aria-live="polite">
          {online ? "ollama up" : "ollama offline"}
        </span>
      </div>
      <label className="flex items-center gap-2">
        <span>model</span>
        <select
          value={model}
          onChange={e => onModelChange(e.target.value)}
          className="bg-nox-bg border border-nox-line px-2 py-0.5 text-[11px] font-mono normal-case text-nox-ink"
          aria-label="Choose model"
          disabled={models.length === 0}
        >
          {models.length === 0 && <option>{model}</option>}
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      <SessionSwitcher current={sessionId} onSelect={onSessionChange} />
      <div className="ml-auto text-nox-dim" aria-label="Session clock">{now}</div>
    </div>
  );
}
