import { NextRequest } from "next/server";
import { z } from "zod";
import { appendMessage, ensureSession, getMessages, listFacts } from "@/lib/memory";
import { detectMode } from "@/lib/modes";
import { buildSystemPrompt } from "@/lib/nox-prompt";
import { streamChat, type ChatTurn } from "@/lib/ollama";
import type { Mode } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
  priorMode: z.enum([
    "standard", "deep_work", "war_room", "recovery",
    "tactical", "workshop", "counsel", "crisis",
  ]).default("standard"),
  model: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const { sessionId, message, priorMode, model } = parsed.data;

  ensureSession(sessionId);
  const mode: Mode = detectMode({ text: message, hour: new Date().getHours() }, priorMode);
  appendMessage({ sessionId, role: "user", content: message, mode });

  const facts = listFacts();
  const history = getMessages(sessionId, 30);
  const turns: ChatTurn[] = [
    {
      role: "system",
      content: buildSystemPrompt({
        mode,
        facts: facts.map(f => ({ key: f.key, value: f.value })),
        now: new Date(),
      }),
    },
    ...history.map(m => ({
      role: m.role === "system" ? "system" : (m.role as "user" | "assistant"),
      content: m.content,
    })),
  ];

  const encoder = new TextEncoder();
  let collected = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (type: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`),
        );
      };
      send("mode", mode);
      try {
        for await (const chunk of streamChat({ model, messages: turns })) {
          collected += chunk;
          send("token", chunk);
        }
        appendMessage({ sessionId, role: "assistant", content: collected, mode });
        send("done", { mode });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown error";
        send("error", msg);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "connection": "keep-alive",
    },
  });
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return Response.json({ messages: [] });
  ensureSession(sessionId);
  return Response.json({ messages: getMessages(sessionId, 200) });
}
