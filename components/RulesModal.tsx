type RulesModalProps = {
  open: boolean;
  onClose: () => void;
  rules: string[];
};

const HEART = String.fromCodePoint(0x2661);

export default function RulesModal({ open, onClose, rules }: RulesModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/35" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 flex h-[100dvh] flex-col overflow-hidden rounded-t-3xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-pink-100" />
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-pink-700">Peraturan Booking</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-pink-200 bg-white px-3 py-1 text-[11px] font-medium text-pink-700"
          >
            Kembali
          </button>
        </div>
        <div className="flex-1 overflow-hidden pr-1">
          <ul className="space-y-2 text-sm text-[#333333]">
            {rules.map((rule) => (
              <li key={rule} className="flex items-start gap-2">
                <span className="text-pink-500">{HEART}</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 rounded-2xl border border-pink-200 bg-pink-50 px-3 py-2 text-xs font-semibold text-pink-700">
            Yang akan diproses adalah yang DP terlebih dahulu.
          </div>
        </div>
      </div>
    </div>
  );
}
