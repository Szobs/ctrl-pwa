import type { CalendarEvent, WorkShift } from '../types'

/**
 * Личные правила расписания — Andrii P.
 *
 * 1. После ночной смены (21:30–06:00):
 *    - Сон: 06:00–13:00 на следующий день
 *    - К девушке в 16:30–21:30 (суббота: 16:30–23:59, ночевать)
 *
 * 2. После ранней смены (05:45–14:15):
 *    - К девушке в 16:30–21:30 (суббота: 15:30–23:59, ночевать)
 *
 * 3. Воскресенье → к девушке 10:00–22:00 (всегда)
 */

export const SCHEDULE_RULES_DESCRIPTION = {
  version: 2,
  author: 'Andrii P.',
  rules: [
    {
      id: 'night-shift-sleep',
      description: 'После ночной смены (старт ≥ 20:00) — сон 06:00–13:00 на следующий день',
    },
    {
      id: 'after-night-shift',
      description: 'После ночной смены — к девушке в 16:30–21:30 на следующий день. Суббота: 16:30–23:59 (ночевать).',
    },
    {
      id: 'after-morning-shift',
      description: 'После ранней смены (старт < 12:00) — к девушке в 16:30–21:30. Суббота: 15:30–23:59 (ночевать).',
    },
    {
      id: 'sunday',
      description: 'Каждое воскресенье — к девушке 10:00–22:00.',
    },
  ],
}

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return localDateStr(d)
}

function dayOfWeek(dateStr: string): number {
  // 0=Sun 1=Mon ... 6=Sat
  return new Date(dateStr + 'T12:00:00').getDay()
}

function isNightShift(shift: WorkShift): boolean {
  return parseInt(shift.startTime.split(':')[0]) >= 20
}

function isMorningShift(shift: WorkShift): boolean {
  return parseInt(shift.startTime.split(':')[0]) < 12
}

function getSundaysInRange(dates: string[]): string[] {
  if (!dates.length) return []
  const sorted = [...dates].sort()
  const start = new Date(sorted[0] + 'T12:00:00')
  const end   = new Date(sorted[sorted.length - 1] + 'T12:00:00')
  end.setDate(end.getDate() + 7)
  const sundays: string[] = []
  const cur = new Date(start)
  while (cur.getDay() !== 0) cur.setDate(cur.getDate() + 1)
  while (cur <= end) {
    sundays.push(localDateStr(cur))
    cur.setDate(cur.getDate() + 7)
  }
  return sundays
}

export function applyScheduleRules(workSchedule: WorkShift[]): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const gfDates = new Set<string>() // даты уже занятые девушкой

  // Правило 1: ночная смена → сон + девушка на следующий день
  for (const shift of workSchedule) {
    if (!isNightShift(shift)) continue
    const nextDay = addDays(shift.date, 1)
    const isSat = dayOfWeek(nextDay) === 6

    // Сон
    events.push({
      id: `sleep-${shift.date}`,
      date: nextDay,
      startTime: shift.endTime, // обычно '06:00'
      endTime: '13:00',
      label: '😴 Сон',
      type: 'other',
    })

    // Девушка
    if (!gfDates.has(nextDay)) {
      gfDates.add(nextDay)
      events.push({
        id: `gf-night-${shift.date}`,
        date: nextDay,
        startTime: '16:30',
        endTime: isSat ? '23:59' : '21:30',
        label: isSat ? '💕 У девушки (ночевать)' : '💕 У девушки',
        type: 'personal',
      })
    }
  }

  // Правило 2: ранняя смена → девушка в тот же день
  for (const shift of workSchedule) {
    if (!isMorningShift(shift)) continue
    if (gfDates.has(shift.date)) continue
    const isSat = dayOfWeek(shift.date) === 6
    gfDates.add(shift.date)
    events.push({
      id: `gf-morning-${shift.date}`,
      date: shift.date,
      startTime: isSat ? '15:30' : '16:30',
      endTime: isSat ? '23:59' : '21:30',
      label: isSat ? '💕 У девушки (ночевать)' : '💕 У девушки',
      type: 'personal',
    })
  }

  // Правило 3: каждое воскресенье
  for (const sunday of getSundaysInRange(workSchedule.map(s => s.date))) {
    if (gfDates.has(sunday)) continue
    gfDates.add(sunday)
    events.push({
      id: `gf-sunday-${sunday}`,
      date: sunday,
      startTime: '10:00',
      endTime: '22:00',
      label: '💕 У девушки',
      type: 'personal',
    })
  }

  return events.sort((a, b) => a.date.localeCompare(b.date))
}
