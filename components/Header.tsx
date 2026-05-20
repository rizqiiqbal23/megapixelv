export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-pink-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-[60px] w-full max-w-none items-center justify-center px-4">
        <div className="flex items-center gap-2">
          <img src="/image/logo.png" alt="Megapixelv Logo" className="h-6 w-6 object-contain" />
          <h1 className="text-lg font-semibold tracking-[0.08em] text-[#333333]">MEGAPIXELV</h1>
        </div>
      </div>
    </header>
  );
}
