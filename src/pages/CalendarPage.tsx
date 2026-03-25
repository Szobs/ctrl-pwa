import { useState, useEffect } from 'react'
import { useStore } from '../store'
import type { Calendar, CalendarEvent, EventType } from '../types'

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const DAYS_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

const EVENT_TYPES: { type: EventType; label: string; color: string }[] = [
  { type: 'work',     label: 'Работа',    color: '#EF4444' },
  { type: 'free',     label: 'Свободно',  color: '#7C3AED' },
  { type: 'personal', label: 'Личное',    color: '#F97316' },
  { type: 'other',    label: 'Другое',    color: '#9B98B8' },
]

function typeColor(type: EventType) {
  return EVENT_TYPES.find(t => t.type === type)?.color ?? '#9B98B8'
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const days: (Date | null)[] = []
  const startDow = (first.getDay() + 6) % 7
  for (let i = 0; i < startDow; i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  return days
}

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }

/** Минуты между двумя HH:MM строками (учитывает переход через полночь) */
function diffMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const s = sh * 60 + sm
  let e = eh * 60 + em
  if (e <= s) e += 24 * 60  // ночная смена
  return e - s
}

/** Подсчёт суммарных часов за месяц из массива смен */
function sumMonthMinutes(items: { date: string; startTime: string; endTime: string }[], year: number, month: number) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
  return items
    .filter(i => i.date.startsWith(prefix))
    .reduce((acc, i) => acc + diffMinutes(i.startTime, i.endTime), 0)
}

/** Подсчёт за текущую неделю (Пн–Вс) */
function getWeekRange() {
  const now = new Date()
  const dow = (now.getDay() + 6) % 7
  const mon = new Date(now); mon.setDate(now.getDate() - dow); mon.setHours(0,0,0,0)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999)
  return { mon, sun }
}

function sumWeekMinutes(items: { date: string; startTime: string; endTime: string }[]) {
  const { mon, sun } = getWeekRange()
  return items
    .filter(i => { const d = new Date(i.date + 'T12:00:00'); return d >= mon && d <= sun })
    .reduce((acc, i) => acc + diffMinutes(i.startTime, i.endTime), 0)
}

function fmtH(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}ч ${m}м` : `${h}ч`
}

// ── Add Event Modal ─────────────────────────────────────────────────────────
function AddEventModal({ defaultDate, onSave, onClose }: {
  defaultDate: string
  onSave: (e: CalendarEvent) => void
  onClose: () => void
}) {
  const [label, setLabel]     = useState('')
  const [date, setDate]       = useState(defaultDate)
  const [start, setStart]     = useState('09:00')
  const [end, setEnd]         = useState('11:00')
  const [type, setType]       = useState<EventType>('personal')

  const handleSave = () => {
    if (!label.trim()) return
    onSave({ id: `ev-${Date.now()}`, date, startTime: start, endTime: end, label: label.trim(), type })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full rounded-t-3xl p-6" style={{ backgroundColor: '#252236' }} onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
        <h2 className="text-base font-bold mb-4" style={{ color: '#F0EEFF' }}>Новое событие</h2>

        <label className="text-xs font-semibold mb-1 block" style={{ color: '#9B98B8' }}>Название</label>
        <input
          autoFocus
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Например: Врач, Тренировка..."
          className="w-full px-4 py-3 rounded-xl text-sm mb-3 outline-none"
          style={{ backgroundColor: '#1E1B2E', color: '#F0EEFF', border: '1px solid rgba(255,255,255,0.1)' }}
        />

        <label className="text-xs font-semibold mb-1 block" style={{ color: '#9B98B8' }}>Дата</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm mb-3 outline-none"
          style={{ backgroundColor: '#1E1B2E', color: '#F0EEFF', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
        />

        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className="text-xs font-semibold mb-1 block" style={{ color: '#9B98B8' }}>Начало</label>
            <input
              type="time"
              value={start}
              onChange={e => setStart(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#1E1B2E', color: '#F0EEFF', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold mb-1 block" style={{ color: '#9B98B8' }}>Конец</label>
            <input
              type="time"
              value={end}
              onChange={e => setEnd(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#1E1B2E', color: '#F0EEFF', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
            />
          </div>
        </div>

        <label className="text-xs font-semibold mb-2 block" style={{ color: '#9B98B8' }}>Тип</label>
        <div className="flex gap-2 mb-5">
          {EVENT_TYPES.map(t => (
            <button
              key={t.type}
              onClick={() => setType(t.type)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                backgroundColor: type === t.type ? t.color : `${t.color}18`,
                color: type === t.type ? '#fff' : t.color,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: typeColor(type), color: '#fff' }}
        >
          Добавить
        </button>
      </div>
    </div>
  )
}

// ── Stats Card ──────────────────────────────────────────────────────────────
function StatsCard({ calendar }: { calendar: Calendar }) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const monthWorkMin  = sumMonthMinutes(calendar.workSchedule, year, month)
  const monthFreeMin  = sumMonthMinutes(calendar.freeWindows ?? [], year, month)
  const weekWorkMin   = sumWeekMinutes(calendar.workSchedule)
  const weekFreeMin   = sumWeekMinutes(calendar.freeWindows ?? [])

  // Добавляем пользовательские события типа work
  const userWorkSchedule = (calendar.events ?? []).filter(e => e.type === 'work')
  const userFreeSchedule = (calendar.events ?? []).filter(e => e.type === 'free')
  const monthUserWork = sumMonthMinutes(userWorkSchedule, year, month)
  const monthUserFree = sumMonthMinutes(userFreeSchedule, year, month)
  const weekUserWork  = sumWeekMinutes(userWorkSchedule)
  const weekUserFree  = sumWeekMinutes(userFreeSchedule)

  const totalMonthWork = monthWorkMin + monthUserWork
  const totalMonthFree = monthFreeMin + monthUserFree
  const totalWeekWork  = weekWorkMin  + weekUserWork
  const totalWeekFree  = weekFreeMin  + weekUserFree

  return (
    <div className="px-4 mb-4">
      <div className="rounded-2xl p-4" style={{ backgroundColor: '#252236' }}>
        <p className="text-xs font-semibold mb-3" style={{ color: '#9B98B8' }}>Бюджет времени</p>

        {/* Week */}
        <div className="mb-3">
          <p className="text-xs mb-1.5" style={{ color: '#9B98B866' }}>Эта неделя</p>
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl px-3 py-2" style={{ backgroundColor: '#EF444418' }}>
              <p className="text-xs" style={{ color: '#EF4444' }}>Работа</p>
              <p className="text-base font-bold" style={{ color: '#F0EEFF' }}>{fmtH(totalWeekWork)}</p>
            </div>
            <div className="flex-1 rounded-xl px-3 py-2" style={{ backgroundColor: '#7C3AED18' }}>
              <p className="text-xs" style={{ color: '#7C3AED' }}>Проекты</p>
              <p className="text-base font-bold" style={{ color: '#F0EEFF' }}>{fmtH(totalWeekFree)}</p>
            </div>
          </div>
        </div>

        {/* Month */}
        <div>
          <p className="text-xs mb-1.5" style={{ color: '#9B98B866' }}>{MONTHS_RU[month]}</p>
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl px-3 py-2" style={{ backgroundColor: '#EF444418' }}>
              <p className="text-xs" style={{ color: '#EF4444' }}>Работа</p>
              <p className="text-base font-bold" style={{ color: '#F0EEFF' }}>{fmtH(totalMonthWork)}</p>
            </div>
            <div className="flex-1 rounded-xl px-3 py-2" style={{ backgroundColor: '#7C3AED18' }}>
              <p className="text-xs" style={{ color: '#7C3AED' }}>Проекты</p>
              <p className="text-base font-bold" style={{ color: '#F0EEFF' }}>{fmtH(totalMonthFree)}</p>
            </div>
          </div>
        </div>

        {/* Bar */}
        {(totalMonthWork + totalMonthFree) > 0 && (() => {
          const total = totalMonthWork + totalMonthFree
          const workPct = Math.round(totalMonthWork / total * 100)
          return (
            <div className="mt-3">
              <div className="flex rounded-full overflow-hidden" style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <div style={{ width: `${workPct}%`, backgroundColor: '#EF4444' }} />
                <div style={{ width: `${100 - workPct}%`, backgroundColor: '#7C3AED' }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: '#EF444488' }}>{workPct}% работа</span>
                <span className="text-xs" style={{ color: '#7C3AED88' }}>{100 - workPct}% проекты</span>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

// ── Март 2026 пресет ────────────────────────────────────────────────────────
const MARCH_2026_CALENDAR: Calendar = {
  workSchedule: [
    { date: '2026-03-02', startTime: '05:45', endTime: '14:30', label: 'Смена (ранняя)' },
    { date: '2026-03-03', startTime: '21:30', endTime: '06:00', label: 'Смена (ночная)' },
    { date: '2026-03-04', startTime: '21:30', endTime: '06:00', label: 'Смена (ночная)' },
    { date: '2026-03-06', startTime: '21:30', endTime: '06:00', label: 'Смена (ночная)' },
    { date: '2026-03-09', startTime: '05:45', endTime: '14:15', label: 'Смена (ранняя)' },
    { date: '2026-03-11', startTime: '14:00', endTime: '22:15', label: 'Смена (дневная)' },
    { date: '2026-03-13', startTime: '14:00', endTime: '22:00', label: 'Смена (дневная)' },
    { date: '2026-03-14', startTime: '14:00', endTime: '23:45', label: 'Смена (дневная)' },
    { date: '2026-03-16', startTime: '14:00', endTime: '22:00', label: 'Смена (дневная)' },
    { date: '2026-03-17', startTime: '14:00', endTime: '22:00', label: 'Смена (дневная)' },
    { date: '2026-03-24', startTime: '21:30', endTime: '06:00', label: 'Смена (ночная)' },
    { date: '2026-03-26', startTime: '05:45', endTime: '14:15', label: 'Смена (ранняя)' },
    { date: '2026-03-27', startTime: '05:45', endTime: '14:15', label: 'Смена (ранняя)' },
    { date: '2026-03-28', startTime: '14:00', endTime: '23:45', label: 'Смена (дневная)' },
    { date: '2026-03-31', startTime: '05:45', endTime: '14:15', label: 'Смена (ранняя)' },
  ],
  plannedSlots: [],
  blockedTime: [],
  events: [],
  freeWindows: [
    { date: '2026-03-02', startTime: '22:00', endTime: '00:30', freeMinutes: 150,  label: '🖥 ПК (после девушки)' },
    { date: '2026-03-03', startTime: '09:00', endTime: '21:00', freeMinutes: 720,  label: '🕐 До ночной смены' },
    { date: '2026-03-04', startTime: '13:00', endTime: '21:30', freeMinutes: 510,  label: '😴 После ночной (сон до 13)' },
    { date: '2026-03-05', startTime: '13:00', endTime: '22:00', freeMinutes: 540,  label: '😴 Отдых (после ночной)' },
    { date: '2026-03-06', startTime: '09:00', endTime: '21:00', freeMinutes: 720,  label: '🕐 До ночной смены' },
    { date: '2026-03-07', startTime: '13:00', endTime: '22:00', freeMinutes: 540,  label: '😴 Отдых (после ночной)' },
    { date: '2026-03-08', startTime: '10:00', endTime: '22:00', freeMinutes: 720,  label: '✅ Выходной' },
    { date: '2026-03-09', startTime: '22:00', endTime: '00:30', freeMinutes: 150,  label: '🖥 ПК (после девушки)' },
    { date: '2026-03-10', startTime: '10:00', endTime: '22:00', freeMinutes: 720,  label: '✅ Выходной' },
    { date: '2026-03-11', startTime: '08:00', endTime: '13:30', freeMinutes: 330,  label: '🌅 До дневной смены' },
    { date: '2026-03-12', startTime: '10:00', endTime: '22:00', freeMinutes: 720,  label: '✅ Выходной' },
    { date: '2026-03-13', startTime: '08:00', endTime: '13:30', freeMinutes: 330,  label: '🌅 До дневной смены' },
    { date: '2026-03-14', startTime: '08:00', endTime: '13:30', freeMinutes: 330,  label: '🌅 До дневной смены' },
    { date: '2026-03-15', startTime: '10:00', endTime: '22:00', freeMinutes: 720,  label: '✅ Выходной' },
    { date: '2026-03-16', startTime: '08:00', endTime: '13:30', freeMinutes: 330,  label: '🌅 До дневной смены' },
    { date: '2026-03-17', startTime: '08:00', endTime: '13:30', freeMinutes: 330,  label: '🌅 До дневной смены' },
    { date: '2026-03-18', startTime: '10:00', endTime: '22:00', freeMinutes: 720,  label: '✅ Выходной' },
    { date: '2026-03-19', startTime: '10:00', endTime: '22:00', freeMinutes: 720,  label: '✅ Выходной' },
    { date: '2026-03-20', startTime: '10:00', endTime: '22:00', freeMinutes: 720,  label: '✅ Выходной' },
    { date: '2026-03-21', startTime: '10:00', endTime: '22:00', freeMinutes: 720,  label: '✅ Выходной' },
    { date: '2026-03-22', startTime: '10:00', endTime: '22:00', freeMinutes: 720,  label: '✅ Выходной' },
    { date: '2026-03-24', startTime: '09:00', endTime: '21:00', freeMinutes: 720,  label: '🕐 До ночной смены' },
    { date: '2026-03-25', startTime: '13:00', endTime: '22:00', freeMinutes: 540,  label: '😴 После ночной (сон до 13)' },
    { date: '2026-03-26', startTime: '22:00', endTime: '00:30', freeMinutes: 150,  label: '🖥 ПК (после девушки)' },
    { date: '2026-03-27', startTime: '22:00', endTime: '00:30', freeMinutes: 150,  label: '🖥 ПК (после девушки)' },
    { date: '2026-03-28', startTime: '08:00', endTime: '13:30', freeMinutes: 330,  label: '🌅 До дневной смены' },
    { date: '2026-03-29', startTime: '10:00', endTime: '22:00', freeMinutes: 720,  label: '✅ Выходной' },
    { date: '2026-03-30', startTime: '10:00', endTime: '22:00', freeMinutes: 720,  label: '✅ Выходной' },
    { date: '2026-03-31', startTime: '22:00', endTime: '00:30', freeMinutes: 150,  label: '🖥 ПК (после девушки)' },
  ],
}

// ── Main ────────────────────────────────────────────────────────────────────
export function CalendarPage() {
  const { calendar, projects, sessions, syncData, setCalendar, addEvent, deleteEvent } = useStore()
  const today = new Date()
  const [year, setYear]       = useState(today.getFullYear())
  const [month, setMonth]     = useState(today.getMonth())
  const [selected, setSelected] = useState<string>(toDateStr(today))
  const [showAdd, setShowAdd] = useState(false)
  const [importing, setImporting] = useState(false)
  const [saving, setSaving]   = useState(false)

  useEffect(() => { syncData() }, [])

  const days = getMonthDays(year, month)
  const todayStr = toDateStr(today)

  const workDates    = new Set(calendar.workSchedule.map(e => e.date))
  const slotDates    = new Set(calendar.plannedSlots.map(e => e.date))
  const sessionDates = new Set(sessions.map(s => s.startedAt.split('T')[0]))
  const freeDates    = new Set((calendar.freeWindows ?? []).map(e => e.date))
  const eventDates   = new Set((calendar.events ?? []).map(e => e.date))

  const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11) } else setMonth(m => m-1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0) } else setMonth(m => m+1) }

  const sel = selected
  const selectedWork     = calendar.workSchedule.filter(e => e.date === sel)
  const selectedSlots    = calendar.plannedSlots.filter(e => e.date === sel)
  const selectedSessions = sessions.filter(s => s.startedAt.split('T')[0] === sel)
  const selectedFree     = (calendar.freeWindows ?? []).filter(e => e.date === sel)
  const selectedEvents   = (calendar.events ?? []).filter(e => e.date === sel)

  const handleImportMarch = async () => {
    setSaving(true)
    await setCalendar({ ...MARCH_2026_CALENDAR, events: calendar.events ?? [] })
    setSaving(false)
    setImporting(false)
  }

  const isEmpty = selectedWork.length === 0 && selectedSlots.length === 0 &&
    selectedSessions.length === 0 && selectedFree.length === 0 && selectedEvents.length === 0

  return (
    <div className="flex flex-col min-h-svh pb-24" style={{ backgroundColor: '#1E1B2E' }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: '#F0EEFF' }}>Календарь</h1>
        <button
          onClick={() => setImporting(i => !i)}
          className="text-xs px-3 py-1.5 rounded-xl font-semibold"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#9B98B8' }}
        >
          📅 Загрузить график
        </button>
      </div>

      {/* Import */}
      {importing && (
        <div className="px-4 mb-3">
          <div className="rounded-2xl p-4" style={{ backgroundColor: '#252236', border: '1px solid #7C3AED44' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: '#F0EEFF' }}>График март 2026 — Andrii P.</p>
            <p className="text-xs mb-3" style={{ color: '#9B98B8' }}>
              15 смен + расчёт свободного времени по каждому дню
            </p>
            <button
              onClick={handleImportMarch}
              disabled={saving}
              className="w-full py-3 rounded-xl font-semibold text-sm"
              style={{ backgroundColor: saving ? '#7C3AED88' : '#7C3AED', color: '#fff' }}
            >
              {saving ? 'Сохраняю...' : '✓ Применить и сохранить'}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <StatsCard calendar={calendar} />

      {/* Calendar grid */}
      <div className="px-4 mb-4">
        <div className="rounded-2xl p-3" style={{ backgroundColor: '#252236' }}>
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#F0EEFF' }}>‹</button>
            <span className="font-semibold text-sm" style={{ color: '#F0EEFF' }}>{MONTHS_RU[month]} {year}</span>
            <button onClick={nextMonth} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#F0EEFF' }}>›</button>
          </div>

          <div className="grid grid-cols-7 mb-1 gap-1">
            {DAYS_RU.map(d => (
              <div key={d} className="text-center text-xs py-1 font-medium" style={{ color: '#9B98B866' }}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              if (!d) return <div key={`e${i}`} />
              const ds = toDateStr(d)
              const isToday    = ds === todayStr
              const isSelected = ds === selected
              const hasWork    = workDates.has(ds)
              const hasSession = sessionDates.has(ds)
              const hasEvent   = eventDates.has(ds)

              const freeMin = (calendar.freeWindows ?? [])
                .filter(fw => fw.date === ds)
                .reduce((sum, fw) => sum + fw.freeMinutes, 0)
              const freeH = freeMin > 0 ? Math.round(freeMin / 60) : 0

              let bg = 'transparent'
              let dateColor = '#F0EEFF'
              if (isSelected) { bg = '#7C3AED'; dateColor = '#fff' }
              else if (isToday) { bg = '#7C3AED33'; dateColor = '#C4B5FD' }
              else if (hasWork) { bg = '#EF444415'; }

              return (
                <button
                  key={ds}
                  onClick={() => setSelected(ds)}
                  className="flex flex-col items-center justify-between rounded-xl py-1.5 px-0.5 transition-all active:scale-95"
                  style={{
                    backgroundColor: bg,
                    border: isToday && !isSelected ? '1px solid #7C3AED66' : '1px solid transparent',
                    minHeight: 52,
                  }}
                >
                  <span className="text-sm font-semibold leading-none" style={{ color: dateColor }}>
                    {d.getDate()}
                  </span>
                  {freeH > 0 ? (
                    <span
                      className="text-xs font-bold leading-none mt-1"
                      style={{ color: isSelected ? '#C4B5FD' : '#7C3AED' }}
                    >
                      {freeH}ч
                    </span>
                  ) : hasWork ? (
                    <span className="text-xs leading-none mt-1" style={{ color: '#EF444488' }}>—</span>
                  ) : (
                    <span className="mt-1" style={{ height: 14 }} />
                  )}
                  {(hasSession || hasEvent) && (
                    <div className="flex gap-0.5 mt-0.5">
                      {hasSession && <div className="w-1 h-1 rounded-full" style={{ backgroundColor: isSelected ? '#fff' : '#10B981' }} />}
                      {hasEvent   && <div className="w-1 h-1 rounded-full" style={{ backgroundColor: isSelected ? '#fff' : '#F97316' }} />}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-3 mt-3 pt-3 flex-wrap" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {[['#EF4444','Работа'],['#7C3AED','Свободно (ч)'],['#10B981','Сессии'],['#F97316','События']].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                <span className="text-xs" style={{ color: '#9B98B8' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected day */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: '#F0EEFF' }}>
            {new Date(sel + 'T12:00:00').toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
            style={{ backgroundColor: '#7C3AED22', color: '#7C3AED' }}
          >
            + Событие
          </button>
        </div>

        {/* Free window */}
        {selectedFree.map((fw, i) => (
          <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl mb-2" style={{ backgroundColor: '#7C3AED18', border: '1px solid #7C3AED33' }}>
            <div className="w-1.5 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: '#7C3AED' }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#F0EEFF' }}>{fw.label}</p>
              <p className="text-xs" style={{ color: '#9B98B8' }}>{fw.startTime} — {fw.endTime}</p>
            </div>
            <p className="text-sm font-bold flex-shrink-0" style={{ color: '#7C3AED' }}>
              {fmtH(fw.freeMinutes)}
            </p>
          </div>
        ))}

        {/* Work */}
        {selectedWork.map((e, i) => (
          <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl mb-2" style={{ backgroundColor: '#EF444411' }}>
            <div className="w-1.5 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: '#EF4444' }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#F0EEFF' }}>{e.label}</p>
              <p className="text-xs" style={{ color: '#9B98B8' }}>{e.startTime} — {e.endTime}</p>
            </div>
            <p className="text-xs flex-shrink-0" style={{ color: '#EF444488' }}>
              {fmtH(diffMinutes(e.startTime, e.endTime))}
            </p>
          </div>
        ))}

        {/* Custom events */}
        {selectedEvents.map(ev => (
          <div key={ev.id} className="flex items-center gap-3 py-2 px-3 rounded-xl mb-2" style={{ backgroundColor: `${typeColor(ev.type)}18` }}>
            <div className="w-1.5 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: typeColor(ev.type) }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#F0EEFF' }}>{ev.label}</p>
              <p className="text-xs" style={{ color: '#9B98B8' }}>{ev.startTime} — {ev.endTime}</p>
            </div>
            <button
              onClick={() => deleteEvent(ev.id)}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
              style={{ color: '#9B98B866', backgroundColor: 'transparent' }}
            >
              ×
            </button>
          </div>
        ))}

        {/* Planned slots */}
        {selectedSlots.map((slot, i) => {
          const project = projects.find(p => p.id === slot.projectId)
          const task = project?.goals.flatMap(g => g.tasks).find(t => t.id === slot.taskId)
          return (
            <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl mb-2" style={{ backgroundColor: '#3B82F611' }}>
              <div className="w-1.5 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: project?.color ?? '#3B82F6' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#F0EEFF' }}>{task?.title ?? 'Задача'}</p>
                <p className="text-xs" style={{ color: '#9B98B8' }}>{slot.startTime} · {slot.durationMinutes}мин · {project?.name}</p>
              </div>
            </div>
          )
        })}

        {/* Sessions */}
        {selectedSessions.map((s, i) => {
          const project = projects.find(p => p.id === s.projectId)
          return (
            <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl mb-2" style={{ backgroundColor: '#10B98111' }}>
              <div className="w-1.5 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: project?.color ?? '#10B981' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#F0EEFF' }}>{project?.name ?? 'Проект'}</p>
                <p className="text-xs" style={{ color: '#9B98B8' }}>{s.durationMinutes}мин · {s.xpEarned} XP</p>
              </div>
            </div>
          )
        })}

        {isEmpty && (
          <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: '#252236' }}>
            <p className="text-2xl mb-2">📭</p>
            <p className="text-sm" style={{ color: '#9B98B8' }}>Нет событий</p>
            <button onClick={() => setShowAdd(true)} className="mt-3 text-xs" style={{ color: '#7C3AED' }}>
              + Добавить событие
            </button>
          </div>
        )}
      </div>

      {/* Add event modal */}
      {showAdd && (
        <AddEventModal
          defaultDate={selected}
          onSave={ev => { addEvent(ev); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
