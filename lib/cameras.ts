export const CAMERAS = ["nikon", "casio", "kodak"] as const;

export type CameraName = (typeof CAMERAS)[number];
export type CameraStatus = Record<CameraName, boolean>;
export type ManualOverrides = Record<string, Partial<CameraStatus>>;
