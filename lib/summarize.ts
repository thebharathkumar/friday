import type { ChatMessage } from "./types";
import { generateOnce, type ChatTurn } from "./ollama";

const SUMMARIZER_SYSTEM = `You compress conversation history for an AI assistant's working memory. Output 5 to 10 dense bullet points capturing: the user's goals, decisions reached, open threads, and any facts about the user that recurred. No preamble. No closing remarks. Bullets only.`;

export async function summarizeDropped(args: {
  dropped: ChatMessage[];
  prior: string;
  model?: string;
}): Promise<string> {
  if (args.dropped.length === 0) return args.prior;
  const transcript = args.dropped
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");
  const turns: ChatTurn[] = [
    { role: "system", content: SUMMARIZER_SYSTEM },
    {
      role: "user",
      content:
        (args.prior ? `Existing summary:\n${args.prior}\n\nNew transcript to fold in:\n` : "") +
        transcript,
    },
  ];
  try {
    return (await generateOnce({ model: args.model, messages: turns, temperature: 0.2 })).trim();
  } catch {
    return args.prior;
  }
}
