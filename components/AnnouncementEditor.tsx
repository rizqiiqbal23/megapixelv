"use client";

import { useEffect, useMemo, useState } from "react";

import AnnouncementBar from "@/components/AnnouncementBar";
import { type AnnouncementRecord } from "@/lib/announcement-data";

type AnnouncementResponse = {
  announcement?: AnnouncementRecord | null;
  error?: string;
};

type AnnouncementDraft = {
  text: string;
  isActive: boolean;
};

const EMPTY_DRAFT: AnnouncementDraft = {
  text: "",
  isActive: false,
};

async function safeJson<T>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default function AnnouncementEditor() {
  const [draft, setDraft] = useState<AnnouncementDraft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewText = useMemo(() => draft.text.trim(), [draft.text]);
  const canSave = !draft.isActive || Boolean(previewText);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/announcement", { cache: "no-store", signal: controller.signal });
        const json = await safeJson<AnnouncementResponse>(response);
        if (!response.ok) throw new Error(json?.error || "Gagal memuat announcement.");
        if (!active) return;

        const current = json?.announcement;
        setDraft({
          text: current?.text || "",
          isActive: Boolean(current?.isActive),
        });
      } catch (fetchError) {
        if (!active || controller.signal.aborted) return;
        setError(fetchError instanceof Error ? fetchError.message : "Gagal memuat announcement.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  async function saveAnnouncement() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/announcement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: draft.text,
          isActive: draft.isActive,
        }),
      });
      const json = await safeJson<AnnouncementResponse>(response);
      if (!response.ok) throw new Error(json?.error || "Gagal menyimpan announcement.");

      const current = json?.announcement;
      if (current) {
        setDraft({
          text: current.text || "",
          isActive: Boolean(current.isActive),
        });
      }
      setMessage("Announcement berhasil disimpan.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan announcement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto flex h-[calc(100dvh-118px)] w-full max-w-[420px] flex-col rounded-[24px] border border-pink-100 bg-white p-2 shadow-[0_8px_24px_rgba(247,108,156,0.08)] sm:max-w-4xl sm:p-5">
      <div className="mb-2 flex items-center justify-between text-pink-600 sm:mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg sm:text-xl">✨</span>
          <h2 className="text-base font-semibold sm:text-2xl">Announcement</h2>
        </div>
        <span className="text-sm text-pink-300 sm:text-base">♡</span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-pink-100 bg-pink-50/30 p-2 sm:p-4">
        <div className="grid h-full gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-pink-100 bg-white p-3 sm:p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">Pengumuman</p>
            <textarea
              value={draft.text}
              onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))}
              placeholder="✨ Promo weekend aktif! Bonus strap gratis"
              className="min-h-32 w-full resize-none rounded-2xl border border-pink-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-pink-400 sm:min-h-40"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDraft((current) => ({ ...current, isActive: true }))}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  draft.isActive ? "bg-gradient-to-r from-[#FF8FB1] to-[#F76C9C] text-white" : "border border-pink-200 bg-white text-pink-700"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setDraft((current) => ({ ...current, isActive: false }))}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  !draft.isActive ? "bg-gradient-to-r from-[#FF8FB1] to-[#F76C9C] text-white" : "border border-pink-200 bg-white text-pink-700"
                }`}
              >
                Inactive
              </button>
            </div>

            <button
              type="button"
              onClick={saveAnnouncement}
              disabled={saving || !canSave}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#FF8FB1] to-[#F76C9C] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-200 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Save Announcement"}
            </button>

            <div className="mt-3 rounded-2xl border border-dashed border-pink-200 bg-pink-50/60 px-3 py-2 text-xs text-zinc-600">
              {draft.isActive
                ? previewText
                  ? "Announcement aktif dan akan tampil di frontend."
                  : "Isi teks dulu untuk mengaktifkan announcement."
                : "Announcement inactive dan disembunyikan di frontend."}
            </div>

            {loading ? <p className="mt-3 text-xs text-zinc-500">Memuat announcement...</p> : null}
            {message ? <p className="mt-3 rounded-xl bg-pink-50 px-3 py-2 text-sm text-pink-700">{message}</p> : null}
            {error ? <p className="mt-3 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-sm text-pink-700">{error}</p> : null}
          </div>

          <div className="rounded-2xl border border-pink-100 bg-white p-3 sm:p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">Live Preview</p>
            <div className="rounded-3xl border border-pink-100 bg-pink-50/50 p-3">
              <AnnouncementBar text={previewText} className="w-full" />
              {!previewText ? (
                <p className="mt-3 text-sm text-zinc-500">Preview akan muncul saat teks diisi.</p>
              ) : (
                <p className="mt-3 text-xs text-zinc-500">
                  Preview mengikuti animasi frontend. Jika status inactive, bar tidak tampil di halaman booking.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
