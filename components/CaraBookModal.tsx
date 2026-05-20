type CaraBookModalProps = {
  open: boolean;
  onClose: () => void;
};

const STEPS = [
  "Buka halaman booking, lalu klik tanggal yang kamu inginkan di kalender.",
  "Setelah tanggal dipilih, daftar kamera akan muncul di bawah kalender.",
  "Pilih kamera yang sesuai dengan kebutuhanmu.",
  "Setelah kamera dipilih, tombol BOOK akan aktif.",
  "Tekan BOOK untuk membuka Google Form yang sudah terisi otomatis dengan tanggal dan kamera pilihanmu.",
  "Lengkapi form, lalu kirim booking. Tim kami akan memproses pesanan sesuai urutan pembayaran DP. 💖",
];

export default function CaraBookModal({ open, onClose }: CaraBookModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/35" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 flex h-[100dvh] flex-col overflow-hidden rounded-t-3xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-pink-100" />
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-pink-700">Cara Book</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-pink-200 bg-white px-3 py-1 text-[11px] font-medium text-pink-700"
          >
            Kembali
          </button>
        </div>

        <div className="flex-1 overflow-hidden pr-1">
          <div className="mb-3 rounded-2xl border border-pink-200 bg-pink-50 px-3 py-2 text-sm text-pink-700">
            💖 klik tanggal yang kamu mau, pilih kamera, lalu BOOK! 📸💕
          </div>

          <ol className="space-y-2 text-sm text-[#333333]">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-3 rounded-2xl border border-pink-100 bg-[#FFF7FA] px-3 py-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#FF7BA5] to-[#F64F8B] text-xs font-bold text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
