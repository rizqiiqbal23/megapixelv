export default function Header() {
  const SPARKLE = String.fromCodePoint(0x2728);

  return (
    <header className="sticky top-0 z-40 border-b border-pink-100 backdrop-blur-md bg-white/80">
      <div className="mx-auto flex h-[60px] w-full max-w-[420px] items-center justify-center px-4">
        <span className="mr-2 text-pink-300">{SPARKLE}</span>
        <div className="flex items-center gap-2">
          <img src="/image/logo.png" alt="Megapixelv Logo" className="h-6 w-6 object-contain" />
          <h1 className="text-lg font-semibold tracking-[0.08em] text-[#333333]">MEGAPIXELV</h1>
        </div>
        <span className="ml-2 text-pink-300">{SPARKLE}</span>
      </div>
    </header>
  );
}
