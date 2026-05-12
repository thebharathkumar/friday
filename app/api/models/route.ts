import { NextRequest } from "next/server";
import { listModels, DEFAULT_MODEL } from "@/lib/ollama";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;
  const models = await listModels();
  return Response.json({ models, default: DEFAULT_MODEL });
}
