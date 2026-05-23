"use client";

const ANNOUNCEMENT_SPEED_SECONDS = 15;

type AnnouncementBarProps = {
  text: string | null | undefined;
  className?: string;
};

export default function AnnouncementBar({ text, className = "" }: AnnouncementBarProps) {
  const value = text?.trim();
  if (!value) return null;

  return (
    <div
      className={`relative flex h-5 items-center overflow-hidden rounded-none border px-2 shadow-sm ${className}`}
      style={{
        backgroundColor: "#FFF1F6",
        borderColor: "#F9D4E4",
      }}
      aria-live="polite"
    >
      <div
        className="announcement-marquee-track flex w-max items-center whitespace-nowrap text-[9px] font-medium leading-none sm:text-[10px]"
        style={{ color: "#E75480", animationDuration: `${ANNOUNCEMENT_SPEED_SECONDS}s` }}
      >
        <span className="flex-shrink-0 pr-8">{value}</span>
        <span aria-hidden="true" className="flex-shrink-0 pr-8">
          {value}
        </span>
      </div>
    </div>
  );
}
