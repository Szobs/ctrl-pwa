import { useNavigate } from 'react-router-dom'
import type { Project } from '../types'
import { ProgressBar } from './ProgressBar'
import { calcWeightedProgress } from '../lib/templates'

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
      className="w-full text-left rounded-2xl p-3 transition-all duration-200 active:scale-98"
      style={{
        backgroundColor: '#252236',
        border: `1px solid ${project.color}22`,
      }}
    >
      {/* Icon + name row */}
      <div className="flex items-center gap-2 mb-2.5">
        {project.icon ? (
          <span className="text-2xl leading-none flex-shrink-0">{project.icon}</span>
        ) : (
          <div
            className="w-8 h-8 rounded-xl flex-shrink-0"
            style={{ backgroundColor: `${project.color}22`, boxShadow: `0 0 8px ${project.color}33` }}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-tight truncate" style={{ color: '#F0EEFF' }}>
            {project.name}
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: project.color, opacity: 0.8 }}>
            {project.projectRank} · Ур.{project.projectLevel}
          </p>
        </div>
        {project.streakDays > 0 && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <span className="text-sm">🔥</span>
            <span className="text-xs font-bold" style={{ color: '#F97316' }}>{project.streakDays}</span>
          </div>
        )}
      </div>

      {/* Progress */}
      <ProgressBar value={progress} color={project.color} height={4} />

      {/* Stats */}
      <div className="flex justify-between mt-2">
        <span className="text-xs" style={{ color: '#9B98B8' }}>
          {doneTasks}/{allTasks.length} задач
        </span>
        <span className="text-xs font-medium" style={{ color: '#9B98B8' }}>
          {hours}ч
        </span>
      </div>
    </button>
  )
}
