'use client'

'use client'

export interface VolumeData {
  hour: string;
  volume: number;
  timestamp: number;
}

interface VolumeTrendChartProps {
  data: VolumeData[];
}

export function VolumeTrendChart({ data }: VolumeTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center border border-dashed border-black/20 font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
        No data available
      </div>
    );
  }

  const maxVolume = Math.max(...data.map((d) => d.volume), 1);
  const points = data.map((item) => ({
    ...item,
    heightPx: Math.max((item.volume / maxVolume) * 120, 4),
  }));

  return (
    <div className="space-y-3 flex flex-col h-full">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
        <span>24h Volume</span>
        <span>Total ${formatVolume(data.reduce((sum, point) => sum + point.volume, 0))}</span>
      </div>
      <div className="flex-1 flex items-end gap-1 h-36 border-t border-black/5 pt-10 pb-4">
        {points.map((point, index) => (
          <div
            key={`${point.hour}-${index}`}
            className="flex-1 flex flex-col items-center justify-end"
            style={{ minWidth: '1rem' }}
          >
            <div
              className="w-full bg-[#5f9bff] transition-all"
              style={{ height: `${point.heightPx}px` }}
              title={`${point.hour}: $${formatVolume(point.volume)}`}
            />
            <div className="text-[8px] text-black/40 mt-2">{point.hour}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatVolume(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}
