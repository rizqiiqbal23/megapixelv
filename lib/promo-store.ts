import { neon } from "@neondatabase/serverless";

import { generatePromoCode, normalizePromoCampaignInput, type PromoCampaign, type PromoCampaignInput } from "@/lib/promo-data";

const DATABASE_URL = process.env.DATABASE_URL;
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;
let ensureTablePromise: Promise<void> | null = null;

type PromoRow = {
  id: string;
  date_key: string;
  promo_code: string;
  quota_total: number;
  quota_remaining: number;
  notes: string;
  active: boolean;
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
    CREATE TABLE IF NOT EXISTS promo_campaigns (
      id TEXT PRIMARY KEY,
      date_key TEXT NOT NULL UNIQUE,
      promo_code TEXT NOT NULL UNIQUE,
      quota_total INTEGER NOT NULL,
      quota_remaining INTEGER NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.then(() => undefined);

  await ensureTablePromise;
}

function toCampaign(row: PromoRow): PromoCampaign {
  return {
    id: row.id,
    dateKey: row.date_key,
    promoCode: row.promo_code,
    quotaTotal: Number(row.quota_total),
    quotaRemaining: Number(row.quota_remaining),
    notes: row.notes || "",
    active: Boolean(row.active),
    updatedAt: row.updated_at,
  };
}

function makeId(dateKey: string): string {
  return `promo_${dateKey.replaceAll("-", "")}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function readPromoCampaigns(): Promise<PromoCampaign[]> {
  if (!sql) return [];

  await ensureTable();
  const db = requireSql();
  const rows = (await db`
    SELECT id, date_key, promo_code, quota_total, quota_remaining, notes, active, updated_at
    FROM promo_campaigns
    ORDER BY date_key ASC
  `) as PromoRow[];

  return rows.map(toCampaign);
}

export async function upsertPromoCampaign(input: PromoCampaignInput): Promise<PromoCampaign> {
  if (!sql) {
    throw new Error("DATABASE_URL belum di-set.");
  }

  const normalized = normalizePromoCampaignInput(input);
  if (!normalized) {
    throw new Error("Data promo tidak valid.");
  }

  await ensureTable();
  const db = requireSql();

  const existingRows = (await db`
    SELECT id, date_key, promo_code, quota_total, quota_remaining, notes, active, updated_at
    FROM promo_campaigns
    WHERE date_key = ${normalized.dateKey}
    LIMIT 1
  `) as PromoRow[];

  const existing = existingRows[0];
  if (existing) {
    const nextQuotaTotal = normalized.quotaTotal;
    const nextQuotaRemaining = Math.min(Number(existing.quota_remaining), nextQuotaTotal);
    const updatedRows = (await db`
      UPDATE promo_campaigns
      SET quota_total = ${nextQuotaTotal},
          quota_remaining = ${nextQuotaRemaining},
          notes = ${normalized.notes || ""},
          active = ${normalized.active ?? true},
          updated_at = NOW()
      WHERE id = ${existing.id}
      RETURNING id, date_key, promo_code, quota_total, quota_remaining, notes, active, updated_at
    `) as PromoRow[];

    return toCampaign(updatedRows[0]);
  }

  const promoCode = generatePromoCode(normalized.dateKey);
  const id = makeId(normalized.dateKey);
  const insertedRows = (await db`
    INSERT INTO promo_campaigns (
      id,
      date_key,
      promo_code,
      quota_total,
      quota_remaining,
      notes,
      active,
      updated_at
    )
    VALUES (
      ${id},
      ${normalized.dateKey},
      ${promoCode},
      ${normalized.quotaTotal},
      ${normalized.quotaTotal},
      ${normalized.notes || ""},
      ${normalized.active ?? true},
      NOW()
    )
    RETURNING id, date_key, promo_code, quota_total, quota_remaining, notes, active, updated_at
  `) as PromoRow[];

  return toCampaign(insertedRows[0]);
}

export async function updatePromoCampaign(
  id: string,
  patch: Partial<PromoCampaignInput> & { promoCode?: string; resetRemaining?: boolean }
): Promise<PromoCampaign | null> {
  if (!sql) {
    throw new Error("DATABASE_URL belum di-set.");
  }

  if (!id) return null;
  await ensureTable();
  const db = requireSql();

  const existingRows = (await db`
    SELECT id, date_key, promo_code, quota_total, quota_remaining, notes, active, updated_at
    FROM promo_campaigns
    WHERE id = ${id}
    LIMIT 1
  `) as PromoRow[];
  const existing = existingRows[0];
  if (!existing) return null;

  const nextDateKey = typeof patch.dateKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(patch.dateKey) ? patch.dateKey : existing.date_key;
  const nextQuotaTotal = typeof patch.quotaTotal === "number" && Number.isFinite(patch.quotaTotal) && patch.quotaTotal > 0
    ? Math.floor(patch.quotaTotal)
    : Number(existing.quota_total);
  const nextQuotaRemaining =
    patch.resetRemaining === true ? nextQuotaTotal : Math.min(Number(existing.quota_remaining), nextQuotaTotal);
  const nextNotes = typeof patch.notes === "string" ? patch.notes : existing.notes;
  const nextActive = typeof patch.active === "boolean" ? patch.active : existing.active;

  const updatedRows = (await db`
    UPDATE promo_campaigns
    SET date_key = ${nextDateKey},
        quota_total = ${nextQuotaTotal},
        quota_remaining = ${nextQuotaRemaining},
        notes = ${nextNotes},
        active = ${nextActive},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, date_key, promo_code, quota_total, quota_remaining, notes, active, updated_at
  `) as PromoRow[];

  return toCampaign(updatedRows[0]);
}

export async function deletePromoCampaign(id: string): Promise<void> {
  if (!sql) {
    throw new Error("DATABASE_URL belum di-set.");
  }

  if (!id) return;
  await ensureTable();
  const db = requireSql();
  await db`DELETE FROM promo_campaigns WHERE id = ${id}`;
}

export async function consumePromoForDate(dateKey: string): Promise<PromoCampaign | null> {
  if (!sql) return null;

  if (!dateKey) return null;
  await ensureTable();
  const db = requireSql();

  const consumedRows = (await db`
    UPDATE promo_campaigns
    SET quota_remaining = quota_remaining - 1,
        updated_at = NOW()
    WHERE date_key = ${dateKey}
      AND active = TRUE
      AND quota_remaining > 0
    RETURNING id, date_key, promo_code, quota_total, quota_remaining, notes, active, updated_at
  `) as PromoRow[];

  const row = consumedRows[0];
  return row ? toCampaign(row) : null;
}
