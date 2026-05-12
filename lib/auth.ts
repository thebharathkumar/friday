import { NextRequest } from "next/server";

const TOKEN = process.env.NOX_AUTH_TOKEN ?? "";

interface AuthResult {
  ok: boolean;
  response: Response;
}

const OK: AuthResult = { ok: true, response: new Response() };

export function requireAuth(req: NextRequest): AuthResult {
  if (!TOKEN) return OK;
  const header = req.headers.get("authorization") ?? "";
  const sent = header.startsWith("Bearer ") ? header.slice(7) : "";
  const cookie = req.cookies.get("nox_token")?.value ?? "";
  if (sent === TOKEN || cookie === TOKEN) return OK;
  return {
    ok: false,
    response: new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    }),
  };
}

export function authEnabled(): boolean {
  return TOKEN.length > 0;
}
