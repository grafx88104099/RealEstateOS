import AISearch from "@/components/search/ai-search";

export default function ConsumerSearchPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Зар хайх</h1>
        <p className="text-sm text-gray-500 mt-1">AI ашиглан байгалийн хэлээр хайлт хийх</p>
      </div>
      <AISearch />
    </div>
  );
}
