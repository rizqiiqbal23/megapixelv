import { NextResponse } from "next/server";

import { readPromoCampaigns } from "@/lib/promo-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await readPromoCampaigns();
    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membaca promo." },
      { status: 500 }
    );
  }
}
