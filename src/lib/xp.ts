import type { GlobalStreak, Project, Session, Task, ProjectCategory } from '../types'

export const XP = {
  TASK_COMPLETE: 10,
  TASK_IN_TIME_BONUS: 5,
  SESSION_PER_30MIN: 5,
  STREAK_DAY: 15,
  GOAL_COMPLETE: 50,
  WEEKLY_PERFECT: 100,
}

const GLOBAL_RANKS = [
  { min: 0, max: 500, rank: 'Подмастерье', levelRange: [1, 5] },
  { min: 500, max: 2000, rank: 'Ремесленник', levelRange: [6, 10] },
  { min: 2000, max: 8000, rank: 'Мастер', levelRange: [11, 20] },
  { min: 8000, max: 25000, rank: 'Архитектор', levelRange: [21, 35] },
  { min: 25000, max: Infinity, rank: 'Архитектор Миров', levelRange: [36, 100] },
]

const PROJECT_RANKS: Record<ProjectCategory, string[]> = {
  game: ['Новичок', 'Дизайнер', 'Геймдев', 'Создатель Миров', 'Легенда Жанра'],
  book: ['Писарь', 'Хронист', 'Рассказчик', 'Автор', 'Мастер Слова'],
  finance: ['Аналитик', 'Стратег', 'Архитектор Систем', 'Алхимик Данных', 'Алхимик Данных'],
  general: ['Новичок', 'Практик', 'Специалист', 'Эксперт', 'Мастер'],
}

// XP границы уровней проекта (5 уровней)
const PROJECT_XP_THRESHOLDS = [0, 50, 150, 400, 800]

export function calcProjectLevel(totalXP: number): number {
  let level = 1
  for (let i = 0; i < PROJECT_XP_THRESHOLDS.length; i++) {
    if (totalXP >= PROJECT_XP_THRESHOLDS[i]) level = i + 1
    else break
  }
  return level
}

export function calcProjectProgress(totalXP: number): { level: number; progress: number; nextLevelXP: number } {
  const level = calcProjectLevel(totalXP)
  const maxLevel = PROJECT_XP_THRESHOLDS.length
  if (level >= maxLevel) return { level, progress: 100, nextLevelXP: 0 }
  const current = PROJECT_XP_THRESHOLDS[level - 1]
  const next = PROJECT_XP_THRESHOLDS[level]
  const progress = Math.floor(((totalXP - current) / (next - current)) * 100)
  return { level, progress, nextLevelXP: next - totalXP }
}

export function calcGlobalLevel(totalXP: number): { level: number; rank: string; nextLevelXP: number; progress: number } {
  let level = 1
  // Each level requires 100 * level XP, cumulative
  let accumulated = 0
  while (true) {
    const needed = 100 * level
    if (accumulated + needed > totalXP) {
      const rankInfo = GLOBAL_RANKS.find(r => totalXP >= r.min && totalXP < r.max) ?? GLOBAL_RANKS[0]
      return {
        level,
        rank: rankInfo.rank,
        nextLevelXP: needed,
        progress: Math.floor(((totalXP - accumulated) / needed) * 100),
      }
    }
    accumulated += needed
    level++
  }
}

export function calcProjectRank(project: Project): string {
  const ranks = PROJECT_RANKS[project.category] ?? PROJECT_RANKS.general
  const idx = Math.min(project.projectLevel - 1, ranks.length - 1)
  return ranks[Math.floor(idx / (5 / ranks.length))] ?? ranks[ranks.length - 1]
}

export function calcSessionXP(durationMinutes: number): number {
  return Math.floor(durationMinutes / 30) * XP.SESSION_PER_30MIN
}

export function calcTaskXP(task: Task): number {
  let xp = XP.TASK_COMPLETE
  if (task.estimatedMinutes > 0 && task.actualMinutes <= task.estimatedMinutes * 1.2) {
    xp += XP.TASK_IN_TIME_BONUS
  }
  return xp
}

export function updateStreak(streak: GlobalStreak): GlobalStreak {
  const today = new Date().toISOString().split('T')[0]
  const last = streak.lastActiveDate

  if (last === today) return streak

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const newStreak = last === yesterday ? streak.currentStreak + 1 : 1

  return {
    ...streak,
    currentStreak: newStreak,
    maxStreak: Math.max(streak.maxStreak, newStreak),
    lastActiveDate: today,
    totalXP: streak.totalXP + XP.STREAK_DAY,
  }
}

export function buildSession(
  projectId: string,
  taskId: string,
  startedAt: string,
  endedAt: string,
): Session {
  const durationMinutes = Math.round(
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000,
  )
  return {
    id: `session-${Date.now()}`,
    projectId,
    taskId,
    startedAt,
    endedAt,
    durationMinutes,
    xpEarned: calcSessionXP(durationMinutes),
  }
}
