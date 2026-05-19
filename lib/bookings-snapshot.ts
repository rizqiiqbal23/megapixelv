import { neon } from "@neondatabase/serverless";
import { type CameraStatus } from "@/lib/cameras";

type CameraBookings = Record<string, CameraStatus>;

const DATABASE_URL = process.env.DATABASE_URL;
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;
let ensureTablePromise: Promise<void> | null = null;

type SnapshotRow = {
  id: string;
  camera_bookings_json: string;
  booked_dates_json: string;
  last_synced_at: string;
};

export type BookingsSnapshot = {
  cameraBookings: CameraBookings;
  bookedDates: string[];
  lastSyncedAt: string;
};

function requireSql() {
  if (!sql) {
    throw new Error("DATABASE_URL belum di-set.");
  }

  return sql;
}

async function ensureTable(): Promise<void> {
  const db = requireSql();
  ensureTablePromise ??= db`
    CREATE TABLE IF NOT EXISTS bookings_snapshot (
      id TEXT PRIMARY KEY,
      camera_bookings_json TEXT NOT NULL,
      booked_dates_json TEXT NOT NULL,
      last_synced_at TIMESTAMPTZ NOT NULL
    )
  `.then(() => undefined);

  await ensureTablePromise;
}

export async function readBookingsSnapshot(): Promise<BookingsSnapshot | null> {
  if (!sql) return null;

  await ensureTable();
  const db = requireSql();
  const rows = (await db`
    SELECT id, camera_bookings_json, booked_dates_json, last_synced_at
    FROM bookings_snapshot
    WHERE id = 'default'
    LIMIT 1
  `) as SnapshotRow[];

  const row = rows[0];
  if (!row) return null;

  try {
    return {
      cameraBookings: JSON.parse(row.camera_bookings_json) as CameraBookings,
      bookedDates: JSON.parse(row.booked_dates_json) as string[],
      lastSyncedAt: row.last_synced_at,
    };
  } catch {
    return null;
  }
}

export async function writeBookingsSnapshot(snapshot: BookingsSnapshot): Promise<void> {
  if (!sql) {
    throw new Error("DATABASE_URL belum di-set.");
  }

  await ensureTable();
  const db = requireSql();
  await db`
    INSERT INTO bookings_snapshot (
      id,
      camera_bookings_json,
      booked_dates_json,
      last_synced_at
    )
    VALUES ('default', ${JSON.stringify(snapshot.cameraBookings)}, ${JSON.stringify(snapshot.bookedDates)}, ${snapshot.lastSyncedAt})
    ON CONFLICT (id)
    DO UPDATE SET
      camera_bookings_json = EXCLUDED.camera_bookings_json,
      booked_dates_json = EXCLUDED.booked_dates_json,
      last_synced_at = EXCLUDED.last_synced_at
  `;
}

export function isBookingsSnapshotStale(lastSyncedAt: string | null | undefined): boolean {
  if (!lastSyncedAt) return true;
  const parsed = new Date(lastSyncedAt);
  if (Number.isNaN(parsed.getTime())) return true;
  return Date.now() - parsed.getTime() > 3 * 60 * 60 * 1000;
}
