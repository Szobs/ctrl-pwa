import { useEffect } from 'react'
import { useStore } from '../store'
import { ActivityGraph } from '../components/ActivityGraph'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function HistoryPage() {
  const { sessions, projects, syncData } = useStore()

  useEffect(() => { syncData() }, [])

  const sorted = [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const totalMinutes = sessions.reduce((s, x) => s + x.durationMinutes, 0)
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10

  // Group by date
  const byDate: Record<string, typeof sessions> = {}
  for (const s of sorted) {
    const date = s.startedAt.split('T')[0]
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(s)
  }

  return (
    <div className="flex flex-col min-h-svh pb-24" style={{ backgroundColor: '#1E1B2E' }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold" style={{ color: '#F0EEFF' }}>История</h1>
        <p className="text-sm mt-0.5" style={{ color: '#9B98B8' }}>
          {sessions.length} сессий · {totalHours}ч всего
        </p>
      </div>

      {/* Activity graph */}
      <div className="px-4 mb-4">
        <div className="rounded-2xl p-4" style={{ backgroundColor: '#252236' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: '#9B98B8' }}>Активность за 13 недель</p>
          <ActivityGraph sessions={sessions} weeks={13} />
        </div>
      </div>

      {/* Sessions list */}
      <div className="px-4">
        {sessions.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: '#252236' }}>
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm" style={{ color: '#9B98B8' }}>Нет сессий. Запусти таймер на задаче!</p>
          </div>
        ) : (
          Object.entries(byDate).map(([date, daySessions]) => {
            const dayMinutes = daySessions.reduce((s, x) => s + x.durationMinutes, 0)
            return (
              <div key={date} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold" style={{ color: '#9B98B8' }}>
                    {new Date(date + 'T12:00:00').toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-xs" style={{ color: '#10B981' }}>{dayMinutes}мин</p>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#252236' }}>
                  {daySessions.map((s, i) => {
                    const project = projects.find(p => p.id === s.projectId)
                    const task = project?.goals.flatMap(g => g.tasks).find(t => t.id === s.taskId)
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 px-4 py-3"
                        style={{ borderBottom: i < daySessions.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                      >
                        <div
                          className="w-1.5 h-8 rounded-full flex-shrink-0"
                          style={{ backgroundColor: project?.color ?? '#7C3AED' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: '#F0EEFF' }}>
                            {task?.title ?? 'Задача'}
                          </p>
                          <p className="text-xs" style={{ color: '#9B98B8' }}>
                            {project?.name} · {formatTime(s.startedAt)} — {formatTime(s.endedAt)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold" style={{ color: '#F0EEFF' }}>{s.durationMinutes}мин</p>
                          <p className="text-xs" style={{ color: '#7C3AED' }}>+{s.xpEarned} XP</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
