"use client";

import { useEffect, useMemo, useState } from "react";

import { generatePromoCode, type PromoCampaign } from "@/lib/promo-data";

type PromoResponse = {
  rows?: PromoCampaign[];
  row?: PromoCampaign;
  error?: string;
};

type PromoDraft = {
  dateKey: string;
  quotaTotal: string;
  notes: string;
  active: boolean;
};

const EMPTY_DRAFT: PromoDraft = {
  dateKey: "",
  quotaTotal: "1",
  notes: "",
  active: true,
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

export default function PromoEditor() {
  const [rows, setRows] = useState<PromoCampaign[]>([]);
  const [draft, setDraft] = useState<PromoDraft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedRows = useMemo(() => [...rows].sort((a, b) => a.dateKey.localeCompare(b.dateKey)), [rows]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/promo", { cache: "no-store", signal: controller.signal });
        const json = await safeJson<PromoResponse>(response);
        if (!response.ok) throw new Error(json?.error || "Gagal memuat promo.");
        if (!active) return;
        setRows(json?.rows || []);
      } catch (fetchError) {
        if (!active || controller.signal.aborted) return;
        setError(fetchError instanceof Error ? fetchError.message : "Gagal memuat promo.");
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

  async function createPromo() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const quotaTotal = Number(draft.quotaTotal);
      const response = await fetch("/api/admin/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateKey: draft.dateKey,
          quotaTotal,
          notes: draft.notes,
          active: draft.active,
        }),
      });
      const json = await safeJson<PromoResponse>(response);
      if (!response.ok) throw new Error(json?.error || "Gagal menyimpan promo.");

      if (json?.row) {
        setRows((current) => {
          const filtered = current.filter((item) => item.id !== json.row?.id && item.dateKey !== json.row?.dateKey);
          return [...filtered, json.row!];
        });
      }

      setDraft({
        dateKey: "",
        quotaTotal: "1",
        notes: "",
        active: true,
      });
      setMessage("Promo berhasil disimpan.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Gagal menyimpan promo.");
    } finally {
      setLoading(false);
    }
  }

  async function saveRow(row: PromoCampaign) {
    setSavingId(row.id);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/promo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          dateKey: row.dateKey,
          quotaTotal: row.quotaTotal,
          notes: row.notes,
          active: row.active,
        }),
      });
      const json = await safeJson<PromoResponse>(response);
      if (!response.ok) throw new Error(json?.error || "Gagal menyimpan promo.");
      if (json?.row) {
        setRows((current) => current.map((item) => (item.id === json.row?.id ? json.row! : item)));
      }
      setMessage("Promo diperbarui.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan promo.");
    } finally {
      setSavingId(null);
    }
  }

  async function resetQuota(row: PromoCampaign) {
    setSavingId(row.id);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/promo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          dateKey: row.dateKey,
          quotaTotal: row.quotaTotal,
          notes: row.notes,
          active: row.active,
          resetRemaining: true,
        }),
      });
      const json = await safeJson<PromoResponse>(response);
      if (!response.ok) throw new Error(json?.error || "Gagal reset jatah.");
      if (json?.row) {
        setRows((current) => current.map((item) => (item.id === json.row?.id ? json.row! : item)));
      }
      setMessage("Jatah promo direset.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Gagal reset jatah.");
    } finally {
      setSavingId(null);
    }
  }

  async function removeRow(row: PromoCampaign) {
    setSavingId(row.id);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/promo", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const json = await safeJson<PromoResponse>(response);
      if (!response.ok) throw new Error(json?.error || "Gagal menghapus promo.");
      setRows((current) => current.filter((item) => item.id !== row.id));
      setMessage("Promo dihapus.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Gagal menghapus promo.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="mx-auto flex h-[calc(100dvh-118px)] w-full max-w-[420px] flex-col rounded-[24px] border border-pink-100 bg-white p-2 shadow-[0_8px_24px_rgba(247,108,156,0.08)] sm:max-w-4xl sm:p-5">
      <div className="mb-2 flex items-center justify-between text-pink-600 sm:mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg sm:text-xl">🎁</span>
          <h2 className="text-base font-semibold sm:text-2xl">Promo</h2>
        </div>
        <span className="text-sm text-pink-300 sm:text-base">✨</span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-pink-100 bg-pink-50/30 p-2 sm:p-4">
        <div className="mb-3 rounded-2xl border border-pink-100 bg-white p-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">Tambah Promo</p>
          <div className="grid gap-2 sm:grid-cols-4">
            <input
              type="date"
              value={draft.dateKey}
              onChange={(event) => setDraft((current) => ({ ...current, dateKey: event.target.value }))}
              className="rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400"
            />
            <input
              type="number"
              min={1}
              value={draft.quotaTotal}
              onChange={(event) => setDraft((current) => ({ ...current, quotaTotal: event.target.value }))}
              className="rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400"
              placeholder="Jatah"
            />
            <input
              type="text"
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              className="rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400"
              placeholder="Catatan promo"
            />
            <button
              type="button"
              onClick={createPromo}
              disabled={loading || !draft.dateKey}
              className="rounded-xl bg-gradient-to-r from-[#FF8FB1] to-[#F76C9C] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Menyimpan..." : "Tambah"}
            </button>
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-zinc-600">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))}
            />
            Aktifkan promo
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-[#F9D4E4] bg-white">
          <div className="grid grid-cols-[1fr_1fr_1fr] bg-gradient-to-r from-pink-100 to-[#FFF0F7] px-2 py-2 text-[11px] font-semibold text-pink-700 sm:grid-cols-[1fr_1fr_1fr_1fr_1fr] sm:px-3 sm:py-3 sm:text-sm">
            <div>Tanggal</div>
            <div>Kode</div>
            <div className="text-right">Jatah</div>
            <div className="hidden sm:block">Catatan</div>
            <div className="hidden sm:block text-right">Aksi</div>
          </div>

          <div className="divide-y divide-pink-100">
            {sortedRows.length ? (
              sortedRows.map((row) => (
                <div key={row.id} className="grid grid-cols-[1fr_1fr_1fr] gap-2 px-2 py-2 sm:grid-cols-[1fr_1fr_1fr_1fr_1fr] sm:px-3">
                  <div className="space-y-1">
                    <input
                      type="date"
                      value={row.dateKey}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item) => (item.id === row.id ? { ...item, dateKey: event.target.value } : item))
                        )
                      }
                      className="w-full rounded-xl border border-pink-200 bg-white px-2 py-1.5 text-[11px] outline-none focus:border-pink-400 sm:px-3 sm:py-2 sm:text-sm"
                    />
                    <label className="flex items-center gap-2 text-[10px] text-zinc-600 sm:text-xs">
                      <input
                        type="checkbox"
                        checked={row.active}
                        onChange={(event) =>
                          setRows((current) =>
                            current.map((item) => (item.id === row.id ? { ...item, active: event.target.checked } : item))
                          )
                        }
                      />
                      Aktif
                    </label>
                  </div>
                  <div className="space-y-1">
                    <input
                      value={row.promoCode}
                      readOnly
                      className="w-full rounded-xl border border-pink-200 bg-pink-50 px-2 py-1.5 text-[11px] font-semibold text-pink-700 outline-none sm:px-3 sm:py-2 sm:text-sm"
                    />
                    <p className="text-[10px] text-zinc-500 sm:text-xs">Generated otomatis</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="number"
                        min={1}
                        value={row.quotaTotal}
                        onChange={(event) =>
                          setRows((current) =>
                            current.map((item) =>
                              item.id === row.id ? { ...item, quotaTotal: Number(event.target.value) || 1 } : item
                            )
                          )
                        }
                        className="w-full rounded-xl border border-pink-200 bg-white px-2 py-1.5 text-[11px] outline-none focus:border-pink-400 sm:px-3 sm:py-2 sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => resetQuota(row)}
                        disabled={savingId === row.id}
                        className="rounded-xl border border-pink-200 bg-white px-2 py-1.5 text-[10px] font-medium text-pink-700 disabled:opacity-60 sm:px-3 sm:text-xs"
                      >
                        Reset
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-500 sm:text-xs">
                      {row.quotaRemaining}/{row.quotaTotal}
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <input
                      value={row.notes}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item) => (item.id === row.id ? { ...item, notes: event.target.value } : item))
                        )
                      }
                      className="w-full rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400"
                    />
                  </div>
                  <div className="hidden sm:flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => saveRow(row)}
                      disabled={savingId === row.id}
                      className="rounded-xl bg-gradient-to-r from-[#FF8FB1] to-[#F76C9C] px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(row)}
                      disabled={savingId === row.id}
                      className="rounded-xl border border-pink-200 bg-white px-3 py-2 text-xs font-medium text-pink-700 disabled:opacity-60"
                    >
                      Hapus
                    </button>
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-2 sm:hidden">
                    <button
                      type="button"
                      onClick={() => saveRow(row)}
                      disabled={savingId === row.id}
                      className="rounded-xl bg-gradient-to-r from-[#FF8FB1] to-[#F76C9C] px-3 py-2 text-[11px] font-medium text-white disabled:opacity-60"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(row)}
                      disabled={savingId === row.id}
                      className="rounded-xl border border-pink-200 bg-white px-3 py-2 text-[11px] font-medium text-pink-700 disabled:opacity-60"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-3 py-6 text-sm text-zinc-600">Belum ada promo.</div>
            )}
          </div>
        </div>

        {message ? <p className="mt-2 rounded-xl bg-pink-50 px-2 py-1.5 text-[11px] text-pink-700 sm:mt-3 sm:px-3 sm:py-2 sm:text-sm">{message}</p> : null}
        {error ? <p className="mt-2 rounded-xl border border-pink-200 bg-pink-50 px-2 py-1.5 text-[11px] text-pink-700 sm:mt-3 sm:px-3 sm:py-2 sm:text-sm">{error}</p> : null}
      </div>
    </section>
  );
}
