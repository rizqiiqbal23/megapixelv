import { promises as fs } from "node:fs";
import path from "node:path";

type CameraLabel = "Nikon" | "Kodak" | "Casio";

type GalleryPhoto = {
  id: string;
  alt: string;
};

type GalleryGroup = {
  label: CameraLabel;
  photos: GalleryPhoto[];
};

const CAMERA_LABELS: CameraLabel[] = ["Nikon", "Kodak", "Casio"];

function getFileIdFromDriveUrl(url: string): string | null {
  const match = url.match(/\/file\/d\/([^/]+)/i);
  return match?.[1] ?? null;
}

function parseGalleryData(content: string): GalleryGroup[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = new Map<CameraLabel, GalleryPhoto[]>();

  for (let index = 0; index < lines.length; index += 2) {
    const label = lines[index] as CameraLabel;
    const urlsLine = lines[index + 1] ?? "";
    if (!CAMERA_LABELS.includes(label)) continue;

    const photos = urlsLine
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean)
      .map((url, photoIndex) => {
        const id = getFileIdFromDriveUrl(url);
        if (!id) return null;

        return {
          id,
          alt: `${label} photo ${photoIndex + 1}`,
        };
      })
      .filter((photo): photo is GalleryPhoto => photo !== null);

    parsed.set(label, photos);
  }

  return CAMERA_LABELS.map((label) => ({
    label,
    photos: parsed.get(label) ?? [],
  }));
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "list_image.txt");
    const content = await fs.readFile(filePath, "utf-8");
    const groups = parseGalleryData(content);
    return Response.json({ groups });
  } catch {
    return Response.json({ groups: [] }, { status: 500 });
  }
}
