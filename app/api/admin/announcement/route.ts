import { NextRequest, NextResponse } from "next/server";

import { getSessionCookieName, verifySessionToken } from "@/lib/admin-auth";
import { normalizeAnnouncementInput } from "@/lib/announcement-data";
import { readAnnouncement, upsertAnnouncement } from "@/lib/announcement-store";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function isAuthorized(request: NextRequest): boolean {
  const token = request.cookies.get(getSessionCookieName())?.value;
  return token ? verifySessionToken(token) : false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  try {
    const announcement = await readAnnouncement();
    return NextResponse.json({ announcement });
  } catch {
    return NextResponse.json({ error: "Gagal membaca announcement." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const input = normalizeAnnouncementInput(body);
  if (!input) {
    return NextResponse.json({ error: "Data announcement tidak valid." }, { status: 400 });
  }

  try {
    const announcement = await upsertAnnouncement(input);
    return NextResponse.json({ ok: true, announcement });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan announcement." },
      { status: 500 }
    );
  }
}
