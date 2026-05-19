import { cameraLabel, openBookingForm, type CameraKey } from "@/components/booking-form";

type StickyBookButtonProps = {
  visible: boolean;
  selectedDateLabel: string;
  selectedDateRaw: string;
  selectedTime: string;
  selectedCamera: CameraKey | null;
};

export default function StickyBookButton({ visible, selectedDateLabel, selectedDateRaw, selectedTime, selectedCamera }: StickyBookButtonProps) {
  if (!selectedCamera) return null;

  return (
    <button
      type="button"
      onClick={() =>
        openBookingForm({
          date: selectedDateRaw,
          camera: selectedCamera,
          time: selectedTime || "00:00",
        })
      }
      className={`sm:hidden fixed bottom-3 left-3 right-3 z-50 h-[56px] rounded-full bg-gradient-to-r from-[#FF7BA5] to-[#F64F8B] px-4 text-white shadow-xl transition-all ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0"
      }`}
    >
      <div className="text-sm font-bold">BOOK {cameraLabel(selectedCamera).toUpperCase()}</div>
      <div className="text-[11px]">{selectedDateLabel}</div>
    </button>
  );
}
