"use client";

import { useEffect, useMemo, useState } from "react";

import CameraCard, { type CameraAvailability } from "@/components/CameraCard";
import { cameraLabel, openBookingForm, type CameraKey } from "@/components/booking-form";

const CALENDAR_ICON = String.fromCodePoint(0x1f5d3);
const EDIT_LABEL = "edit";
const TIME_HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const TIME_MINUTES = ["00", "15", "30", "45"];

type SelectedDateCardProps = {
  selectedDateLabel: string;
  selectedDateRaw: string;
  selectedTime: string;
  onChangeTime: (time: string) => void;
  onOpenTimePicker: () => void;
  onCloseSelectedDate: () => void;
  cameraStates: Array<{ key: CameraKey; status: CameraAvailability }>;
  selectedCamera: CameraKey | null;
  onSelectCamera: (camera: CameraKey) => void;
};

export default function SelectedDateCard({
  selectedDateLabel,
  selectedDateRaw,
  selectedTime,
  onChangeTime,
  onOpenTimePicker,
  onCloseSelectedDate,
  cameraStates,
  selectedCamera,
  onSelectCamera,
}: SelectedDateCardProps) {
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const availableCount = cameraStates.filter((item) => item.status !== "full").length;

  const [selectedHour, selectedMinute] = useMemo(() => {
    const [hour = "00", minute = "00"] = selectedTime.split(":");
    return [hour.padStart(2, "0"), minute.padStart(2, "0")];
  }, [selectedTime]);

  const canBook = Boolean(selectedCamera);
  const buttonLabel = canBook ? `BOOK ${cameraLabel(selectedCamera as CameraKey).toUpperCase()}` : "Pilih kamera terlebih dahulu";

  const updateTime = (nextHour?: string, nextMinute?: string) => {
    const hour = nextHour ?? selectedHour;
    const minute = nextMinute ?? selectedMinute;
    onChangeTime(`${hour}:${minute}`);
  };

  useEffect(() => {
    if (!isTimePickerOpen) return;
    const id = window.setTimeout(() => onOpenTimePicker(), 0);
    return () => window.clearTimeout(id);
  }, [isTimePickerOpen, onOpenTimePicker]);

  return (
    <section className="relative rounded-3xl border border-pink-100 bg-white p-4 shadow-[0_10px_25px_rgba(246,79,139,0.08)]">
      <button
        type="button"
        onClick={onCloseSelectedDate}
        className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border border-pink-200 bg-white text-[11px] font-bold text-pink-500 shadow-sm transition hover:bg-pink-50"
        aria-label="Tutup status kamera"
      >
        ×
      </button>

      <div className="mb-3 flex items-center gap-2 pr-8 text-pink-600">
        <span>{CALENDAR_ICON}</span>
        <h3 className="text-sm font-semibold text-[#333333] sm:text-base">{selectedDateLabel}</h3>
      </div>
      <p className="mb-4 text-xs text-zinc-600">Tersedia {availableCount} dari 3 kamera</p>

      <div className="mb-4 rounded-3xl border border-pink-200 bg-pink-50/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex h-6 items-center rounded-full bg-pink-200/70 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-pink-700">
            {EDIT_LABEL}
          </span>
          <label className="block text-xs font-medium text-pink-700">Jam sewa</label>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsTimePickerOpen((value) => {
              const nextValue = !value;
              if (nextValue) onOpenTimePicker();
              return nextValue;
            });
          }}
          className="flex h-12 w-full items-center justify-between rounded-2xl border border-pink-200 bg-white px-4 text-sm font-medium text-pink-700 shadow-sm transition hover:border-pink-300 hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-200"
        >
          <span>{selectedTime || "00:00"}</span>
          <span className="rounded-full bg-pink-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-pink-700">
            {EDIT_LABEL}
          </span>
        </button>

        {isTimePickerOpen ? (
          <div className="mt-3 rounded-3xl border border-pink-100 bg-white p-3 shadow-[0_12px_28px_rgba(246,79,139,0.12)]">
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-pink-500">Jam</p>
                <div className="grid max-h-44 grid-cols-3 gap-2 overflow-y-auto pr-1">
                  {TIME_HOURS.map((hour) => {
                    const active = hour === selectedHour;
                    return (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => updateTime(hour)}
                        className={`rounded-2xl border px-0 py-2 text-sm font-semibold transition ${
                          active
                            ? "border-pink-400 bg-pink-500 text-white shadow-sm"
                            : "border-pink-100 bg-pink-50 text-pink-700 hover:border-pink-300 hover:bg-pink-100"
                        }`}
                      >
                        {hour}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-pink-500">Menit</p>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_MINUTES.map((minute) => {
                    const active = minute === selectedMinute;
                    return (
                      <button
                        key={minute}
                        type="button"
                        onClick={() => updateTime(undefined, minute)}
                        className={`rounded-2xl border px-0 py-2 text-sm font-semibold transition ${
                          active
                            ? "border-pink-400 bg-pink-500 text-white shadow-sm"
                            : "border-pink-100 bg-pink-50 text-pink-700 hover:border-pink-300 hover:bg-pink-100"
                        }`}
                      >
                        {minute}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-pink-500">Pilih jam lalu menit, hasilnya otomatis dipakai saat BOOK.</p>
              <button
                type="button"
                onClick={() => setIsTimePickerOpen(false)}
                className="rounded-full border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-semibold text-pink-700 transition hover:bg-pink-100"
              >
                Selesai
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-2.5">
        {cameraStates.map((camera) => (
          <CameraCard
            key={camera.key}
            camera={camera.key}
            status={camera.status}
            selected={selectedCamera === camera.key}
            onSelect={() => onSelectCamera(camera.key)}
          />
        ))}
      </div>

      <button
        type="button"
        disabled={!canBook}
        onClick={
          canBook
            ? () =>
                openBookingForm({
                  date: selectedDateRaw,
                  camera: selectedCamera as CameraKey,
                  time: selectedTime || "00:00",
                })
            : undefined
        }
        className={`mt-4 hidden h-[52px] w-full rounded-full border text-sm font-semibold transition sm:inline-flex sm:items-center sm:justify-center ${
          canBook
            ? "border-pink-300 text-pink-700 hover:bg-gradient-to-r hover:from-[#FF7BA5] hover:to-[#F64F8B] hover:text-white"
            : "border-pink-200 bg-pink-50 text-pink-300"
        }`}
      >
        {buttonLabel}
      </button>
    </section>
  );
}
