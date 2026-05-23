export type AnnouncementRecord = {
  id: string;
  text: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AnnouncementInput = {
  text: string;
  isActive: boolean;
};

export const DEFAULT_ANNOUNCEMENT_ID = "site_announcement";

export function normalizeAnnouncementInput(input: unknown): AnnouncementInput | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;

  const candidate = input as Partial<AnnouncementInput> & { active?: boolean; is_active?: boolean };
  const text = typeof candidate.text === "string" ? candidate.text.trim() : "";
  const isActive =
    typeof candidate.isActive === "boolean"
      ? candidate.isActive
      : typeof candidate.active === "boolean"
        ? candidate.active
        : typeof candidate.is_active === "boolean"
          ? candidate.is_active
          : false;

  if (isActive && !text) return null;

  return {
    text,
    isActive,
  };
}
