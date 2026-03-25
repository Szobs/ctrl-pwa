import type { CalendarEvent, WorkShift } from '../types'

/**
 * Личные правила расписания — Andrii P.
 *
 * 1. После ночной смены (21:30–06:00) → в 16:30 к девушке
 *    Если следующий день суббота — ночевать (нет конечного времени ПК)
 *
 * 2. Суббота с ранней сменой (05:45–14:15) → к девушке в 15:30, ночевать
 *
 * 3. Пятница ночная + суббота сон до 13 → к девушке в 16:30, ночевать
 *    (покрывается правилом 1 + признаком субботы)
 *
 * 4. Воскресенье → к девушке в 10:00, домой в 22:00
 *    (для всех воскресений в диапазоне импортируемого графика)
 */

export const SCHEDULE_RULES_DESCRIPTION = {
  version: 1,
  author: 'Andrii P.',
  rules: [
    {
      id: 'after-night-shift',
      description: 'После ночной смены (старт ≥ 20:00) — к девушке в 16:30 на следующий день',
      overnight: 'Если следующий день суббота — ночевать (без PC-времени)',
    },
    {
      id: 'saturday-morning-shift',
      description: 'Суббота с ранней сменой (старт < 12:00) — к девушке в 15:30, ночевать',
    },
    {
      id: 'sunday',
      description: 'Каждое воскресенье — к девушке в 10:00, домой в 22:00',
    },
  ],
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function dayOfWeek(dateStr: string): number {
  // 0=Sun 1=Mon ... 6=Sat
  return new Date(dateStr + 'T12:00:00').getDay()
}

function isNightShift(shift: WorkShift): boolean {
  const h = parseInt(shift.startTime.split(':')[0])
  return h >= 20
}

function isMorningShift(shift: WorkShift): boolean {
  const h = parseInt(shift.startTime.split(':')[0])
  return h < 12
}

/** Возвращает все воскресения в диапазоне дат */
function getSundaysInRange(dates: string[]): string[] {
  if (!dates.length) return []
  const sorted = [...dates].sort()
  const start = new Date(sorted[0] + 'T12:00:00')
  const end   = new Date(sorted[sorted.length - 1] + 'T12:00:00')
  // Добавим 7 дней на случай ночных смен сдвигающих конец
  end.setDate(end.getDate() + 7)

  const sundays: string[] = []
  const cur = new Date(start)
  // Перемотаем до ближайшего воскресенья
  while (cur.getDay() !== 0) cur.setDate(cur.getDate() + 1)
  while (cur <= end) {
    sundays.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 7)
  }
  return sundays
}

export function applyScheduleRules(workSchedule: WorkShift[]): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const usedDates = new Set<string>()

  // Правило 1 & 3: после ночной смены
  for (const shift of workSchedule) {
    if (!isNightShift(shift)) continue
    const nextDay = addDays(shift.date, 1)
    const isSat = dayOfWeek(nextDay) === 6
    if (usedDates.has(nextDay)) continue
    usedDates.add(nextDay)
    events.push({
      id: `gf-night-${shift.date}`,
      date: nextDay,
      startTime: '16:30',
      endTime: isSat ? '23:59' : '23:00',
      label: isSat ? '💕 У девушки (ночевать)' : '💕 У девушки',
      type: 'personal',
    })
  }

  // Правило 2: суббота + ранняя смена
  for (const shift of workSchedule) {
    if (!isMorningShift(shift)) continue
    if (dayOfWeek(shift.date) !== 6) continue // только суббота
    if (usedDates.has(shift.date)) continue   // уже покрыта правилом 1
    usedDates.add(shift.date)
    events.push({
      id: `gf-sat-morning-${shift.date}`,
      date: shift.date,
      startTime: '15:30',
      endTime: '23:59',
      label: '💕 У девушки (ночевать)',
      type: 'personal',
    })
  }

  // Правило 4: каждое воскресенье
  const allDates = workSchedule.map(s => s.date)
  for (const sunday of getSundaysInRange(allDates)) {
    if (usedDates.has(sunday)) continue
    usedDates.add(sunday)
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
