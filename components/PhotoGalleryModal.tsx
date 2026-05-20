"use client";

import { useEffect, useRef, useState } from "react";

type PhotoGalleryModalProps = {
  open: boolean;
  onClose: () => void;
};

const CAMERA_GROUPS = [
  {
    label: "Nikon",
    photos: [
      {
        id: "1eHpT3MOSaNPcitJc6rBG-i2Lkch7pQle",
        alt: "Nikon sample photo",
      },
    ],
    accent: "from-emerald-100 to-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
  {
    label: "Kodak",
    photos: [],
    accent: "from-amber-100 to-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
  },
  {
    label: "Casio",
    photos: [],
    accent: "from-rose-100 to-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
  },
] as const;

const CAMERA_ICON = String.fromCodePoint(0x1f4f7);

export default function PhotoGalleryModal({ open, onClose }: PhotoGalleryModalProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [panelScale, setPanelScale] = useState(1);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState("");

  useEffect(() => {
    if (!open) return;

    const updateScale = () => {
      if (typeof window === "undefined") return;
      const shell = shellRef.current;
      if (!shell) return;

      const availableHeight = Math.max(0, window.innerHeight - 12);
      const contentHeight = shell.scrollHeight;
      const nextScale = Math.min(1, availableHeight / contentHeight);
      setPanelScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    };

    updateScale();

    window.addEventListener("resize", updateScale);
    window.addEventListener("orientationchange", updateScale);
    return () => {
      window.removeEventListener("resize", updateScale);
      window.removeEventListener("orientationchange", updateScale);
    };
  }, [open]);

  if (!open) return null;

  const getDriveImageUrl = (fileId: string) => `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;

  return (
    <div className="fixed inset-0 z-50 bg-black/35" onClick={onClose}>
      <div className="absolute inset-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div
          ref={shellRef}
          className="absolute bottom-0 left-0 right-0 flex h-[100dvh] origin-bottom flex-col overflow-hidden rounded-t-3xl bg-white p-4 shadow-2xl"
          style={
            panelScale < 1
              ? { transform: `scale(${panelScale})`, width: `${100 / panelScale}%`, left: `${(100 - 100 / panelScale) / 2}%` }
              : undefined
          }
        >
          <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-pink-100" />
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-pink-700">Photo Gallery</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-pink-200 bg-white px-3 py-1 text-[11px] font-medium text-pink-700"
            >
              Kembali
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <div className="mb-3 rounded-2xl border border-pink-200 bg-pink-50 px-3 py-2 text-xs text-pink-700">
              Galeri ini akan menampilkan foto hasil jepretan Nikon, Kodak, dan Casio.
            </div>

            <div className="grid gap-3">
              {CAMERA_GROUPS.map((group) => (
                <section key={group.label} className={`rounded-3xl border ${group.border} bg-gradient-to-br ${group.accent} p-3`}>
                  <div className={`mb-2 flex items-center justify-between ${group.text}`}>
                    <div className="flex items-center gap-2">
                      <span>{CAMERA_ICON}</span>
                      <h4 className="text-sm font-semibold">{group.label}</h4>
                    </div>
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]">
                      Coming soon
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {group.photos.length ? (
                      group.photos.map((photo) => (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => {
                            setLightboxSrc(getDriveImageUrl(photo.id));
                            setLightboxAlt(photo.alt);
                          }}
                          className="relative aspect-square overflow-hidden rounded-2xl border border-white/80 bg-white/55 shadow-sm transition hover:scale-[1.02]"
                        >
                          <img
                            src={getDriveImageUrl(photo.id)}
                            alt={photo.alt}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(event) => {
                              event.currentTarget.src = `https://drive.google.com/uc?export=view&id=${photo.id}`;
                            }}
                          />
                        </button>
                      ))
                    ) : (
                      Array.from({ length: 3 }, (_, index) => (
                        <div
                          key={`${group.label}-${index}`}
                          className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-white/80 bg-white/55 text-[10px] font-medium text-zinc-500"
                        >
                          Foto {index + 1}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>

      {lightboxSrc ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="relative h-[100dvh] w-full max-w-[100vw]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxSrc(null)}
              className="absolute right-2 top-2 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-pink-700 shadow-lg"
            >
              Kembali
            </button>
            <div className="flex h-full items-center justify-center">
              <img
                src={lightboxSrc}
                alt={lightboxAlt}
                className="max-h-full max-w-full object-contain shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
