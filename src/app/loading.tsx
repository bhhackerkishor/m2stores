export default function LoadingHomePage() {
  return (
    <div className="min-h-dvh bg-surface-50 dark:bg-surface-950 p-4 sm:p-8 space-y-12 animate-pulse max-w-7xl mx-auto">
      {/* Hero Skeleton */}
      <div className="w-full h-80 rounded-2xl bg-surface-200 dark:bg-surface-800" />

      {/* Category Grid Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-48 bg-surface-200 dark:bg-surface-800 rounded-md" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 bg-surface-200 dark:bg-surface-800 rounded-xl"
            />
          ))}
        </div>
      </div>

      {/* Product Grid Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-48 bg-surface-200 dark:bg-surface-800 rounded-md" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-64 bg-surface-200 dark:bg-surface-800 rounded-xl"
            />
          ))}
        </div>
      </div>
    </div>
  );
}