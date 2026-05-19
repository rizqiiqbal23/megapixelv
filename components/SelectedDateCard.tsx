import CameraCard, { type CameraAvailability } from "@/components/CameraCard";
import { cameraLabel, openBookingForm, type CameraKey } from "@/components/booking-form";

const CALENDAR_ICON = String.fromCodePoint(0x1f5d3);

type SelectedDateCardProps = {
  selectedDateLabel: string;
  selectedDateRaw: string;
  cameraStates: Array<{ key: CameraKey; status: CameraAvailability }>;
  selectedCamera: CameraKey | null;
  onSelectCamera: (camera: CameraKey) => void;
};

export default function SelectedDateCard({
  selectedDateLabel,
  selectedDateRaw,
  cameraStates,
  selectedCamera,
  onSelectCamera,
}: SelectedDateCardProps) {
  const availableCount = cameraStates.filter((item) => item.status !== "full").length;

  const canBook = Boolean(selectedCamera);
  const buttonLabel = canBook ? `BOOK ${cameraLabel(selectedCamera as CameraKey).toUpperCase()}` : "Pilih kamera terlebih dahulu";

  return (
    <section className="rounded-3xl border border-pink-100 bg-white p-4 shadow-[0_10px_25px_rgba(246,79,139,0.08)]">
      <div className="mb-3 flex items-center gap-2 text-pink-600">
        <span>{CALENDAR_ICON}</span>
        <h3 className="text-sm font-semibold text-[#333333] sm:text-base">{selectedDateLabel}</h3>
      </div>
      <p className="mb-4 text-xs text-zinc-600">Tersedia {availableCount} dari 3 kamera</p>

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
        onClick={canBook ? () => openBookingForm(selectedDateRaw, cameraLabel(selectedCamera as CameraKey)) : undefined}
        className={`mt-4 h-[52px] w-full rounded-full border text-sm font-semibold transition ${
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
