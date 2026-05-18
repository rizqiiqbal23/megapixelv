import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MATERIAL_PRICE_PER_GRAM: Record<string, number> = {
  PLA: 600,
  PETG: 750,
  ABS: 800,
};

const MACHINE_COST = 50000;

export const runtime = "nodejs";

function parseFilamentWeight(gcode: string): number | null {
  const byWeight = gcode.match(/;\s*filament used \[g\]\s*=\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (byWeight?.[1]) {
    return Number(byWeight[1]);
  }

  return null;
}

export async function POST(request: Request) {
  let stlPath: string | null = null;
  let gcodePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const material = formData.get("material");
    const infillValue = formData.get("infill");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "File STL wajib diunggah." },
        { status: 400 }
      );
    }

    const allowedMaterials = new Set(["PLA", "PETG", "ABS"]);
    if (typeof material !== "string" || !allowedMaterials.has(material)) {
      return NextResponse.json(
        { error: "Material tidak valid." },
        { status: 400 }
      );
    }

    const infill = Number(infillValue);
    if (!Number.isFinite(infill) || infill < 10 || infill > 100) {
      return NextResponse.json(
        { error: "Infill harus berada di rentang 10 sampai 100." },
        { status: 400 }
      );
    }

    const prusaSlicerPath =
      process.env.PRUSASLICER_PATH || "prusa-slicer-console.exe";
    const prusaSlicerConfigPath = process.env.PRUSASLICER_CONFIG_PATH;

    if (!prusaSlicerConfigPath) {
      return NextResponse.json(
        {
          error:
            "Server belum dikonfigurasi. Set PRUSASLICER_CONFIG_PATH ke file config PrusaSlicer (.ini).",
        },
        { status: 500 }
      );
    }

    const safeBase = `calc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    stlPath = join(tmpdir(), `${safeBase}.stl`);
    gcodePath = join(tmpdir(), `${safeBase}.gcode`);

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    await fs.writeFile(stlPath, fileBytes);

    await execFileAsync(prusaSlicerPath, [
      "--load",
      prusaSlicerConfigPath,
      "--export-gcode",
      "--output",
      gcodePath,
      "--fill-density",
      `${infill}%`,
      stlPath,
    ]);

    const gcode = await fs.readFile(gcodePath, "utf8");
    const weight = parseFilamentWeight(gcode);

    if (!Number.isFinite(weight) || !weight || weight <= 0) {
      return NextResponse.json(
        {
          error:
            "Gagal membaca berat filament dari output PrusaSlicer. Pastikan profil slicing valid.",
        },
        { status: 500 }
      );
    }

    const pricePerGram = MATERIAL_PRICE_PER_GRAM[material];
    const totalPrice = Math.round(weight * pricePerGram + MACHINE_COST);

    return NextResponse.json({
      weight: Math.round(weight),
      price: totalPrice,
    });
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses request." },
      { status: 500 }
    );
  } finally {
    const cleanupTasks: Array<Promise<unknown>> = [];
    if (stlPath) cleanupTasks.push(fs.unlink(stlPath).catch(() => null));
    if (gcodePath) cleanupTasks.push(fs.unlink(gcodePath).catch(() => null));
    await Promise.all(cleanupTasks);
  }
}
