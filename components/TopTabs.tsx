type TopTabsProps = {
  active: "pricelist" | "rules" | null;
  onOpenPricelist: () => void;
  onOpenRules: () => void;
};

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-full px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${
        active
          ? "bg-gradient-to-r from-[#FF7BA5] to-[#F64F8B] text-white"
          : "text-pink-700 hover:bg-pink-50"
      }`}
    >
      {label}
    </button>
  );
}

export default function TopTabs({ active, onOpenPricelist, onOpenRules }: TopTabsProps) {
  return (
    <div className="mx-auto mt-3 w-full max-w-[420px] px-3">
      <div className="flex h-[44px] items-center justify-center gap-2 rounded-full border border-pink-100 bg-white shadow-sm">
        <TabButton label="Pricelist" active={active === "pricelist"} onClick={onOpenPricelist} />
        <TabButton label="Peraturan Booking" active={active === "rules"} onClick={onOpenRules} />
      </div>
    </div>
  );
}

