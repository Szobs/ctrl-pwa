import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { TEMPLATES, buildFromTemplate } from '../lib/templates'
import type { Project, ProjectCategory } from '../types'

const COLORS = ['#7C3AED', '#F97316', '#3B82F6', '#10B981', '#EF4444', '#EC4899', '#F59E0B', '#06B6D4']
const ICONS = ['🎮', '📖', '📈', '🌐', '🚀', '⚔️', '🏰', '🤖', '🎵', '🎨', '💡', '🔬', '📝', '🌍', '⚡', '🎯']
const CATEGORIES: { value: ProjectCategory; label: string; emoji: string }[] = [
  { value: 'general', label: 'Общий / Лор', emoji: '🌐' },
  { value: 'game', label: 'Игра', emoji: '🎮' },
  { value: 'book', label: 'Книга / Писательство', emoji: '📖' },
  { value: 'finance', label: 'Торговый бот / Финансы', emoji: '📈' },
]

export function NewProject() {
  const navigate = useNavigate()
  const { addProject } = useStore()
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [category, setCategory] = useState<ProjectCategory>('general')
  const [icon, setIcon] = useState<string>('')
  const [useTemplate, setUseTemplate] = useState(true)
  const [saving, setSaving] = useState(false)

  const template = TEMPLATES[category]
  const totalTasks = template.goals.reduce((s, g) => s + g.tasks.length, 0)

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)

    const { phases, goals } = useTemplate
      ? buildFromTemplate(template)
      : { phases: [], goals: [] }

    const project: Project = {
      id: `project-${Date.now()}`,
      name: name.trim(),
      color,
      category,
      createdAt: new Date().toISOString(),
      goals,
      phases,
      totalXP: 0,
      projectLevel: 1,
      projectRank: 'Новичок',
      streakDays: 0,
      lastWorkedAt: null,
      totalMinutes: 0,
      completionOverride: null,
      aiAnalysis: null,
      aiAnalyzedAt: null,
      icon: icon || undefined,
    }
    await addProject(project)
    setSaving(false)
    navigate(`/project/${project.id}`)
  }

  return (
    <div className="min-h-svh px-4 pt-12 pb-8" style={{ backgroundColor: '#1E1B2E' }}>
      <button onClick={() => navigate('/')} className="flex items-center gap-1 mb-6 text-sm" style={{ color: '#9B98B8' }}>
        ← Назад
      </button>

      <h1 className="text-xl font-bold mb-6" style={{ color: '#F0EEFF' }}>Новый проект</h1>

      <div className="flex flex-col gap-5">
        {/* Name */}
        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: '#9B98B8' }}>Название</label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Название проекта"
            className="w-full px-3 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: '#252236', color: '#F0EEFF', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: '#9B98B8' }}>Категория</label>
          <div className="flex flex-col gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-left transition-all flex items-center gap-2"
                style={{
                  backgroundColor: category === c.value ? `${color}22` : '#252236',
                  color: category === c.value ? color : '#9B98B8',
                  border: `1px solid ${category === c.value ? `${color}44` : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <span>{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="text-xs mb-2 block font-medium" style={{ color: '#9B98B8' }}>Цвет</label>
          <div className="flex gap-3 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-10 h-10 rounded-full transition-all"
                style={{
                  backgroundColor: c,
                  boxShadow: color === c ? `0 0 0 3px #1E1B2E, 0 0 0 5px ${c}` : 'none',
                  transform: color === c ? 'scale(1.1)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Icon */}
        <div>
          <label className="text-xs mb-2 block font-medium" style={{ color: '#9B98B8' }}>Иконка <span style={{ color: '#9B98B855' }}>(необязательно)</span></label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setIcon('')}
              className="w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all"
              style={{
                backgroundColor: icon === '' ? `${color}22` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${icon === '' ? `${color}44` : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <span style={{ color: '#9B98B8', fontSize: 10 }}>∅</span>
            </button>
            {ICONS.map(ic => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                style={{
                  backgroundColor: icon === ic ? `${color}22` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${icon === ic ? `${color}44` : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        {/* Template */}
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${color}33` }}>
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: `${color}18` }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: '#F0EEFF' }}>Шаблон проекта</p>
              <p className="text-xs mt-0.5" style={{ color: '#9B98B8' }}>{template.description}</p>
            </div>
            <button
              onClick={() => setUseTemplate(v => !v)}
              className="text-xs px-3 py-1.5 rounded-xl font-semibold transition-all"
              style={{
                backgroundColor: useTemplate ? color : 'rgba(255,255,255,0.06)',
                color: useTemplate ? '#fff' : '#9B98B8',
              }}
            >
              {useTemplate ? 'Включён' : 'Выключен'}
            </button>
          </div>

          {useTemplate && (
            <div className="px-4 py-3" style={{ backgroundColor: '#252236' }}>
              {/* Phases */}
              <div className="flex gap-1.5 flex-wrap mb-3">
                {template.phases.map((ph, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${color}22`, color }}
                  >
                    {ph.name}
                  </span>
                ))}
              </div>
              {/* Goals summary */}
              <div className="flex flex-col gap-1">
                {template.goals.map((g, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span style={{ color: '#9B98B8' }}>{g.title}</span>
                    <span style={{ color: '#9B98B855' }}>{g.tasks.length} задач · вес {g.weight}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-3 pt-2" style={{ color: '#9B98B8', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                Итого: {template.phases.length} фаз · {template.goals.length} целей · {totalTasks} задач
              </p>
            </div>
          )}
        </div>

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={!name.trim() || saving}
          className="w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-98 disabled:opacity-40"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}BB)`,
            color: '#fff',
            boxShadow: `0 4px 20px ${color}44`,
          }}
        >
          {saving ? 'Создание...' : useTemplate ? `Создать по шаблону (${totalTasks} задач)` : 'Создать пустой проект'}
        </button>
      </div>
    </div>
  )
}
