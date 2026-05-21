export default function DashboardLoading() {
  return (
    <div className="p-8 max-w-screen-xl mx-auto animate-pulse">
      <div className="h-7 w-48 bg-gray-200 rounded mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
            <div className="h-7 w-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 h-64" />
        ))}
      </div>
    </div>
  );
}
