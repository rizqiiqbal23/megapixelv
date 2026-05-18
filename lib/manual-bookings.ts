import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { CAMERAS, type CameraStatus, type ManualOverrides } from "@/lib/cameras";

export type { CameraStatus, ManualOverrides };

const DATA_DIR = path.join(process.cwd(), "data");
const OVERRIDES_FILE = path.join(DATA_DIR, "manual-bookings.json");

function emptyOverrides(): ManualOverrides {
  return {};
}

export async function readManualOverrides(): Promise<ManualOverrides> {
  try {
    const raw = await readFile(OVERRIDES_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return emptyOverrides();
    return parsed as ManualOverrides;
  } catch {
    return emptyOverrides();
  }
}

export async function writeManualOverrides(overrides: ManualOverrides): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(OVERRIDES_FILE, JSON.stringify(overrides, null, 2), "utf8");
}

export function mergeManualOverrides(
  cameraBookings: Record<string, CameraStatus>,
  overrides: ManualOverrides
): Record<string, CameraStatus> {
  const merged: Record<string, CameraStatus> = {};

  for (const [dateKey, status] of Object.entries(cameraBookings)) {
    merged[dateKey] = { ...status };
  }

  for (const [dateKey, status] of Object.entries(overrides)) {
    if (!merged[dateKey]) {
      merged[dateKey] = { nikon: false, casio: false, kodak: false };
    }

    for (const camera of CAMERAS) {
      const value = status[camera];
      if (typeof value === "boolean") {
        merged[dateKey][camera] = value;
      }
    }
  }

  return merged;
}
