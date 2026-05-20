import { neon } from "@neondatabase/serverless";

import {
  cloneDefaultPricelistRows,
  normalizePricelistRows,
  type PricelistRow,
} from "@/lib/pricelist-data";

const DATABASE_URL = process.env.DATABASE_URL;
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;
let ensureTablePromise: Promise<void> | null = null;

type PricelistRowRecord = {
  id: string;
  sort_order: number;
  duration_label: string;
  price_label: string;
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
    CREATE TABLE IF NOT EXISTS pricelist_items (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL,
      duration_label TEXT NOT NULL,
      price_label TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.then(() => undefined);

  await ensureTablePromise;
}

function rowsFromRecords(records: PricelistRowRecord[]): PricelistRow[] {
  return records
    .map((record) => ({
      id: record.id,
      duration: record.duration_label,
      price: record.price_label,
      sortOrder: record.sort_order,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function readPricelistRows(): Promise<{ rows: PricelistRow[]; lastUpdatedAt: string | null; source: "db" | "default" }> {
  if (!sql) {
    return {
      rows: cloneDefaultPricelistRows(),
      lastUpdatedAt: null,
      source: "default",
    };
  }

  await ensureTable();
  const db = requireSql();
  const rows = (await db`
    SELECT id, sort_order, duration_label, price_label, updated_at
    FROM pricelist_items
    ORDER BY sort_order ASC, id ASC
  `) as PricelistRowRecord[];

  if (!rows.length) {
    return {
      rows: cloneDefaultPricelistRows(),
      lastUpdatedAt: null,
      source: "default",
    };
  }

  const latestUpdatedAt = rows.reduce<string | null>((latest, row) => {
    if (!latest) return row.updated_at;
    return new Date(row.updated_at).getTime() > new Date(latest).getTime() ? row.updated_at : latest;
  }, null);

  return {
    rows: rowsFromRecords(rows),
    lastUpdatedAt: latestUpdatedAt,
    source: "db",
  };
}

export async function writePricelistRows(rows: PricelistRow[]): Promise<void> {
  if (!sql) {
    throw new Error("DATABASE_URL belum di-set.");
  }

  await ensureTable();
  const normalized = normalizePricelistRows(rows);
  const db = requireSql();
  await db`DELETE FROM pricelist_items`;

  for (const row of normalized) {
    await db`
      INSERT INTO pricelist_items (id, sort_order, duration_label, price_label, updated_at)
      VALUES (${row.id}, ${row.sortOrder}, ${row.duration}, ${row.price}, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        sort_order = EXCLUDED.sort_order,
        duration_label = EXCLUDED.duration_label,
        price_label = EXCLUDED.price_label,
        updated_at = NOW()
    `;
  }
}
