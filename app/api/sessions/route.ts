import { NextRequest } from "next/server";
import { z } from "zod";
import {
  deleteSession,
  ensureSession,
  listSessions,
  renameSession,
} from "@/lib/memory";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;
  return Response.json({ sessions: listSessions() });
}

const Create = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(80).default("untitled"),
});

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;
  const parsed = Create.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const session = ensureSession(parsed.data.id, parsed.data.title);
  renameSession(session.id, parsed.data.title);
  return Response.json({ session });
}

const Patch = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(80),
});

export async function PATCH(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;
  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  renameSession(parsed.data.id, parsed.data.title);
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  deleteSession(id);
  return Response.json({ ok: true });
}
