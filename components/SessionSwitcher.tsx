"use client";

import { useEffect, useState } from "react";
import type { Session } from "@/lib/types";

interface Props {
  current: string;
  onSelect: (id: string) => void;
}

function newId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function SessionSwitcher({ current, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  async function load() {
    const r = await fetch("/api/sessions");
    if (!r.ok) return;
    const j = await r.json();
    setSessions(j.sessions);
  }

  useEffect(() => {
    if (open) load();
  }, [open]);

  async function createNew() {
    const id = newId();
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, title: "new session" }),
    });
    onSelect(id);
    setOpen(false);
  }

  async function commitRename(id: string) {
    const title = renameValue.trim() || "untitled";
    await fetch("/api/sessions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, title }),
    });
    setRenaming(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this session and all its messages?")) return;
    await fetch(`/api/sessions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (id === current) {
      const remaining = sessions.filter(s => s.id !== id);
      if (remaining.length > 0) onSelect(remaining[0].id);
      else {
        const id2 = newId();
        await fetch("/api/sessions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: id2, title: "new session" }),
        });
        onSelect(id2);
      }
    }
    load();
  }

  const currentTitle = sessions.find(s => s.id === current)?.title ?? "session";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="text-[11px] uppercase tracking-[0.18em] text-nox-dim hover:text-nox-ink border border-nox-line px-2 py-1 font-mono"
      >
        sessions: <span className="text-nox-ink normal-case">{currentTitle}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 w-80 bg-nox-panel border border-nox-line z-30 max-h-96 overflow-y-auto"
        >
          <button
            onClick={createNew}
            className="w-full text-left px-3 py-2 text-xs uppercase tracking-wider text-nox-accent hover:bg-nox-bg border-b border-nox-line"
          >
            + new session
          </button>
          {sessions.length === 0 && (
            <div className="px-3 py-2 text-xs text-nox-dim italic">No sessions yet.</div>
          )}
          {sessions.map(s => (
            <div
              key={s.id}
              className={`group flex items-center gap-2 px-3 py-2 text-xs hover:bg-nox-bg ${
                s.id === current ? "bg-nox-bg/60" : ""
              }`}
            >
              {renaming === s.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => commitRename(s.id)}
                  onKeyDown={e => {
                    if (e.key === "Enter") commitRename(s.id);
                    if (e.key === "Escape") setRenaming(null);
                  }}
                  className="flex-1 bg-nox-bg border border-nox-line px-1 py-0.5"
                />
              ) : (
                <button
                  onClick={() => { onSelect(s.id); setOpen(false); }}
                  className="flex-1 text-left truncate"
                >
                  <span className={s.id === current ? "text-nox-accent" : "text-nox-ink"}>
                    {s.title}
                  </span>
                  <span className="ml-2 text-nox-dim text-[10px]">
                    {s.last_active.slice(5, 16)}
                  </span>
                </button>
              )}
              <button
                onClick={() => { setRenaming(s.id); setRenameValue(s.title); }}
                aria-label="Rename session"
                className="opacity-0 group-hover:opacity-100 text-nox-dim hover:text-nox-ink text-[10px] uppercase"
              >
                rename
              </button>
              <button
                onClick={() => remove(s.id)}
                aria-label="Delete session"
                className="opacity-0 group-hover:opacity-100 text-nox-dim hover:text-nox-alert text-[10px] uppercase"
              >
                purge
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
