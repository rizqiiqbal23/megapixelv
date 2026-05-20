import { NextRequest, NextResponse } from "next/server";

import { getSessionCookieName, verifySessionToken } from "@/lib/admin-auth";
import { normalizePricelistRows, type PricelistRow } from "@/lib/pricelist-data";
import { readPricelistRows, writePricelistRows } from "@/lib/pricelist-store";

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
    const pricelist = await readPricelistRows();
    return NextResponse.json(pricelist);
  } catch {
    return NextResponse.json({ error: "Gagal membaca pricelist." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  let body: { rows?: PricelistRow[] } = {};
  try {
    body = (await request.json()) as { rows?: PricelistRow[] };
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  if (!body.rows) {
    return NextResponse.json({ error: "rows wajib diisi." }, { status: 400 });
  }

  try {
    const rows = normalizePricelistRows(body.rows);
    await writePricelistRows(rows);
    return NextResponse.json({ ok: true, rows });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan pricelist di server." }, { status: 500 });
  }
}
