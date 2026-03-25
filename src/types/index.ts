export type TaskStatus = 'pending' | 'in_progress' | 'done'
export type ProjectCategory = 'general' | 'game' | 'book' | 'finance'

export interface Task {
  id: string
  title: string
  status: TaskStatus
  estimatedMinutes: number
  actualMinutes: number
  createdAt: string
  completedAt?: string | null
  weight?: number  // 1-10, важность для цели (default: 1)
}

export interface Goal {
  id: string
  title: string
  tasks: Task[]
  weight?: number   // 1-10, важность для проекта (default: 1)
  phaseId?: string  // к какой фазе относится
}

export interface Phase {
  id: string
  name: string
  order: number
}

export interface Project {
  id: string
  name: string
  color: string
  category: ProjectCategory
  createdAt: string
  goals: Goal[]
  phases: Phase[]
  totalXP: number
  projectLevel: number
  projectRank: string
  streakDays: number
  lastWorkedAt: string | null
  totalMinutes: number
  // AI-анализ
  completionOverride?: number | null  // AI-заданный % завершения
  aiAnalysis?: string | null          // текст анализа от Claude
  aiAnalyzedAt?: string | null        // когда был анализ
  // Папка проекта
  folderPath?: string | null          // путь к папке на диске
  // Иконка
  icon?: string                       // эмодзи-иконка проекта
}

export interface Session {
  id: string
  projectId: string
  taskId: string
  startedAt: string
  endedAt: string
  durationMinutes: number
  xpEarned: number
}

export interface GlobalStreak {
  currentStreak: number
  maxStreak: number
  totalXP: number
  level: number
  rank: string
  lastActiveDate: string | null
  weeklyMinutes: number[]
}

export interface GitHubConfig {
  token: string
  owner: string
  repo: string
}

export interface ActiveSession {
  projectId: string
  taskId: string
  startedAt: string
}

// Calendar
export interface WorkShift {
  date: string       // YYYY-MM-DD
  startTime: string  // HH:MM
  endTime: string    // HH:MM
  label: string
}

export interface PlannedSlot {
  id: string
  taskId: string
  projectId: string
  date: string       // YYYY-MM-DD
  startTime: string  // HH:MM
  durationMinutes: number
}

export interface FreeWindow {
  date: string       // YYYY-MM-DD
  startTime: string  // HH:MM
  endTime: string    // HH:MM
  freeMinutes: number
  label: string
}

export type EventType = 'work' | 'personal' | 'free' | 'other'

export interface CalendarEvent {
  id: string
  date: string       // YYYY-MM-DD
  startTime: string  // HH:MM
  endTime: string    // HH:MM
  label: string
  type: EventType
}

export interface Calendar {
  workSchedule: WorkShift[]
  plannedSlots: PlannedSlot[]
  blockedTime: WorkShift[]
  freeWindows: FreeWindow[]
  events: CalendarEvent[]
}

// Journal
export interface JournalEntry {
  id: string
  text: string
  createdAt: string  // ISO
}

export interface Journal {
  entries: JournalEntry[]
}

// Idea Board
export interface BoardSticker {
  id: string
  text: string
  x: number
  y: number
  color: string
}

export interface BoardConnection {
  from: string
  to: string
}

export interface Board {
  stickers: BoardSticker[]
  connections: BoardConnection[]
}
