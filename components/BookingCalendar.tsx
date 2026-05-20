import { type CameraKey } from "@/components/booking-form";

export type DayCameraStatus = Record<CameraKey, boolean>;
export type CameraBookings = Record<string, DayCameraStatus>;

const WEEK_DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const ICON_AVAILABLE = String.fromCodePoint(0x2705);
const ICON_LIMITED = String.fromCodePoint(0x23f3);
const ICON_FULL = String.fromCodePoint(0x26d4);

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

function getDayType(status?: DayCameraStatus): "empty" | "partial" | "full" {
  if (!status) return "empty";

  const bookedCount = ["nikon", "casio", "kodak"].filter((camera) => status[camera as CameraKey]).length;
  if (bookedCount === 0) return "empty";
  if (bookedCount === 3) return "full";
  return "partial";
}

function getDayTypeClass(type: "empty" | "partial" | "full"): string {
  if (type === "empty") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (type === "partial") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function getDayTypeIcon(type: "empty" | "partial" | "full"): string {
  if (type === "empty") return ICON_AVAILABLE;
  if (type === "partial") return ICON_LIMITED;
  return ICON_FULL;
}

type BookingCalendarProps = {
  activeMonth: Date;
  setActiveMonth: (next: Date) => void;
  cameraBookings: CameraBookings;
  promoDates: string[];
  selectedDate: string | null;
  onSelectDate: (dateKey: string) => void;
  lastUpdatedAt: string | null;
};

export default function BookingCalendar({
  activeMonth,
  setActiveMonth,
  cameraBookings,
  promoDates,
  selectedDate,
  onSelectDate,
  lastUpdatedAt,
}: BookingCalendarProps) {
  const year = activeMonth.getFullYear();
  const month = activeMonth.getMonth();

  const monthLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(activeMonth);

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const maxMonthStart = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  const canGoPrev = activeMonth.getTime() > currentMonthStart.getTime();
  const canGoNext = activeMonth.getTime() < maxMonthStart.getTime();

  const cells = buildCalendarDays(year, month);
  const promoSet = new Set(promoDates);

  return (
    <section className="rounded-3xl border border-pink-100 bg-white p-4 shadow-[0_10px_25px_rgba(246,79,139,0.08)]">
      <div className="mb-3 flex items-center justify-between">
        {canGoPrev ? (
          <button
            type="button"
            onClick={() => setActiveMonth(new Date(year, month - 1, 1))}
            className="h-9 w-9 rounded-xl border border-pink-200 bg-white text-pink-700"
          >
            ‹
          </button>
        ) : (
          <div className="h-9 w-9" />
        )}
        <h2 className="text-sm font-semibold text-[#333333] sm:text-base">Kalender Booking {monthLabel}</h2>
        {canGoNext ? (
          <button
            type="button"
            onClick={() => setActiveMonth(new Date(year, month + 1, 1))}
            className="h-9 w-9 rounded-xl border border-pink-200 bg-white text-pink-700"
          >
            ›
          </button>
        ) : (
          <div className="h-9 w-9" />
        )}
      </div>

      <p className="mb-3 text-center text-[11px] text-zinc-500">
        Update terakhir: {lastUpdatedAt ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(lastUpdatedAt)) : "-"}
      </p>

      <div className="mb-3 flex flex-wrap gap-1.5 text-[10px]">
        <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">{ICON_AVAILABLE} Available</span>
        <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">{ICON_LIMITED} Limited</span>
        <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">{ICON_FULL} Full</span>
      </div>

      <div className="mb-3 rounded-2xl border border-[#F9D4E4] bg-[#FFF7FA] p-3 text-xs text-zinc-600">
        <p><span className="font-semibold text-emerald-600">Available</span> semua slot kosong.</p>
        <p><span className="font-semibold text-amber-600">Limited</span> sebagian kamera sudah terisi.</p>
        <p><span className="font-semibold text-rose-600">Full</span> semua kamera terisi.</p>
        <p className="mt-2 font-medium text-pink-600">Yang masuk kalender hanya yang sudah DP.</p>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-pink-700">
        {WEEK_DAYS.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell) => {
          if (!cell.day) {
            return <div key={cell.key} className="h-14 rounded-xl bg-pink-50/40" />;
          }

          const dateKey = toDateKey(year, month, cell.day);
          const dayType = getDayType(cameraBookings[dateKey]);
          const isSelected = selectedDate === dateKey;
          const hasPromo = promoSet.has(dateKey);

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              className={`relative h-14 overflow-hidden rounded-xl border p-1 text-left transition ${getDayTypeClass(dayType)} hover:scale-[1.03] ${
                hasPromo ? "border-pink-400 bg-[#FFF1F8] shadow-[0_0_0_2px_rgba(255,123,165,0.14)]" : ""
              } ${
                isSelected ? "border-pink-400 ring-2 ring-pink-300 shadow-[0_0_0_3px_rgba(246,79,139,0.14)] scale-[1.03]" : ""
              }`}
            >
              {hasPromo ? (
                <span className="absolute -right-1 top-1 rotate-45 rounded-full bg-gradient-to-r from-[#FF7BA5] to-[#F64F8B] px-1 py-0.5 text-[6px] font-bold uppercase tracking-[0.18em] text-white shadow-sm">
                  Promo
                </span>
              ) : null}
              <div className="text-sm font-semibold leading-none">{cell.day}</div>
              <div className={`mt-1 text-xs ${hasPromo ? "pr-10" : ""}`}>{getDayTypeIcon(dayType)}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
