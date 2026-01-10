export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-2 text-sm text-muted-foreground">로딩 중...</p>
      </div>
    </div>
  )
}
