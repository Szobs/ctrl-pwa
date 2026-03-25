interface Props {
  value: number  // 0–100
  color: string
  height?: number
  showLabel?: boolean
}

export function ProgressBar({ value, color, height = 6, showLabel = false }: Props) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className="w-full">
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height, backgroundColor: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span className="text-xs mt-1 block" style={{ color }}>
          {pct}%
        </span>
      )}
    </div>
  )
}
