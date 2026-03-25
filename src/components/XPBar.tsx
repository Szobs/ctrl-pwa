interface Props {
  totalXP: number
}

export function XPBar({ totalXP }: Props) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-medium" style={{ color: '#7C3AED' }}>Опыт</span>
        <span className="text-xs font-bold" style={{ color: '#7C3AED' }}>{totalXP} XP</span>
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min((totalXP % 500) / 500 * 100, 100)}%`, background: 'linear-gradient(90deg, #7C3AED, #A855F7)' }}
        />
      </div>
    </div>
  )
}
