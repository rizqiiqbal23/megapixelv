export type PromoCampaign = {
  id: string;
  dateKey: string;
  promoCode: string;
  quotaTotal: number;
  quotaRemaining: number;
  notes: string;
  active: boolean;
  updatedAt: string;
};

export type PromoCampaignInput = {
  dateKey: string;
  quotaTotal: number;
  notes?: string;
  active?: boolean;
};

export function generatePromoCode(dateKey: string): string {
  const compactDate = dateKey.replaceAll("-", "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PROMO-${compactDate}-${suffix}`;
}

export function normalizePromoCampaignInput(input: unknown): PromoCampaignInput | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const candidate = input as Partial<PromoCampaignInput>;
  const dateKey = typeof candidate.dateKey === "string" ? candidate.dateKey.trim() : "";
  const quotaTotal = Number(candidate.quotaTotal);
  const notes = typeof candidate.notes === "string" ? candidate.notes.trim() : "";
  const active = typeof candidate.active === "boolean" ? candidate.active : true;

  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  if (!Number.isFinite(quotaTotal) || quotaTotal <= 0) return null;

  return {
    dateKey,
    quotaTotal: Math.floor(quotaTotal),
    notes,
    active,
  };
}
