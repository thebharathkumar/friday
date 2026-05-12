"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "./StatusBar";
import { MemoryPanel } from "./MemoryPanel";
import { CrisisBanner } from "./CrisisBanner";
import { Markdown } from "./Markdown";
import type { ChatMessage, Mode } from "@/lib/types";
import { modeColor, modeLabel } from "@/lib/modes";

const SESSION_STORAGE_KEY = "nox.session";

function newSessionId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readSessionId(): string {
  if (typeof window === "undefined") return "default";
  let id = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = newSessionId();
    localStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

interface LiveMessage {
  role: "user" | "assistant";
  content: string;
  mode: Mode;
  streaming?: boolean;
}

export function Chat() {
  const [sid, setSid] = useState<string>(readSessionId);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("standard");
  const [modeChanged, setModeChanged] = useState(false);
  const [model, setModel] = useState<string>("loading...");
  const [online, setOnline] = useState<boolean>(false);
  const [models, setModels] = useState<string[]>([]);
  const [now, setNow] = useState<string>(new Date().toISOString().slice(11, 19) + " UTC");
  const [busy, setBusy] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date().toISOString().slice(11, 19) + " UTC");
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      try {
        const r = await fetch("/api/models");
        if (cancelled) return;
        const j = await r.json();
        const list = j.models ?? [];
        setModels(list);
        setOnline(list.length > 0);
        if (!list.includes(model)) setModel(j.default ?? "llama3.1:8b");
      } catch {
        if (!cancelled) setOnline(false);
      }
    };
    ping();
    const t = setInterval(ping, 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, [model]);

  useEffect(() => {
    localStorage.setItem(SESSION_STORAGE_KEY, sid);
    fetch(`/api/chat?sessionId=${encodeURIComponent(sid)}`)
      .then(r => r.json())
      .then((j: { messages: ChatMessage[] }) => {
        const seeded: LiveMessage[] = j.messages
          .filter(m => m.role !== "system")
          .map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            mode: m.mode,
          }));
        setMessages(seeded);
        if (seeded.length > 0) setMode(seeded[seeded.length - 1].mode);
        else setMode("standard");
      });
  }, [sid]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);

    setMessages(prev => [
      ...prev,
      { role: "user", content: text, mode },
      { role: "assistant", content: "", mode, streaming: true },
    ]);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: sid,
          message: text,
          priorMode: mode,
          model,
        }),
        signal: ac.signal,
      });

      if (!res.ok) throw new Error(`http ${res.status}`);
      if (!res.body) throw new Error("no stream body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const raw of events) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          let payload: { type: string; data: unknown };
          try {
            payload = JSON.parse(line.slice(5).trim());
          } catch { continue; }

          if (payload.type === "mode") {
            const d = payload.data as { mode: Mode; changed: boolean };
            setMode(d.mode);
            setModeChanged(d.changed);
            setMessages(prev => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === "assistant") last.mode = d.mode;
              const userMsg = copy[copy.length - 2];
              if (userMsg && userMsg.role === "user") userMsg.mode = d.mode;
              return copy;
            });
          } else if (payload.type === "token") {
            const t = payload.data as string;
            setMessages(prev => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === "assistant") {
                copy[copy.length - 1] = { ...last, content: last.content + t };
              }
              return copy;
            });
          } else if (payload.type === "error") {
            setMessages(prev => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === "assistant") {
                copy[copy.length - 1] = {
                  ...last,
                  content: last.content + `\n\n[backend error: ${payload.data}]`,
                  streaming: false,
                };
              }
              return copy;
            });
          } else if (payload.type === "aborted" || payload.type === "done") {
            setMessages(prev => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === "assistant") {
                copy[copy.length - 1] = {
                  ...last,
                  content: last.content + (payload.type === "aborted" ? "\n\n[aborted]" : ""),
                  streaming: false,
                };
                if (liveRegionRef.current) {
                  liveRegionRef.current.textContent = `NOX response complete. ${last.content.length} characters.`;
                }
              }
              return copy;
            });
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setMessages(prev => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === "assistant") {
            copy[copy.length - 1] = {
              ...last,
              content: last.content + "\n\n[aborted]",
              streaming: false,
            };
          }
          return copy;
        });
      } else {
        const msg = err instanceof Error ? err.message : "unknown";
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `[transport failure: ${msg}]`,
          mode,
        }]);
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, [input, busy, mode, model, sid]);

  const handleSessionChange = useCallback((newId: string) => {
    abortRef.current?.abort();
    setSid(newId);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <StatusBar
        mode={mode}
        model={model}
        models={models}
        online={online}
        now={now}
        sessionId={sid}
        onSessionChange={handleSessionChange}
        onModelChange={setModel}
      />
      <CrisisBanner mode={mode} changed={modeChanged} />

      <div className="flex flex-1 min-h-0">
        <main className="flex-1 flex flex-col min-w-0">
          <div
            ref={scrollerRef}
            className="flex-1 overflow-y-auto px-6 py-4 space-y-5"
            role="log"
            aria-label="Conversation"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.length === 0 && (
              <div className="font-mono text-sm text-nox-dim space-y-2">
                <div className="text-nox-accent">NOX online.</div>
                <div>Standard mode. Calibrated, one step ahead.</div>
                <div>Speak when ready, sir.</div>
              </div>
            )}
            {messages.map((m, i) => (
              <MessageBubble key={i} msg={m} />
            ))}
          </div>

          <div
            ref={liveRegionRef}
            className="sr-only"
            role="status"
            aria-live="polite"
          />

          <div className="border-t border-nox-line p-3 bg-nox-panel/40">
            <div className="flex gap-3 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                  if (e.key === "Escape" && busy) {
                    e.preventDefault();
                    stop();
                  }
                }}
                placeholder={busy ? "NOX is responding. Esc to stop." : "Speak to NOX. Enter to send, Shift+Enter newline."}
                rows={2}
                aria-label="Message to NOX"
                className="flex-1 bg-nox-bg border border-nox-line px-3 py-2 text-sm resize-none focus:outline-none focus:border-nox-accent font-sans disabled:opacity-50"
                disabled={busy}
              />
              {busy ? (
                <button
                  onClick={stop}
                  aria-label="Stop generation"
                  className="px-4 py-2 text-xs uppercase tracking-[0.2em] border border-nox-alert text-nox-alert hover:bg-nox-alert hover:text-nox-bg transition"
                >
                  stop
                </button>
              ) : (
                <button
                  onClick={send}
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className="px-4 py-2 text-xs uppercase tracking-[0.2em] border border-nox-accent text-nox-accent hover:bg-nox-accent hover:text-nox-bg transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-nox-accent"
                >
                  send
                </button>
              )}
            </div>
          </div>
        </main>

        <MemoryPanel />
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: LiveMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className="font-mono text-sm">
      <div className={`flex items-baseline gap-3 mb-1 text-[10px] uppercase tracking-[0.2em] ${isUser ? "text-nox-dim" : modeColor(msg.mode)}`}>
        <span>{isUser ? "you" : "nox"}</span>
        {!isUser && <span className="text-nox-dim">{modeLabel(msg.mode)}</span>}
      </div>
      {isUser ? (
        <div className="whitespace-pre-wrap leading-relaxed text-nox-ink">
          {msg.content}
        </div>
      ) : (
        <div className={`leading-relaxed text-nox-ink ${msg.streaming && !msg.content ? "cursor-blink" : ""}`}>
          {msg.content ? <Markdown content={msg.content} /> : (msg.streaming ? "" : " ")}
          {msg.streaming && msg.content && <span className="cursor-blink" aria-hidden />}
        </div>
      )}
    </div>
  );
}
