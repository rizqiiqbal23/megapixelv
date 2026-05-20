type PricelistModalProps = {
  open: boolean;
  onClose: () => void;
};

const PRICES = [
  ["6 jam", "30.000"],
  ["12 jam", "45.000"],
  ["1 hari", "70.000"],
  ["2 hari", "120.000"],
  ["3 hari", "180.000"],
  ["4 hari", "250.000"],
  ["5 hari", "320.000"],
  ["6 hari", "400.000"],
  ["7 hari", "450.000"],
] as const;

export default function PricelistModal({ open, onClose }: PricelistModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/35" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 flex h-[100dvh] flex-col overflow-hidden rounded-t-3xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-pink-100" />
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-pink-700">Pricelist</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-pink-200 bg-white px-3 py-1 text-[11px] font-medium text-pink-700"
          >
            Kembali
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="overflow-hidden rounded-2xl border border-[#F9D4E4]">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-pink-100 to-[#FFF0F7] text-pink-700">
                <tr>
                  <th className="px-4 py-3 text-left">Durasi</th>
                  <th className="px-4 py-3 text-right">Harga Sewa</th>
                </tr>
              </thead>
              <tbody className="bg-[#FFF7FA]">
                {PRICES.map(([durasi, harga]) => (
                  <tr key={durasi} className="border-t border-pink-100">
                    <td className="px-4 py-2.5 text-[#333333]">{durasi}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[#F64F8B]">{harga}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-center">
            <img src="/image/logo1.png" alt="Logo Pricelist" className="h-16 w-auto object-contain" />
          </div>
        </div>
      </div>
    </div>
  );
}
