import { NextRequest, NextResponse } from "next/server";

import { consumePromoForDate } from "@/lib/promo-store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: { dateKey?: string } = {};
  try {
    body = (await request.json()) as { dateKey?: string };
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const dateKey = typeof body.dateKey === "string" ? body.dateKey.trim() : "";
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return NextResponse.json({ error: "dateKey wajib diisi." }, { status: 400 });
  }

  try {
    const promo = await consumePromoForDate(dateKey);
    if (!promo) {
      return NextResponse.json({
        promoApplied: false,
        promoCode: null,
        quotaRemaining: null,
        dateKey,
      });
    }

    return NextResponse.json({
      promoApplied: true,
      promoCode: promo.promoCode,
      quotaRemaining: promo.quotaRemaining,
      quotaTotal: promo.quotaTotal,
      dateKey,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memproses promo." },
      { status: 500 }
    );
  }
}
