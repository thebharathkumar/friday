"use client";

import { useEffect, useState } from "react";
import type { Fact } from "@/lib/types";

export function MemoryPanel() {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("general");

  async function load() {
    const r = await fetch("/api/memory");
    const j = await r.json();
    setFacts(j.facts);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!key.trim() || !value.trim()) return;
    await fetch("/api/memory", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: key.trim(), value: value.trim(), category }),
    });
    setKey("");
    setValue("");
    load();
  }

  async function remove(k: string) {
    await fetch(`/api/memory?key=${encodeURIComponent(k)}`, { method: "DELETE" });
    load();
  }

  return (
    <aside className="w-80 border-l border-nox-line bg-nox-panel/40 flex flex-col">
      <div className="px-4 py-3 border-b border-nox-line text-[11px] uppercase tracking-[0.18em] text-nox-dim font-mono">
        Persistent Memory
      </div>

      <div className="p-3 space-y-2 border-b border-nox-line">
        <input
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="key (e.g. name)"
          className="w-full bg-nox-bg border border-nox-line px-2 py-1.5 text-sm focus:outline-none focus:border-nox-accent"
        />
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="value"
          className="w-full bg-nox-bg border border-nox-line px-2 py-1.5 text-sm focus:outline-none focus:border-nox-accent"
        />
        <div className="flex gap-2">
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="flex-1 bg-nox-bg border border-nox-line px-2 py-1.5 text-xs"
          >
            <option value="general">general</option>
            <option value="identity">identity</option>
            <option value="people">people</option>
            <option value="preferences">preferences</option>
            <option value="ongoing">ongoing</option>
          </select>
          <button
            onClick={save}
            className="px-3 py-1.5 text-xs uppercase tracking-wider border border-nox-accent text-nox-accent hover:bg-nox-accent hover:text-nox-bg transition"
          >
            log
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
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
            <div className="mt-1 text-nox-ink">{f.value}</div>
            <button
              onClick={() => remove(f.key)}
              className="mt-1 text-[10px] text-nox-dim hover:text-nox-alert uppercase tracking-wider opacity-0 group-hover:opacity-100 transition"
            >
              purge
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
