export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="lg:col-span-1">
          <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}

