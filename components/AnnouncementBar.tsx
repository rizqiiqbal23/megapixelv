"use client";

type AnnouncementBarProps = {
  text: string | null | undefined;
  className?: string;
};

export default function AnnouncementBar({ text, className = "" }: AnnouncementBarProps) {
  const value = text?.trim();
  if (!value) return null;

  return (
    <div
      className={`relative flex h-10 items-center overflow-hidden rounded-full border px-3 shadow-sm ${className}`}
      style={{
        backgroundColor: "#FFF1F6",
        borderColor: "#F9D4E4",
      }}
      aria-live="polite"
    >
      <div
        className="announcement-marquee whitespace-nowrap text-[13px] font-medium leading-none sm:text-sm"
        style={{ color: "#E75480" }}
      >
        {value}
      </div>
    </div>
  );
}
