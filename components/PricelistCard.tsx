import Link from "next/link";

type PriceRow = {
  duration: string;
  price: string;
};

type PricelistCardProps = {
  rows: PriceRow[];
};

function CuteCherryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 48" className={className} aria-hidden="true">
      <path d="M32 22 C28 10, 34 6, 42 6" stroke="#4A9F58" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M33 22 C36 10, 28 6, 20 6" stroke="#4A9F58" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M41 5 C46 1, 53 2, 57 6 C52 10, 45 10, 41 5Z" fill="#8CD089" stroke="#4A9F58" strokeWidth="1.5" />
      <circle cx="23" cy="30" r="12.5" fill="#F45B8A" stroke="#C92D60" strokeWidth="2" />
      <circle cx="41" cy="30" r="12.5" fill="#F45B8A" stroke="#C92D60" strokeWidth="2" />
      <circle cx="18.5" cy="25" r="2.2" fill="#FFD1E0" opacity="0.9" />
      <circle cx="36.5" cy="25" r="2.2" fill="#FFD1E0" opacity="0.9" />
    </svg>
  );
}

export default function PricelistCard({ rows }: PricelistCardProps) {
  return (
    <section className="relative mx-auto flex h-[calc(100dvh-10px)] w-full flex-col overflow-hidden rounded-[34px] border border-[#f6c8d8] bg-[#fffdfd] shadow-[0_22px_52px_rgba(233,75,134,0.13)] animate-[fadeInUp_450ms_ease-out_both] sm:h-auto sm:w-[calc(100%-24px)] sm:max-w-[420px]">
      <div
        className="h-[72px] w-full bg-[length:44px_44px]"
        style={{
          backgroundColor: "#f9dbe6",
          backgroundImage:
            "linear-gradient(0deg, rgba(255,255,255,0.25) 50%, transparent 50%), linear-gradient(90deg, rgba(255,255,255,0.25) 50%, transparent 50%)",
        }}
      />

      <svg className="absolute left-0 top-[56px] h-9 w-full" viewBox="0 0 420 36" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M0 0
             C14 14, 28 14, 42 0
             C56 14, 70 14, 84 0
             C98 14, 112 14, 126 0
             C140 14, 154 14, 168 0
             C182 14, 196 14, 210 0
             C224 14, 238 14, 252 0
             C266 14, 280 14, 294 0
             C308 14, 322 14, 336 0
             C350 14, 364 14, 378 0
             C392 14, 406 14, 420 0
             V36 H0 Z"
          fill="#ffffff"
        />
      </svg>

      <div className="pointer-events-none absolute left-1/2 top-[34px] -translate-x-1/2">
        <CuteCherryIcon className="h-[40px] w-[54px] sm:h-[46px] sm:w-[62px]" />
      </div>
      <span className="pointer-events-none absolute left-4 top-[130px] text-pink-200">✦</span>
      <span className="pointer-events-none absolute right-4 top-[124px] text-pink-200">✦</span>

      <div className="flex-1 px-5 pb-8 pt-[74px] sm:px-6 sm:pb-9 sm:pt-20">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-[33px] font-bold leading-none tracking-[0.03em] text-[#e94b86] sm:text-[42px]">PRICELIST</h1>
          <Link
            href="/"
            className="rounded-full border border-[#f5abc5] bg-white px-4 py-2 text-[17px] font-medium text-[#e76495] shadow-[0_3px_8px_rgba(233,75,134,0.09)] transition hover:bg-[#fff2f7] hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 focus-visible:ring-offset-2 sm:px-6 sm:text-[22px]"
          >
            Kembali
          </Link>
        </div>

        <div className="rounded-[22px] bg-[#fff7fa] p-0">
          <div className="mb-3 grid grid-cols-[1fr_auto] rounded-2xl bg-[#fbe3ec] px-4 py-[11px] text-[17px] font-medium text-[#c74375] sm:px-5 sm:text-[24px]">
            <span className="pl-7">Durasi</span>
            <span className="pr-2">Harga Sewa</span>
          </div>

          <div className="space-y-2.5">
            {rows.map((row) => (
              <div
                key={row.duration}
                className="grid h-[46px] grid-cols-[1fr_auto] items-center rounded-[16px] border border-[#f6cedd] bg-white px-3 transition-colors hover:bg-[#fff0f6] sm:h-[52px] sm:px-4"
              >
                <div className="flex items-center gap-2.5 text-[22px] text-[#333] sm:gap-3 sm:text-[28px]">
                  <CuteCherryIcon className="h-[18px] w-[24px] shrink-0" />
                  <span className="text-[20px] font-normal leading-none sm:text-[30px]">{row.duration}</span>
                </div>
                <span className="text-[23px] font-bold leading-none text-[#e91e63] sm:text-[32px]">{row.price}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="h-[62px] w-full bg-[length:44px_44px]"
        style={{
          backgroundColor: "#f9dbe6",
          backgroundImage:
            "linear-gradient(0deg, rgba(255,255,255,0.25) 50%, transparent 50%), linear-gradient(90deg, rgba(255,255,255,0.25) 50%, transparent 50%)",
        }}
      />
      <svg className="absolute bottom-[48px] left-0 h-9 w-full" viewBox="0 0 420 36" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M0 36
             C14 22, 28 22, 42 36
             C56 22, 70 22, 84 36
             C98 22, 112 22, 126 36
             C140 22, 154 22, 168 36
             C182 22, 196 22, 210 36
             C224 22, 238 22, 252 36
             C266 22, 280 22, 294 36
             C308 22, 322 22, 336 36
             C350 22, 364 22, 378 36
             C392 22, 406 22, 420 36
             V0 H0 Z"
          fill="#ffffff"
        />
      </svg>

      <CuteCherryIcon className="pointer-events-none absolute bottom-3 left-4 h-[24px] w-[32px] opacity-90 sm:h-[30px] sm:w-[40px]" />
      <CuteCherryIcon className="pointer-events-none absolute bottom-3 right-4 h-[24px] w-[32px] opacity-90 sm:h-[30px] sm:w-[40px]" />
      <span className="pointer-events-none absolute bottom-14 left-1/2 -translate-x-1/2 text-white">•</span>
      <span className="pointer-events-none absolute bottom-14 left-8 text-pink-200">✦</span>
      <span className="pointer-events-none absolute bottom-14 right-8 text-pink-200">✦</span>
    </section>
  );
}
