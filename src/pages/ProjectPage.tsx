import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { ProgressBar } from '../components/ProgressBar'
import { IdeaBoard } from '../components/IdeaBoard'
import { ActivityGraph } from '../components/ActivityGraph'
import { calcProjectProgress } from '../lib/xp'
import { calcWeightedProgress } from '../lib/templates'
import type { Task, Goal, Board } from '../types'

type Tab = 'tasks' | 'board' | 'history' | 'journal'

const COLORS = ['#7C3AED', '#F97316', '#3B82F6', '#10B981', '#EF4444', '#EC4899', '#F59E0B', '#06B6D4']

const ICONS = ['🎮', '📖', '📈', '🌐', '🚀', '⚔️', '🏰', '🤖', '🎵', '🎨', '💡', '🔬', '📝', '🌍', '⚡', '🎯']

// ── Edit Project Modal ────────────────────────────────────────────────────────
function EditProjectModal({ name, color, folderPath, icon, onSave, onDelete, onClose }: {
  name: string
  color: string
  folderPath?: string | null
  icon?: string
  onSave: (name: string, color: string, folderPath: string | null, icon: string | undefined) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [n, setN] = useState(name)
  const [c, setC] = useState(color)
  const [ic, setIc] = useState(icon ?? '')
  const [path, setPath] = useState(folderPath ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [folderStatus, setFolderStatus] = useState<'idle' | 'picking' | 'created' | 'error'>('idle')

  const handlePickFolder = async () => {
    setFolderStatus('picking')
    try {
      // @ts-ignore — File System Access API
      const parentHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
      // Создаём подпапку с именем проекта
      const projectName = n.trim() || name
      // @ts-ignore
      await parentHandle.getDirectoryHandle(projectName, { create: true })
      // Подставляем имя папки в поле пути
      if (!path) setPath(projectName)
      setFolderStatus('created')
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setFolderStatus('error')
      } else {
        setFolderStatus('idle')
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        className="w-full rounded-t-3xl p-6 max-h-[90svh] overflow-y-auto"
        style={{ backgroundColor: '#252236' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
        <h2 className="text-base font-bold mb-4" style={{ color: '#F0EEFF' }}>Редактировать проект</h2>

        <label className="text-xs font-semibold mb-1 block" style={{ color: '#9B98B8' }}>Название</label>
        <input
          value={n}
          onChange={e => setN(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm mb-4 outline-none"
          style={{ backgroundColor: '#1E1B2E', color: '#F0EEFF', border: '1px solid rgba(255,255,255,0.1)' }}
        />

        <label className="text-xs font-semibold mb-2 block" style={{ color: '#9B98B8' }}>Цвет</label>
        <div className="flex gap-2 mb-5">
          {COLORS.map(col => (
            <button
              key={col}
              onClick={() => setC(col)}
              className="w-8 h-8 rounded-full transition-all"
              style={{
                backgroundColor: col,
                boxShadow: c === col ? `0 0 0 3px #1E1B2E, 0 0 0 5px ${col}` : 'none',
                transform: c === col ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Иконка */}
        <label className="text-xs font-semibold mb-2 block" style={{ color: '#9B98B8' }}>Иконка</label>
        <div className="flex gap-2 flex-wrap mb-5">
          <button
            onClick={() => setIc('')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{
              backgroundColor: ic === '' ? `${c}22` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${ic === '' ? `${c}44` : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <span style={{ color: '#9B98B8', fontSize: 10 }}>∅</span>
          </button>
          {ICONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => setIc(emoji)}
              className="w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all"
              style={{
                backgroundColor: ic === emoji ? `${c}22` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${ic === emoji ? `${c}44` : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Папка проекта */}
        <label className="text-xs font-semibold mb-2 block" style={{ color: '#9B98B8' }}>Папка проекта</label>
        <div className="flex gap-2 mb-1">
          <input
            value={path}
            onChange={e => setPath(e.target.value)}
            placeholder="C:\Projects\MyGame"
            className="flex-1 px-3 py-2.5 rounded-xl text-xs outline-none"
            style={{ backgroundColor: '#1E1B2E', color: '#F0EEFF', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <button
            onClick={handlePickFolder}
            disabled={folderStatus === 'picking'}
            className="px-3 py-2.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-all"
            style={{ backgroundColor: `${c}22`, color: c, border: `1px solid ${c}44` }}
          >
            {folderStatus === 'picking' ? '...' : '📁 Создать'}
          </button>
        </div>
        {folderStatus === 'created' && (
          <p className="text-xs mb-3" style={{ color: '#10B981' }}>
            ✓ Папка создана. Введи полный путь вручную для AI-анализа.
          </p>
        )}
        {folderStatus === 'error' && (
          <p className="text-xs mb-3" style={{ color: '#EF4444' }}>Ошибка. Браузер может не поддерживать File System API.</p>
        )}
        {!folderStatus || folderStatus === 'idle' ? (
          <p className="text-xs mb-4" style={{ color: '#9B98B855' }}>
            Нажми «Создать» — выбери родительскую папку, подпапка проекта создастся автоматически. Затем укажи полный путь для AI-анализа.
          </p>
        ) : null}

        <button
          onClick={() => { if (n.trim()) onSave(n.trim(), c, path.trim() || null, ic || undefined) }}
          className="w-full py-3 rounded-xl font-semibold text-sm mb-3 transition-all active:scale-98"
          style={{ backgroundColor: c, color: '#fff' }}
        >
          Сохранить
        </button>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-98"
            style={{ backgroundColor: '#EF444418', color: '#EF4444' }}
          >
            Удалить проект
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 py-3 rounded-xl font-semibold text-sm"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#9B98B8' }}
            >
              Отмена
            </button>
            <button
              onClick={onDelete}
              className="flex-1 py-3 rounded-xl font-semibold text-sm"
              style={{ backgroundColor: '#EF4444', color: '#fff' }}
            >
              Удалить навсегда
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Add Goal Modal ─────────────────────────────────────────────────────────────
function AddGoalModal({ onSave, onClose }: { onSave: (title: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full rounded-t-3xl p-6" style={{ backgroundColor: '#252236' }} onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
        <h2 className="text-base font-bold mb-4" style={{ color: '#F0EEFF' }}>Новая цель</h2>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && title.trim()) onSave(title.trim()) }}
          placeholder="Название цели..."
          className="w-full px-4 py-3 rounded-xl text-sm mb-4 outline-none"
          style={{ backgroundColor: '#1E1B2E', color: '#F0EEFF', border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <button
          onClick={() => { if (title.trim()) onSave(title.trim()) }}
          className="w-full py-3 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: '#7C3AED', color: '#fff' }}
        >
          Добавить
        </button>
      </div>
    </div>
  )
}

// ── Add Task Modal ─────────────────────────────────────────────────────────────
function AddTaskModal({ onSave, onClose }: { onSave: (title: string, minutes: number) => void; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState('30')
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full rounded-t-3xl p-6" style={{ backgroundColor: '#252236' }} onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
        <h2 className="text-base font-bold mb-4" style={{ color: '#F0EEFF' }}>Новая задача</h2>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Название задачи..."
          className="w-full px-4 py-3 rounded-xl text-sm mb-3 outline-none"
          style={{ backgroundColor: '#1E1B2E', color: '#F0EEFF', border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <div className="flex items-center gap-3 mb-4">
          <label className="text-xs" style={{ color: '#9B98B8' }}>Оценка (мин):</label>
          <input
            type="number"
            value={minutes}
            onChange={e => setMinutes(e.target.value)}
            className="w-20 px-3 py-2 rounded-xl text-sm outline-none text-center"
            style={{ backgroundColor: '#1E1B2E', color: '#F0EEFF', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>
        <button
          onClick={() => { if (title.trim()) onSave(title.trim(), parseInt(minutes) || 30) }}
          className="w-full py-3 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: '#7C3AED', color: '#fff' }}
        >
          Добавить
        </button>
      </div>
    </div>
  )
}

// ── Task Item ─────────────────────────────────────────────────────────────────
function TaskItem({ task, projectColor, onStart, onComplete, onUncomplete, onDelete }: {
  task: Task
  projectColor: string
  onStart: () => void
  onComplete: () => void
  onUncomplete: () => void
  onDelete: () => void
}) {
  const [showDelete, setShowDelete] = useState(false)
  const statusIcon = task.status === 'done' ? '✓' : task.status === 'in_progress' ? '▶' : '○'
  const statusColor = task.status === 'done' ? '#10B981' : task.status === 'in_progress' ? projectColor : '#9B98B8'

  return (
    <div
      className="flex items-start gap-3 py-3 border-b"
      style={{ borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <button
        onClick={task.status === 'done' ? onUncomplete : onComplete}
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold transition-all active:scale-90"
        style={{
          backgroundColor: task.status === 'done' ? '#10B98122' : 'rgba(255,255,255,0.06)',
          color: statusColor,
          border: `1px solid ${statusColor}44`,
        }}
      >
        {statusIcon}
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: task.status === 'done' ? '#9B98B8' : '#F0EEFF', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
          {task.title}
        </p>
        <div className="flex gap-3 mt-1">
          {task.estimatedMinutes > 0 && (
            <span className="text-xs" style={{ color: '#9B98B8' }}>~{task.estimatedMinutes}мин</span>
          )}
          {task.actualMinutes > 0 && (
            <span className="text-xs" style={{ color: '#10B981' }}>факт {task.actualMinutes}мин</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {task.status !== 'done' && (
          <button
            onClick={onStart}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95"
            style={{ backgroundColor: `${projectColor}22`, color: projectColor, border: `1px solid ${projectColor}33` }}
          >
            ▶
          </button>
        )}
        <button
          onClick={() => setShowDelete(s => !s)}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-all"
          style={{ color: showDelete ? '#EF4444' : '#9B98B840', backgroundColor: showDelete ? '#EF444418' : 'transparent' }}
        >
          ×
        </button>
        {showDelete && (
          <button
            onClick={onDelete}
            className="px-2 py-1 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: '#EF4444', color: '#fff' }}
          >
            Удалить
          </button>
        )}
      </div>
    </div>
  )
}

// ── Goal Section ──────────────────────────────────────────────────────────────
function GoalSection({ goal, projectColor, onStartTask, onCompleteTask, onUncompleteTask, onDeleteTask, onDeleteGoal, onAddTask }: {
  goal: Goal
  projectColor: string
  onStartTask: (taskId: string) => void
  onCompleteTask: (taskId: string) => void
  onUncompleteTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onDeleteGoal: () => void
  onAddTask: () => void
}) {
  const [open, setOpen] = useState(true)
  const done = goal.tasks.filter(t => t.status === 'done').length
  const progress = goal.tasks.length ? Math.round((done / goal.tasks.length) * 100) : 0

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between py-2">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-semibold truncate" style={{ color: '#F0EEFF' }}>{goal.title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#9B98B8' }}>
            {done}/{goal.tasks.length}
          </span>
          <span style={{ color: '#9B98B8', fontSize: 12, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
        </button>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={onAddTask}
            className="px-2 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95"
            style={{ backgroundColor: `${projectColor}22`, color: projectColor }}
          >
            + Задача
          </button>
          <button
            onClick={onDeleteGoal}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
            style={{ color: '#EF444466', backgroundColor: 'transparent' }}
          >
            ×
          </button>
        </div>
      </div>

      <ProgressBar value={progress} color={projectColor} height={3} />

      {open && (
        <div className="mt-2">
          {goal.tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              projectColor={projectColor}
              onStart={() => onStartTask(task.id)}
              onComplete={() => onCompleteTask(task.id)}
              onUncomplete={() => onUncompleteTask(task.id)}
              onDelete={() => onDeleteTask(task.id)}
            />
          ))}
          {goal.tasks.length === 0 && (
            <p className="text-xs py-3 text-center" style={{ color: '#9B98B8' }}>
              Нет задач. Нажми «+ Задача» или попроси Claude Code.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    projects, sessions, startSession, completeTask, uncompleteTask, activeSession,
    updateProject, deleteProject, addGoal, deleteGoal, addTask, deleteTask,
    boards, loadBoard, saveBoard,
    journals, loadJournal, addJournalEntry, deleteJournalEntry,
  } = useStore()
  const project = projects.find(p => p.id === id)
  const [tab, setTab] = useState<Tab>('tasks')
  const [showEdit, setShowEdit] = useState(false)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [addTaskGoalId, setAddTaskGoalId] = useState<string | null>(null)
  const [boardFullscreen, setBoardFullscreen] = useState(false)
  const [journalText, setJournalText] = useState('')
  const [journalSaving, setJournalSaving] = useState(false)

  useEffect(() => {
    if (id) loadBoard(id)
  }, [id])

  useEffect(() => {
    if (id) loadJournal(id)
  }, [id])

  const board: Board = (id ? boards[id] : undefined) ?? { stickers: [], connections: [] }
  const handleBoardChange = (b: Board) => { if (id) saveBoard(id, b) }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-svh" style={{ backgroundColor: '#1E1B2E' }}>
        <div className="text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p style={{ color: '#9B98B8' }}>Проект не найден</p>
          <button onClick={() => navigate('/')} className="mt-4 text-sm" style={{ color: '#7C3AED' }}>← Назад</button>
        </div>
      </div>
    )
  }

  const allTasks = project.goals.flatMap(g => g.tasks)
  const doneTasks = allTasks.filter(t => t.status === 'done').length
  const weightedProgress = calcWeightedProgress(project.goals)
  const progress = project.completionOverride != null ? project.completionOverride : weightedProgress
  const hours = Math.round(project.totalMinutes / 60 * 10) / 10
  const xpProgress = calcProjectProgress(project.totalXP)
  const phases = project.phases ?? []

  // Оценка времени
  const estimatedMin = allTasks.reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0)
  const remainingMin = allTasks.filter(t => t.status !== 'done').reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0)
  const spentMin = project.totalMinutes
  const isTimeOver = estimatedMin > 0 && spentMin > estimatedMin
  function fmtH(m: number) {
    const h = Math.floor(m / 60); const min = m % 60
    return min > 0 ? `${h}ч ${min}м` : `${h}ч`
  }

  const handleStartTask = (taskId: string) => {
    if (activeSession) return
    startSession(project.id, taskId)
  }

  return (
    <div className="min-h-svh pb-28" style={{ backgroundColor: '#1E1B2E' }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-6" style={{ background: `linear-gradient(180deg, ${project.color}22 0%, transparent 100%)` }}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm" style={{ color: '#9B98B8' }}>
            ← Назад
          </button>
          <button
            onClick={() => setShowEdit(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#9B98B8' }}
          >
            ✏️ Изменить
          </button>
        </div>

        <div className="flex items-center gap-3 mb-1">
          {project.icon ? (
            <span className="text-2xl leading-none flex-shrink-0">{project.icon}</span>
          ) : (
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: project.color, boxShadow: `0 0 12px ${project.color}88` }} />
          )}
          <h1 className="text-xl font-bold" style={{ color: '#F0EEFF' }}>{project.name}</h1>
        </div>
        {project.folderPath ? (
          <div className="flex items-center gap-1.5 mb-4 ml-7">
            <span className="text-xs" style={{ color: '#9B98B8' }}>📁</span>
            <span className="text-xs truncate" style={{ color: '#9B98B866', maxWidth: '240px' }}>{project.folderPath}</span>
          </div>
        ) : (
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 mb-4 ml-7 text-xs transition-all"
            style={{ color: '#9B98B844' }}
          >
            📁 Привязать папку
          </button>
        )}

        <div className="flex gap-4 mb-3">
          <div className="text-center">
            <p className="text-xl font-bold" style={{ color: project.color }}>{progress}%</p>
            <p className="text-xs" style={{ color: '#9B98B8' }}>прогресс</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold" style={{ color: '#F97316' }}>
              {project.streakDays > 0 ? `🔥${project.streakDays}` : '—'}
            </p>
            <p className="text-xs" style={{ color: '#9B98B8' }}>серия</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold" style={{ color: '#F0EEFF' }}>{hours}ч</p>
            <p className="text-xs" style={{ color: '#9B98B8' }}>потрачено</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold" style={{ color: '#7C3AED' }}>{project.totalXP}</p>
            <p className="text-xs" style={{ color: '#9B98B8' }}>XP</p>
          </div>
        </div>

        {/* Time plan */}
        {estimatedMin > 0 && (
          <div className="rounded-xl p-3 mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${isTimeOver ? '#EF444422' : 'rgba(255,255,255,0.06)'}` }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold" style={{ color: '#9B98B8' }}>Оценка времени</span>
              {isTimeOver && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#EF444418', color: '#EF4444' }}>перерасход</span>}
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              <div className="text-center">
                <p className="text-sm font-bold" style={{ color: '#9B98B8' }}>{fmtH(estimatedMin)}</p>
                <p style={{ color: '#9B98B866', fontSize: 10 }}>план</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold" style={{ color: '#10B981' }}>{fmtH(spentMin)}</p>
                <p style={{ color: '#9B98B866', fontSize: 10 }}>потрачено</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold" style={{ color: isTimeOver ? '#EF4444' : '#7C3AED' }}>{fmtH(remainingMin)}</p>
                <p style={{ color: '#9B98B866', fontSize: 10 }}>осталось</p>
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, estimatedMin > 0 ? Math.round((spentMin / estimatedMin) * 100) : 0)}%`,
                  backgroundColor: isTimeOver ? '#EF4444' : project.color,
                }}
              />
            </div>
          </div>
        )}

        {/* Phases */}
        {phases.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 no-scrollbar">
            {[...phases].sort((a, b) => a.order - b.order).map(phase => {
              const phaseGoals = project.goals.filter(g => g.phaseId === phase.id)
              const phaseTasks = phaseGoals.flatMap(g => g.tasks)
              const phaseDone = phaseTasks.filter(t => t.status === 'done').length
              const phaseComplete = phaseTasks.length > 0 && phaseDone === phaseTasks.length
              const phaseActive = phaseTasks.length > 0 && phaseDone > 0 && !phaseComplete
              return (
                <span
                  key={phase.id}
                  className="text-xs px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0"
                  style={{
                    backgroundColor: phaseComplete ? `${project.color}33` : phaseActive ? `${project.color}18` : 'rgba(255,255,255,0.06)',
                    color: phaseComplete ? project.color : phaseActive ? project.color : '#9B98B8',
                    border: `1px solid ${phaseComplete ? `${project.color}44` : 'transparent'}`,
                  }}
                >
                  {phaseComplete ? '✓ ' : phaseActive ? '▶ ' : ''}{phase.name}
                </span>
              )
            })}
          </div>
        )}

        {/* Rank & Level */}
        <div className="rounded-xl px-3 py-2 mb-3" style={{ backgroundColor: `${project.color}18`, border: `1px solid ${project.color}33` }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: project.color }}>
                Ур. {xpProgress.level}
              </span>
              <span className="text-xs font-semibold" style={{ color: '#F0EEFF' }}>
                {project.projectRank}
              </span>
            </div>
            <span className="text-xs" style={{ color: '#9B98B8' }}>
              {xpProgress.nextLevelXP > 0 ? `ещё ${xpProgress.nextLevelXP} XP` : 'Макс. уровень'}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${xpProgress.progress}%`, backgroundColor: project.color }}
            />
          </div>
        </div>

        <ProgressBar value={progress} color={project.color} height={8} showLabel />
        {project.completionOverride != null && (
          <p className="text-xs mt-1" style={{ color: '#9B98B8' }}>
            AI override: {project.completionOverride}% · авто: {weightedProgress}%
          </p>
        )}
        {project.aiAnalysis && (
          <div className="mt-3 rounded-xl px-3 py-2.5" style={{ backgroundColor: '#7C3AED12', border: '1px solid #7C3AED33' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#7C3AED' }}>
              🤖 AI-анализ {project.aiAnalyzedAt ? `· ${new Date(project.aiAnalyzedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : ''}
            </p>
            <p className="text-xs" style={{ color: '#9B98B8', whiteSpace: 'pre-wrap' }}>{project.aiAnalysis}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: '#252236' }}>
          {(['tasks', 'journal', 'board', 'history'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ backgroundColor: tab === t ? project.color : 'transparent', color: tab === t ? '#fff' : '#9B98B8' }}
            >
              {t === 'tasks' ? 'Задачи' : t === 'journal' ? 'Журнал' : t === 'board' ? 'Доска' : 'История'}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks tab */}
      {tab === 'tasks' && (
        <div className="px-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold" style={{ color: '#F0EEFF' }}>Цели и задачи</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#9B98B8' }}>{doneTasks}/{allTasks.length}</span>
              <button
                onClick={() => setShowAddGoal(true)}
                className="px-3 py-1 rounded-xl text-xs font-semibold transition-all active:scale-95"
                style={{ backgroundColor: `${project.color}22`, color: project.color }}
              >
                + Цель
              </button>
            </div>
          </div>

          {project.goals.length === 0 ? (
            <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: '#252236', border: `1px dashed ${project.color}44` }}>
              <p className="text-3xl mb-2">🤖</p>
              <p className="text-sm font-medium mb-1" style={{ color: '#F0EEFF' }}>Нет целей</p>
              <p className="text-xs mb-3" style={{ color: '#9B98B8' }}>
                Добавь цель кнопкой выше или попроси Claude Code разбить на задачи
              </p>
              <button
                onClick={() => setShowAddGoal(true)}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: project.color, color: '#fff' }}
              >
                + Добавить цель
              </button>
            </div>
          ) : (
            project.goals.map(goal => (
              <GoalSection
                key={goal.id}
                goal={goal}
                projectColor={project.color}
                onStartTask={handleStartTask}
                onCompleteTask={(taskId) => completeTask(project.id, goal.id, taskId)}
                onUncompleteTask={(taskId) => uncompleteTask(project.id, goal.id, taskId)}
                onDeleteTask={(taskId) => deleteTask(project.id, goal.id, taskId)}
                onDeleteGoal={() => deleteGoal(project.id, goal.id)}
                onAddTask={() => setAddTaskGoalId(goal.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Board tab */}
      {tab === 'board' && (
        <div className="px-4">
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#252236', height: 'calc(100svh - 320px)' }}>
            <div className="flex items-center justify-end px-3 pt-2">
              <button
                onClick={() => setBoardFullscreen(true)}
                className="text-xs px-2 py-1 rounded-lg"
                style={{ color: '#9B98B8', backgroundColor: 'rgba(255,255,255,0.06)' }}
              >
                ⛶ На весь экран
              </button>
            </div>
            <div style={{ height: 'calc(100% - 36px)' }}>
              <IdeaBoard board={board} onChange={handleBoardChange} />
            </div>
          </div>
        </div>
      )}

      {/* Journal tab */}
      {tab === 'journal' && (
        <div className="px-4">
          {/* New entry */}
          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: '#252236' }}>
            <textarea
              value={journalText}
              onChange={e => setJournalText(e.target.value)}
              placeholder="Что сделал? Что важно запомнить?"
              rows={4}
              className="w-full text-sm outline-none resize-none mb-3"
              style={{ backgroundColor: 'transparent', color: '#F0EEFF', caretColor: project.color }}
            />
            <button
              disabled={!journalText.trim() || journalSaving}
              onClick={async () => {
                if (!journalText.trim()) return
                setJournalSaving(true)
                await addJournalEntry(project.id, journalText.trim())
                setJournalText('')
                setJournalSaving(false)
              }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-98 disabled:opacity-40"
              style={{ backgroundColor: project.color, color: '#fff' }}
            >
              {journalSaving ? 'Сохраняю...' : '+ Добавить запись'}
            </button>
          </div>

          {/* Entries */}
          {(() => {
            const journal = id ? journals[id] : undefined
            const entries = journal?.entries ?? []
            if (entries.length === 0) {
              return (
                <div className="text-center py-10">
                  <p className="text-3xl mb-2">📓</p>
                  <p className="text-sm" style={{ color: '#9B98B8' }}>Нет записей. Добавь первую!</p>
                </div>
              )
            }
            return (
              <div className="flex flex-col gap-3 pb-6">
                {entries.map(entry => {
                  const d = new Date(entry.createdAt)
                  const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                  const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <div key={entry.id} className="rounded-2xl p-4" style={{ backgroundColor: '#252236', border: `1px solid ${project.color}18` }}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-xs font-semibold" style={{ color: project.color }}>{dateStr}</span>
                          <span className="text-xs ml-2" style={{ color: '#9B98B8' }}>{timeStr}</span>
                        </div>
                        <button
                          onClick={() => deleteJournalEntry(project.id, entry.id)}
                          className="text-xs w-6 h-6 flex items-center justify-center rounded-lg transition-all"
                          style={{ color: '#EF444466' }}
                        >
                          ×
                        </button>
                      </div>
                      <p className="text-sm" style={{ color: '#F0EEFF', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{entry.text}</p>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="px-4">
          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: '#252236' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: '#9B98B8' }}>Активность</p>
            <ActivityGraph sessions={sessions} projectId={project.id} weeks={13} />
          </div>
          {sessions.filter(s => s.projectId === project.id).length === 0 ? (
            <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: '#252236' }}>
              <p className="text-2xl mb-2">📭</p>
              <p className="text-sm" style={{ color: '#9B98B8' }}>Нет сессий по этому проекту</p>
            </div>
          ) : (
            [...sessions]
              .filter(s => s.projectId === project.id)
              .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
              .map(s => {
                const task = project.goals.flatMap(g => g.tasks).find(t => t.id === s.taskId)
                return (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-2" style={{ backgroundColor: '#252236' }}>
                    <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#F0EEFF' }}>{task?.title ?? 'Задача'}</p>
                      <p className="text-xs" style={{ color: '#9B98B8' }}>
                        {new Date(s.startedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} · {new Date(s.startedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold" style={{ color: '#F0EEFF' }}>{s.durationMinutes}мин</p>
                      <p className="text-xs" style={{ color: '#7C3AED' }}>+{s.xpEarned} XP</p>
                    </div>
                  </div>
                )
              })
          )}
        </div>
      )}

      {/* Fullscreen board overlay */}
      {boardFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#1A1728' }}>
          <div className="flex items-center justify-between px-4 pt-safe" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8 }}>
            <span className="text-sm font-semibold" style={{ color: '#F0EEFF' }}>{project.name} · Доска</span>
            <button
              onClick={() => setBoardFullscreen(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#9B98B8' }}
            >
              Свернуть
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <IdeaBoard board={board} onChange={handleBoardChange} />
          </div>
        </div>
      )}

      {/* Modals */}
      {showEdit && (
        <EditProjectModal
          name={project.name}
          color={project.color}
          folderPath={project.folderPath}
          icon={project.icon}
          onSave={(name, color, folderPath, icon) => {
            updateProject({ ...project, name, color, folderPath, icon })
            setShowEdit(false)
          }}
          onDelete={() => {
            deleteProject(project.id)
            navigate('/')
          }}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showAddGoal && (
        <AddGoalModal
          onSave={(title) => {
            addGoal(project.id, title)
            setShowAddGoal(false)
          }}
          onClose={() => setShowAddGoal(false)}
        />
      )}

      {addTaskGoalId && (
        <AddTaskModal
          onSave={(title, minutes) => {
            addTask(project.id, addTaskGoalId, title, minutes)
            setAddTaskGoalId(null)
          }}
          onClose={() => setAddTaskGoalId(null)}
        />
      )}
    </div>
  )
}
