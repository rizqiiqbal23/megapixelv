import { neon } from "@neondatabase/serverless";
import {
  CAMERAS,
  type CameraStatus,
  type CalendarDayStatus,
  type ManualOverrides,
} from "@/lib/cameras";

export type { CameraStatus, ManualOverrides };

const DATABASE_URL = process.env.DATABASE_URL;
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;
let ensureTablePromise: Promise<void> | null = null;

function requireSql() {
  if (!sql) {
    throw new Error("DATABASE_URL belum di-set.");
  }

  return sql;
}

function emptyOverrides(): ManualOverrides {
  return {};
}

function normalizeOverrides(input: unknown): ManualOverrides {
  if (!input || typeof input !== "object" || Array.isArray(input)) return emptyOverrides();

  const result: ManualOverrides = {};
  for (const [dateKey, value] of Object.entries(input as Record<string, unknown>)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const status = value as Partial<CameraStatus> & { isHoliday?: unknown };
    const isHoliday = Boolean(status.isHoliday);
    result[dateKey] = {
      nikon: isHoliday ? false : Boolean(status.nikon),
      casio: isHoliday ? false : Boolean(status.casio),
      kodak: isHoliday ? false : Boolean(status.kodak),
      isHoliday,
    };
  }

  return result;
}

async function ensureTable(): Promise<void> {
  const db = requireSql();
  ensureTablePromise ??= db`
    CREATE TABLE IF NOT EXISTS manual_bookings (
      date_key TEXT PRIMARY KEY,
      nikon BOOLEAN NOT NULL DEFAULT FALSE,
      casio BOOLEAN NOT NULL DEFAULT FALSE,
      kodak BOOLEAN NOT NULL DEFAULT FALSE,
      is_holiday BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
    .then(async () => {
      await db`ALTER TABLE manual_bookings ADD COLUMN IF NOT EXISTS is_holiday BOOLEAN NOT NULL DEFAULT FALSE`;
    })
    .then(() => undefined);

  await ensureTablePromise;
}

export async function readManualOverrides(): Promise<ManualOverrides> {
  if (!sql) return emptyOverrides();

  await ensureTable();
  const db = requireSql();
  const rows = (await db`
    SELECT date_key, nikon, casio, kodak, is_holiday
    FROM manual_bookings
    ORDER BY date_key ASC
  `) as Array<{ date_key: string; nikon: boolean; casio: boolean; kodak: boolean; is_holiday: boolean }>;

  const overrides: ManualOverrides = {};
  for (const row of rows) {
    overrides[row.date_key] = {
      nikon: Boolean(row.nikon),
      casio: Boolean(row.casio),
      kodak: Boolean(row.kodak),
      isHoliday: Boolean(row.is_holiday),
    };
  }

  return overrides;
}

export async function readManualOverridesLastUpdatedAt(): Promise<string | null> {
  if (!sql) return null;

  await ensureTable();
  const db = requireSql();
  const rows = (await db`
    SELECT MAX(updated_at) AS latest_updated_at
    FROM manual_bookings
  `) as Array<{ latest_updated_at: string | null }>;

  const value = rows[0]?.latest_updated_at;
  return value || null;
}

export async function writeManualOverrides(overrides: ManualOverrides): Promise<void> {
  if (!sql) {
    throw new Error("DATABASE_URL belum di-set.");
  }

  await ensureTable();
  const db = requireSql();
  await db`DELETE FROM manual_bookings`;

  for (const [dateKey, status] of Object.entries(normalizeOverrides(overrides))) {
    const isHoliday = Boolean(status.isHoliday);
    await db`
      INSERT INTO manual_bookings (date_key, nikon, casio, kodak, is_holiday, updated_at)
      VALUES (${dateKey}, ${isHoliday ? false : Boolean(status.nikon)}, ${isHoliday ? false : Boolean(status.casio)}, ${isHoliday ? false : Boolean(status.kodak)}, ${isHoliday}, NOW())
      ON CONFLICT (date_key)
      DO UPDATE SET
        nikon = EXCLUDED.nikon,
        casio = EXCLUDED.casio,
        kodak = EXCLUDED.kodak,
        is_holiday = EXCLUDED.is_holiday,
        updated_at = NOW()
    `;
  }
}

export function mergeManualOverrides(
  cameraBookings: Record<string, CameraStatus>,
  overrides: ManualOverrides
): Record<string, CalendarDayStatus> {
  const merged: Record<string, CalendarDayStatus> = {};

  for (const [dateKey, status] of Object.entries(cameraBookings)) {
    merged[dateKey] = { ...status, isHoliday: false };
  }

  for (const [dateKey, status] of Object.entries(overrides)) {
    if (!merged[dateKey]) {
      merged[dateKey] = { nikon: false, casio: false, kodak: false, isHoliday: false };
    }

    merged[dateKey].isHoliday = Boolean(status.isHoliday);
    for (const camera of CAMERAS) {
      const value = status[camera];
      if (typeof value === "boolean") {
        merged[dateKey][camera] = value;
      }
    }

    if (status.isHoliday) {
      merged[dateKey].nikon = false;
      merged[dateKey].casio = false;
      merged[dateKey].kodak = false;
    }
  }

  return merged;
}
