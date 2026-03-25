import { useEffect, useState } from 'react'
import { useStore } from '../store'

export function SessionTimer() {
  const { activeSession, projects, stopSession } = useStore()
  const [elapsed, setElapsed] = useState(0)
  const [stopping, setStopping] = useState(false)

  useEffect(() => {
    if (!activeSession) return
    const interval = setInterval(() => {
      setElapsed(Math.round((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [activeSession])

  if (!activeSession) return null

  const project = projects.find(p => p.id === activeSession.projectId)
  const task = project?.goals.flatMap(g => g.tasks).find(t => t.id === activeSession.taskId)
  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const xpEarned = Math.floor(elapsed / 1800) * 5

  const handleStop = async () => {
    setStopping(true)
    await stopSession()
    setStopping(false)
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 mx-auto"
      style={{ maxWidth: 480 }}
    >
      <div
        className="m-3 rounded-2xl p-4"
        style={{
          backgroundColor: '#252236',
          border: `1px solid ${project?.color ?? '#7C3AED'}44`,
          boxShadow: `0 8px 32px ${project?.color ?? '#7C3AED'}22`,
        }}
      >
        <div className="flex items-center gap-3">
          {/* Animated dot */}
          <div
            className="w-3 h-3 rounded-full flex-shrink-0 animate-session"
            style={{ backgroundColor: project?.color ?? '#7C3AED' }}
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate" style={{ color: '#9B98B8' }}>
              {project?.name ?? '—'}
            </p>
            <p className="text-xs font-medium truncate" style={{ color: '#F0EEFF' }}>
              {task?.title ?? 'Сессия'}
            </p>
          </div>

          {/* Timer */}
          <div className="text-center flex-shrink-0">
            <p
              className="text-xl font-mono font-bold tabular-nums"
              style={{ color: project?.color ?? '#7C3AED' }}
            >
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </p>
            {xpEarned > 0 && (
              <p className="text-xs animate-xp-pop" style={{ color: '#10B981' }}>
                +{xpEarned} XP
              </p>
            )}
          </div>

          {/* Stop button */}
          <button
            onClick={handleStop}
            disabled={stopping}
            className="flex-shrink-0 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{
              backgroundColor: `${project?.color ?? '#7C3AED'}22`,
              color: project?.color ?? '#7C3AED',
              border: `1px solid ${project?.color ?? '#7C3AED'}44`,
            }}
          >
            {stopping ? '...' : 'Стоп'}
          </button>
        </div>
      </div>
    </div>
  )
}
