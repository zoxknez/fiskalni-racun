export function ChartSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg animate-pulse">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="h-3 w-24 mx-auto bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  )
}
