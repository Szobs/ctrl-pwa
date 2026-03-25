import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { ProjectCard } from '../components/ProjectCard'
import { calcGlobalLevel } from '../lib/xp'
import type { Project } from '../types'

const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

const QUOTES = [
  'Каждый час работы сегодня — это версия себя, которая недостижима без действия.',
  'Прогресс не требует идеального дня. Он требует одного следующего шага.',
  'Ты строишь что-то реальное. Не останавливайся.',
  'Дисциплина — это выбор между тем, чего хочешь сейчас, и тем, чего хочешь больше всего.',
  'Маленькие действия каждый день побеждают большие планы без действий.',
  'Работа над своим проектом — это инвестиция в единственного человека, которому ты доверяешь на 100%.',
  'Не жди вдохновения. Начни — и оно придёт.',
]

function getDailyQuote() {
  return QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length]
}

function WeeklyChart({ minutes }: { minutes: number[] }) {
  const max = Math.max(...minutes, 1)
  const today = new Date().getDay()
  return (
    <div className="flex items-end gap-1.5 h-14">
      {minutes.map((m, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-sm transition-all duration-500"
            style={{
              height: `${Math.max(4, (m / max) * 44)}px`,
              backgroundColor: i === today ? '#10B981' : 'rgba(255,255,255,0.12)',
            }}
          />
          <span style={{ color: i === today ? '#10B981' : '#9B98B8', fontSize: 10 }}>
            {DAYS[i]}
          </span>
        </div>
      ))}
    </div>
  )
}

function getNextTask(projects: Project[]) {
  for (const project of projects) {
    for (const goal of project.goals) {
      const task = goal.tasks.find(t => t.status === 'pending' || t.status === 'in_progress')
      if (task) return { project, goal, task }
    }
  }
  return null
}

export function MainScreen() {
  const navigate = useNavigate()
  const { projects, streak, syncing, syncData, resetAll } = useStore()
  const [confirmReset, setConfirmReset] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024)

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => { syncData() }, [])

  const totalWeeklyMinutes = streak.weeklyMinutes.reduce((a, b) => a + b, 0)
  const weeklyHours = Math.round(totalWeeklyMinutes / 60 * 10) / 10
  const { level, rank, nextLevelXP, progress: xpProgress } = calcGlobalLevel(streak.totalXP)

  const allTasks = projects.flatMap(p => p.goals.flatMap(g => g.tasks))
  const totalEstimatedMin = allTasks.reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0)
  const remainingMin = allTasks.filter(t => t.status !== 'done').reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0)
  const spentMin = projects.reduce((s, p) => s + p.totalMinutes, 0)
  const doneTasks = allTasks.filter(t => t.status === 'done')
  const doneEstimated = doneTasks.reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0)
  const doneSpent = doneTasks.reduce((s, t) => s + (t.actualMinutes ?? 0), 0)
  const overrunPct = doneEstimated > 0 ? Math.round(((doneSpent - doneEstimated) / doneEstimated) * 100) : 0
  const todayStr = new Date().toISOString().split('T')[0]
  const activeToday = streak.lastActiveDate === todayStr

  return (
    <div className="min-h-svh pb-24" style={{ backgroundColor: '#1E1B2E' }}>

      {/* ── DESKTOP: 3 колонки на всю ширину ── */}
      {isDesktop && <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, padding: '32px 0 96px', alignItems: 'start' }}
      >
        {/* ── ЛЕВАЯ: Проекты ── */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold" style={{ color: '#F0EEFF' }}>Проекты</h2>
            <button
              onClick={() => navigate('/new-project')}
              className="text-sm px-3 py-1.5 rounded-xl transition-all active:scale-95"
              style={{ backgroundColor: '#7C3AED22', color: '#7C3AED' }}
            >
              + Добавить
            </button>
          </div>
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🚀</p>
              <p className="text-sm" style={{ color: '#9B98B8' }}>Нет проектов</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {projects.map(p => <ProjectCard key={p.id} project={p} />)}
            </div>
          )}
        </div>

        {/* ── ЦЕНТР: Шапка + статы + мотивация ── */}
        <div>
          {/* Header */}
          <div className="mb-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h1 className="text-3xl font-black tracking-tight" style={{ color: '#F0EEFF' }}>CTRL</h1>
                <p className="text-sm mt-0.5" style={{ color: '#9B98B8' }}>
                  {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              {syncing && (
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#7C3AED22', color: '#7C3AED' }}>
                  Синхронизация...
                </span>
              )}
            </div>

            {/* XP */}
            <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: '#252236' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: '#7C3AED' }}>Ур. {level}</span>
                  <span className="text-sm" style={{ color: '#9B98B8' }}>{rank}</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: '#F0EEFF' }}>{streak.totalXP} XP</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${xpProgress}%`, background: 'linear-gradient(90deg, #7C3AED, #A855F7)' }}
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: '#9B98B866' }}>ещё {nextLevelXP} XP до ур. {level + 1}</p>
            </div>
          </div>

          {/* Неделя */}
          <div className="rounded-2xl p-4 mb-3" style={{ backgroundColor: '#252236' }}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold" style={{ color: '#F0EEFF' }}>Эта неделя</span>
              <span className="text-base font-bold" style={{ color: '#10B981' }}>{weeklyHours}ч</span>
            </div>
            <WeeklyChart minutes={streak.weeklyMinutes} />
          </div>

          {/* Оценка времени */}
          {totalEstimatedMin > 0 && (
            <div className="rounded-2xl p-4 mb-3" style={{ backgroundColor: '#252236' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: '#9B98B8' }}>Оценка времени · все проекты</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'план', value: Math.round(totalEstimatedMin / 60 * 10) / 10, color: '#F0EEFF' },
                  { label: 'потрачено', value: Math.round(spentMin / 60 * 10) / 10, color: '#10B981' },
                  { label: 'осталось', value: Math.round(remainingMin / 60 * 10) / 10, color: '#7C3AED' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl p-3 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-lg font-bold" style={{ color }}>{value}<span className="text-xs font-normal">ч</span></p>
                    <p className="text-xs mt-0.5" style={{ color: '#9B98B8' }}>{label}</p>
                  </div>
                ))}
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, totalEstimatedMin > 0 ? Math.round(spentMin / totalEstimatedMin * 100) : 0)}%`,
                    background: 'linear-gradient(90deg, #7C3AED, #10B981)',
                  }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: '#9B98B8' }}>
                  {Math.min(100, totalEstimatedMin > 0 ? Math.round(spentMin / totalEstimatedMin * 100) : 0)}% от плана
                </span>
                {overrunPct !== 0 && (
                  <span className="text-xs" style={{ color: overrunPct > 0 ? '#EF4444' : '#10B981' }}>
                    {overrunPct > 0 ? `+${overrunPct}% перерасход` : `${Math.abs(overrunPct)}% быстрее`}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Мотивация */}
          <div
            className="rounded-2xl p-4 mb-4"
            style={{ background: 'linear-gradient(135deg, #7C3AED18, #A855F711)', border: '1px solid #7C3AED33' }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: '#7C3AED' }}>Мысль дня</p>
            <p className="text-sm leading-relaxed" style={{ color: '#C4B5FD' }}>{getDailyQuote()}</p>
          </div>

          {/* Reset */}
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="w-full py-2 rounded-xl text-xs"
              style={{ color: '#9B98B830' }}
            >
              Сбросить все данные
            </button>
          ) : (
            <div className="rounded-2xl p-4" style={{ backgroundColor: '#EF444411', border: '1px solid #EF444433' }}>
              <p className="text-sm font-semibold mb-1 text-center" style={{ color: '#EF4444' }}>Удалить всё?</p>
              <p className="text-xs text-center mb-3" style={{ color: '#9B98B8' }}>Проекты, сессии и прогресс будут удалены из GitHub</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmReset(false)} className="flex-1 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#9B98B8' }}>Отмена</button>
                <button onClick={async () => { await resetAll(); setConfirmReset(false) }} className="flex-1 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#EF4444', color: '#fff' }}>Удалить всё</button>
              </div>
            </div>
          )}
        </div>

        {/* ── ПРАВАЯ: Серии ── */}
        <div>
          <h2 className="text-lg font-bold mb-3" style={{ color: '#F0EEFF' }}>Серии</h2>

          {/* Глобальная серия */}
          <div className="rounded-2xl p-4 mb-3" style={{ backgroundColor: '#252236' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: '#9B98B8' }}>Глобальная</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black" style={{ color: streak.currentStreak > 0 ? '#F97316' : '#9B98B844' }}>
                {streak.currentStreak}
              </span>
              <div className="pb-1">
                <p className="text-sm" style={{ color: '#F0EEFF' }}>дней подряд</p>
                <p className="text-xs" style={{ color: '#9B98B8' }}>рекорд {streak.maxStreak}д</p>
              </div>
            </div>
            <p className="text-xs mt-2" style={{ color: activeToday ? '#10B981' : '#EF444488' }}>
              {activeToday ? '✓ сегодня активен' : '⚠ сегодня не работал'}
            </p>
          </div>

          {/* Серии по проектам */}
          <div className="flex flex-col gap-2">
            {projects.map(p => {
              const isActiveToday = p.lastActiveDate === todayStr
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/project/${p.id}`)}
                  className="w-full text-left rounded-2xl p-3 transition-all active:scale-98"
                  style={{ backgroundColor: '#252236', border: `1px solid ${p.color}22` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {p.icon
                        ? <span className="text-lg leading-none flex-shrink-0">{p.icon}</span>
                        : <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      }
                      <span className="text-sm font-medium truncate" style={{ color: '#F0EEFF' }}>{p.name}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <span className="text-lg font-black" style={{ color: p.streakDays > 0 ? '#F97316' : '#9B98B844' }}>
                        {p.streakDays}
                      </span>
                      <span className="text-xs" style={{ color: '#9B98B8' }}>д</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    {p.streakDays > 0 ? (
                      <div className="flex-1 h-1 rounded-full overflow-hidden mr-2" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, p.streakDays / Math.max(streak.maxStreak, 1) * 100)}%`,
                            backgroundColor: '#F97316',
                          }}
                        />
                      </div>
                    ) : <div className="flex-1" />}
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: isActiveToday ? '#10B98118' : 'rgba(255,255,255,0.04)',
                        color: isActiveToday ? '#10B981' : '#9B98B855',
                      }}
                    >
                      {isActiveToday ? '✓ сегодня' : 'не сегодня'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>}

      {/* ── МОБИЛЬНЫЙ: вертикальный стак ── */}
      {!isDesktop && <div>
        <div className="px-3 pt-12 pb-3">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#F0EEFF' }}>CTRL</h1>
              <p className="text-sm mt-0.5" style={{ color: '#9B98B8' }}>
                {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            {syncing && (
              <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#7C3AED22', color: '#7C3AED' }}>
                Синхронизация...
              </span>
            )}
          </div>
          <div className="mt-3 rounded-xl px-3 py-2" style={{ backgroundColor: '#252236' }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: '#7C3AED' }}>Ур. {level}</span>
                <span className="text-xs" style={{ color: '#9B98B8' }}>{rank}</span>
              </div>
              <span className="text-xs font-semibold" style={{ color: '#F0EEFF' }}>{streak.totalXP} XP</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full" style={{ width: `${xpProgress}%`, background: 'linear-gradient(90deg, #7C3AED, #A855F7)' }} />
            </div>
            <p className="text-xs mt-1" style={{ color: '#9B98B866' }}>ещё {nextLevelXP} XP до ур. {level + 1}</p>
          </div>
        </div>

        <div className="px-3 mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3" style={{ backgroundColor: '#252236' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold" style={{ color: '#9B98B8' }}>Неделя</span>
              <span className="text-sm font-bold" style={{ color: '#10B981' }}>{weeklyHours}ч</span>
            </div>
            <WeeklyChart minutes={streak.weeklyMinutes} />
          </div>
          <div className="rounded-2xl p-3 flex flex-col justify-between" style={{ backgroundColor: '#252236' }}>
            <span className="text-xs font-semibold" style={{ color: '#9B98B8' }}>Серия</span>
            <div className="flex items-end gap-1 mt-1">
              <span className="text-3xl font-black leading-none" style={{ color: '#F0EEFF' }}>{streak.currentStreak}</span>
              <span className="text-sm mb-0.5" style={{ color: '#9B98B8' }}>дн</span>
            </div>
            <p className="text-xs mt-1" style={{ color: '#F97316' }}>🔥 рекорд {streak.maxStreak}д</p>
          </div>
        </div>

        {totalEstimatedMin > 0 && (
          <div className="px-3 mb-4">
            <div className="rounded-2xl p-3" style={{ backgroundColor: '#252236' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#9B98B8' }}>Оценка времени</p>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {[
                  { label: 'план', value: Math.round(totalEstimatedMin / 60 * 10) / 10, color: '#F0EEFF' },
                  { label: 'потрачено', value: Math.round(spentMin / 60 * 10) / 10, color: '#10B981' },
                  { label: 'осталось', value: Math.round(remainingMin / 60 * 10) / 10, color: '#7C3AED' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl p-2 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-sm font-bold" style={{ color }}>{value}<span className="text-xs font-normal">ч</span></p>
                    <p className="text-xs" style={{ color: '#9B98B8' }}>{label}</p>
                  </div>
                ))}
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, totalEstimatedMin > 0 ? Math.round(spentMin / totalEstimatedMin * 100) : 0)}%`, background: 'linear-gradient(90deg, #7C3AED, #10B981)' }} />
              </div>
            </div>
          </div>
        )}

        <div className="px-3 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold" style={{ color: '#F0EEFF' }}>Проекты</h2>
            <button onClick={() => navigate('/new-project')} className="text-sm px-3 py-1 rounded-xl" style={{ backgroundColor: '#7C3AED22', color: '#7C3AED' }}>+ Добавить</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {projects.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>

        <div className="px-3 mt-6 mb-2">
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)} className="w-full py-2 rounded-xl text-xs" style={{ color: '#9B98B830' }}>
              Сбросить все данные
            </button>
          ) : (
            <div className="rounded-2xl p-3" style={{ backgroundColor: '#EF444411', border: '1px solid #EF444433' }}>
              <p className="text-sm font-semibold mb-1 text-center" style={{ color: '#EF4444' }}>Удалить всё?</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setConfirmReset(false)} className="flex-1 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#9B98B8' }}>Отмена</button>
                <button onClick={async () => { await resetAll(); setConfirmReset(false) }} className="flex-1 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#EF4444', color: '#fff' }}>Удалить всё</button>
              </div>
            </div>
          )}
        </div>
      </div>}

    </div>
  )
}
