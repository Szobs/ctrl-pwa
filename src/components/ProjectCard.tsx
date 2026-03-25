import { useNavigate } from 'react-router-dom'
import type { Project, ProjectCategory } from '../types'
import { ProgressBar } from './ProgressBar'
import { calcWeightedProgress } from '../lib/templates'

const CATEGORY_LABELS: Record<ProjectCategory, { label: string; emoji: string }> = {
  general: { label: 'Общий / Лор', emoji: '🌐' },
  game:    { label: 'Игра', emoji: '🎮' },
  book:    { label: 'Книга', emoji: '📖' },
  finance: { label: 'Финансы', emoji: '📈' },
}

interface Props {
  project: Project
}

export function ProjectCard({ project }: Props) {
  const navigate = useNavigate()
  const progress = project.completionOverride != null
    ? project.completionOverride
    : calcWeightedProgress(project.goals)
  const allTasks = project.goals.flatMap(g => g.tasks)
  const doneTasks = allTasks.filter(t => t.status === 'done').length
  const hours = Math.round(project.totalMinutes / 60 * 10) / 10

  return (
    <button
      onClick={() => navigate(`/project/${project.id}`)}
      className="w-full text-left rounded-2xl p-4 transition-all duration-200 active:scale-98"
      style={{
        backgroundColor: '#252236',
        border: `1px solid ${project.color}22`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {project.icon ? (
            <span className="text-xl leading-none flex-shrink-0">{project.icon}</span>
          ) : (
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color, boxShadow: `0 0 8px ${project.color}66` }}
            />
          )}
          <div>
            <span className="font-semibold text-sm" style={{ color: '#F0EEFF' }}>
              {project.name}
            </span>
            <p className="text-xs mt-0.5" style={{ color: '#9B98B8' }}>
              {CATEGORY_LABELS[project.category].emoji} {CATEGORY_LABELS[project.category].label}
            </p>
          </div>
        </div>
        {project.streakDays > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-sm animate-fire">🔥</span>
            <span className="text-xs font-bold" style={{ color: '#F97316' }}>
              {project.streakDays}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <ProgressBar value={progress} color={project.color} height={5} />

      {/* Stats */}
      <div className="flex justify-between mt-2">
        <span className="text-xs" style={{ color: '#9B98B8' }}>
          {doneTasks}/{allTasks.length} задач
        </span>
        <span className="text-xs" style={{ color: '#9B98B8' }}>
          {hours}ч
        </span>
      </div>

      {/* Rank */}
      <div className="mt-2">
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${project.color}22`, color: project.color }}
        >
          {project.projectRank} · Ур. {project.projectLevel}
        </span>
      </div>
    </button>
  )
}
