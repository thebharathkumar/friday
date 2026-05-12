import { NextRequest } from "next/server";
import { z } from "zod";
import {
  appendMessage,
  ensureSession,
  getMessagesWithinBudget,
  getSessionState,
  listFactsWithinBudget,
  setSessionMode,
  setSessionSummary,
  updateMessageContent,
} from "@/lib/memory";
import { detectMode } from "@/lib/modes";
import { buildSystemPrompt, MODE_TEMPERATURE } from "@/lib/nox-prompt";
import { streamChat, type ChatTurn } from "@/lib/ollama";
import { summarizeDropped } from "@/lib/summarize";
import { requireAuth } from "@/lib/auth";
import type { Mode } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ModeEnum = z.enum([
  "standard", "deep_work", "war_room", "recovery",
  "tactical", "workshop", "counsel", "crisis",
]);

const Body = z.object({
  sessionId: z.string().min(1).max(64),
  message: z.string().min(1).max(8000),
  priorMode: ModeEnum.default("standard"),
  model: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const { sessionId, message, priorMode, model } = parsed.data;

  ensureSession(sessionId);
  const state = getSessionState(sessionId);
  const detect = detectMode(
    {
      text: message,
      hour: new Date().getHours(),
      stickyMode: state.sticky_mode,
      turnsSinceModeChange: state.turns_since_change,
    },
    priorMode,
  );
  const mode: Mode = detect.mode;
  const modeChanged = mode !== state.sticky_mode;
  setSessionMode(sessionId, mode, modeChanged);

  appendMessage({ sessionId, role: "user", content: message, mode });

  const { recent, dropped } = getMessagesWithinBudget(sessionId);
  const facts = listFactsWithinBudget();

  const turns: ChatTurn[] = [
    {
      role: "system",
      content: buildSystemPrompt({
        mode,
        facts: facts.map(f => ({ key: f.key, value: f.value, category: f.category })),
        now: new Date(),
        historySummary: state.summary || undefined,
      }),
    },
    ...recent.map((m): ChatTurn => ({
      role: m.role === "system" ? "system" : (m.role as "user" | "assistant"),
      content: m.content,
    })),
  ];

  const assistantRow = appendMessage({
    sessionId,
    role: "assistant",
    content: "",
    mode,
  });

  const encoder = new TextEncoder();
  let collected = "";
  let lastFlush = 0;
  const FLUSH_INTERVAL_MS = 1500;

  const ac = new AbortController();
  req.signal.addEventListener("abort", () => ac.abort(), { once: true });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (type: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`),
          );
        } catch { /* client gone */ }
      };

      send("mode", { mode, sticky: detect.sticky, changed: modeChanged });

      let aborted = false;
      try {
        for await (const chunk of streamChat({
          model,
          messages: turns,
          temperature: MODE_TEMPERATURE[mode],
          signal: ac.signal,
        })) {
          if (ac.signal.aborted) { aborted = true; break; }
          collected += chunk;
          send("token", chunk);
          const now = Date.now();
          if (now - lastFlush > FLUSH_INTERVAL_MS) {
            updateMessageContent(assistantRow.id, collected);
            lastFlush = now;
          }
        }
        updateMessageContent(assistantRow.id, collected + (aborted ? "\n\n[aborted]" : ""));
        send(aborted ? "aborted" : "done", { mode });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown error";
        updateMessageContent(assistantRow.id, collected + `\n\n[backend error: ${msg}]`);
        send("error", msg);
      } finally {
        controller.close();
      }

      if (dropped.length > 0) {
        summarizeDropped({ dropped, prior: state.summary, model })
          .then(s => setSessionSummary(sessionId, s))
          .catch(() => { /* tolerate */ });
      }
    },
    cancel() {
      ac.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "connection": "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return Response.json({ messages: [] });
  ensureSession(sessionId);
  const { recent } = getMessagesWithinBudget(sessionId);
  return Response.json({ messages: recent });
}
