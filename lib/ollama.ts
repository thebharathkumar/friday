import { Ollama } from "ollama";

const HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
export const DEFAULT_MODEL = process.env.NOX_MODEL ?? "llama3.1:8b";

let client: Ollama | null = null;
function getClient(): Ollama {
  if (!client) client = new Ollama({ host: HOST });
  return client;
}

export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function* streamChat(args: {
  model?: string;
  messages: ChatTurn[];
  temperature?: number;
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

  for await (const part of stream) {
    if (part.message?.content) yield part.message.content;
    if (part.done) break;
  }
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
