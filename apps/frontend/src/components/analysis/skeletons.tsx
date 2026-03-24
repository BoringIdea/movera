// Skeleton components for Decibel dashboard

export const MetricsCardsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="mv-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-20 animate-pulse bg-black/8"></div>
          <div className="h-8 w-8 animate-pulse border border-black/10 bg-[#fbfbf8]"></div>
        </div>
        <div className="mb-2 h-8 w-24 animate-pulse bg-black/8"></div>
        <div className="h-4 w-16 animate-pulse bg-black/8"></div>
      </div>
    ))}
  </div>
)

export const MarketsTableSkeleton = () => (
  <div className="mv-panel p-6">
    <div className="mb-6 h-6 w-32 animate-pulse bg-black/8"></div>
    <div className="space-y-3">
      {/* Table header */}
      <div className="grid grid-cols-7 gap-4 border-b border-black/10 pb-3">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-4 animate-pulse bg-black/8"></div>
        ))}
      </div>
      {/* Table rows */}
      {[1, 2, 3, 4, 5].map((row) => (
        <div key={row} className="grid grid-cols-7 gap-4 py-3">
          {[1, 2, 3, 4, 5, 6, 7].map((col) => (
            <div key={col} className="h-4 animate-pulse bg-black/8"></div>
          ))}
        </div>
      ))}
    </div>
  </div>
)

export const VolumeTrendChartSkeleton = () => (
  <div className="mv-panel p-6">
    <div className="mb-6 h-6 w-40 animate-pulse bg-black/8"></div>
    <div className="h-64 animate-pulse border border-black/10 bg-[#fbfbf8]"></div>
  </div>
)

export const OIDistributionChartSkeleton = () => (
  <div className="mv-panel p-6">
    <div className="mb-6 h-6 w-48 animate-pulse bg-black/8"></div>
    <div className="flex items-center justify-center">
      <div className="h-48 w-48 animate-pulse rounded-full border border-black/10 bg-[#fbfbf8]"></div>
    </div>
  </div>
)

export const LiveTradeFeedSkeleton = () => (
  <div className="mv-panel p-6">
    <div className="mb-6 h-6 w-32 animate-pulse bg-black/8"></div>
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse bg-black/18"></div>
            <div className="h-4 w-20 animate-pulse bg-black/8"></div>
            <div className="h-4 w-16 animate-pulse bg-black/8"></div>
          </div>
          <div className="h-4 w-12 animate-pulse bg-black/8"></div>
        </div>
      ))}
    </div>
  </div>
)

export const FundingRatesWidgetSkeleton = () => (
  <div className="mv-panel p-6">
    <div className="mb-6 h-6 w-36 animate-pulse bg-black/8"></div>
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="h-4 w-24 animate-pulse bg-black/8"></div>
          <div className="h-4 w-16 animate-pulse bg-black/8"></div>
        </div>
      ))}
    </div>
  </div>
)

export const LeaderboardWidgetSkeleton = () => (
  <div className="mv-panel p-6">
    <div className="mb-6 h-6 w-28 animate-pulse bg-black/8"></div>
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-6 w-6 animate-pulse border border-black/10 bg-[#fbfbf8]"></div>
          <div className="h-4 w-20 animate-pulse bg-black/8"></div>
          <div className="h-4 w-16 animate-pulse bg-black/8"></div>
        </div>
      ))}
    </div>
  </div>
)

export const UserActivitySkeleton = () => (
  <div className="mv-panel p-6">
    <div className="mb-6 h-6 w-32 animate-pulse bg-black/8"></div>
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center justify-between border border-black/10 bg-[#fbfbf8] p-3">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse bg-black/18"></div>
            <div className="h-4 w-24 animate-pulse bg-black/8"></div>
          </div>
          <div className="h-4 w-16 animate-pulse bg-black/8"></div>
        </div>
      ))}
    </div>
  </div>
)

export const UserTasksSkeleton = () => (
  <div className="mv-panel p-6">
    <div className="mb-6 h-6 w-28 animate-pulse bg-black/8"></div>
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-black/10 bg-[#fbfbf8] p-3">
          <div className="mb-2 h-4 w-32 animate-pulse bg-black/8"></div>
          <div className="h-3 w-48 animate-pulse bg-black/8"></div>
        </div>
      ))}
    </div>
  </div>
)
