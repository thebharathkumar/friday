import { Ollama } from "ollama";

const HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
export const DEFAULT_MODEL = process.env.NOX_MODEL ?? "llama3.1:8b";

declare global {
  // eslint-disable-next-line no-var
  var __nox_ollama: Ollama | undefined;
}

function getClient(): Ollama {
  if (!globalThis.__nox_ollama) {
    globalThis.__nox_ollama = new Ollama({ host: HOST });
  }
  return globalThis.__nox_ollama;
}

export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function* streamChat(args: {
  model?: string;
  messages: ChatTurn[];
  temperature?: number;
  signal?: AbortSignal;
}): AsyncGenerator<string, void, void> {
  const ollama = getClient();
  const stream = await ollama.chat({
    model: args.model ?? DEFAULT_MODEL,
    messages: args.messages,
    stream: true,
    options: {
      temperature: args.temperature ?? 0.6,
    },
  });

  const onAbort = () => {
    try { stream.abort(); } catch { /* noop */ }
  };
  if (args.signal) {
    if (args.signal.aborted) onAbort();
    else args.signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    for await (const part of stream) {
      if (part.message?.content) yield part.message.content;
      if (part.done) break;
    }
  } finally {
    args.signal?.removeEventListener("abort", onAbort);
  }
}

export async function generateOnce(args: {
  model?: string;
  messages: ChatTurn[];
  temperature?: number;
}): Promise<string> {
  const ollama = getClient();
  const res = await ollama.chat({
    model: args.model ?? DEFAULT_MODEL,
    messages: args.messages,
    stream: false,
    options: { temperature: args.temperature ?? 0.3 },
  });
  return res.message?.content ?? "";
}

export async function listModels(): Promise<string[]> {
  try {
    const ollama = getClient();
    const res = await ollama.list();
    return res.models.map(m => m.name);
  } catch {
    return [];
  }
}
