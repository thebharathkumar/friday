"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "./StatusBar";
import { MemoryPanel } from "./MemoryPanel";
import type { ChatMessage, Mode } from "@/lib/types";
import { modeColor, modeLabel } from "@/lib/modes";

function sessionId(): string {
  if (typeof window === "undefined") return "default";
  const KEY = "nox.session";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(KEY, id);
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
  const [sid] = useState(sessionId);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("standard");
  const [model, setModel] = useState<string>("loading...");
  const [online, setOnline] = useState<boolean>(false);
  const [models, setModels] = useState<string[]>([]);
  const [now, setNow] = useState<string>(new Date().toISOString().slice(11, 19) + " UTC");
  const [busy, setBusy] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date().toISOString().slice(11, 19) + " UTC");
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/models").then(r => r.json()).then(j => {
      setModels(j.models ?? []);
      setOnline((j.models ?? []).length > 0);
      setModel(j.default ?? "llama3.1:8b");
    }).catch(() => setOnline(false));
  }, []);

  useEffect(() => {
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
      });
  }, [sid]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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
      });

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
          const payload = JSON.parse(line.slice(5).trim()) as { type: string; data: unknown };
          if (payload.type === "mode") {
            const m = payload.data as Mode;
            setMode(m);
            setMessages(prev => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === "assistant") last.mode = m;
              const userMsg = copy[copy.length - 2];
              if (userMsg && userMsg.role === "user") userMsg.mode = m;
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
          } else if (payload.type === "done") {
            setMessages(prev => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === "assistant") {
                copy[copy.length - 1] = { ...last, streaming: false };
              }
              return copy;
            });
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `[transport failure: ${msg}]`,
        mode,
      }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }, [input, busy, mode, model, sid]);

  return (
    <div className="h-screen flex flex-col">
      <StatusBar mode={mode} model={model} online={online} now={now} />

      <div className="flex flex-1 min-h-0">
        <main className="flex-1 flex flex-col min-w-0">
          <div ref={scrollerRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
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

          <div className="border-t border-nox-line p-3 bg-nox-panel/40">
            <div className="flex gap-3 items-end">
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                className="bg-nox-bg border border-nox-line px-2 py-2 text-xs font-mono"
                disabled={models.length === 0}
              >
                {models.length === 0 && <option>{model}</option>}
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={busy ? "NOX is responding..." : "Speak to NOX. Enter to send, Shift+Enter for newline."}
                rows={2}
                className="flex-1 bg-nox-bg border border-nox-line px-3 py-2 text-sm resize-none focus:outline-none focus:border-nox-accent font-sans"
                disabled={busy}
              />
              <button
                onClick={send}
                disabled={busy || !input.trim()}
                className="px-4 py-2 text-xs uppercase tracking-[0.2em] border border-nox-accent text-nox-accent hover:bg-nox-accent hover:text-nox-bg transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-nox-accent"
              >
                {busy ? "..." : "send"}
              </button>
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
      <div className={`whitespace-pre-wrap leading-relaxed ${isUser ? "text-nox-ink" : "text-nox-ink"} ${msg.streaming ? "cursor-blink" : ""}`}>
        {msg.content || (msg.streaming ? "" : " ")}
      </div>
    </div>
  );
}
