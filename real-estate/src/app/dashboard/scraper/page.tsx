import Link from "next/link";
import { ScraperClient } from "@/components/scraper/scraper-client";

export default function ScraperPage() {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Зар цуглуулагч</h1>
          <p className="text-sm text-gray-500 mt-1">Гадны сайтуудаас зар автомат оруулах</p>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Буцах</Link>
      </div>
      <ScraperClient />
    </div>
  );
}
