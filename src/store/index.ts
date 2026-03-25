import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, Session, GlobalStreak, GitHubConfig, ActiveSession, Calendar, Board, Journal } from '../types'
import * as gh from '../lib/github'
import { calcGlobalLevel, updateStreak, buildSession, calcTaskXP, calcProjectLevel, calcProjectRank } from '../lib/xp'

interface Shas {
  [path: string]: string
}

const DEFAULT_CALENDAR: Calendar = {
  workSchedule: [],
  plannedSlots: [],
  blockedTime: [],
  freeWindows: [],
  events: [],
}

interface AppState {
  // Config
  config: GitHubConfig | null
  setConfig: (c: GitHubConfig) => void
  clearConfig: () => void

  // Data
  projects: Project[]
  sessions: Session[]
  streak: GlobalStreak
  calendar: Calendar
  shas: Shas
  loading: boolean
  syncing: boolean
  pendingSaves: number
  error: string | null

  // Active session
  activeSession: ActiveSession | null

  // Board (per-project, loaded on demand)
  boards: Record<string, Board>
  boardShas: Record<string, string>

  // Journal (per-project, loaded on demand)
  journals: Record<string, Journal>
  journalShas: Record<string, string>

  // Actions
  syncData: () => Promise<void>
  startSession: (projectId: string, taskId: string) => void
  stopSession: () => Promise<void>
  completeTask: (projectId: string, goalId: string, taskId: string) => Promise<void>
  addProject: (project: Project) => Promise<void>
  updateProject: (project: Project) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  addGoal: (projectId: string, title: string) => Promise<void>
  deleteGoal: (projectId: string, goalId: string) => Promise<void>
  addTask: (projectId: string, goalId: string, title: string, estimatedMinutes: number) => Promise<void>
  deleteTask: (projectId: string, goalId: string, taskId: string) => Promise<void>
  uncompleteTask: (projectId: string, goalId: string, taskId: string) => Promise<void>
  setCalendar: (calendar: Calendar) => Promise<void>
  addEvent: (event: import('../types').CalendarEvent) => Promise<void>
  deleteEvent: (eventId: string) => Promise<void>
  setProjectAnalysis: (projectId: string, analysis: string, completionOverride: number | null) => Promise<void>
  resetAll: () => Promise<void>
  loadBoard: (projectId: string) => Promise<void>
  saveBoard: (projectId: string, board: Board) => Promise<void>
  loadJournal: (projectId: string) => Promise<void>
  addJournalEntry: (projectId: string, text: string) => Promise<void>
  deleteJournalEntry: (projectId: string, entryId: string) => Promise<void>
}

const DEFAULT_STREAK: GlobalStreak = {
  currentStreak: 0,
  maxStreak: 0,
  totalXP: 0,
  level: 1,
  rank: 'Подмастерье',
  lastActiveDate: null,
  weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
}

// Module-level: last time we successfully loaded from GitHub (resets on page reload)
let lastGithubSyncAt = 0
const SYNC_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      config: null,
      projects: [],
      sessions: [],
      streak: DEFAULT_STREAK,
      calendar: DEFAULT_CALENDAR,
      shas: {},
      loading: false,
      syncing: false,
      pendingSaves: 0,
      error: null,
      activeSession: null,
      boards: {},
      boardShas: {},
      journals: {},
      journalShas: {},

      setConfig: (c) => set({ config: c }),
      clearConfig: () => {
        lastGithubSyncAt = 0
        set({
          config: null,
          projects: [],
          sessions: [],
          streak: DEFAULT_STREAK,
          calendar: DEFAULT_CALENDAR,
          shas: {},
          boards: {},
          boardShas: {},
          journals: {},
          journalShas: {},
        })
      },

      syncData: async () => {
        const { config, pendingSaves } = get()
        if (!config) return
        if (pendingSaves > 0) return
        if (Date.now() - lastGithubSyncAt < SYNC_COOLDOWN_MS) return
        set({ syncing: true, error: null })
        try {
          const data = await gh.fetchAllData(config)
          const streakData = data.streak as GlobalStreak
          const { level, rank } = calcGlobalLevel(streakData.totalXP)
          lastGithubSyncAt = Date.now()
          set({
            projects: data.projects,
            sessions: data.sessions,
            streak: { ...streakData, level, rank },
            calendar: data.calendar,
            shas: data.shas,
            syncing: false,
          })
        } catch (e: unknown) {
          set({ syncing: false, error: e instanceof Error ? e.message : 'Sync error' })
        }
      },

      startSession: (projectId, taskId) => {
        set({ activeSession: { projectId, taskId, startedAt: new Date().toISOString() } })
      },

      stopSession: async () => {
        const { activeSession, config, sessions, streak, projects, shas } = get()
        if (!activeSession || !config) return

        const endedAt = new Date().toISOString()
        const session = buildSession(activeSession.projectId, activeSession.taskId, activeSession.startedAt, endedAt)
        const newSessions = [...sessions, session]

        const newStreak = updateStreak(streak)
        const updatedStreak = {
          ...newStreak,
          totalXP: newStreak.totalXP + session.xpEarned,
          weeklyMinutes: updateWeeklyMinutes(newStreak.weeklyMinutes, session.durationMinutes),
        }
        const { level, rank } = calcGlobalLevel(updatedStreak.totalXP)
        updatedStreak.level = level
        updatedStreak.rank = rank

        const today = endedAt.split('T')[0]
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        const updatedProjects = projects.map(p => {
          if (p.id !== activeSession.projectId) return p
          const lastDate = p.lastWorkedAt?.split('T')[0]
          const newStreakDays =
            lastDate === today ? p.streakDays :
            lastDate === yesterday ? p.streakDays + 1 : 1
          return { ...p, totalMinutes: p.totalMinutes + session.durationMinutes, lastWorkedAt: endedAt, streakDays: newStreakDays }
        })

        set(s => ({ activeSession: null, sessions: newSessions, streak: updatedStreak, projects: updatedProjects, pendingSaves: s.pendingSaves + 1 }))

        try {
          const [sessionsSha, streakSha, projectsSha] = await Promise.all([
            gh.saveSessions(config, newSessions, shas['data/sessions.json']),
            gh.saveStreak(config, updatedStreak, shas['data/streak.json']),
            gh.saveProjects(config, updatedProjects, shas['data/projects.json']),
          ])
          set(s => ({ shas: { ...s.shas, 'data/sessions.json': sessionsSha, 'data/streak.json': streakSha, 'data/projects.json': projectsSha }, pendingSaves: s.pendingSaves - 1 }))
        } catch (e) {
          set(s => ({ pendingSaves: s.pendingSaves - 1 }))
          console.error('Failed to save session', e)
        }
      },

      completeTask: async (projectId, goalId, taskId) => {
        const { config, projects, streak, shas } = get()
        const project = projects.find(p => p.id === projectId)
        if (!project) return

        const updatedProjects = projects.map(p => {
          if (p.id !== projectId) return p
          const goals = p.goals.map(g => {
            if (g.id !== goalId) return g
            const tasks = g.tasks.map(t =>
              t.id === taskId
                ? { ...t, status: 'done' as const, completedAt: new Date().toISOString() }
                : t,
            )
            return { ...g, tasks }
          })
          const completedTask = p.goals.flatMap(g => g.tasks).find(t => t.id === taskId)
          const taskXP = completedTask ? calcTaskXP(completedTask) : 10
          const newTotalXP = p.totalXP + taskXP
          const newLevel = calcProjectLevel(newTotalXP)
          const newRank = calcProjectRank({ ...p, projectLevel: newLevel })
          return { ...p, goals, totalXP: newTotalXP, projectLevel: newLevel, projectRank: newRank }
        })

        const updatedProject = updatedProjects.find(p => p.id === projectId)!
        const newStreak = { ...streak }
        for (const goal of updatedProject.goals) {
          if (goal.id === goalId && goal.tasks.every(t => t.status === 'done')) {
            newStreak.totalXP += 50
          }
        }
        const { level, rank } = calcGlobalLevel(newStreak.totalXP)
        newStreak.level = level
        newStreak.rank = rank

        set(s => ({ projects: updatedProjects, streak: newStreak, pendingSaves: s.pendingSaves + 1 }))

        try {
          const [projectsSha, streakSha] = await Promise.all([
            gh.saveProjects(config!, updatedProjects, shas['data/projects.json']),
            gh.saveStreak(config!, newStreak, shas['data/streak.json']),
          ])
          set(s => ({ shas: { ...s.shas, 'data/projects.json': projectsSha, 'data/streak.json': streakSha }, pendingSaves: s.pendingSaves - 1 }))
        } catch (e) {
          set(s => ({ pendingSaves: s.pendingSaves - 1 }))
          console.error('Failed to save task completion', e)
        }
      },

      addProject: async (project) => {
        const { config, projects, shas } = get()
        const updated = [...projects, project]
        set(s => ({ projects: updated, pendingSaves: s.pendingSaves + 1 }))
        if (config) {
          try {
            const sha = await gh.saveProjects(config, updated, shas['data/projects.json'])
            set(s => ({ shas: { ...s.shas, 'data/projects.json': sha }, pendingSaves: s.pendingSaves - 1 }))
          } catch (e) { set(s => ({ pendingSaves: s.pendingSaves - 1 })) }
        } else { set(s => ({ pendingSaves: s.pendingSaves - 1 })) }
      },

      updateProject: async (project) => {
        const { config, projects, shas } = get()
        const updated = projects.map(p => (p.id === project.id ? project : p))
        set(s => ({ projects: updated, pendingSaves: s.pendingSaves + 1 }))
        if (config) {
          try {
            const sha = await gh.saveProjects(config, updated, shas['data/projects.json'])
            set(s => ({ shas: { ...s.shas, 'data/projects.json': sha }, pendingSaves: s.pendingSaves - 1 }))
          } catch (e) { set(s => ({ pendingSaves: s.pendingSaves - 1 })) }
        } else { set(s => ({ pendingSaves: s.pendingSaves - 1 })) }
      },

      deleteProject: async (projectId) => {
        const { config, projects, shas } = get()
        const updated = projects.filter(p => p.id !== projectId)
        set(s => ({ projects: updated, pendingSaves: s.pendingSaves + 1 }))
        if (config) {
          try {
            const sha = await gh.saveProjects(config, updated, shas['data/projects.json'])
            set(s => ({ shas: { ...s.shas, 'data/projects.json': sha }, pendingSaves: s.pendingSaves - 1 }))
          } catch (e) { set(s => ({ pendingSaves: s.pendingSaves - 1 })) }
        } else { set(s => ({ pendingSaves: s.pendingSaves - 1 })) }
      },

      addGoal: async (projectId, title) => {
        const { config, projects, shas } = get()
        const newGoal = { id: `goal-${Date.now()}`, title, tasks: [] }
        const updated = projects.map(p =>
          p.id === projectId ? { ...p, goals: [...p.goals, newGoal] } : p
        )
        set(s => ({ projects: updated, pendingSaves: s.pendingSaves + 1 }))
        if (config) {
          try {
            const sha = await gh.saveProjects(config, updated, shas['data/projects.json'])
            set(s => ({ shas: { ...s.shas, 'data/projects.json': sha }, pendingSaves: s.pendingSaves - 1 }))
          } catch (e) { set(s => ({ pendingSaves: s.pendingSaves - 1 })) }
        } else { set(s => ({ pendingSaves: s.pendingSaves - 1 })) }
      },

      deleteGoal: async (projectId, goalId) => {
        const { config, projects, shas } = get()
        const updated = projects.map(p =>
          p.id === projectId ? { ...p, goals: p.goals.filter(g => g.id !== goalId) } : p
        )
        set(s => ({ projects: updated, pendingSaves: s.pendingSaves + 1 }))
        if (config) {
          try {
            const sha = await gh.saveProjects(config, updated, shas['data/projects.json'])
            set(s => ({ shas: { ...s.shas, 'data/projects.json': sha }, pendingSaves: s.pendingSaves - 1 }))
          } catch (e) { set(s => ({ pendingSaves: s.pendingSaves - 1 })) }
        } else { set(s => ({ pendingSaves: s.pendingSaves - 1 })) }
      },

      addTask: async (projectId, goalId, title, estimatedMinutes) => {
        const { config, projects, shas } = get()
        const newTask = {
          id: `task-${Date.now()}`,
          title,
          status: 'pending' as const,
          estimatedMinutes,
          actualMinutes: 0,
          createdAt: new Date().toISOString(),
          completedAt: null,
        }
        const updated = projects.map(p =>
          p.id === projectId
            ? { ...p, goals: p.goals.map(g => g.id === goalId ? { ...g, tasks: [...g.tasks, newTask] } : g) }
            : p
        )
        set(s => ({ projects: updated, pendingSaves: s.pendingSaves + 1 }))
        if (config) {
          try {
            const sha = await gh.saveProjects(config, updated, shas['data/projects.json'])
            set(s => ({ shas: { ...s.shas, 'data/projects.json': sha }, pendingSaves: s.pendingSaves - 1 }))
          } catch (e) { set(s => ({ pendingSaves: s.pendingSaves - 1 })) }
        } else { set(s => ({ pendingSaves: s.pendingSaves - 1 })) }
      },

      deleteTask: async (projectId, goalId, taskId) => {
        const { config, projects, shas } = get()
        const updated = projects.map(p =>
          p.id === projectId
            ? { ...p, goals: p.goals.map(g => g.id === goalId ? { ...g, tasks: g.tasks.filter(t => t.id !== taskId) } : g) }
            : p
        )
        set(s => ({ projects: updated, pendingSaves: s.pendingSaves + 1 }))
        if (config) {
          try {
            const sha = await gh.saveProjects(config, updated, shas['data/projects.json'])
            set(s => ({ shas: { ...s.shas, 'data/projects.json': sha }, pendingSaves: s.pendingSaves - 1 }))
          } catch (e) { set(s => ({ pendingSaves: s.pendingSaves - 1 })) }
        } else { set(s => ({ pendingSaves: s.pendingSaves - 1 })) }
      },

      uncompleteTask: async (projectId, goalId, taskId) => {
        const { config, projects, shas } = get()
        const updated = projects.map(p =>
          p.id !== projectId ? p : {
            ...p,
            goals: p.goals.map(g =>
              g.id !== goalId ? g : {
                ...g,
                tasks: g.tasks.map(t =>
                  t.id === taskId ? { ...t, status: 'pending' as const, completedAt: null } : t
                ),
              }
            ),
          }
        )
        set(s => ({ projects: updated, pendingSaves: s.pendingSaves + 1 }))
        if (config) {
          try {
            const sha = await gh.saveProjects(config, updated, shas['data/projects.json'])
            set(s => ({ shas: { ...s.shas, 'data/projects.json': sha }, pendingSaves: s.pendingSaves - 1 }))
          } catch (e) { set(s => ({ pendingSaves: s.pendingSaves - 1 })) }
        } else { set(s => ({ pendingSaves: s.pendingSaves - 1 })) }
      },

      resetAll: async () => {
        const { config, shas } = get()
        const emptyProjects: Project[] = []
        const emptySessions: Session[] = []
        const resetStreak: GlobalStreak = { ...DEFAULT_STREAK }
        set({ projects: emptyProjects, sessions: emptySessions, streak: resetStreak, activeSession: null, boards: {}, boardShas: {} })
        if (config) {
          const [pSha, sSha, stSha] = await Promise.all([
            gh.saveProjects(config, emptyProjects, shas['data/projects.json']),
            gh.saveSessions(config, emptySessions, shas['data/sessions.json']),
            gh.saveStreak(config, resetStreak, shas['data/streak.json']),
          ])
          set(s => ({ shas: { ...s.shas, 'data/projects.json': pSha, 'data/sessions.json': sSha, 'data/streak.json': stSha } }))
        }
      },

      addEvent: async (event) => {
        const { config, calendar, shas } = get()
        const updated = { ...calendar, events: [...(calendar.events ?? []), event] }
        set({ calendar: updated })
        if (config) {
          const sha = await gh.saveCalendar(config, updated, shas['data/calendar.json'])
          set(s => ({ shas: { ...s.shas, 'data/calendar.json': sha } }))
        }
      },

      deleteEvent: async (eventId) => {
        const { config, calendar, shas } = get()
        const updated = { ...calendar, events: (calendar.events ?? []).filter(e => e.id !== eventId) }
        set({ calendar: updated })
        if (config) {
          const sha = await gh.saveCalendar(config, updated, shas['data/calendar.json'])
          set(s => ({ shas: { ...s.shas, 'data/calendar.json': sha } }))
        }
      },

      setCalendar: async (calendar) => {
        const { config, shas } = get()
        set({ calendar })
        if (config) {
          const sha = await gh.saveCalendar(config, calendar, shas['data/calendar.json'])
          set(s => ({ shas: { ...s.shas, 'data/calendar.json': sha } }))
        }
      },

      loadBoard: async (projectId) => {
        const { config, boards } = get()
        if (!config || boards[projectId]) return
        const { board, sha } = await gh.fetchBoard(config, projectId)
        set(s => ({
          boards: { ...s.boards, [projectId]: board },
          boardShas: { ...s.boardShas, [projectId]: sha },
        }))
      },

      saveBoard: async (projectId, board) => {
        const { config, boardShas } = get()
        set(s => ({ boards: { ...s.boards, [projectId]: board } }))
        if (config) {
          const sha = await gh.saveBoard(config, projectId, board, boardShas[projectId])
          set(s => ({ boardShas: { ...s.boardShas, [projectId]: sha } }))
        }
      },

      loadJournal: async (projectId) => {
        const { config, journals } = get()
        if (!config || journals[projectId]) return
        const { journal, sha } = await gh.fetchJournal(config, projectId)
        set(s => ({
          journals: { ...s.journals, [projectId]: journal },
          journalShas: { ...s.journalShas, [projectId]: sha },
        }))
      },

      addJournalEntry: async (projectId, text) => {
        const { config, journals, journalShas } = get()
        const current = journals[projectId] ?? { entries: [] }
        const entry = { id: `je-${Date.now()}`, text, createdAt: new Date().toISOString() }
        const updated = { entries: [entry, ...current.entries] }
        set(s => ({ journals: { ...s.journals, [projectId]: updated } }))
        if (config) {
          const sha = await gh.saveJournal(config, projectId, updated, journalShas[projectId])
          set(s => ({ journalShas: { ...s.journalShas, [projectId]: sha } }))
        }
      },

      deleteJournalEntry: async (projectId, entryId) => {
        const { config, journals, journalShas } = get()
        const current = journals[projectId] ?? { entries: [] }
        const updated = { entries: current.entries.filter(e => e.id !== entryId) }
        set(s => ({ journals: { ...s.journals, [projectId]: updated } }))
        if (config) {
          const sha = await gh.saveJournal(config, projectId, updated, journalShas[projectId])
          set(s => ({ journalShas: { ...s.journalShas, [projectId]: sha } }))
        }
      },

      setProjectAnalysis: async (projectId, analysis, completionOverride) => {
        const { config, projects, shas } = get()
        const updated = projects.map(p =>
          p.id === projectId
            ? { ...p, aiAnalysis: analysis, completionOverride, aiAnalyzedAt: new Date().toISOString() }
            : p
        )
        set({ projects: updated })
        if (config) {
          const sha = await gh.saveProjects(config, updated, shas['data/projects.json'])
          set(s => ({ shas: { ...s.shas, 'data/projects.json': sha } }))
        }
      },
    }),
    {
      name: 'ctrl-storage',
      partialize: (state) => ({
        config: state.config,
        projects: state.projects,
        sessions: state.sessions,
        streak: state.streak,
        calendar: state.calendar,
        shas: state.shas,
        activeSession: state.activeSession,
        boards: state.boards,
        boardShas: state.boardShas,
        journals: state.journals,
        journalShas: state.journalShas,
      }),
    },
  ),
)

function updateWeeklyMinutes(weekly: number[], addMinutes: number): number[] {
  const dayOfWeek = new Date().getDay()
  const updated = [...weekly]
  updated[dayOfWeek] = (updated[dayOfWeek] ?? 0) + addMinutes
  return updated
}
