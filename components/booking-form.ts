export type CameraKey = "nikon" | "casio" | "kodak";

const CAMERA_LABELS: Record<CameraKey, string> = {
  nikon: "Nikon",
  casio: "Casio",
  kodak: "Kodak",
};

export function cameraLabel(camera: CameraKey): string {
  return CAMERA_LABELS[camera];
}

type BookingFormInput = {
  date: string;
  camera: CameraKey;
  time?: string;
};

export function openBookingForm({ date, camera, time }: BookingFormInput) {
  const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfQEfEwQycrM2auRb86SWMcYLq64B7Li7I2PaCSSJqBwosTgg/viewform?usp=pp_url";
  const DATE_TIME_ENTRY = "entry.1585171895";
  const CAMERA_ENTRY = "entry.235456864";

  const dateTimeValue = `${date} ${time || "00:00"}`;
  const params = new URLSearchParams({
    [CAMERA_ENTRY]: cameraLabel(camera),
    [DATE_TIME_ENTRY]: dateTimeValue,
  });

  const url = `${FORM_URL}&${params.toString()}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

