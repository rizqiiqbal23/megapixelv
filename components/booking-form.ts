export type CameraKey = "nikon" | "casio" | "kodak";

const CAMERA_LABELS: Record<CameraKey, string> = {
  nikon: "Nikon",
  casio: "Casio",
  kodak: "Kodak",
};

export function cameraLabel(camera: CameraKey): string {
  return CAMERA_LABELS[camera];
}

export function openBookingForm(date: string, camera: string) {
  const FORM_URL = "https://docs.google.com/forms/d/e/FORM_ID/viewform?usp=pp_url";
  const DATE_ENTRY = "entry.111111111";
  const CAMERA_ENTRY = "entry.222222222";

  const url = `${FORM_URL}&${DATE_ENTRY}=${encodeURIComponent(date)}&${CAMERA_ENTRY}=${encodeURIComponent(camera)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

