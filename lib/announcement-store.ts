import { neon } from "@neondatabase/serverless";

import {
  DEFAULT_ANNOUNCEMENT_ID,
  DEFAULT_ANNOUNCEMENT_SPEED_SECONDS,
  normalizeAnnouncementInput,
  type AnnouncementInput,
  type AnnouncementRecord,
} from "@/lib/announcement-data";

const DATABASE_URL = process.env.DATABASE_URL;
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;
let ensureTablePromise: Promise<void> | null = null;

type AnnouncementRow = {
  id: string;
  text: string;
  is_active: boolean;
  speed_seconds: number | null;
  created_at: string;
  updated_at: string;
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
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT FALSE,
      speed_seconds INTEGER NOT NULL DEFAULT 15,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
    .then(async () => {
      await db`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS speed_seconds INTEGER NOT NULL DEFAULT 15`;
    })
    .then(() => undefined);

  await ensureTablePromise;
}

function toAnnouncement(row: AnnouncementRow): AnnouncementRecord {
  return {
    id: row.id,
    text: row.text || "",
    isActive: Boolean(row.is_active),
    speedSeconds: Number.isFinite(Number(row.speed_seconds))
      ? Math.max(4, Math.floor(Number(row.speed_seconds)))
      : DEFAULT_ANNOUNCEMENT_SPEED_SECONDS,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function readAnnouncement(): Promise<AnnouncementRecord | null> {
  if (!sql) return null;

  await ensureTable();
  const db = requireSql();
  const rows = (await db`
    SELECT id, text, is_active, speed_seconds, created_at, updated_at
    FROM announcements
    WHERE id = ${DEFAULT_ANNOUNCEMENT_ID}
    LIMIT 1
  `) as AnnouncementRow[];

  const row = rows[0];
  return row ? toAnnouncement(row) : null;
}

export async function readActiveAnnouncement(): Promise<AnnouncementRecord | null> {
  const row = await readAnnouncement();
  if (!row || !row.isActive || !row.text.trim()) return null;
  return row;
}

export async function upsertAnnouncement(input: AnnouncementInput): Promise<AnnouncementRecord> {
  if (!sql) {
    throw new Error("DATABASE_URL belum di-set.");
  }

  const normalized = normalizeAnnouncementInput(input);
  if (!normalized) {
    throw new Error("Data announcement tidak valid.");
  }

  await ensureTable();
  const db = requireSql();
  const existingRows = (await db`
    SELECT id, text, is_active, speed_seconds, created_at, updated_at
    FROM announcements
    WHERE id = ${DEFAULT_ANNOUNCEMENT_ID}
    LIMIT 1
  `) as AnnouncementRow[];

  const existing = existingRows[0];
  if (existing) {
    const updatedRows = (await db`
      UPDATE announcements
      SET text = ${normalized.text},
          is_active = ${normalized.isActive},
          speed_seconds = ${DEFAULT_ANNOUNCEMENT_SPEED_SECONDS},
          updated_at = NOW()
      WHERE id = ${DEFAULT_ANNOUNCEMENT_ID}
      RETURNING id, text, is_active, speed_seconds, created_at, updated_at
    `) as AnnouncementRow[];

    return toAnnouncement(updatedRows[0]);
  }

  const insertedRows = (await db`
    INSERT INTO announcements (
      id,
      text,
      is_active,
      speed_seconds,
      created_at,
      updated_at
    )
    VALUES (
      ${DEFAULT_ANNOUNCEMENT_ID},
      ${normalized.text},
      ${normalized.isActive},
      ${DEFAULT_ANNOUNCEMENT_SPEED_SECONDS},
      NOW(),
      NOW()
    )
    RETURNING id, text, is_active, speed_seconds, created_at, updated_at
  `) as AnnouncementRow[];

  return toAnnouncement(insertedRows[0]);
}
