"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CAMERAS, type CameraName, type CameraStatus } from "@/lib/cameras";
import { type ManualOverrides } from "@/lib/cameras";

type CameraBookings = Record<string, CameraStatus>;

type BookingResponse = {
  cameraBookings?: CameraBookings;
  lastUpdatedAt?: string;
  error?: string;
};

type SessionResponse = {
  authenticated?: boolean;
};

type OverridesResponse = {
  overrides?: ManualOverrides;
  error?: string;
};

const BOOKINGS_STORAGE_KEY = "booking_cache_v1";
const BOOKINGS_UPDATED_AT_KEY = "booking_cache_updated_at_v1";

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

function getDayType(status?: CameraStatus): "empty" | "partial" | "full" {
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

function emptyStatus(): CameraStatus {
  return { nikon: false, casio: false, kodak: false };
}

function mergeOverrides(
  baseBookings: CameraBookings,
  overrides: ManualOverrides
): CameraBookings {
  const merged: CameraBookings = {};

  for (const [dateKey, status] of Object.entries(baseBookings)) {
    merged[dateKey] = { ...status };
  }

  for (const [dateKey, status] of Object.entries(overrides)) {
    if (!merged[dateKey]) merged[dateKey] = emptyStatus();
    for (const camera of CAMERAS) {
      const overrideValue = status[camera];
      if (typeof overrideValue === "boolean") {
        merged[dateKey][camera] = overrideValue;
      }
    }
  }

  return merged;
}

async function safeJson<T>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default function AdminPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [cameraBookings, setCameraBookings] = useState<CameraBookings>(() => {
    if (typeof window === "undefined") return {};
    try {
      const cachedRaw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
      if (!cachedRaw) return {};
      const parsed = JSON.parse(cachedRaw) as BookingResponse["cameraBookings"];
      if (!parsed || typeof parsed !== "object") return {};
      return parsed;
    } catch {
      return {};
    }
  });
  const [manualOverrides, setManualOverrides] = useState<ManualOverrides>({});
  const [loadingData, setLoadingData] = useState(false);
  const [refreshingSheet, setRefreshingSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<CameraStatus>(emptyStatus());
  const [activeMonth, setActiveMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

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
  const mergedBookings = useMemo(
    () => mergeOverrides(cameraBookings, manualOverrides),
    [cameraBookings, manualOverrides]
  );
  const selectedMerged = selectedDateKey ? mergedBookings[selectedDateKey] : undefined;
  const selectedOverride = selectedDateKey ? manualOverrides[selectedDateKey] : undefined;

  const loadAdminData = useCallback(async (options?: { forceSheetRefresh?: boolean }) => {
    setLoadingData(true);
    try {
      const bookingsUrl = options?.forceSheetRefresh
        ? "/api/bookings?refresh=1&nocooldown=1"
        : "/api/bookings";
      const bookingsResponse = await fetch(bookingsUrl, { cache: "no-store" });
      const bookingsJson = await safeJson<BookingResponse>(bookingsResponse);
      if (!bookingsResponse.ok) {
        throw new Error(bookingsJson?.error || "Gagal memuat booking.");
      }

      setCameraBookings(bookingsJson?.cameraBookings || {});
      try {
        localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookingsJson?.cameraBookings || {}));
        localStorage.setItem(BOOKINGS_UPDATED_AT_KEY, bookingsJson?.lastUpdatedAt || new Date().toISOString());
      } catch {
        // ignore storage errors
      }

      const overridesResponse = await fetch("/api/admin/overrides", { cache: "no-store" });
      const overridesJson = await safeJson<OverridesResponse>(overridesResponse);
      if (!overridesResponse.ok) {
        throw new Error(overridesJson?.error || "Gagal memuat override manual.");
      }

      const nextOverrides = overridesJson?.overrides || {};
      setManualOverrides(nextOverrides);
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat data admin.");
      throw error;
    } finally {
      setLoadingData(false);
    }
  }, []);

  async function forceRefreshFromSheet() {
    setRefreshingSheet(true);
    setMessage(null);
    try {
      await loadAdminData({ forceSheetRefresh: true });
      setMessage("Data berhasil diambil ulang dari Google Sheet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal mengambil ulang data Google Sheet.");
    } finally {
      setRefreshingSheet(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        const json = await safeJson<SessionResponse>(response);
        if (!active) return;
        const ok = Boolean(json?.authenticated);
        setAuthenticated(ok);
        if (ok) {
          try {
            await loadAdminData();
          } catch {
            // handled via message state
          }
        }
      } catch {
        if (active) setAuthenticated(false);
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, [loadAdminData]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const json = await safeJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(json?.error || "Login gagal.");

      setAuthenticated(true);
      try {
        await loadAdminData();
      } catch (error) {
        setLoginError(error instanceof Error ? error.message : "Berhasil login, tapi data admin gagal dimuat.");
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Login gagal.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setCameraBookings({});
    setManualOverrides({});
    setSelectedDateKey(null);
    setMessage(null);
  }

  async function saveOverride() {
    if (!selectedDateKey) return;
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/overrides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey: selectedDateKey, status: draftStatus }),
      });
      const json = await safeJson<{ error?: string; overrides?: ManualOverrides }>(response);
      if (!response.ok) throw new Error(json?.error || "Gagal menyimpan override.");

      try {
        await loadAdminData();
      } catch {
        // handled via message state
      }
      setMessage("Status berhasil disimpan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan override.");
    } finally {
      setSaving(false);
    }
  }

  async function clearOverride() {
    if (!selectedDateKey) return;
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/overrides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey: selectedDateKey, remove: true }),
      });
      const json = await safeJson<{ error?: string; overrides?: ManualOverrides }>(response);
      if (!response.ok) throw new Error(json?.error || "Gagal menghapus override.");

      try {
        await loadAdminData();
      } catch {
        // handled via message state
      }
      setMessage("Override manual dihapus.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menghapus override.");
    } finally {
      setSaving(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-[url('/image/bg.png')] bg-cover bg-center px-4 py-8">
        <div className="mx-auto max-w-md rounded-3xl border border-pink-100 bg-white/90 p-6 text-center shadow-xl backdrop-blur">
          <p className="text-sm font-semibold text-pink-700">Memeriksa akses admin...</p>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-[url('/image/bg.png')] bg-cover bg-center px-4 py-8">
        <div className="mx-auto max-w-md rounded-3xl border border-pink-100 bg-white/92 p-6 shadow-xl backdrop-blur">
          <div className="mb-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">Admin Access</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[0.08em] text-zinc-800">MEGAPIXELV</h1>
            <p className="mt-2 text-sm text-zinc-500">Masuk untuk mengatur status kamera kalender.</p>
          </div>

          <form className="space-y-3" onSubmit={handleLogin}>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Username</label>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-2xl border border-pink-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-pink-400"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-pink-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-pink-400"
                autoComplete="current-password"
              />
            </div>
            {loginError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{loginError}</p>}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded-2xl bg-gradient-to-r from-[#FF8FB1] to-[#F76C9C] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-200 transition hover:scale-[1.01] disabled:opacity-60"
            >
              {isLoggingIn ? "Masuk..." : "Masuk"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const overrideDates = Object.keys(manualOverrides).sort();

  return (
    <main className="relative min-h-screen bg-[url('/image/bg.png')] bg-cover bg-center pb-24 lg:h-screen lg:overflow-hidden lg:pb-0">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <div className="absolute left-2 top-2 h-14 w-14 rounded-full bg-pink-300/40 blur-xl sm:left-4 sm:top-4 sm:h-20 sm:w-20" />
        <div className="absolute right-2 top-2 h-12 w-12 rounded-full bg-rose-300/35 blur-xl sm:right-4 sm:top-4 sm:h-16 sm:w-16" />
      </div>

      <header className="sticky top-0 z-20 border-b border-pink-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex min-h-20 w-full max-w-[1720px] items-center justify-between gap-3 px-4 py-2 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-500">Admin</p>
            <h1 className="text-xl font-semibold tracking-[0.08em] text-zinc-800 sm:text-3xl">MEGAPIXELV</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-xl border border-pink-200 bg-white px-3 py-2 text-xs font-medium text-pink-700"
            >
              Home
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-pink-600 px-3 py-2 text-xs font-medium text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1720px] grid-cols-1 gap-4 p-3 sm:p-6 lg:h-[calc(100vh-80px)] lg:grid-cols-[1.15fr_0.95fr] lg:overflow-hidden">
        <section className="relative rounded-[24px] border border-pink-100 bg-white p-3 shadow-[0_8px_24px_rgba(247,108,156,0.08)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            {canGoPrev ? (
              <button
                type="button"
                onClick={() => setActiveMonth(new Date(year, month - 1, 1))}
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
              onClick={() => setActiveMonth(new Date(year, month + 1, 1))}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-pink-200 bg-white text-base font-bold leading-none text-pink-600"
            >
              ›
            </button>
          </div>

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
              <span className="font-semibold text-amber-700">Limited Availability</span> - Sudah ada booking, tetapi masih ada slot yang tersedia.
            </p>
            <p>
              <span className="font-semibold text-rose-700">Fully Booked</span> - Semua slot sudah terisi.
            </p>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-pink-700 sm:gap-2 sm:text-sm">
            {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {cells.map((cell) => {
              if (!cell.day) {
                return <div key={cell.key} className="h-[4.6rem] rounded-lg bg-zinc-50 sm:h-20 sm:rounded-xl" />;
              }

              const dateKey = toDateKey(year, month, cell.day);
              const dayType = getDayType(mergedBookings[dateKey]);
              const isSelected = selectedDateKey === dateKey;

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => {
                    setSelectedDateKey(dateKey);
                    const next = mergedBookings[dateKey] || emptyStatus();
                    setDraftStatus({
                      nikon: Boolean(next.nikon),
                      casio: Boolean(next.casio),
                      kodak: Boolean(next.kodak),
                    });
                  }}
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

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={forceRefreshFromSheet}
              disabled={loadingData || saving || refreshingSheet}
              className="rounded-xl border border-pink-200 bg-white px-3 py-2 text-xs font-medium text-pink-700 disabled:opacity-60"
            >
              {refreshingSheet ? "Mengambil..." : "Ambil ulang Google Sheet"}
            </button>
          </div>

          {loadingData && (
            <p className="mt-3 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-sm text-pink-700">Memuat data...</p>
          )}
        </section>

        <section className="flex min-h-0 flex-col rounded-[24px] border border-pink-100 bg-white p-3 shadow-[0_8px_24px_rgba(247,108,156,0.08)] sm:p-5">
          <div className="mb-3 flex items-center justify-between text-pink-600">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛠️</span>
              <h2 className="text-lg font-semibold sm:text-2xl">Manual Status</h2>
            </div>
            <span className="text-pink-300">♡</span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-pink-100 bg-pink-50/30 p-3 sm:p-4">
            {!selectedDateKey ? (
              <p className="text-sm text-zinc-600">Pilih tanggal di kalender untuk mengubah status kamera.</p>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">Tanggal dipilih</p>
                    <h3 className="text-lg font-semibold text-zinc-800">{selectedDateKey}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftStatus(emptyStatus());
                      setSelectedDateKey(null);
                    }}
                    className="rounded-xl border border-pink-200 bg-white px-3 py-2 text-xs text-pink-700"
                  >
                    Tutup
                  </button>
                </div>

                <div className="space-y-2">
                  {CAMERAS.map((camera) => {
                    const active = draftStatus[camera];
                    return (
                      <button
                        key={camera}
                        type="button"
                        onClick={() =>
                          setDraftStatus((prev) => ({
                            ...prev,
                            [camera]: !prev[camera],
                          }))
                        }
                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                          active ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        <span className="font-medium">{cameraLabel(camera)}</span>
                        <span>{active ? "Booked" : "Available"}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftStatus({ nikon: true, casio: true, kodak: true })}
                    className="rounded-xl bg-rose-500 px-3 py-2 text-xs font-medium text-white"
                  >
                    Semua Booked
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftStatus({ nikon: false, casio: false, kodak: false })}
                    className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-medium text-white"
                  >
                    Semua Available
                  </button>
                  <button
                    type="button"
                    onClick={clearOverride}
                    disabled={saving || !selectedOverride}
                    className="rounded-xl border border-pink-200 bg-white px-3 py-2 text-xs font-medium text-pink-700 disabled:opacity-60"
                  >
                    Hapus override
                  </button>
                </div>

                <button
                  type="button"
                  onClick={saveOverride}
                  disabled={saving}
                  className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#FF8FB1] to-[#F76C9C] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-200 disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : "Simpan status"}
                </button>

                {message && <p className="mt-3 rounded-xl bg-pink-50 px-3 py-2 text-sm text-pink-700">{message}</p>}

                <div className="mt-5 rounded-2xl border border-pink-100 bg-white/80 p-3 text-xs text-zinc-600">
                  <p className="font-semibold text-zinc-700">Status saat ini</p>
                  <p className="mt-1">
                    Merged: {selectedMerged ? "Ada" : "Kosong"}
                  </p>
                  <p className="mt-1">
                    Override manual: {selectedOverride ? "Ada" : "Tidak ada"}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-pink-100 bg-pink-50/30 p-3 text-xs text-zinc-600">
            <p className="font-semibold text-zinc-700">Override aktif</p>
            <p className="mt-1">{overrideDates.length ? overrideDates.join(", ") : "-"}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
