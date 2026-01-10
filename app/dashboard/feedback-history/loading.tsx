export default function Loading() {
  return (
    <div className="flex min-h-screen">
      <div className="w-64 bg-gray-100 animate-pulse" />
      <main className="flex-1 p-6 space-y-6">
        <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-[600px] bg-gray-200 rounded-lg animate-pulse" />
      </main>
    </div>
  );
}

