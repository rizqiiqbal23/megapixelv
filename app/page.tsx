"use client";

import { Poppins } from "next/font/google";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BookingCalendar, { type CameraBookings } from "@/components/BookingCalendar";
import CaraBookModal from "@/components/CaraBookModal";
import Header from "@/components/Header";
import PhotoGalleryModal from "@/components/PhotoGalleryModal";
import PricelistModal from "@/components/PricelistModal";
import RulesModal from "@/components/RulesModal";
import SelectedDateCard from "@/components/SelectedDateCard";
import StickyBookButton from "@/components/StickyBookButton";
import TopTabs from "@/components/TopTabs";
import { type CameraKey } from "@/components/booking-form";
import { type PromoCampaign } from "@/lib/promo-data";

type BookingResponse = {
  cameraBookings?: CameraBookings;
  lastUpdatedAt?: string;
  error?: string;
};

type PromoResponse = {
  rows?: PromoCampaign[];
  error?: string;
};

const BOOKINGS_STORAGE_KEY = "booking_cache_v1";
const BOOKINGS_UPDATED_AT_KEY = "booking_cache_updated_at_v1";
const CAMERAS: CameraKey[] = ["nikon", "casio", "kodak"];

const RULES = [
  "COD maksimal menunggu 20 menit. Jika melebihi batas waktu tersebut, booking dianggap hangus.",
  "Pengembalian kamera maksimal terlambat 30 menit. Jika lebih dari itu, akan dikenakan biaya tambahan sebesar Rp10.000 per jam.",
  "DILARANG KERAS DIGICAM BASAH, BARET, MAUPUN RUSAK. Harap berhati-hati saat menggunakan dan menyimpan kamera. Apabila terjadi kerusakan atau kehilangan, penyewa wajib menanggung seluruh biaya perbaikan atau mengganti dengan kamera yang sama.",
  "JANGAN MENYENTUH LENSA KAMERA, apalagi memaksa lensa untuk masuk.",
  "Dilarang meletakkan kamera di dalam jok motor atau di tempat yang dapat membuat kamera terhimpit oleh barang lain.",
  "Jika digunakan di alam terbuka, pastikan kamera tidak terkena debu, kotoran, maupun air.",
  "Jangan gunakan kamera saat hujan atau dalam kondisi cuaca basah.",
  "Setiap penyewaan sudah termasuk card reader, sehingga file foto dapat dipindahkan sendiri. Jika ingin dibantu memindahkan file, akan dikenakan biaya tambahan sebesar Rp5.000.",
  "Pelunasan wajib dilakukan melalui transfer sebelum pengambilan kamera.",
  "Wajib membawa jaminan berupa KTP, SIM, atau KTM.",
  "Mohon membawa kepala charger.",
];

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

function toReadableDate(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function Home() {
  const isFetchingRef = useRef(false);
  const homeShellRef = useRef<HTMLDivElement | null>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const lastUpdatedAtRef = useRef<string | null>(null);
  const homeBaselineHeightRef = useRef<number | null>(null);
  const [homeScale, setHomeScale] = useState(1);

  const scrollPageTo = useCallback((target: "top" | "bottom") => {
    if (typeof window === "undefined") return;
    const viewport = scrollViewportRef.current;
    if (viewport) {
      const top = target === "top" ? 0 : viewport.scrollHeight;
      viewport.scrollTo({ top, behavior: "smooth" });
      return;
    }

    const top = target === "top" ? 0 : document.documentElement.scrollHeight;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

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

  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(BOOKINGS_UPDATED_AT_KEY);
  });

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [promoDates, setPromoDates] = useState<string[]>([]);
  const [activeMonth, setActiveMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState("00:00");
  const [selectedCamera, setSelectedCamera] = useState<CameraKey | null>(null);
  const [showStickyBook, setShowStickyBook] = useState(false);
  const [showPricelist, setShowPricelist] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showCaraBook, setShowCaraBook] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [activeTab, setActiveTab] = useState<"cara-book" | "photo-gallery" | "pricelist" | "rules" | null>(null);

  const loadBookings = useCallback(async (signal?: AbortSignal) => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      const response = await fetch("/api/bookings", { cache: "no-store", signal });
      const json = (await response.json()) as BookingResponse;
      if (!response.ok) throw new Error(json.error || "Gagal memuat data booking.");

      const nextBookings = json.cameraBookings || {};
      setCameraBookings(nextBookings);
      const updatedAt = json.lastUpdatedAt || new Date().toISOString();
      setLastUpdatedAt(updatedAt);

      try {
        localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(nextBookings));
        localStorage.setItem(BOOKINGS_UPDATED_AT_KEY, updatedAt);
      } catch {
        // ignore storage error
      }
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      isFetchingRef.current = false;
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  const loadPromos = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/promo", { cache: "no-store", signal });
      const json = (await response.json()) as PromoResponse;
      if (!response.ok) throw new Error(json.error || "Gagal memuat promo.");

      const nextPromoDates = (json.rows || [])
        .filter((row) => row.active && row.quotaRemaining > 0)
        .map((row) => row.dateKey);
      setPromoDates(nextPromoDates);
    } catch {
      // ignore promo loading failure
    }
  }, []);

  useEffect(() => {
    lastUpdatedAtRef.current = lastUpdatedAt;
  }, [lastUpdatedAt]);

  useEffect(() => {
    const updateHomeScale = () => {
      if (typeof window === "undefined") return;
      if (window.innerWidth >= 640) {
        setHomeScale(1);
        return;
      }

      const shell = homeShellRef.current;
      if (!shell) return;

      const viewport = scrollViewportRef.current;
      const availableHeight = Math.max(0, (viewport?.clientHeight ?? window.innerHeight) - 8);
      if (homeBaselineHeightRef.current === null) {
        homeBaselineHeightRef.current = shell.scrollHeight;
      }

      const contentHeight = homeBaselineHeightRef.current || shell.scrollHeight;
      if (!contentHeight) {
        setHomeScale(1);
        return;
      }

      const nextScale = Math.min(1, availableHeight / contentHeight);
      setHomeScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    };

    updateHomeScale();

    window.addEventListener("resize", updateHomeScale);
    window.addEventListener("orientationchange", updateHomeScale);
    return () => {
      window.removeEventListener("resize", updateHomeScale);
      window.removeEventListener("orientationchange", updateHomeScale);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const id = setTimeout(() => void loadBookings(controller.signal), 0);
    const interval = setInterval(() => void loadBookings(), 3 * 60 * 60 * 1000);
    return () => {
      controller.abort();
      clearTimeout(id);
      clearInterval(interval);
    };
  }, [loadBookings]);

  useEffect(() => {
    const controller = new AbortController();
    void loadPromos(controller.signal);
    const interval = window.setInterval(() => void loadPromos(), 60 * 1000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [loadPromos]);

  useEffect(() => {
    const checkForRemoteUpdate = async () => {
      try {
        const response = await fetch("/api/bookings?meta=1", { cache: "no-store" });
        if (!response.ok) return;

        const json = (await response.json()) as Pick<BookingResponse, "lastUpdatedAt">;
        const remoteLastUpdatedAt = json.lastUpdatedAt || null;
        if (!remoteLastUpdatedAt) return;

        if (remoteLastUpdatedAt !== lastUpdatedAtRef.current) {
          window.location.reload();
        }
      } catch {
        // ignore meta polling failure
      }
    };

    const interval = window.setInterval(() => void checkForRemoteUpdate(), 5 * 1000);
    return () => window.clearInterval(interval);
  }, [loadBookings]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === BOOKINGS_STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue) as CameraBookings;
          if (parsed && typeof parsed === "object") setCameraBookings(parsed);
        } catch {
          // ignore invalid cache
        }
      }

      if (event.key === BOOKINGS_UPDATED_AT_KEY) {
        setLastUpdatedAt(event.newValue || null);
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const viewport = scrollViewportRef.current;
      const scrollTop = viewport ? viewport.scrollTop : window.scrollY;
      const shouldShow =
        scrollTop > 200 &&
        Boolean(selectedDate) &&
        Boolean(selectedCamera) &&
        window.innerWidth < 640;
      setShowStickyBook(shouldShow);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [selectedDate, selectedCamera]);

  useEffect(() => {
    const shouldForceLockMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const shouldLockScroll = shouldForceLockMobile || !selectedDate || showCaraBook || showPricelist || showRules;
    const body = document.body;
    const html = document.documentElement;

    if (shouldLockScroll) {
      body.style.overflow = "hidden";
      html.style.overflow = "hidden";
    } else {
      body.style.overflow = "";
      html.style.overflow = "";
    }

    return () => {
      body.style.overflow = "";
      html.style.overflow = "";
    };
  }, [selectedDate, showCaraBook, showPricelist, showRules]);

  const selectedDayStatus = selectedDate ? cameraBookings[selectedDate] : undefined;

  const cameraStates = useMemo(() => {
    if (!selectedDate) return [] as Array<{ key: CameraKey; status: "available" | "full" }>;
    return CAMERAS.map((camera) => {
      if (selectedDayStatus?.[camera]) {
        return { key: camera, status: "full" as const };
      }

      return { key: camera, status: "available" as const };
    });
  }, [selectedDate, selectedDayStatus]);

  function handleSelectDate(dateKey: string) {
    if (selectedDate === dateKey) {
      handleCloseSelectedDate();
      return;
    }
    setSelectedDate(dateKey);
    setSelectedCamera(null);
    setSelectedTime("00:00");
    requestAnimationFrame(() => scrollPageTo("bottom"));
  }

  function handleCloseSelectedDate() {
    setSelectedDate(null);
    setSelectedCamera(null);
    setSelectedTime("00:00");
    requestAnimationFrame(() => scrollPageTo("top"));
  }

  function openCaraBookModal() {
    setActiveTab("cara-book");
    setShowCaraBook(true);
  }

  function openPhotoGalleryModal() {
    setActiveTab("photo-gallery");
    setShowPhotoGallery(true);
  }

  function openPricelistModal() {
    setActiveTab("pricelist");
    setShowPricelist(true);
  }

  function openRulesModal() {
    setActiveTab("rules");
    setShowRules(true);
  }

  return (
    <main
      className={`${poppins.className} min-h-[100dvh] overflow-hidden bg-cover bg-center pb-0 lg:min-h-screen lg:overflow-visible lg:pb-40`}
      style={{
        backgroundImage:
          "linear-gradient(rgba(251, 113, 133, 0.2), rgba(251, 113, 133, 0.2)), url('/image/bg.png')",
      }}
    >
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <div className="absolute left-3 top-16 h-14 w-14 rounded-full bg-pink-200/35 blur-xl animate-[floatSoft_5.5s_ease-in-out_infinite]" />
        <div className="absolute right-3 top-16 h-12 w-12 rounded-full bg-rose-200/35 blur-xl animate-[floatSoft_6s_ease-in-out_infinite_0.8s]" />
        <div className="absolute left-3 bottom-16 h-12 w-12 rounded-full bg-fuchsia-200/30 blur-xl animate-[floatSoft_6.8s_ease-in-out_infinite_0.3s]" />
        <div className="absolute right-3 bottom-16 h-14 w-14 rounded-full bg-pink-100/50 blur-xl animate-[floatSoft_5.8s_ease-in-out_infinite_1.1s]" />
        <span className="absolute left-4 top-28 text-pink-300 animate-[floatSoft_4.6s_ease-in-out_infinite]">✨</span>
        <span className="absolute right-4 top-28 text-pink-300 animate-[floatSoft_5.2s_ease-in-out_infinite_0.6s]">♡</span>
        <span className="absolute left-4 bottom-28 text-pink-300 animate-[floatSoft_5s_ease-in-out_infinite_0.9s]">✿</span>
        <span className="absolute right-4 bottom-28 text-pink-300 animate-[floatSoft_6.2s_ease-in-out_infinite_0.4s]">✦</span>
        <span className="absolute left-4 top-1/2 text-pink-400/80 animate-[floatSpin_7s_ease-in-out_infinite]">📷</span>
        <span className="absolute right-4 top-1/2 text-pink-400/80 animate-[floatSpin_7.5s_ease-in-out_infinite_0.7s]">📷</span>
        <span className="absolute left-4 bottom-8 text-pink-400/80 animate-[floatSoft_6.4s_ease-in-out_infinite_0.5s]">🍒</span>
        <span className="absolute right-4 bottom-8 text-pink-400/80 animate-[floatSoft_6.9s_ease-in-out_infinite_0.2s]">🍒</span>
      </div>

      <Header />

      <div
        ref={scrollViewportRef}
        className="h-[calc(100dvh-60px)] w-full overflow-y-auto overscroll-contain lg:h-auto lg:overflow-visible"
      >
        <div
          ref={homeShellRef}
          className="mx-auto w-full max-w-[420px] origin-top px-3 pt-0 transition-transform duration-150 sm:pt-0"
          style={homeScale < 1 ? { transform: `scale(${homeScale})` } : undefined}
        >
          <TopTabs
            active={activeTab === "cara-book" ? "cara-book" : activeTab === "photo-gallery" ? "photo-gallery" : null}
            onOpenCaraBook={openCaraBookModal}
            onOpenPhotoGallery={openPhotoGalleryModal}
          />

          <div className="mt-3 space-y-3">
          <BookingCalendar
            activeMonth={activeMonth}
            setActiveMonth={setActiveMonth}
            cameraBookings={cameraBookings}
            promoDates={promoDates}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            lastUpdatedAt={lastUpdatedAt}
          />

            {selectedDate && (
              <SelectedDateCard
                selectedDateLabel={toReadableDate(selectedDate)}
                selectedDateRaw={selectedDate}
                selectedTime={selectedTime}
                onChangeTime={setSelectedTime}
                onOpenTimePicker={() => scrollPageTo("bottom")}
                onCloseSelectedDate={handleCloseSelectedDate}
                cameraStates={cameraStates}
                selectedCamera={selectedCamera}
                onSelectCamera={setSelectedCamera}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={openPricelistModal}
                className="rounded-2xl bg-white px-3 py-3 text-sm font-medium text-pink-700 shadow-sm"
              >
                {`Pricelist ${String.fromCodePoint(0x1f4b8)}`}
              </button>
              <button
                type="button"
                onClick={openRulesModal}
                className="rounded-2xl bg-white px-3 py-3 text-sm font-medium text-pink-700 shadow-sm"
              >
                {`Peraturan Booking${String.fromCodePoint(0x2757)}`}
              </button>
            </div>

            {error && <p className="rounded-2xl border border-pink-200 bg-pink-50 px-3 py-2 text-sm text-pink-700">{error}</p>}
            {isLoading && <p className="text-center text-xs text-zinc-500">Memuat data booking...</p>}
          </div>
        </div>
      </div>

      <StickyBookButton
        visible={showStickyBook}
        selectedDateLabel={selectedDate ? toReadableDate(selectedDate) : ""}
        selectedDateRaw={selectedDate || ""}
        selectedTime={selectedTime}
        selectedCamera={selectedCamera}
      />

      <CaraBookModal
        open={showCaraBook}
        onClose={() => {
          setShowCaraBook(false);
          setActiveTab(null);
        }}
      />
      <PricelistModal
        open={showPricelist}
        onClose={() => {
          setShowPricelist(false);
          setActiveTab(null);
        }}
      />
      <PhotoGalleryModal
        open={showPhotoGallery}
        onClose={() => {
          setShowPhotoGallery(false);
          setActiveTab(null);
        }}
      />
      <RulesModal
        open={showRules}
        onClose={() => {
          setShowRules(false);
          setActiveTab(null);
        }}
        rules={RULES}
      />
    </main>
  );
}
