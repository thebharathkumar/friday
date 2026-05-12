import { NextRequest } from "next/server";
import { z } from "zod";
import { authEnabled } from "@/lib/auth";

export const runtime = "nodejs";

const Body = z.object({ token: z.string().min(1).max(256) });

export async function GET() {
  return Response.json({ required: authEnabled() });
}

export async function POST(req: NextRequest) {
  if (!authEnabled()) {
    return Response.json({ ok: true, required: false });
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "token required" }, { status: 400 });
  }
  const expected = process.env.NOX_AUTH_TOKEN ?? "";
  if (parsed.data.token !== expected) {
    return Response.json({ error: "invalid token" }, { status: 401 });
  }
  const res = Response.json({ ok: true });
  res.headers.set(
    "set-cookie",
    `nox_token=${expected}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`,
  );
  return res;
}
