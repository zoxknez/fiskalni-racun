export function ChartSkeleton() {
  return (
    <div className="flex h-full w-full animate-pulse items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <div className="text-center">
        <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="mx-auto h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  )
}
