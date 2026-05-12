import { NextRequest } from "next/server";
import { z } from "zod";
import { deleteFact, listFacts, setFact } from "@/lib/memory";

export const runtime = "nodejs";

const Upsert = z.object({
  key: z.string().min(1).max(64),
  value: z.string().min(1).max(2000),
  category: z.string().min(1).max(32).default("general"),
});

export async function GET() {
  return Response.json({ facts: listFacts() });
}

export async function POST(req: NextRequest) {
  const parsed = Upsert.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const fact = setFact(parsed.data.key, parsed.data.value, parsed.data.category);
  return Response.json({ fact });
}

export async function DELETE(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return Response.json({ error: "key required" }, { status: 400 });
  deleteFact(key);
  return Response.json({ ok: true });
}
