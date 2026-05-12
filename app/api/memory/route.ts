import { NextRequest } from "next/server";
import { z } from "zod";
import { deleteFact, listFacts, setFact } from "@/lib/memory";
import { checkFactSafety } from "@/lib/pii";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

const Upsert = z.object({
  key: z.string().min(1).max(64).regex(/^[A-Za-z0-9_. -]+$/, "alphanumerics, spaces, _ . - only"),
  value: z.string().min(1).max(2000),
  category: z.string().min(1).max(32).default("general"),
  override: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;
  return Response.json({ facts: listFacts() });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;
  const parsed = Upsert.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { key, value, category, override } = parsed.data;
  if (!override) {
    const check = checkFactSafety(value);
    if (!check.ok) return Response.json({ error: "pii_block", reason: check.reason }, { status: 422 });
  }
  const fact = setFact(key, value, category);
  return Response.json({ fact });
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return Response.json({ error: "key required" }, { status: 400 });
  deleteFact(key);
  return Response.json({ ok: true });
}
