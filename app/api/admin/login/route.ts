import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, getSessionCookieName, getSessionCookieOptions, verifyCredentials } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string } = {};

  try {
    body = (await request.json()) as { username?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Body login tidak valid." }, { status: 400 });
  }

  if (!verifyCredentials(body.username || "", body.password || "")) {
    return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieName(), createSessionToken(), getSessionCookieOptions());
  return response;
}
