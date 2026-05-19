import { NextRequest, NextResponse } from "next/server";
import {
  getSessionCookieName,
  verifySessionToken,
} from "@/lib/admin-auth";
import { readManualOverrides, writeManualOverrides, type CameraStatus } from "@/lib/manual-bookings";

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
    const overrides = await readManualOverrides();
    return NextResponse.json({ overrides });
  } catch {
    return NextResponse.json({ error: "Gagal membaca override." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  let body: { dateKey?: string; status?: CameraStatus; remove?: boolean } = {};
  try {
    body = (await request.json()) as { dateKey?: string; status?: CameraStatus; remove?: boolean };
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  if (!body.dateKey) {
    return NextResponse.json({ error: "dateKey wajib diisi." }, { status: 400 });
  }

  try {
    const overrides = await readManualOverrides();

    if (body.remove) {
      delete overrides[body.dateKey];
    } else if (body.status) {
      overrides[body.dateKey] = {
        nikon: Boolean(body.status.nikon),
        casio: Boolean(body.status.casio),
        kodak: Boolean(body.status.kodak),
      };
    } else {
      return NextResponse.json({ error: "status wajib diisi." }, { status: 400 });
    }

    await writeManualOverrides(overrides);
    return NextResponse.json({ ok: true, overrides });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan override di server." }, { status: 500 });
  }
}
