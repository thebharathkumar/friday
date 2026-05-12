"use client";

import { useEffect, useState } from "react";
import type { Fact } from "@/lib/types";

interface DraftState {
  key: string;
  value: string;
  category: string;
  editingId: number | null;
  warning: string | null;
  override: boolean;
}

const EMPTY: DraftState = {
  key: "",
  value: "",
  category: "general",
  editingId: null,
  warning: null,
  override: false,
};

export function MemoryPanel() {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [draft, setDraft] = useState<DraftState>(EMPTY);

  async function load() {
    const r = await fetch("/api/memory");
    if (!r.ok) return;
    const j = await r.json();
    setFacts(j.facts);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!draft.key.trim() || !draft.value.trim()) return;
    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        key: draft.key.trim(),
        value: draft.value.trim(),
        category: draft.category,
        override: draft.override,
      }),
    });
    if (res.status === 422) {
      const j = await res.json();
      setDraft(d => ({ ...d, warning: j.reason ?? "Memory likely contains a secret." }));
      return;
    }
    if (!res.ok) {
      setDraft(d => ({ ...d, warning: "Save failed." }));
      return;
    }
    setDraft(EMPTY);
    load();
  }

  async function remove(k: string) {
    await fetch(`/api/memory?key=${encodeURIComponent(k)}`, { method: "DELETE" });
    load();
  }

  function beginEdit(f: Fact) {
    setDraft({
      key: f.key,
      value: f.value,
      category: f.category,
      editingId: f.id,
      warning: null,
      override: false,
    });
  }

  return (
    <aside className="w-80 border-l border-nox-line bg-nox-panel/40 flex flex-col" aria-label="Persistent memory">
      <div className="px-4 py-3 border-b border-nox-line text-[11px] uppercase tracking-[0.18em] text-nox-dim font-mono">
        Persistent Memory
      </div>

      <div className="p-3 space-y-2 border-b border-nox-line">
        <label className="block text-[10px] uppercase tracking-wider text-nox-dim">
          key
          <input
            value={draft.key}
            onChange={e => setDraft(d => ({ ...d, key: e.target.value }))}
            placeholder="e.g. name"
            disabled={draft.editingId !== null}
            className="mt-1 w-full bg-nox-bg border border-nox-line px-2 py-1.5 text-sm focus:outline-none focus:border-nox-accent disabled:opacity-50"
            aria-label="Fact key"
          />
        </label>
        <label className="block text-[10px] uppercase tracking-wider text-nox-dim">
          value
          <textarea
            value={draft.value}
            onChange={e => setDraft(d => ({ ...d, value: e.target.value, warning: null }))}
            placeholder="value"
            rows={2}
            className="mt-1 w-full bg-nox-bg border border-nox-line px-2 py-1.5 text-sm resize-y focus:outline-none focus:border-nox-accent"
            aria-label="Fact value"
          />
        </label>
        <div className="flex gap-2">
          <select
            value={draft.category}
            onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
            className="flex-1 bg-nox-bg border border-nox-line px-2 py-1.5 text-xs"
            aria-label="Fact category"
          >
            <option value="general">general</option>
            <option value="identity">identity</option>
            <option value="people">people</option>
            <option value="preferences">preferences</option>
            <option value="ongoing">ongoing</option>
            <option value="health">health</option>
          </select>
          <button
            onClick={save}
            className="px-3 py-1.5 text-xs uppercase tracking-wider border border-nox-accent text-nox-accent hover:bg-nox-accent hover:text-nox-bg transition"
          >
            {draft.editingId !== null ? "update" : "log"}
          </button>
          {draft.editingId !== null && (
            <button
              onClick={() => setDraft(EMPTY)}
              className="px-2 py-1.5 text-xs uppercase tracking-wider text-nox-dim hover:text-nox-ink"
            >
              cancel
            </button>
          )}
        </div>
        {draft.warning && (
          <div role="alert" className="border border-nox-warn bg-nox-warn/10 p-2 text-xs">
            <div className="text-nox-warn uppercase tracking-wider text-[10px] mb-1">flagged</div>
            <div className="text-nox-ink">{draft.warning}</div>
            <label className="mt-2 flex items-center gap-2 text-nox-dim">
              <input
                type="checkbox"
                checked={draft.override}
                onChange={e => setDraft(d => ({ ...d, override: e.target.checked }))}
              />
              <span>I understand, save anyway.</span>
            </label>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2" aria-live="polite">
        {facts.length === 0 && (
          <div className="text-xs text-nox-dim italic">No facts logged.</div>
        )}
        {facts.map(f => (
          <div key={f.id} className="border border-nox-line p-2 text-xs group">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-nox-accent font-mono">{f.key}</span>
              <span className="text-nox-dim text-[10px] uppercase tracking-wider">
                {f.category}
              </span>
            </div>
            <div className="mt-1 text-nox-ink whitespace-pre-wrap">{f.value}</div>
            <div className="mt-1 flex gap-3 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={() => beginEdit(f)}
                className="text-[10px] text-nox-dim hover:text-nox-accent uppercase tracking-wider"
                aria-label={`Edit fact ${f.key}`}
              >
                edit
              </button>
              <button
                onClick={() => remove(f.key)}
                className="text-[10px] text-nox-dim hover:text-nox-alert uppercase tracking-wider"
                aria-label={`Delete fact ${f.key}`}
              >
                purge
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
