import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "@/lib/admin-auth";
import {
  mergeManualOverrides,
  readManualOverrides,
  readManualOverridesLastUpdatedAt,
} from "@/lib/manual-bookings";
import {
  isBookingsSnapshotStale,
  readBookingsSnapshot,
  writeBookingsSnapshot,
  type BookingsSnapshot,
} from "@/lib/bookings-snapshot";

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

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const FORCED_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;
const REFRESH_WAIT_TIMEOUT_MS = 8 * 1000;

type RateLimitBucket = { count: number; resetAt: number };
const rateLimitBuckets = new Map<string, RateLimitBucket>();
let refreshInFlight: Promise<void> | null = null;
let lastForcedRefreshAt = 0;

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
    const basicDate = getRowValue(row, ["date", "tanggal", "tanggal sewa"]);
    const basicStatus = getRowValue(row, ["status"]);
    const basicCamera = getRowValue(row, ["camera", "kamera"]);

    const rentDateTime = getRowValue(row, ["tanggal & jam sewa", "tanggal dan jam sewa"]);
    const durationRaw = getRowValue(row, ["durasi"]);
    const cameraRaw = basicCamera || getRowValue(row, ["kamera"]);
    const paymentStatus = getRowValue(row, ["status pembayaran", "payment status", "status"]);

    if (!isAllowedPaymentStatus(paymentStatus)) return;

    if (rentDateTime && durationRaw) {
      const start = parseDateTime(rentDateTime);
      const hours = parseDurationHours(durationRaw);
      const camera = normalizeCamera(cameraRaw);
      if (start && hours) {
        markBookingRange(result, start, hours, camera);
        return;
      }
    }

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

async function fetchLatestBookings(sheetUrl: string): Promise<{
  cameraBookings: CameraBookings;
  bookedDates: string[];
  rowsCount: number;
  payloadKeys: string[];
  scriptError: string | null;
  sampleKeys: string[];
}> {
  const response = await fetch(sheetUrl, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      JSON.stringify({
        message: "Gagal mengambil data booking dari Google Sheet.",
        status: response.status,
        body: body.slice(0, 500),
      })
    );
  }

  const rawText = await response.text();
  let json: BookingPayload;
  try {
    json = JSON.parse(rawText) as BookingPayload;
  } catch {
    throw new Error(
      JSON.stringify({
        message: "Response Google Apps Script bukan JSON valid.",
        sample: rawText.slice(0, 500),
      })
    );
  }

  const cameraBookings = extractCameraBookings(json);
  const bookedDates = Object.keys(cameraBookings).sort();
  const rows = Array.isArray(json) ? [] : ((json.data ?? json.rows ?? []) as Array<Record<string, unknown>>);
  const payloadKeys = Array.isArray(json) ? [] : Object.keys(json);

  return {
    cameraBookings,
    bookedDates,
    rowsCount: rows.length,
    payloadKeys,
    scriptError: Array.isArray(json) ? null : (json.error ?? null),
    sampleKeys: rows[0] ? Object.keys(rows[0]) : [],
  };
}

function parseErrorPayload(error: unknown): { message: string; status?: number; body?: string; sample?: string } {
  if (!(error instanceof Error)) {
    return { message: "Terjadi kesalahan saat membaca data booking." };
  }

  try {
    return JSON.parse(error.message) as { message: string; status?: number; body?: string; sample?: string };
  } catch {
    return { message: error.message || "Terjadi kesalahan saat membaca data booking." };
  }
}

async function resolveLastDataUpdatedAt(sheetSyncedAt: string): Promise<string> {
  const overrideUpdatedAt = await readManualOverridesLastUpdatedAt();
  if (!overrideUpdatedAt) return sheetSyncedAt;

  const sheetTime = new Date(sheetSyncedAt).getTime();
  const overrideTime = new Date(overrideUpdatedAt).getTime();
  if (Number.isNaN(sheetTime)) return overrideUpdatedAt;
  if (Number.isNaN(overrideTime)) return sheetSyncedAt;
  return overrideTime > sheetTime ? overrideUpdatedAt : sheetSyncedAt;
}

async function buildResponseFromSnapshot(snapshot: BookingsSnapshot, _fetchedAt: string) {
  const manualOverrides = await readManualOverrides();
  const mergedBookings = mergeManualOverrides(snapshot.cameraBookings, manualOverrides);
  const lastUpdatedAt = await resolveLastDataUpdatedAt(snapshot.lastSyncedAt);

  return NextResponse.json({
    cameraBookings: mergedBookings,
    bookedDates: Object.keys(mergedBookings).sort(),
    cameras: CAMERAS,
    lastUpdatedAt,
    fetchSource: "snapshot",
  });
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = rateLimitBuckets.get(ip);

  if (!current || now >= current.resetAt) {
    rateLimitBuckets.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, retryAfterSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
}

async function waitForInFlightRefresh() {
  if (!refreshInFlight) return;
  await Promise.race([
    refreshInFlight,
    new Promise<void>((resolve) => setTimeout(resolve, REFRESH_WAIT_TIMEOUT_MS)),
  ]);
}

async function refreshSnapshotFromSource(sheetUrl: string, fetchedAt: string, forceRefreshRequested: boolean) {
  const latest = await fetchLatestBookings(sheetUrl);
  const lastUpdatedAt = fetchedAt;
  await writeBookingsSnapshot({
    cameraBookings: latest.cameraBookings,
    bookedDates: latest.bookedDates,
    lastSyncedAt: lastUpdatedAt,
  });
  if (forceRefreshRequested) {
    lastForcedRefreshAt = Date.now();
  }
  return { latest, lastUpdatedAt };
}

export async function GET(request: NextRequest) {
  const fetchedAt = new Date().toISOString();
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Terlalu banyak request. Coba lagi sebentar.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

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

  const refreshRequested = request.nextUrl.searchParams.get("refresh") === "1";
  const metaRequested = request.nextUrl.searchParams.get("meta") === "1";
  const bypassCooldownRequested = request.nextUrl.searchParams.get("nocooldown") === "1";
  const token = request.cookies.get(getSessionCookieName())?.value;
  const isAdmin = token ? verifySessionToken(token) : false;
  const allowBypassCooldown = bypassCooldownRequested && isAdmin;
  const forceRefreshRequested = refreshRequested;

  if (metaRequested) {
    const snapshot = await readBookingsSnapshot();
    const lastUpdatedAt = snapshot ? await resolveLastDataUpdatedAt(snapshot.lastSyncedAt) : null;

    return NextResponse.json({
      lastUpdatedAt,
      fetchSource: snapshot ? "meta-snapshot" : "meta-empty",
      hasSnapshot: Boolean(snapshot),
    });
  }

  if (
    forceRefreshRequested &&
    !allowBypassCooldown &&
    Date.now() - lastForcedRefreshAt < FORCED_REFRESH_COOLDOWN_MS
  ) {
    const snapshot = await readBookingsSnapshot();
    if (snapshot) {
      const response = await buildResponseFromSnapshot(snapshot, fetchedAt);
      response.headers.set("x-refresh-cooldown", "1");
      return response;
    }
  }

  if (refreshInFlight) {
    await waitForInFlightRefresh();
  }

  const snapshot = await readBookingsSnapshot();
  const shouldRefresh = forceRefreshRequested || !snapshot || isBookingsSnapshotStale(snapshot.lastSyncedAt);

  if (!shouldRefresh && snapshot) {
    return buildResponseFromSnapshot(snapshot, fetchedAt);
  }

  try {
    if (refreshInFlight) {
      await waitForInFlightRefresh();
      const latestSnapshot = await readBookingsSnapshot();
      if (latestSnapshot) {
        return buildResponseFromSnapshot(latestSnapshot, fetchedAt);
      }
    }

    let releaseInFlight: () => void = () => {};
    const inFlightMarker = new Promise<void>((resolve) => {
      releaseInFlight = resolve;
    });
    refreshInFlight = inFlightMarker;

    let latestResult: Awaited<ReturnType<typeof refreshSnapshotFromSource>>;
    try {
      latestResult = await refreshSnapshotFromSource(sheetUrl, fetchedAt, forceRefreshRequested);
    } finally {
      releaseInFlight();
      refreshInFlight = null;
    }
    const { latest, lastUpdatedAt: lastSyncedAt } = latestResult;

    const manualOverrides = await readManualOverrides();
    const mergedBookings = mergeManualOverrides(latest.cameraBookings, manualOverrides);
    const lastUpdatedAt = await resolveLastDataUpdatedAt(lastSyncedAt);

    const response = NextResponse.json({
      cameraBookings: mergedBookings,
      bookedDates: Object.keys(mergedBookings).sort(),
      cameras: CAMERAS,
      lastUpdatedAt,
      fetchSource: "sheet",
      debug: {
        scriptError: latest.scriptError,
        payloadKeys: latest.payloadKeys,
        rowsCount: latest.rowsCount,
        sampleKeys: latest.sampleKeys,
        refreshed: true,
      },
    });
    return response;
  } catch (error) {
    refreshInFlight = null;
    const parsed = parseErrorPayload(error);

    if (snapshot) {
      const manualOverrides = await readManualOverrides();
      const mergedBookings = mergeManualOverrides(snapshot.cameraBookings, manualOverrides);
      const lastUpdatedAt = await resolveLastDataUpdatedAt(snapshot.lastSyncedAt);
      return NextResponse.json({
        cameraBookings: mergedBookings,
        bookedDates: Object.keys(mergedBookings).sort(),
        cameras: CAMERAS,
        lastUpdatedAt,
        fetchSource: "snapshot-stale-fallback",
        stale: true,
        error: `${parsed.message} Memakai cache terakhir.`,
        debug: parsed.status
          ? {
              status: parsed.status,
              body: parsed.body,
              sample: parsed.sample,
            }
          : undefined,
      });
    }

    return NextResponse.json(
      {
        error: parsed.message,
        debug: parsed.status
          ? {
              status: parsed.status,
              body: parsed.body,
              sample: parsed.sample,
            }
          : undefined,
      },
      { status: parsed.status && parsed.status >= 400 ? 502 : 500 }
    );
  }
}

export async function HEAD(request: NextRequest) {
  const getResponse = await GET(request);
  return new NextResponse(null, {
    status: getResponse.status,
    headers: getResponse.headers,
  });
}
