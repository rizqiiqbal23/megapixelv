import { Poppins } from "next/font/google";
import PricelistCard from "@/components/PricelistCard";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const PRICE_ROWS = [
  { duration: "6 jam", price: "30.000" },
  { duration: "12 jam", price: "45.000" },
  { duration: "1 hari", price: "70.000" },
  { duration: "2 hari", price: "120.000" },
  { duration: "3 hari", price: "180.000" },
  { duration: "4 hari", price: "250.000" },
  { duration: "5 hari", price: "320.000" },
  { duration: "6 hari", price: "400.000" },
  { duration: "7 hari", price: "450.000" },
];
export default function PricelistPage() {
  return (
    <main className={`${poppins.className} relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fff8fb] px-0 py-[5px] sm:py-10`}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 15% 12%, rgba(255,214,231,0.45), transparent 22%), radial-gradient(circle at 85% 80%, rgba(255,214,231,0.36), transparent 20%), #fff8fb",
        }}
      />

      <div className="w-full px-[6px] sm:w-auto sm:px-0">
        <PricelistCard rows={PRICE_ROWS} />
      </div>
    </main>
  );
}
