import { cameraLabel, type CameraKey } from "@/components/booking-form";

export type CameraAvailability = "available" | "full";

type CameraCardProps = {
  camera: CameraKey;
  status: CameraAvailability;
  selected: boolean;
  onSelect: () => void;
};

function badgeStyle(status: CameraAvailability): string {
  if (status === "available") return "bg-emerald-100 text-emerald-700";
  return "bg-rose-100 text-rose-700";
}

function badgeLabel(status: CameraAvailability): string {
  if (status === "available") return "Available";
  return "Booked";
}

export default function CameraCard({ camera, status, selected, onSelect }: CameraCardProps) {
  const selectable = status !== "full";

  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={selectable ? onSelect : undefined}
      className={`w-full rounded-xl border p-3 text-left transition ${
        selected
          ? "border-pink-300 bg-pink-50"
          : "border-pink-100 bg-white"
      } ${selectable ? "hover:scale-[1.01]" : "opacity-70 cursor-not-allowed"}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#333333]">{cameraLabel(camera)}</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeStyle(status)}`}>{badgeLabel(status)}</span>
      </div>
      {selected && <p className="mt-2 text-xs font-medium text-pink-700">✓ Dipilih</p>}
    </button>
  );
}

