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

type PromoConsumeResponse = {
  promoApplied?: boolean;
  promoCode?: string | null;
};

async function consumePromo(date: string): Promise<string | null> {
  try {
    const response = await fetch("/api/promo/consume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateKey: date }),
    });
    const json = (await response.json()) as PromoConsumeResponse;
    if (!response.ok) return null;
    return json?.promoCode || null;
  } catch {
    return null;
  }
}

function buildBookingFormUrl({ date, camera, time, promoCode }: BookingFormInput & { promoCode?: string | null }) {
  const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfQEfEwQycrM2auRb86SWMcYLq64B7Li7I2PaCSSJqBwosTgg/viewform?usp=pp_url";
  const DATE_TIME_ENTRY = "entry.1585171895";
  const CAMERA_ENTRY = "entry.235456864";
  const PROMO_CODE_PARAM = process.env.NEXT_PUBLIC_GOOGLE_FORM_PROMO_ENTRY_ID || "promo_code";

  const params = new URLSearchParams({
    [CAMERA_ENTRY]: cameraLabel(camera),
    [DATE_TIME_ENTRY]: `${date} ${time || "00:00"}`,
  });

  if (promoCode) {
    params.set(PROMO_CODE_PARAM, promoCode);
  }

  return `${FORM_URL}&${params.toString()}`;
}

export async function openBookingForm({ date, camera, time }: BookingFormInput) {
  const promoCode = await consumePromo(date);
  const url = buildBookingFormUrl({ date, camera, time, promoCode });
  window.location.assign(url);
}

