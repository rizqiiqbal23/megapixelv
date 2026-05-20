"use client";

import { useEffect, useRef, useState } from "react";

import { cloneDefaultPricelistRows, type PricelistRow } from "@/lib/pricelist-data";

type PricelistModalProps = {
  open: boolean;
  onClose: () => void;
};

type PricelistResponse = {
  rows?: PricelistRow[];
  lastUpdatedAt?: string | null;
  source?: string;
  error?: string;
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

export default function PricelistModal({ open, onClose }: PricelistModalProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [rows, setRows] = useState<PricelistRow[]>(cloneDefaultPricelistRows());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelScale, setPanelScale] = useState(1);

  useEffect(() => {
    if (!open) return;

    let active = true;
    const controller = new AbortController();

    async function loadPricelist() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/pricelist", { cache: "no-store", signal: controller.signal });
        const json = await safeJson<PricelistResponse>(response);
        if (!response.ok) throw new Error(json?.error || "Gagal memuat pricelist.");

        if (!active) return;
        setRows(json?.rows?.length ? json.rows : cloneDefaultPricelistRows());
      } catch (fetchError) {
        if (!active || controller.signal.aborted) return;
        setError(fetchError instanceof Error ? fetchError.message : "Gagal memuat pricelist.");
        setRows(cloneDefaultPricelistRows());
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPricelist();

    return () => {
      active = false;
      controller.abort();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const updateScale = () => {
      if (typeof window === "undefined") return;
      const shell = shellRef.current;
      if (!shell) return;

      const availableHeight = Math.max(0, window.innerHeight - 12);
      const contentHeight = shell.scrollHeight;
      const nextScale = Math.min(1, availableHeight / contentHeight);
      setPanelScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    };

    updateScale();

    window.addEventListener("resize", updateScale);
    window.addEventListener("orientationchange", updateScale);
    return () => {
      window.removeEventListener("resize", updateScale);
      window.removeEventListener("orientationchange", updateScale);
    };
  }, [open, rows, loading, error]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/35" onClick={onClose}>
      <div className="absolute inset-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div
          ref={shellRef}
          className="absolute bottom-0 left-0 right-0 flex h-[100dvh] origin-bottom flex-col overflow-hidden rounded-t-3xl bg-white p-4 shadow-2xl"
          style={panelScale < 1 ? { transform: `scale(${panelScale})`, width: `${100 / panelScale}%`, left: `${(100 - 100 / panelScale) / 2}%` } : undefined}
        >
          <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-pink-100" />
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-pink-700">Pricelist</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-pink-200 bg-white px-3 py-1 text-[11px] font-medium text-pink-700"
            >
              Kembali
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="overflow-hidden rounded-2xl border border-[#F9D4E4]">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-pink-100 to-[#FFF0F7] text-pink-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Durasi</th>
                    <th className="px-4 py-3 text-right">Harga Sewa</th>
                  </tr>
                </thead>
                <tbody className="bg-[#FFF7FA]">
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-pink-100">
                      <td className="px-4 py-2.5 text-[#333333]">{row.duration}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-[#F64F8B]">{row.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {loading ? <p className="mt-3 text-center text-xs text-zinc-500">Memuat pricelist...</p> : null}
            {error ? <p className="mt-3 rounded-2xl border border-pink-200 bg-pink-50 px-3 py-2 text-sm text-pink-700">{error}</p> : null}
            <div className="mt-4 flex justify-center">
              <img src="/image/logo1.png" alt="Logo Pricelist" className="h-16 w-auto object-contain" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
