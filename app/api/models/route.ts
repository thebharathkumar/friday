import { listModels, DEFAULT_MODEL } from "@/lib/ollama";

export const runtime = "nodejs";

export async function GET() {
  const models = await listModels();
  return Response.json({ models, default: DEFAULT_MODEL });
}
