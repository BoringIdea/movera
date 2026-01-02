'use client'

'use client'

import type { Market } from './markets-table'

interface OIDistributionChartProps {
  markets: Market[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#cbd5f5']

export function OIDistributionChart({ markets }: OIDistributionChartProps) {
  const totalOI = markets.reduce((sum, m) => sum + m.open_interest, 0) || 1;
  const sortedMarkets = [...markets].sort((a, b) => b.open_interest - a.open_interest)
  const topMarkets = sortedMarkets.slice(0, 5)
  const others = sortedMarkets.slice(5)
  const othersOI = others.reduce((sum, m) => sum + m.open_interest, 0)

  const data = topMarkets.map((market, index) => ({
    name: market.market_name,
    percentage: (market.open_interest / totalOI) * 100,
    value: market.open_interest,
    color: COLORS[index % COLORS.length],
  }))

  if (othersOI > 0) {
    data.push({
      name: 'Others',
      percentage: (othersOI / totalOI) * 100,
      value: othersOI,
      color: COLORS[COLORS.length - 1],
    })
  }

  const gradientStyle = createGradient(data)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-black/60">
        <span>Open Interest Distribution</span>
        <span className="text-xs text-black/50">${formatCurrency(totalOI)}</span>
      </div>
      <div className="flex flex-col gap-4 md:flex-row items-center">
        <div
          className="relative w-40 h-40 rounded-full border border-black"
          style={{ background: gradientStyle }}
        >
          <div className="absolute inset-4 rounded-full border border-black bg-white flex items-center justify-center text-xs font-black uppercase tracking-[0.2em] text-black/60">
            Total OI
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="font-black">{item.name}</span>
              </div>
              <div className="text-right">
                <div className="text-xs text-black/40">{item.percentage.toFixed(1)}%</div>
                <div className="font-semibold text-black">${formatCurrency(item.value)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toFixed(0)
}

function createGradient(data: { percentage: number; color: string }[]) {
  let shift = 0
  const parts = data.map((segment) => {
    const start = shift
    shift += segment.percentage
    return `${segment.color} ${start}% ${shift}%`
  })
  return `conic-gradient(${parts.join(', ')})`
}
