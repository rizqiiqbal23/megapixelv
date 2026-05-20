import { NextRequest, NextResponse } from "next/server";

import { getSessionCookieName, verifySessionToken } from "@/lib/admin-auth";
import { normalizePromoCampaignInput } from "@/lib/promo-data";
import {
  deletePromoCampaign,
  readPromoCampaigns,
  updatePromoCampaign,
  upsertPromoCampaign,
} from "@/lib/promo-store";

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
    const rows = await readPromoCampaigns();
    return NextResponse.json({ rows });
  } catch {
    return NextResponse.json({ error: "Gagal membaca promo." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const input = normalizePromoCampaignInput(body);
  if (!input) {
    return NextResponse.json({ error: "Data promo tidak valid." }, { status: 400 });
  }

  try {
    const row = await upsertPromoCampaign(input);
    return NextResponse.json({ ok: true, row });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan promo." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  let body: { id?: string; dateKey?: string; quotaTotal?: number; notes?: string; active?: boolean; resetRemaining?: boolean } = {};
  try {
    body = (await request.json()) as { id?: string; dateKey?: string; quotaTotal?: number; notes?: string; active?: boolean; resetRemaining?: boolean };
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  try {
    const row = await updatePromoCampaign(body.id, body);
    if (!row) {
      return NextResponse.json({ error: "Promo tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, row });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui promo." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  let body: { id?: string } = {};
  try {
    body = (await request.json()) as { id?: string };
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  try {
    await deletePromoCampaign(body.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus promo." },
      { status: 500 }
    );
  }
}
