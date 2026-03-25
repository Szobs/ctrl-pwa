import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { ProjectCard } from '../components/ProjectCard'
import { calcGlobalLevel } from '../lib/xp'
import type { Project } from '../types'

const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function WeeklyChart({ minutes }: { minutes: number[] }) {
  const max = Math.max(...minutes, 1)
  const today = new Date().getDay()
  return (
    <div className="flex items-end gap-1 h-12">
      {minutes.map((m, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-sm transition-all duration-500"
            style={{
              height: `${Math.max(4, (m / max) * 40)}px`,
              backgroundColor: i === today ? '#10B981' : 'rgba(255,255,255,0.12)',
            }}
          />
          <span className="text-xs" style={{ color: i === today ? '#10B981' : '#9B98B8', fontSize: 9 }}>
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
  const { projects, streak, syncing, syncData, startSession, resetAll } = useStore()
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => { syncData() }, [])

  const totalWeeklyMinutes = streak.weeklyMinutes.reduce((a, b) => a + b, 0)
  const weeklyHours = Math.round(totalWeeklyMinutes / 60 * 10) / 10
  const next = getNextTask(projects)

  // XP прогресс
  const { level, rank, nextLevelXP, progress: xpProgress } = calcGlobalLevel(streak.totalXP)

  // Оценка времени по всем проектам
  const allTasks = projects.flatMap(p => p.goals.flatMap(g => g.tasks))
  const totalEstimatedMin = allTasks.reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0)
  const remainingMin = allTasks.filter(t => t.status !== 'done').reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0)
  const spentMin = projects.reduce((s, p) => s + p.totalMinutes, 0)
  const doneTasks = allTasks.filter(t => t.status === 'done')
  const doneEstimated = doneTasks.reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0)
  const doneSpent = doneTasks.reduce((s, t) => s + (t.actualMinutes ?? 0), 0)
  const overrunPct = doneEstimated > 0 ? Math.round(((doneSpent - doneEstimated) / doneEstimated) * 100) : 0

  return (
    <div className="flex flex-col min-h-svh pb-24" style={{ backgroundColor: '#1E1B2E' }}>
      {/* Header */}
      <div className="px-2 pt-12 pb-3">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#F0EEFF' }}>CTRL</h1>
            <p className="text-sm mt-0.5" style={{ color: '#9B98B8' }}>
              {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {syncing && (
              <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#7C3AED22', color: '#7C3AED' }}>
                Синхронизация...
              </span>
            )}
          </div>
        </div>

        {/* XP compact */}
        <div className="mt-3 rounded-xl px-3 py-2" style={{ backgroundColor: '#252236' }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: '#7C3AED' }}>Ур. {level}</span>
              <span className="text-xs" style={{ color: '#9B98B8' }}>{rank}</span>
            </div>
            <span className="text-xs font-semibold" style={{ color: '#F0EEFF' }}>{streak.totalXP} XP</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${xpProgress}%`, background: 'linear-gradient(90deg, #7C3AED, #A855F7)' }}
            />
          </div>
          <p className="text-xs mt-1" style={{ color: '#9B98B866' }}>ещё {nextLevelXP} XP до ур. {level + 1}</p>
        </div>
      </div>

      {/* Weekly stats + Streak side by side */}
      <div className="px-2 mb-4 grid grid-cols-2 gap-2">
        {/* Weekly chart */}
        <div className="rounded-2xl p-3" style={{ backgroundColor: '#252236' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold" style={{ color: '#9B98B8' }}>Неделя</span>
            <span className="text-sm font-bold" style={{ color: '#10B981' }}>{weeklyHours}ч</span>
          </div>
          <WeeklyChart minutes={streak.weeklyMinutes} />
        </div>
        {/* Streak */}
        <div className="rounded-2xl p-3 flex flex-col justify-between" style={{ backgroundColor: '#252236' }}>
          <span className="text-xs font-semibold" style={{ color: '#9B98B8' }}>Серия</span>
          <div className="flex items-end gap-1 mt-1">
            <span className="text-3xl font-black leading-none" style={{ color: '#F0EEFF' }}>{streak.currentStreak}</span>
            <span className="text-sm mb-0.5" style={{ color: '#9B98B8' }}>дн</span>
          </div>
          <div className="mt-2">
            <p className="text-xs" style={{ color: '#F97316' }}>
              🔥 рекорд {streak.maxStreak}д
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#9B98B866' }}>
              {streak.lastActiveDate === new Date().toISOString().split('T')[0] ? '✓ сегодня активен' : 'сегодня не работал'}
            </p>
          </div>
        </div>
      </div>

      {/* Time budget across all projects */}
      {totalEstimatedMin > 0 && (
        <div className="px-2 mb-4">
          <div className="rounded-2xl p-3" style={{ backgroundColor: '#252236' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: '#9B98B8' }}>Оценка времени · все проекты</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <p className="text-base font-bold" style={{ color: '#F0EEFF' }}>{Math.round(totalEstimatedMin / 60 * 10) / 10}<span className="text-xs font-normal">ч</span></p>
                <p className="text-xs mt-0.5" style={{ color: '#9B98B8' }}>план</p>
              </div>
              <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <p className="text-base font-bold" style={{ color: '#10B981' }}>{Math.round(spentMin / 60 * 10) / 10}<span className="text-xs font-normal">ч</span></p>
                <p className="text-xs mt-0.5" style={{ color: '#9B98B8' }}>потрачено</p>
              </div>
              <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <p className="text-base font-bold" style={{ color: '#7C3AED' }}>{Math.round(remainingMin / 60 * 10) / 10}<span className="text-xs font-normal">ч</span></p>
                <p className="text-xs mt-0.5" style={{ color: '#9B98B8' }}>осталось</p>
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, totalEstimatedMin > 0 ? Math.round((spentMin / totalEstimatedMin) * 100) : 0)}%`,
                  background: 'linear-gradient(90deg, #7C3AED, #10B981)',
                }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: '#9B98B8' }}>
                {Math.min(100, totalEstimatedMin > 0 ? Math.round((spentMin / totalEstimatedMin) * 100) : 0)}% от плана
              </span>
              {overrunPct !== 0 && (
                <span className="text-xs" style={{ color: overrunPct > 0 ? '#EF4444' : '#10B981' }}>
                  {overrunPct > 0 ? `+${overrunPct}% перерасход` : `${Math.abs(overrunPct)}% быстрее оценки`}
                </span>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Projects */}
      <div className="px-2">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-semibold" style={{ color: '#F0EEFF' }}>Проекты</h2>
          <button
            onClick={() => navigate('/new-project')}
            className="text-sm px-3 py-1 rounded-xl transition-all active:scale-95"
            style={{ backgroundColor: '#7C3AED22', color: '#7C3AED' }}
          >
            + Добавить
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🚀</p>
            <p className="text-sm" style={{ color: '#9B98B8' }}>Нет проектов. Добавь первый!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {projects.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </div>

      {/* Reset */}
      <div className="px-2 mt-8 mb-2">
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full py-2 rounded-xl text-xs transition-all"
            style={{ color: '#9B98B830', backgroundColor: 'transparent' }}
          >
            Сбросить все данные
          </button>
        ) : (
          <div className="rounded-2xl p-3" style={{ backgroundColor: '#EF444411', border: '1px solid #EF444433' }}>
            <p className="text-sm font-semibold mb-1 text-center" style={{ color: '#EF4444' }}>Удалить всё?</p>
            <p className="text-xs text-center mb-3" style={{ color: '#9B98B8' }}>Проекты, сессии и прогресс будут удалены из GitHub</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmReset(false)} className="flex-1 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#9B98B8' }}>Отмена</button>
              <button onClick={async () => { await resetAll(); setConfirmReset(false) }} className="flex-1 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#EF4444', color: '#fff' }}>Удалить всё</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
