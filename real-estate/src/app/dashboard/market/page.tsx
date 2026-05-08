import Link from "next/link";
import { MarketAnalysisClient } from "@/components/analytics/market-analysis-client";

export default function MarketPage() {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Зах зээлийн шинжилгээ</h1>
          <p className="text-sm text-gray-500 mt-1">AI-д суурилсан зах зээлийн дүн шинжилгээ</p>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Буцах</Link>
      </div>
      <MarketAnalysisClient />
    </div>
  );
}
