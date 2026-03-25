import type { Session } from '../types'

interface Props {
  sessions: Session[]
  projectId?: string // если не указан — глобальный граф
  weeks?: number
}

function getDateString(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function ActivityGraph({ sessions, projectId, weeks = 13 }: Props) {
  const totalDays = weeks * 7
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Строим карту minutes per day
  const minutesByDate: Record<string, number> = {}
  for (const s of sessions) {
    if (projectId && s.projectId !== projectId) continue
    const date = s.startedAt.split('T')[0]
    minutesByDate[date] = (minutesByDate[date] ?? 0) + s.durationMinutes
  }

  // Строим массив дней от oldest к today
  const days: { date: string; minutes: number }[] = []
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const date = getDateString(d)
    days.push({ date, minutes: minutesByDate[date] ?? 0 })
  }

  // Максимум для интенсивности
  const max = Math.max(...days.map(d => d.minutes), 1)

  function getColor(minutes: number): string {
    if (minutes === 0) return 'rgba(255,255,255,0.06)'
    const intensity = Math.min(minutes / max, 1)
    if (intensity < 0.25) return '#10B98140'
    if (intensity < 0.5) return '#10B98170'
    if (intensity < 0.75) return '#10B981AA'
    return '#10B981'
  }

  const DAYS_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  const firstDay = new Date(today)
  firstDay.setDate(today.getDate() - totalDays + 1)
  const startDayOfWeek = firstDay.getDay() // 0=Sun

  // Группируем по неделям
  const grid: { date: string; minutes: number }[][] = []
  let week: { date: string; minutes: number }[] = []

  // Пустые ячейки для выравнивания первой недели
  for (let i = 0; i < startDayOfWeek; i++) {
    week.push({ date: '', minutes: -1 })
  }

  for (const day of days) {
    week.push(day)
    if (week.length === 7) {
      grid.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push({ date: '', minutes: -1 })
    grid.push(week)
  }

  return (
    <div>
      {/* Day labels */}
      <div className="flex gap-0.5 mb-1 ml-0">
        {DAYS_LABELS.map((d, i) => (
          <div key={i} className="flex-1 text-center" style={{ fontSize: 8, color: '#9B98B8' }}>
            {i % 2 === 1 ? d : ''}
          </div>
        ))}
      </div>
      {/* Grid: columns = weeks, rows = days */}
      <div className="flex gap-0.5">
        {grid.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5 flex-1">
            {week.map((day, di) => (
              <div
                key={di}
                title={day.minutes > 0 ? `${day.date}: ${day.minutes} мин` : day.date}
                className="rounded-sm"
                style={{
                  aspectRatio: '1',
                  backgroundColor: day.minutes === -1 ? 'transparent' : getColor(day.minutes),
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
