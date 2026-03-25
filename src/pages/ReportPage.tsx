import { useEffect, useMemo } from 'react'
import { useStore } from '../store'

const SLEEP_HOURS_PER_DAY = 7

function getWeekRange() {
  const now = new Date()
  const dow = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - ((dow + 6) % 7))
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return { mon, sun }
}

function getPrevWeekRange() {
  const { mon } = getWeekRange()
  const prevMon = new Date(mon)
  prevMon.setDate(mon.getDate() - 7)
  const prevSun = new Date(prevMon)
  prevSun.setDate(prevMon.getDate() + 6)
  prevSun.setHours(23, 59, 59, 999)
  return { mon: prevMon, sun: prevSun }
}

function diffMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const s = sh * 60 + sm
  let e = eh * 60 + em
  if (e <= s) e += 24 * 60
  return e - s
}

function fmtH(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}ч ${m}м` : `${h}ч`
}

export function ReportPage() {
  const { sessions, projects, streak, calendar, syncData } = useStore()

  useEffect(() => { syncData() }, [])

  const { mon, sun } = getWeekRange()
  const { mon: prevMon, sun: prevSun } = getPrevWeekRange()

  const thisWeek = useMemo(() => sessions.filter(s => {
    const d = new Date(s.startedAt)
    return d >= mon && d <= sun
  }), [sessions])

  const prevWeek = useMemo(() => sessions.filter(s => {
    const d = new Date(s.startedAt)
    return d >= prevMon && d <= prevSun
  }), [sessions])

  const activeDays = new Set(thisWeek.map(s => s.startedAt.split('T')[0])).size
  const prevActiveDays = new Set(prevWeek.map(s => s.startedAt.split('T')[0])).size

  const totalMinutes = thisWeek.reduce((s, x) => s + x.durationMinutes, 0)
  const prevMinutes = prevWeek.reduce((s, x) => s + x.durationMinutes, 0)
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10
  const prevHours = Math.round(prevMinutes / 60 * 10) / 10

  const byProject: Record<string, number> = {}
  for (const s of thisWeek) {
    byProject[s.projectId] = (byProject[s.projectId] ?? 0) + s.durationMinutes
  }
  const projectStats = Object.entries(byProject)
    .map(([id, minutes]) => ({ project: projects.find(p => p.id === id), minutes }))
    .filter(x => x.project)
    .sort((a, b) => b.minutes - a.minutes)

  const avgDailyMinutes = activeDays > 0 ? totalMinutes / activeDays : 0
  const pendingTasksMinutes = projects
    .flatMap(p => p.goals.flatMap(g => g.tasks))
    .filter(t => t.status !== 'done')
    .reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0)
  const daysToFinish = avgDailyMinutes > 0 ? Math.ceil(pendingTasksMinutes / avgDailyMinutes) : null

  // ── Бюджет времени ─────────────────────────────────────────────────────────
  const monStr2 = (d: Date) => d.toISOString().split('T')[0]
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return monStr2(d)
  })

  const workMinutesThisWeek = (calendar.workSchedule ?? [])
    .filter(s => weekDates.includes(s.date))
    .reduce((acc, s) => acc + diffMinutes(s.startTime, s.endTime), 0)

  const sleepMinutesWeek = SLEEP_HOURS_PER_DAY * 60 * 7
  const totalWeekMinutes = 7 * 24 * 60
  const freeMinutes = Math.max(0, totalWeekMinutes - workMinutesThisWeek - sleepMinutesWeek)
  const usedForProjectsMinutes = totalMinutes
  const remainingFreeMinutes = Math.max(0, freeMinutes - usedForProjectsMinutes)
  const budgetUsagePct = freeMinutes > 0 ? Math.min(100, Math.round((usedForProjectsMinutes / freeMinutes) * 100)) : 0

  // ── ИИ-анализ ──────────────────────────────────────────────────────────────
  function getAIInsights(): { title: string; text: string; color: string }[] {
    const insights: { title: string; text: string; color: string }[] = []

    // Риск потери streak
    const today = new Date().toISOString().split('T')[0]
    const hasSessionToday = sessions.some(s => s.startedAt.startsWith(today))
    if (streak.currentStreak > 0 && !hasSessionToday) {
      insights.push({
        title: '⚡ Streak под угрозой',
        text: `Серия ${streak.currentStreak} дн. прервётся сегодня, если не начать сессию.`,
        color: '#EF4444',
      })
    }

    // Недоиспользование свободного времени
    if (freeMinutes > 0 && budgetUsagePct < 20 && activeDays > 0) {
      insights.push({
        title: '📊 Много свободного времени',
        text: `Ты использовал лишь ${budgetUsagePct}% свободного времени на проекты. Свободно ещё ~${fmtH(remainingFreeMinutes)}.`,
        color: '#F97316',
      })
    }

    // Нет активности
    if (activeDays === 0) {
      const nextProject = projects.find(p => p.goals.flatMap(g => g.tasks).some(t => t.status !== 'done'))
      insights.push({
        title: '🚀 Начни с малого',
        text: nextProject
          ? `На этой неделе ещё не было сессий. Начни с "${nextProject.name}" — там есть незавершённые задачи.`
          : 'На этой неделе ещё не было сессий. Добавь задачи в проекты и приступай!',
        color: '#7C3AED',
      })
    }

    // Проект долго без активности
    const now = Date.now()
    const neglectedProject = projects.find(p => {
      if (!p.lastWorkedAt) return false
      const daysSince = (now - new Date(p.lastWorkedAt).getTime()) / 86400000
      return daysSince > 7 && p.goals.flatMap(g => g.tasks).some(t => t.status !== 'done')
    })
    if (neglectedProject) {
      const days = Math.floor((now - new Date(neglectedProject.lastWorkedAt!).getTime()) / 86400000)
      insights.push({
        title: `💤 ${neglectedProject.name} заброшен`,
        text: `Последняя сессия была ${days} дн. назад. Даже 30 минут вернут проект в ритм.`,
        color: '#9B98B8',
      })
    }

    // Проект без задач
    const emptyProject = projects.find(p => p.goals.length === 0 || p.goals.every(g => g.tasks.length === 0))
    if (emptyProject) {
      insights.push({
        title: `📋 Добавь задачи в "${emptyProject.name}"`,
        text: 'Без задач невозможно отслеживать прогресс. Разбей проект на конкретные шаги.',
        color: '#3B82F6',
      })
    }

    // Хорошая неделя
    if (activeDays >= 5 && insights.length === 0) {
      insights.push({
        title: '🏆 Отличная неделя!',
        text: `${activeDays} активных дней — ты в потоке. Поддержи темп на следующей неделе.`,
        color: '#10B981',
      })
    }

    // Стандартная если ничего
    if (insights.length === 0) {
      insights.push({
        title: '💡 Совет',
        text: activeDays < 3
          ? `Ты работал ${activeDays} дн. из 7. Попробуй добавить ещё 2 дня на следующей неделе.`
          : 'Хороший темп! Ещё пара дней — и неделя будет идеальной.',
        color: '#7C3AED',
      })
    }

    return insights
  }

  const insights = getAIInsights()
  const better = totalMinutes >= prevMinutes

  const monLabel = mon.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  const sunLabel = sun.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })

  return (
    <div className="flex flex-col min-h-svh pb-24" style={{ backgroundColor: '#1E1B2E' }}>
      {/* Header */}
      <div className="px-2 pt-12 pb-4">
        <h1 className="text-xl font-bold" style={{ color: '#F0EEFF' }}>Еженедельный отчёт</h1>
        <p className="text-sm mt-0.5" style={{ color: '#9B98B8' }}>{monLabel} — {sunLabel}</p>
      </div>

      {/* Main stats */}
      <div className="px-2 mb-4">
        <div className="rounded-2xl p-3" style={{ backgroundColor: '#252236' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-3xl font-black" style={{ color: '#F0EEFF' }}>{activeDays}<span className="text-lg font-semibold" style={{ color: '#9B98B8' }}>/7</span></p>
              <p className="text-xs mt-0.5" style={{ color: '#9B98B8' }}>дней с сессиями</p>
              {prevActiveDays > 0 && (
                <p className="text-xs mt-1" style={{ color: activeDays >= prevActiveDays ? '#10B981' : '#EF4444' }}>
                  {activeDays >= prevActiveDays ? '↑' : '↓'} прошлая: {prevActiveDays} дн.
                </p>
              )}
            </div>
            <div>
              <p className="text-3xl font-black" style={{ color: '#F0EEFF' }}>{totalHours}<span className="text-lg font-semibold" style={{ color: '#9B98B8' }}>ч</span></p>
              <p className="text-xs mt-0.5" style={{ color: '#9B98B8' }}>суммарно</p>
              {prevHours > 0 && (
                <p className="text-xs mt-1" style={{ color: better ? '#10B981' : '#EF4444' }}>
                  {better ? '↑' : '↓'} прошлая: {prevHours}ч
                </p>
              )}
            </div>
            <div>
              <p className="text-3xl font-black" style={{ color: '#F97316' }}>🔥{streak.currentStreak}</p>
              <p className="text-xs mt-0.5" style={{ color: '#9B98B8' }}>streak сейчас</p>
              <p className="text-xs mt-1" style={{ color: '#9B98B8' }}>макс: {streak.maxStreak}</p>
            </div>
            <div>
              <p className="text-3xl font-black" style={{ color: '#7C3AED' }}>{streak.totalXP}</p>
              <p className="text-xs mt-0.5" style={{ color: '#9B98B8' }}>XP всего</p>
              <p className="text-xs mt-1" style={{ color: '#7C3AED' }}>{streak.rank} · ур. {streak.level}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Бюджет времени */}
      <div className="px-2 mb-4">
        <div className="rounded-2xl p-3" style={{ backgroundColor: '#252236' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: '#9B98B8' }}>Бюджет времени (эта неделя)</p>
          <div className="space-y-2 mb-3">
            <BudgetRow label="Работа" minutes={workMinutesThisWeek} color="#EF4444" total={totalWeekMinutes} />
            <BudgetRow label="Сон (7ч/день)" minutes={sleepMinutesWeek} color="#3B82F6" total={totalWeekMinutes} />
            <BudgetRow label="На проекты" minutes={usedForProjectsMinutes} color="#10B981" total={totalWeekMinutes} />
            <BudgetRow label="Свободно" minutes={remainingFreeMinutes} color="#7C3AED" total={totalWeekMinutes} />
          </div>
          <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex justify-between text-xs">
              <span style={{ color: '#9B98B8' }}>КПД свободного времени</span>
              <span className="font-bold" style={{ color: budgetUsagePct >= 50 ? '#10B981' : budgetUsagePct >= 20 ? '#F97316' : '#9B98B8' }}>
                {budgetUsagePct}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* By project */}
      {projectStats.length > 0 && (
        <div className="px-2 mb-4">
          <div className="rounded-2xl p-3" style={{ backgroundColor: '#252236' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: '#9B98B8' }}>Часы по проектам</p>
            {projectStats.map(({ project, minutes }) => {
              const pct = Math.round((minutes / totalMinutes) * 100)
              return (
                <div key={project!.id} className="mb-3 last:mb-0">
                  <div className="flex justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project!.color }} />
                      <span className="text-sm" style={{ color: '#F0EEFF' }}>{project!.name}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${project!.color}22`, color: project!.color }}>
                        {project!.projectRank}
                      </span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: '#F0EEFF' }}>
                      {Math.round(minutes / 60 * 10) / 10}ч
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: project!.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Time estimates per project */}
      {projects.length > 0 && (
        <div className="px-2 mb-4">
          <div className="rounded-2xl p-3" style={{ backgroundColor: '#252236' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: '#9B98B8' }}>Оценка времени по проектам</p>
            {projects.map(p => {
              const tasks = p.goals.flatMap(g => g.tasks)
              const est = tasks.reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0)
              if (est === 0 && p.totalMinutes === 0) return null
              const remaining = tasks.filter(t => t.status !== 'done').reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0)
              const spent = p.totalMinutes
              const pct = est > 0 ? Math.min(100, Math.round((spent / est) * 100)) : 0
              const isOver = spent > est && est > 0
              return (
                <div key={p.id} className="mb-4 last:mb-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-sm font-medium flex-1 truncate" style={{ color: '#F0EEFF' }}>{p.name}</span>
                    {isOver && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#EF444418', color: '#EF4444' }}>перерасход</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                    <div className="rounded-lg px-2 py-1.5 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                      <p className="text-xs font-bold" style={{ color: '#9B98B8' }}>{fmtH(est)}</p>
                      <p className="text-xs" style={{ color: '#9B98B855', fontSize: 10 }}>план</p>
                    </div>
                    <div className="rounded-lg px-2 py-1.5 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                      <p className="text-xs font-bold" style={{ color: '#10B981' }}>{fmtH(spent)}</p>
                      <p className="text-xs" style={{ color: '#9B98B855', fontSize: 10 }}>потрачено</p>
                    </div>
                    <div className="rounded-lg px-2 py-1.5 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                      <p className="text-xs font-bold" style={{ color: isOver ? '#EF4444' : '#7C3AED' }}>{fmtH(remaining)}</p>
                      <p className="text-xs" style={{ color: '#9B98B855', fontSize: 10 }}>осталось</p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: isOver ? '#EF4444' : p.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Forecast */}
      {daysToFinish !== null && pendingTasksMinutes > 0 && (
        <div className="px-2 mb-4">
          <div className="rounded-2xl p-3" style={{ backgroundColor: '#252236' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: '#9B98B8' }}>Прогноз</p>
            <p className="text-sm" style={{ color: '#F0EEFF' }}>
              При текущем темпе все задачи будут готовы через{' '}
              <span className="font-bold" style={{ color: '#7C3AED' }}>~{daysToFinish} дн.</span>
            </p>
            <p className="text-xs mt-1" style={{ color: '#9B98B8' }}>
              Осталось ~{Math.round(pendingTasksMinutes / 60 * 10) / 10}ч задач
            </p>
          </div>
        </div>
      )}

      {/* AI Insights */}
      <div className="px-2 mb-4">
        <p className="text-xs font-semibold mb-2" style={{ color: '#9B98B8' }}>Анализ</p>
        <div className="flex flex-col gap-2">
          {insights.map((ins, i) => (
            <div key={i} className="rounded-2xl p-3" style={{ backgroundColor: `${ins.color}12`, border: `1px solid ${ins.color}30` }}>
              <p className="text-sm font-semibold mb-1" style={{ color: ins.color }}>{ins.title}</p>
              <p className="text-sm" style={{ color: '#F0EEFF' }}>{ins.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BudgetRow({ label, minutes, color, total }: { label: string; minutes: number; color: string; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((minutes / total) * 100)) : 0
  return (
    <div>
      <div className="flex justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs" style={{ color: '#9B98B8' }}>{label}</span>
        </div>
        <span className="text-xs font-semibold" style={{ color: '#F0EEFF' }}>{fmtH(minutes)}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}
