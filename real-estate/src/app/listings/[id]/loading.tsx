export default function ListingDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        <div className="aspect-[16/9] bg-gray-200 rounded-2xl mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-8 w-3/4 bg-gray-200 rounded" />
            <div className="h-10 w-1/2 bg-gray-200 rounded" />
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 w-5/6 bg-gray-200 rounded" />
              <div className="h-4 w-4/6 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 h-64" />
        </div>
      </div>
    </div>
  );
}
