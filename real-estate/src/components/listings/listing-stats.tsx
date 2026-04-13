"use client";

interface ListingStatsProps {
  inquiryCount: number;
  daysOnMarket: number;
  hasEmbedding: boolean;
  status: string;
}

export function ListingStats({ inquiryCount, daysOnMarket, hasEmbedding, status }: ListingStatsProps) {
  const isActive = status === "active";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mt-6">
      <h3 className="font-semibold text-gray-900 text-sm mb-3">Зарын статистик</h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{inquiryCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">Хүсэлт</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className={`text-2xl font-bold ${daysOnMarket > 60 ? "text-red-500" : daysOnMarket > 30 ? "text-yellow-600" : "text-gray-900"}`}>
            {daysOnMarket}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Хоног (DOM)</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${hasEmbedding ? "text-green-600" : "text-yellow-500"}`}>
            {hasEmbedding ? "ON" : "OFF"}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">AI хайлт</p>
        </div>
      </div>
      {isActive && daysOnMarket > 30 && inquiryCount === 0 && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <p className="text-xs text-amber-700">
            {daysOnMarket} хоног зарлагдсан, хүсэлт ирээгүй. Үнэ бууруулах эсвэл тайлбар шинэчлэхийг зөвлөж байна.
          </p>
        </div>
      )}
      {isActive && inquiryCount >= 3 && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <p className="text-xs text-green-700">
            Энэ зар халуун эрэлттэй ({inquiryCount} хүсэлт). Хүсэлтүүдэд хурдан хариулаарай.
          </p>
        </div>
      )}
    </div>
  );
}
