import { NextResponse } from "next/server";

import { readPricelistRows } from "@/lib/pricelist-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const pricelist = await readPricelistRows();
    return NextResponse.json(pricelist);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Gagal memuat pricelist.",
      },
      { status: 500 }
    );
  }
}
