import { NextResponse } from "next/server";
import { mergeManualOverrides, readManualOverrides } from "@/lib/manual-bookings";

const CAMERAS = ["nikon", "casio", "kodak"] as const;

type CameraName = (typeof CAMERAS)[number];
type DayCameraStatus = Record<CameraName, boolean>;
type CameraBookings = Record<string, DayCameraStatus>;

type BookingPayload =
  | string[]
  | {
      error?: string;
      bookedDates?: string[];
      dates?: string[];
      cameraBookings?: Record<string, Partial<Record<CameraName, boolean>>>;
      data?: Array<Record<string, unknown>>;
      rows?: Array<Record<string, unknown>>;
    };

export const runtime = "nodejs";

function normalizeDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return trimmed;

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, "0");
    const month = slashMatch[2].padStart(2, "0");
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function emptyCameraStatus(): DayCameraStatus {
  return { nikon: false, casio: false, kodak: false };
}

function normalizeCamera(value: string): CameraName | null {
  const lower = value.trim().toLowerCase();
  if (!lower) return null;
  if (lower.includes("nikon")) return "nikon";
  if (lower.includes("casio")) return "casio";
  if (lower.includes("kodak")) return "kodak";
  return null;
}

function normalizeFieldName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "");
}

function getRowValue(row: Record<string, unknown>, aliases: string[]): string {
  const normalizedAliases = aliases.map((a) => normalizeFieldName(a));
  for (const [rawKey, rawValue] of Object.entries(row)) {
    const key = normalizeFieldName(rawKey);
    if (normalizedAliases.some((alias) => key === alias || key.includes(alias) || alias.includes(key))) {
      return String(rawValue ?? "").trim();
    }
  }
  return "";
}

function parseDateTime(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // MM/DD/YYYY HH:MM:SS
  const dateTimeMatch = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (dateTimeMatch) {
    const month = Number(dateTimeMatch[1]);
    const day = Number(dateTimeMatch[2]);
    const year = Number(dateTimeMatch[3]);
    const hour = Number(dateTimeMatch[4] ?? 0);
    const minute = Number(dateTimeMatch[5] ?? 0);
    const second = Number(dateTimeMatch[6] ?? 0);

    const parsed = new Date(year, month - 1, day, hour, minute, second);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const fallback = new Date(trimmed);
  if (Number.isNaN(fallback.getTime())) return null;
  return fallback;
}

function parseDurationHours(value: string): number | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  const match = trimmed.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const hours = Number(match[1]);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return hours;
}

function isAllowedPaymentStatus(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.includes("batal")) return false;
  if (normalized.includes("belum")) return false;
  if (normalized === "-" || normalized === "kosong") return false;
  if (normalized.includes("lunas")) return true;
  if (normalized.includes("dp")) return true;
  return normalized.includes("bayar");
}

function toDateKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function markBookingRange(
  result: CameraBookings,
  startDate: Date,
  durationHours: number,
  camera: CameraName | null
) {
  const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const lastDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  while (cursor.getTime() <= lastDay.getTime()) {
    const dateKey = toDateKeyFromDate(cursor);
    if (!result[dateKey]) result[dateKey] = emptyCameraStatus();

    if (!camera) {
      result[dateKey] = { nikon: true, casio: true, kodak: true };
    } else {
      result[dateKey][camera] = true;
    }

    cursor.setDate(cursor.getDate() + 1);
  }
}

function isBookedStatus(status: string): boolean {
  const value = status.trim().toLowerCase();
  return value === "booked" || value === "dibooking" || value === "terbooking";
}

function extractCameraBookings(payload: BookingPayload): CameraBookings {
  const result: CameraBookings = {};

  if (Array.isArray(payload)) {
    payload.forEach((dateRaw) => {
      const date = normalizeDate(dateRaw);
      if (!date) return;
      result[date] = { nikon: true, casio: true, kodak: true };
    });
    return result;
  }

  if (payload.cameraBookings) {
    for (const [dateRaw, statusMap] of Object.entries(payload.cameraBookings)) {
      const date = normalizeDate(dateRaw);
      if (!date) continue;
      result[date] = {
        nikon: Boolean(statusMap.nikon),
        casio: Boolean(statusMap.casio),
        kodak: Boolean(statusMap.kodak),
      };
    }
  }

  if (payload.bookedDates && Array.isArray(payload.bookedDates)) {
    payload.bookedDates.forEach((dateRaw) => {
      const date = normalizeDate(dateRaw);
      if (!date) return;
      result[date] = { nikon: true, casio: true, kodak: true };
    });
  }

  if (payload.dates && Array.isArray(payload.dates)) {
    payload.dates.forEach((dateRaw) => {
      const date = normalizeDate(dateRaw);
      if (!date) return;
      result[date] = { nikon: true, casio: true, kodak: true };
    });
  }

  const rows = payload.data ?? payload.rows ?? [];

  rows.forEach((row) => {
    // Backward-compatible keys
    const basicDate = getRowValue(row, ["date", "tanggal", "tanggal sewa"]);
    const basicStatus = getRowValue(row, ["status"]);
    const basicCamera = getRowValue(row, ["camera", "kamera"]);

    // Sheet keys used by user
    const rentDateTime = getRowValue(row, ["tanggal & jam sewa", "tanggal dan jam sewa"]);
    const durationRaw = getRowValue(row, ["durasi"]);
    const cameraRaw = basicCamera || getRowValue(row, ["kamera"]);
    const paymentStatus = getRowValue(row, ["status pembayaran", "payment status", "status"]);

    if (!isAllowedPaymentStatus(paymentStatus)) return;

    // If duration + date-time exists, derive date range booking from start -> end
    if (rentDateTime && durationRaw) {
      const start = parseDateTime(rentDateTime);
      const hours = parseDurationHours(durationRaw);
      const camera = normalizeCamera(cameraRaw);
      if (start && hours) {
        markBookingRange(result, start, hours, camera);
        return;
      }
    }

    // Fallback existing behavior: mark single day when status says booked
    const date = normalizeDate(basicDate);
    if (!date) return;
    if (!isBookedStatus(basicStatus)) return;

    const camera = normalizeCamera(cameraRaw);
    if (!result[date]) result[date] = emptyCameraStatus();
    if (!camera) {
      result[date] = { nikon: true, casio: true, kodak: true };
      return;
    }
    result[date][camera] = true;
  });

  return result;
}

export async function GET() {
  const sheetUrl = process.env.GOOGLE_SHEETS_WEBAPP_URL;

  if (!sheetUrl) {
    return NextResponse.json(
      {
        error:
          "GOOGLE_SHEETS_WEBAPP_URL belum di-set. Isi dengan URL Web App Google Apps Script.",
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(sheetUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      return NextResponse.json(
        {
          error: "Gagal mengambil data booking dari Google Sheet.",
          debug: { status: response.status, body: body.slice(0, 500) },
        },
        { status: 502 }
      );
    }

    const rawText = await response.text();
    let json: BookingPayload;
    try {
      json = JSON.parse(rawText) as BookingPayload;
    } catch {
      return NextResponse.json(
        {
          error: "Response Google Apps Script bukan JSON valid.",
          debug: { sample: rawText.slice(0, 500) },
        },
        { status: 502 }
      );
    }
    const cameraBookings = extractCameraBookings(json);
    const manualOverrides = await readManualOverrides();
    const mergedBookings = mergeManualOverrides(cameraBookings, manualOverrides);
    const bookedDates = Object.keys(mergedBookings).sort();
    const rows = Array.isArray(json)
      ? []
      : ((json.data ?? json.rows ?? []) as Array<Record<string, unknown>>);
    const payloadKeys = Array.isArray(json) ? [] : Object.keys(json);

    return NextResponse.json({
      cameraBookings: mergedBookings,
      bookedDates,
      cameras: CAMERAS,
      debug: {
        scriptError: Array.isArray(json) ? null : (json.error ?? null),
        payloadKeys,
        rowsCount: rows.length,
        sampleKeys: rows[0] ? Object.keys(rows[0]) : [],
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membaca data booking." },
      { status: 500 }
    );
  }
}



