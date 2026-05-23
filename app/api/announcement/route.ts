import { NextResponse } from "next/server";

import { readActiveAnnouncement } from "@/lib/announcement-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const announcement = await readActiveAnnouncement();
    return NextResponse.json({ announcement });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Gagal memuat announcement.",
      },
      { status: 500 }
    );
  }
}
