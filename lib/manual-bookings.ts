import { neon } from "@neondatabase/serverless";
import { CAMERAS, type CameraStatus, type ManualOverrides } from "@/lib/cameras";

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
    const status = value as Partial<CameraStatus>;
    result[dateKey] = {
      nikon: Boolean(status.nikon),
      casio: Boolean(status.casio),
      kodak: Boolean(status.kodak),
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
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.then(() => undefined);

  await ensureTablePromise;
}

export async function readManualOverrides(): Promise<ManualOverrides> {
  if (!sql) return emptyOverrides();

  await ensureTable();
  const db = requireSql();
  const rows = (await db`
    SELECT date_key, nikon, casio, kodak
    FROM manual_bookings
    ORDER BY date_key ASC
  `) as Array<{ date_key: string; nikon: boolean; casio: boolean; kodak: boolean }>;

  const overrides: ManualOverrides = {};
  for (const row of rows) {
    overrides[row.date_key] = {
      nikon: Boolean(row.nikon),
      casio: Boolean(row.casio),
      kodak: Boolean(row.kodak),
    };
  }

  return overrides;
}

export async function writeManualOverrides(overrides: ManualOverrides): Promise<void> {
  if (!sql) {
    throw new Error("DATABASE_URL belum di-set.");
  }

  await ensureTable();
  const db = requireSql();
  await db`DELETE FROM manual_bookings`;

  for (const [dateKey, status] of Object.entries(normalizeOverrides(overrides))) {
    await db`
      INSERT INTO manual_bookings (date_key, nikon, casio, kodak, updated_at)
      VALUES (${dateKey}, ${Boolean(status.nikon)}, ${Boolean(status.casio)}, ${Boolean(status.kodak)}, NOW())
      ON CONFLICT (date_key)
      DO UPDATE SET
        nikon = EXCLUDED.nikon,
        casio = EXCLUDED.casio,
        kodak = EXCLUDED.kodak,
        updated_at = NOW()
    `;
  }
}

export function mergeManualOverrides(
  cameraBookings: Record<string, CameraStatus>,
  overrides: ManualOverrides
): Record<string, CameraStatus> {
  const merged: Record<string, CameraStatus> = {};

  for (const [dateKey, status] of Object.entries(cameraBookings)) {
    merged[dateKey] = { ...status };
  }

  for (const [dateKey, status] of Object.entries(overrides)) {
    if (!merged[dateKey]) {
      merged[dateKey] = { nikon: false, casio: false, kodak: false };
    }

    for (const camera of CAMERAS) {
      const value = status[camera];
      if (typeof value === "boolean") {
        merged[dateKey][camera] = value;
      }
    }
  }

  return merged;
}
