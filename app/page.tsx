"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const CAMERAS = ["nikon", "casio", "kodak"] as const;
type CameraName = (typeof CAMERAS)[number];
type DayCameraStatus = Record<CameraName, boolean>;
type CameraBookings = Record<string, DayCameraStatus>;

type BookingResponse = {
  cameraBookings?: CameraBookings;
  lastUpdatedAt?: string;
  error?: string;
};
const BOOKINGS_STORAGE_KEY = "booking_cache_v1";
const BOOKINGS_UPDATED_AT_KEY = "booking_cache_updated_at_v1";

const WEEK_DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const RULES = [
  "COD maksimal menunggu 20 menit, lebih dari itu dinyatakan hangus.",
  "Untuk pengembalian maksimal keterlambatan 30 menit, lebih dari itu bayar 10k/ jam.",
  "DILARANG KERAS DIGICAM BASAH, BARET, MAUPUN RUSAK, diharap untuk HATI HATI dalam menaruh & menggunakan kamera. Apabila terdapat kerusakan / kehilangan maka cust wajib membayar seluruh biaya perbaikan / mengganti dengan kamera yang sama.",
  "JANGAN PEGANG LENSA CAMERA apalagi memaksa lensa masuk.",
  "Dilarang meletakkan kamera didalam jok motor & jangan terhimpit barang apapun.",
  "Apabila main ke alam, pastikan kamera tidak terkena debu, kotoran & air!",
  "Pastikan kamera tidak dipakai saat turun hujan!",
  "Sudah dapat card reader jadi bisa langsung mindah file-nya sendiri, tapi apabila ingin dibantu memindahkan filenya terdapat fee tambahan sebesar 5k.",
  "Untuk pelunasan wajib di transfer sebelum mengambil kamera.",
  "Membawa jaminan KTP/SIM/KTM.",
  "Membawa kepala charger! :)",
];

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number | null; key: string }> = [];

  for (let i = 0; i < firstDay; i += 1) cells.push({ day: null, key: `empty-start-${i}` });
  for (let day = 1; day <= daysInMonth; day += 1) cells.push({ day, key: `day-${day}` });
  while (cells.length % 7 !== 0) cells.push({ day: null, key: `empty-end-${cells.length}` });

  return cells;
}

function cameraLabel(camera: CameraName): string {
  if (camera === "nikon") return "Nikon";
  if (camera === "casio") return "Casio";
  return "Kodak";
}

function getDayType(status?: DayCameraStatus): "empty" | "partial" | "full" {
  if (!status) return "empty";

  const bookedCount = CAMERAS.filter((camera) => status[camera]).length;
  if (bookedCount === 0) return "empty";
  if (bookedCount === CAMERAS.length) return "full";
  return "partial";
}

function getDayTypeClass(type: "empty" | "partial" | "full"): string {
  if (type === "empty") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (type === "partial") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function getDayTypeIcon(type: "empty" | "partial" | "full"): string {
  if (type === "empty") return "✅";
  if (type === "partial") return "⏳";
  return "⛔";
}

export default function Home() {
  const [cameraBookings, setCameraBookings] = useState<CameraBookings>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as CameraBookings;
      if (!parsed || typeof parsed !== "object") return {};
      return parsed;
    } catch {
      return {};
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [showFloatingBook, setShowFloatingBook] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(BOOKINGS_UPDATED_AT_KEY);
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const loadBookings = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoadingBookings(true);
      const response = await fetch("/api/bookings", {
        signal,
        cache: "no-store",
      });

      const json = (await response.json()) as BookingResponse;

      if (!response.ok) throw new Error(json.error || "Gagal memuat data booking.");

      const nextBookings = json.cameraBookings || {};
      setCameraBookings(nextBookings);
      try {
        localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(nextBookings));
        const nowIso = json.lastUpdatedAt || new Date().toISOString();
        localStorage.setItem(BOOKINGS_UPDATED_AT_KEY, nowIso);
        setLastUpdatedAt(nowIso);
      } catch {
        // ignore storage errors
      }
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      if (!signal?.aborted) setIsLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const initialLoadId = window.setTimeout(() => {
      void loadBookings(controller.signal);
    }, 0);

    const intervalId = setInterval(() => {
      void loadBookings();
    }, 3 * 60 * 60 * 1000);

    return () => {
      controller.abort();
      clearTimeout(initialLoadId);
      clearInterval(intervalId);
    };
  }, [loadBookings]);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      setShowFloatingBook(true);
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        setShowFloatingBook(false);
      }, 1200);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === BOOKINGS_STORAGE_KEY || event.key === BOOKINGS_UPDATED_AT_KEY) {
        void loadBookings();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [loadBookings]);

  const year = activeMonth.getFullYear();
  const month = activeMonth.getMonth();
  const currentMonthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);
  const canGoPrev = activeMonth.getTime() > currentMonthStart.getTime();

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric",
      }).format(activeMonth),
    [activeMonth]
  );

  const cells = useMemo(() => buildCalendarDays(year, month), [year, month]);
  const selectedStatus = selectedDateKey ? cameraBookings[selectedDateKey] : undefined;

  return (
    <main className="relative min-h-screen bg-[url('/bg-new.jpeg')] bg-cover bg-center pb-24 lg:h-screen lg:overflow-hidden lg:pb-0">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <div className="absolute left-2 top-2 h-14 w-14 rounded-full bg-pink-300/40 blur-xl sm:left-4 sm:top-4 sm:h-20 sm:w-20" />
        <div className="absolute right-2 top-2 h-12 w-12 rounded-full bg-rose-300/35 blur-xl sm:right-4 sm:top-4 sm:h-16 sm:w-16" />
        <div className="absolute bottom-2 left-2 h-12 w-12 rounded-full bg-fuchsia-300/35 blur-xl sm:bottom-4 sm:left-4 sm:h-16 sm:w-16" />
        <div className="absolute bottom-2 right-2 h-14 w-14 rounded-full bg-pink-200/45 blur-xl sm:bottom-4 sm:right-4 sm:h-20 sm:w-20" />
        <span className="absolute left-5 top-4 animate-pulse text-xl rotate-[-16deg] sm:left-10 sm:top-8 sm:text-2xl">💗</span>
        <span className="absolute right-5 top-5 animate-bounce text-lg rotate-[18deg] sm:right-10 sm:top-9 sm:text-xl">✨</span>
        <span className="absolute bottom-6 left-5 animate-bounce text-lg rotate-[-12deg] sm:bottom-10 sm:left-10 sm:text-xl">🎀</span>
        <span className="absolute bottom-5 right-6 animate-pulse text-xl rotate-[14deg] sm:bottom-10 sm:right-10 sm:text-2xl">🌸</span>
      </div>
      <header className="sticky top-0 z-20 border-b border-pink-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex min-h-20 w-full max-w-[1720px] items-center justify-center px-4 py-2 sm:px-8">
          <div className="w-full text-center">
            <div className="flex items-center justify-center gap-2 text-zinc-800">
              <span className="text-pink-300">✦</span>
              <h1 className="text-2xl font-semibold tracking-[0.08em] sm:text-5xl sm:tracking-[0.04em] md:text-[64px]">MEGAPIXELV</h1>
              <span className="text-pink-300">✦</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1720px] grid-cols-1 gap-4 p-3 sm:p-6 lg:h-[calc(100vh-80px)] lg:grid-cols-[1.15fr_0.95fr] lg:overflow-hidden">
        <section className="relative rounded-[24px] border border-pink-100 bg-white p-3 shadow-[0_8px_24px_rgba(247,108,156,0.08)] sm:p-5">
          <span className="pointer-events-none absolute -left-2 -top-2 animate-pulse text-lg rotate-[-18deg] sm:-left-3 sm:-top-3 sm:text-xl">🎀</span>
          <span className="pointer-events-none absolute -right-2 -top-2 animate-pulse text-lg rotate-[16deg] sm:-right-3 sm:-top-3 sm:text-xl">💖</span>
          <span className="pointer-events-none absolute -left-2 -bottom-2 animate-bounce text-lg rotate-[12deg] sm:-left-3 sm:-bottom-3 sm:text-xl">⭐</span>
          <span className="pointer-events-none absolute -right-2 -bottom-2 animate-bounce text-lg rotate-[-14deg] sm:-right-3 sm:-bottom-3 sm:text-xl">🌸</span>
          <div className="mb-4 grid grid-cols-[40px_1fr_40px] items-center gap-2">
            {canGoPrev ? (
              <button
                type="button"
                onClick={() => {
                  setActiveMonth(new Date(year, month - 1, 1));
                  setSelectedDateKey(null);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-pink-200 bg-white text-base font-bold leading-none text-zinc-700"
              >
                ‹
              </button>
            ) : (
              <div />
            )}
            <h2 className="flex-1 text-center text-base font-semibold text-zinc-800 sm:text-2xl">Kalender Booking {monthLabel}</h2>
            <button
              type="button"
              onClick={() => {
                setActiveMonth(new Date(year, month + 1, 1));
                setSelectedDateKey(null);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-pink-200 bg-white text-base font-bold leading-none text-pink-600"
            >
              ›
            </button>
          </div>
          <p className="-mt-[0.5625rem] mb-2 text-center text-[10px] text-zinc-500 sm:text-xs">
            Update terakhir:{" "}
            {lastUpdatedAt
              ? new Intl.DateTimeFormat("id-ID", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(lastUpdatedAt))
              : "-"}
          </p>

          <div className="mb-3 flex items-center gap-1 whitespace-nowrap text-[10px] sm:flex-wrap sm:gap-2 sm:text-sm">
            <span className="font-semibold text-zinc-700">Status:</span>
            <span className="rounded-lg bg-emerald-100 px-1.5 py-0.5 text-emerald-700 sm:px-3 sm:py-1">✅ Available</span>
            <span className="rounded-lg bg-amber-100 px-1.5 py-0.5 text-amber-700 sm:px-3 sm:py-1">⏳ Limited Availability</span>
            <span className="rounded-lg bg-rose-100 px-1.5 py-0.5 text-rose-700 sm:px-3 sm:py-1">⛔ Fully Booked</span>
          </div>

          <div className="mb-4 rounded-xl border border-pink-100 bg-pink-50/40 px-3 py-2 text-xs text-zinc-700 sm:text-sm">
            <p>
              <span className="font-semibold text-emerald-700">Available</span> - Semua slot masih kosong.
            </p>
            <p>
              <span className="font-semibold text-amber-700">Limited Availability</span> - Sudah ada booking,
              tetapi masih ada slot yang tersedia.
            </p>
            <p>
              <span className="font-semibold text-rose-700">Fully Booked</span> - Semua slot sudah terisi.
            </p>
            <p className="mt-2 font-medium text-pink-700">Tekan tanggal untuk cek ketersediaan kamera.</p>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-pink-700 sm:gap-2 sm:text-sm">
            {WEEK_DAYS.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {cells.map((cell) => {
              if (!cell.day) {
                return <div key={cell.key} className="h-[4.6rem] rounded-lg bg-zinc-50 sm:h-20 sm:rounded-xl" />;
              }

              const dateKey = toDateKey(year, month, cell.day);
              const dayType = getDayType(cameraBookings[dateKey]);
              const isSelected = selectedDateKey === dateKey;

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelectedDateKey(dateKey)}
                  className={`h-[4.6rem] rounded-lg border p-1.5 text-left transition duration-200 hover:scale-[1.03] sm:h-20 sm:rounded-xl sm:p-2 ${getDayTypeClass(
                    dayType
                  )} ${isSelected ? "ring-2 ring-pink-400" : ""}`}
                >
                  <div className="text-base font-semibold leading-none sm:text-2xl">{cell.day}</div>
                  <div className="mt-1 text-base leading-tight font-medium sm:text-sm">{getDayTypeIcon(dayType)}</div>
                </button>
              );
            })}
          </div>

          {error && (
            <p className="mt-3 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-sm text-pink-700">{error}</p>
          )}

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => loadBookings()}
              disabled={isLoadingBookings}
              className="rounded-lg border border-pink-200 bg-white/95 px-3 py-1.5 text-[10px] font-medium text-pink-700 shadow-sm disabled:opacity-60 sm:text-xs"
            >
              {isLoadingBookings ? "Loading..." : "Muat data terbaru"}
            </button>
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-[24px] border border-pink-100 bg-white p-3 shadow-[0_8px_24px_rgba(247,108,156,0.08)] sm:p-5">
          <div className="mb-3 flex items-center justify-between text-pink-600">
            <div className="flex items-center gap-2">
              <span className="text-xl">🧾</span>
              <h2 className="text-lg font-semibold sm:text-2xl">Peraturan Booking</h2>
            </div>
            <span className="text-pink-300">♡</span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-pink-100 bg-pink-50/30 p-3 sm:p-4">
            <p className="mb-3 text-base font-semibold text-pink-600 sm:text-lg">Yang perlu diperhatikan:</p>
            <ul className="space-y-2 text-xs leading-relaxed text-zinc-700 sm:text-base">
              {RULES.map((rule) => (
                <li key={rule} className="flex items-start gap-2">
                  <span className="mt-0.5 text-pink-500">♥</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>

            <p className="mt-5 rounded-xl border border-pink-200 bg-pink-100/70 px-3 py-2 text-xs font-semibold text-pink-700 sm:text-base">
              ♡ Yang akan diproses adalah yang DP terlebih dahulu
            </p>

            <p className="mt-4 text-base font-medium text-zinc-700 sm:text-lg">Happy Snapping!</p>
          </div>

          <Link
            href="https://forms.gle/CxyGTj8Y6hhTPYK89"
            className="mt-4 hidden w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#FF8FB1] to-[#F76C9C] px-6 py-3 text-xl font-semibold text-white shadow-lg shadow-pink-200 transition duration-200 hover:scale-[1.02] hover:shadow-xl lg:inline-flex"
          >
            <span className="mr-2">📷</span>
            BOOK
          </Link>
        </section>
      </div>

      <Link
        href="https://forms.gle/CxyGTj8Y6hhTPYK89"
        className={`fixed bottom-4 left-4 right-4 z-30 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#FF8FB1] to-[#F76C9C] px-6 py-3 text-base font-semibold text-white shadow-lg shadow-pink-200 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl lg:hidden ${
          showFloatingBook ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0 pointer-events-none"
        }`}
      >
        <span className="mr-2">📷</span>
        BOOK
      </Link>

      {isLoadingBookings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-pink-100/80 backdrop-blur-sm">
          <div className="rounded-3xl border border-pink-200 bg-white/90 px-6 py-5 text-center shadow-xl">
            <div className="mx-auto mb-3 flex items-center justify-center gap-2 text-3xl">
              <span className="animate-bounce rotate-[-12deg]">🎀</span>
              <span className="animate-pulse rotate-[10deg]">💖</span>
              <span className="animate-bounce [animation-delay:150ms] rotate-[-8deg]">✨</span>
            </div>
            <p className="text-sm font-semibold text-pink-700 sm:text-base">Mohon tunggu ya, data sedang dimuat...</p>
          </div>
        </div>
      )}

      {selectedDateKey && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={() => setSelectedDateKey(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-800 sm:text-lg">Detail {selectedDateKey}</h3>
              <button
                type="button"
                onClick={() => setSelectedDateKey(null)}
                className="rounded-lg border border-pink-200 bg-pink-50 px-3 py-1 text-xs text-pink-700"
              >
                Tutup
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {CAMERAS.map((camera) => {
                const isBooked = Boolean(selectedStatus?.[camera]);
                return (
                  <div
                    key={camera}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      isBooked ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    <div className="font-medium">{cameraLabel(camera)}</div>
                    <div>{isBooked ? "Booked" : "Available"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

