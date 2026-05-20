type TopTabsProps = {
  active: "cara-book" | "photo-gallery" | null;
  onOpenCaraBook: () => void;
  onOpenPhotoGallery: () => void;
};

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-full px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${
        active ? "bg-gradient-to-r from-[#FF7BA5] to-[#F64F8B] text-white" : "text-pink-700 hover:bg-pink-50"
      }`}
    >
      {label}
    </button>
  );
}

export default function TopTabs({ active, onOpenCaraBook, onOpenPhotoGallery }: TopTabsProps) {
  return (
    <div className="mx-auto mt-3 w-full max-w-[420px] px-3">
      <div className="flex h-[44px] items-center justify-center rounded-full border border-pink-100 bg-white shadow-sm">
        <TabButton label="Cara Book" active={active === "cara-book"} onClick={onOpenCaraBook} />
        <TabButton label="Photo Gallery" active={active === "photo-gallery"} onClick={onOpenPhotoGallery} />
      </div>
    </div>
  );
}
