// Skeleton components for Decibel dashboard

export const MetricsCardsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="bg-white/80 backdrop-blur rounded-2xl border border-blue-200/60 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
          <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
      </div>
    ))}
  </div>
)

export const MarketsTableSkeleton = () => (
  <div className="bg-white/80 backdrop-blur rounded-2xl border border-blue-200/60 p-6 shadow-sm">
    <div className="h-6 bg-gray-200 rounded w-32 mb-6 animate-pulse"></div>
    <div className="space-y-3">
      {/* Table header */}
      <div className="grid grid-cols-7 gap-4 pb-3 border-b border-gray-200">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
      {/* Table rows */}
      {[1, 2, 3, 4, 5].map((row) => (
        <div key={row} className="grid grid-cols-7 gap-4 py-3">
          {[1, 2, 3, 4, 5, 6, 7].map((col) => (
            <div key={col} className="h-4 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      ))}
    </div>
  </div>
)

export const VolumeTrendChartSkeleton = () => (
  <div className="bg-white/80 backdrop-blur rounded-2xl border border-blue-200/60 p-6 shadow-sm">
    <div className="h-6 bg-gray-200 rounded w-40 mb-6 animate-pulse"></div>
    <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
  </div>
)

export const OIDistributionChartSkeleton = () => (
  <div className="bg-white/80 backdrop-blur rounded-2xl border border-blue-200/60 p-6 shadow-sm">
    <div className="h-6 bg-gray-200 rounded w-48 mb-6 animate-pulse"></div>
    <div className="flex items-center justify-center">
      <div className="w-48 h-48 bg-gray-100 rounded-full animate-pulse"></div>
    </div>
  </div>
)

export const LiveTradeFeedSkeleton = () => (
  <div className="bg-white/80 backdrop-blur rounded-2xl border border-blue-200/60 p-6 shadow-sm">
    <div className="h-6 bg-gray-200 rounded w-32 mb-6 animate-pulse"></div>
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
)

export const FundingRatesWidgetSkeleton = () => (
  <div className="bg-white/80 backdrop-blur rounded-2xl border border-blue-200/60 p-6 shadow-sm">
    <div className="h-6 bg-gray-200 rounded w-36 mb-6 animate-pulse"></div>
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
)

export const LeaderboardWidgetSkeleton = () => (
  <div className="bg-white/80 backdrop-blur rounded-2xl border border-blue-200/60 p-6 shadow-sm">
    <div className="h-6 bg-gray-200 rounded w-28 mb-6 animate-pulse"></div>
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
)

export const UserActivitySkeleton = () => (
  <div className="bg-white/80 backdrop-blur rounded-2xl border border-blue-200/60 p-6 shadow-sm">
    <div className="h-6 bg-gray-200 rounded w-32 mb-6 animate-pulse"></div>
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
)

export const UserTasksSkeleton = () => (
  <div className="bg-white/80 backdrop-blur rounded-2xl border border-blue-200/60 p-6 shadow-sm">
    <div className="h-6 bg-gray-200 rounded w-28 mb-6 animate-pulse"></div>
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-3 border border-gray-200 rounded-lg">
          <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
          <div className="h-3 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
)
