export type PricelistRow = {
  id: string;
  duration: string;
  price: string;
  sortOrder: number;
};

export const DEFAULT_PRICELIST_ROWS: PricelistRow[] = [
  { id: "6-hours", duration: "6 jam", price: "30.000", sortOrder: 0 },
  { id: "12-hours", duration: "12 jam", price: "45.000", sortOrder: 1 },
  { id: "1-day", duration: "1 hari", price: "70.000", sortOrder: 2 },
  { id: "2-day", duration: "2 hari", price: "120.000", sortOrder: 3 },
  { id: "3-day", duration: "3 hari", price: "180.000", sortOrder: 4 },
  { id: "4-day", duration: "4 hari", price: "250.000", sortOrder: 5 },
  { id: "5-day", duration: "5 hari", price: "320.000", sortOrder: 6 },
  { id: "6-day", duration: "6 hari", price: "400.000", sortOrder: 7 },
  { id: "7-day", duration: "7 hari", price: "450.000", sortOrder: 8 },
];

export function cloneDefaultPricelistRows(): PricelistRow[] {
  return DEFAULT_PRICELIST_ROWS.map((row) => ({ ...row }));
}

export function normalizePricelistRows(input: unknown): PricelistRow[] {
  if (!Array.isArray(input)) return cloneDefaultPricelistRows();

  const nextRows = input
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;
      const candidate = row as Partial<PricelistRow>;
      const duration = typeof candidate.duration === "string" ? candidate.duration.trim() : "";
      const price = typeof candidate.price === "string" ? candidate.price.trim() : "";
      const id = typeof candidate.id === "string" && candidate.id.trim() ? candidate.id.trim() : `${index}-${duration || price || "row"}`;
      const sortOrder = Number.isFinite(candidate.sortOrder) ? Number(candidate.sortOrder) : index;

      if (!duration || !price) return null;

      return { id, duration, price, sortOrder };
    })
    .filter((row): row is PricelistRow => Boolean(row))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row, index) => ({ ...row, sortOrder: index }));

  return nextRows.length ? nextRows : cloneDefaultPricelistRows();
}
