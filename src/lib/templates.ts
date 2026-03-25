import type { Phase, Goal, ProjectCategory } from '../types'

export interface ProjectTemplate {
  category: ProjectCategory
  label: string
  description: string
  phases: Omit<Phase, 'id'>[]
  goals: (Omit<Goal, 'id'> & { tasks: { title: string; estimatedMinutes: number; weight?: number }[]; phaseIndex: number })[]
}

function pid() { return `p-${Math.random().toString(36).slice(2, 9)}` }
function gid() { return `g-${Math.random().toString(36).slice(2, 9)}` }
function tid() { return `t-${Math.random().toString(36).slice(2, 9)}` }

export const TEMPLATES: Record<ProjectCategory, ProjectTemplate> = {
  game: {
    category: 'game',
    label: 'Игра',
    description: 'Концепт → Разработка → Контент → Тест → Релиз',
    phases: [
      { name: 'Концепт', order: 1 },
      { name: 'Разработка', order: 2 },
      { name: 'Контент', order: 3 },
      { name: 'Тестирование', order: 4 },
      { name: 'Релиз', order: 5 },
    ],
    goals: [
      {
        title: 'Геймдизайн-документ',
        weight: 8,
        phaseIndex: 0,
        tasks: [
          { title: 'Описать жанр, платформу и целевую аудиторию', estimatedMinutes: 60, weight: 3 },
          { title: 'Задокументировать основной геймплей-луп', estimatedMinutes: 90, weight: 5 },
          { title: 'Продумать прогрессию и систему наград', estimatedMinutes: 60, weight: 4 },
          { title: 'Составить референс-лист (похожие игры)', estimatedMinutes: 30, weight: 2 },
        ],
      },
      {
        title: 'Нарратив и лор',
        weight: 5,
        phaseIndex: 0,
        tasks: [
          { title: 'Написать краткое описание мира', estimatedMinutes: 60, weight: 3 },
          { title: 'Определить главных персонажей и их мотивацию', estimatedMinutes: 60, weight: 4 },
          { title: 'Набросать структуру сюжета', estimatedMinutes: 90, weight: 3 },
        ],
      },
      {
        title: 'Прототип',
        weight: 9,
        phaseIndex: 1,
        tasks: [
          { title: 'Настроить движок / фреймворк', estimatedMinutes: 120, weight: 4 },
          { title: 'Реализовать базовое управление персонажем', estimatedMinutes: 180, weight: 5 },
          { title: 'Сделать первую играбельную сцену', estimatedMinutes: 240, weight: 6 },
          { title: 'Протестировать «ощущение» механик', estimatedMinutes: 60, weight: 3 },
        ],
      },
      {
        title: 'Основные системы',
        weight: 10,
        phaseIndex: 1,
        tasks: [
          { title: 'Система сохранения / загрузки', estimatedMinutes: 180, weight: 5 },
          { title: 'UI / HUD', estimatedMinutes: 240, weight: 4 },
          { title: 'Система звука', estimatedMinutes: 120, weight: 3 },
          { title: 'Меню главного экрана', estimatedMinutes: 120, weight: 3 },
        ],
      },
      {
        title: 'Уровни и контент',
        weight: 8,
        phaseIndex: 2,
        tasks: [
          { title: 'Дизайн уровня 1', estimatedMinutes: 360, weight: 5 },
          { title: 'Расстановка врагов / объектов', estimatedMinutes: 240, weight: 4 },
          { title: 'Балансировка сложности', estimatedMinutes: 180, weight: 4 },
          { title: 'Добавить финальный уровень / босса', estimatedMinutes: 360, weight: 6 },
        ],
      },
      {
        title: 'Арт и аудио',
        weight: 6,
        phaseIndex: 2,
        tasks: [
          { title: 'Финализировать спрайты / модели персонажей', estimatedMinutes: 480, weight: 5 },
          { title: 'Фоновая музыка и SFX', estimatedMinutes: 240, weight: 4 },
          { title: 'Анимации', estimatedMinutes: 360, weight: 4 },
        ],
      },
      {
        title: 'QA и полировка',
        weight: 7,
        phaseIndex: 3,
        tasks: [
          { title: 'Полное прохождение без гайдов', estimatedMinutes: 120, weight: 5 },
          { title: 'Исправить все критические баги', estimatedMinutes: 360, weight: 8 },
          { title: 'Оптимизация производительности', estimatedMinutes: 180, weight: 4 },
          { title: 'Сессия с тестировщиками', estimatedMinutes: 120, weight: 5 },
        ],
      },
      {
        title: 'Релиз',
        weight: 5,
        phaseIndex: 4,
        tasks: [
          { title: 'Собрать финальный билд', estimatedMinutes: 60, weight: 5 },
          { title: 'Подготовить страницу / описание', estimatedMinutes: 120, weight: 4 },
          { title: 'Опубликовать', estimatedMinutes: 30, weight: 6 },
          { title: 'Сбор первичного фидбэка', estimatedMinutes: 60, weight: 3 },
        ],
      },
    ],
  },

  book: {
    category: 'book',
    label: 'Книга / Писательство',
    description: 'Планирование → Черновик → Редактура → Финал',
    phases: [
      { name: 'Планирование', order: 1 },
      { name: 'Черновик', order: 2 },
      { name: 'Редактура', order: 3 },
      { name: 'Финал', order: 4 },
    ],
    goals: [
      {
        title: 'Структура и план',
        weight: 8,
        phaseIndex: 0,
        tasks: [
          { title: 'Определить жанр, целевую аудиторию и объём', estimatedMinutes: 60, weight: 3 },
          { title: 'Написать синопсис (1-2 страницы)', estimatedMinutes: 90, weight: 5 },
          { title: 'Разбить на главы / арки', estimatedMinutes: 60, weight: 4 },
        ],
      },
      {
        title: 'Мир и персонажи',
        weight: 7,
        phaseIndex: 0,
        tasks: [
          { title: 'Карточки на главных персонажей (биография, мотивация)', estimatedMinutes: 120, weight: 5 },
          { title: 'Описание мира / сеттинга', estimatedMinutes: 90, weight: 4 },
          { title: 'Таймлайн событий', estimatedMinutes: 60, weight: 3 },
        ],
      },
      {
        title: 'Черновик',
        weight: 10,
        phaseIndex: 1,
        tasks: [
          { title: 'Написать 25% текста', estimatedMinutes: 600, weight: 5 },
          { title: 'Написать 50% текста', estimatedMinutes: 600, weight: 5 },
          { title: 'Написать 75% текста', estimatedMinutes: 600, weight: 5 },
          { title: 'Завершить черновик (100%)', estimatedMinutes: 600, weight: 7 },
        ],
      },
      {
        title: 'Структурная редактура',
        weight: 8,
        phaseIndex: 2,
        tasks: [
          { title: 'Прочитать черновик целиком и выписать проблемы', estimatedMinutes: 180, weight: 4 },
          { title: 'Переписать слабые главы', estimatedMinutes: 480, weight: 6 },
          { title: 'Проверить логику сюжета и арки персонажей', estimatedMinutes: 120, weight: 5 },
        ],
      },
      {
        title: 'Копиредактура и вычитка',
        weight: 6,
        phaseIndex: 2,
        tasks: [
          { title: 'Прогнать через корректор', estimatedMinutes: 60, weight: 3 },
          { title: 'Ручная вычитка вслух', estimatedMinutes: 360, weight: 5 },
          { title: 'Финальная проверка', estimatedMinutes: 120, weight: 4 },
        ],
      },
      {
        title: 'Публикация',
        weight: 5,
        phaseIndex: 3,
        tasks: [
          { title: 'Оформить обложку', estimatedMinutes: 120, weight: 4 },
          { title: 'Разметка / форматирование', estimatedMinutes: 90, weight: 3 },
          { title: 'Опубликовать / отправить издателю', estimatedMinutes: 60, weight: 6 },
        ],
      },
    ],
  },

  finance: {
    category: 'finance',
    label: 'Торговый бот / Финансы',
    description: 'Исследование → Прототип → Бэктест → Оптимизация → Боевой запуск',
    phases: [
      { name: 'Исследование', order: 1 },
      { name: 'Прототип', order: 2 },
      { name: 'Бэктест', order: 3 },
      { name: 'Оптимизация', order: 4 },
      { name: 'Боевой запуск', order: 5 },
    ],
    goals: [
      {
        title: 'Анализ рынка и стратегии',
        weight: 8,
        phaseIndex: 0,
        tasks: [
          { title: 'Выбрать рынок и инструменты (акции / крипто / фьючерсы)', estimatedMinutes: 60, weight: 3 },
          { title: 'Изучить 3-5 базовых торговых стратегий', estimatedMinutes: 180, weight: 5 },
          { title: 'Сформулировать торговую гипотезу', estimatedMinutes: 90, weight: 6 },
          { title: 'Определить риск-параметры (max drawdown, position size)', estimatedMinutes: 60, weight: 5 },
        ],
      },
      {
        title: 'Техническое исследование',
        weight: 6,
        phaseIndex: 0,
        tasks: [
          { title: 'Выбрать стек (язык, брокер API, библиотеки)', estimatedMinutes: 60, weight: 4 },
          { title: 'Изучить API брокера', estimatedMinutes: 120, weight: 4 },
          { title: 'Подключиться к тестовому аккаунту', estimatedMinutes: 60, weight: 3 },
        ],
      },
      {
        title: 'Прототип стратегии',
        weight: 9,
        phaseIndex: 1,
        tasks: [
          { title: 'Реализовать базовую логику стратегии', estimatedMinutes: 360, weight: 7 },
          { title: 'Написать модуль получения данных', estimatedMinutes: 180, weight: 5 },
          { title: 'Добавить расчёт сигналов входа/выхода', estimatedMinutes: 240, weight: 6 },
          { title: 'Базовое управление позицией', estimatedMinutes: 180, weight: 5 },
        ],
      },
      {
        title: 'Система бэктеста',
        weight: 10,
        phaseIndex: 2,
        tasks: [
          { title: 'Собрать исторические данные (1+ год)', estimatedMinutes: 120, weight: 4 },
          { title: 'Написать движок симуляции', estimatedMinutes: 360, weight: 7 },
          { title: 'Прогнать бэктест на истории', estimatedMinutes: 120, weight: 5 },
          { title: 'Визуализировать equity curve и метрики', estimatedMinutes: 180, weight: 4 },
          { title: 'Провести walk-forward анализ', estimatedMinutes: 180, weight: 6 },
        ],
      },
      {
        title: 'Оптимизация и риск',
        weight: 8,
        phaseIndex: 3,
        tasks: [
          { title: 'Grid search по параметрам', estimatedMinutes: 240, weight: 5 },
          { title: 'Добавить stop-loss и take-profit', estimatedMinutes: 120, weight: 7 },
          { title: 'Тест на Out-of-Sample данных', estimatedMinutes: 120, weight: 6 },
          { title: 'Стресс-тест на кризисных периодах', estimatedMinutes: 120, weight: 5 },
        ],
      },
      {
        title: 'Мониторинг и деплой',
        weight: 7,
        phaseIndex: 4,
        tasks: [
          { title: 'Настроить логирование и алерты', estimatedMinutes: 120, weight: 5 },
          { title: 'Запустить на paper-trading 2 недели', estimatedMinutes: 60, weight: 6 },
          { title: 'Выход в боевой режим с малым размером', estimatedMinutes: 30, weight: 8 },
          { title: 'Dashboard для мониторинга PnL', estimatedMinutes: 240, weight: 4 },
        ],
      },
    ],
  },

  general: {
    category: 'general',
    label: 'Общий / Лор вселенной',
    description: 'Планирование → Создание → Доработка → Завершение',
    phases: [
      { name: 'Планирование', order: 1 },
      { name: 'Создание', order: 2 },
      { name: 'Доработка', order: 3 },
      { name: 'Завершение', order: 4 },
    ],
    goals: [
      {
        title: 'Концепция и видение',
        weight: 7,
        phaseIndex: 0,
        tasks: [
          { title: 'Сформулировать основную идею (1 абзац)', estimatedMinutes: 30, weight: 4 },
          { title: 'Определить цель и результат проекта', estimatedMinutes: 45, weight: 5 },
          { title: 'Собрать референсы и вдохновение', estimatedMinutes: 60, weight: 2 },
        ],
      },
      {
        title: 'Структура и план',
        weight: 8,
        phaseIndex: 0,
        tasks: [
          { title: 'Разбить на крупные блоки / разделы', estimatedMinutes: 60, weight: 5 },
          { title: 'Оценить объём и сроки', estimatedMinutes: 30, weight: 3 },
          { title: 'Определить приоритетность блоков', estimatedMinutes: 30, weight: 4 },
        ],
      },
      {
        title: 'Основная работа',
        weight: 10,
        phaseIndex: 1,
        tasks: [
          { title: 'Выполнить блок 1', estimatedMinutes: 240, weight: 5 },
          { title: 'Выполнить блок 2', estimatedMinutes: 240, weight: 5 },
          { title: 'Выполнить блок 3', estimatedMinutes: 240, weight: 5 },
        ],
      },
      {
        title: 'Проверка и улучшения',
        weight: 6,
        phaseIndex: 2,
        tasks: [
          { title: 'Ревью всего материала', estimatedMinutes: 120, weight: 4 },
          { title: 'Исправить несоответствия', estimatedMinutes: 180, weight: 5 },
          { title: 'Получить внешний фидбэк', estimatedMinutes: 60, weight: 3 },
        ],
      },
      {
        title: 'Завершение',
        weight: 5,
        phaseIndex: 3,
        tasks: [
          { title: 'Финальная версия / сборка', estimatedMinutes: 60, weight: 5 },
          { title: 'Документирование / архивирование', estimatedMinutes: 45, weight: 3 },
          { title: 'Поделиться / опубликовать', estimatedMinutes: 30, weight: 4 },
        ],
      },
    ],
  },
}

/** Генерирует готовые Phase[] и Goal[] из шаблона */
export function buildFromTemplate(template: ProjectTemplate): { phases: Phase[]; goals: Goal[] } {
  const phases: Phase[] = template.phases.map((p, i) => ({
    id: `phase-${i}-${pid()}`,
    name: p.name,
    order: p.order,
  }))

  const goals: Goal[] = template.goals.map(g => ({
    id: gid(),
    title: g.title,
    weight: g.weight,
    phaseId: phases[g.phaseIndex]?.id,
    tasks: g.tasks.map(t => ({
      id: tid(),
      title: t.title,
      status: 'pending' as const,
      estimatedMinutes: t.estimatedMinutes,
      actualMinutes: 0,
      weight: t.weight ?? 1,
      createdAt: new Date().toISOString(),
      completedAt: null,
    })),
  }))

  return { phases, goals }
}

/** Подсчёт взвешенного прогресса проекта */
export function calcWeightedProgress(goals: Goal[]): number {
  if (goals.length === 0) return 0

  let totalWeight = 0
  let completedWeight = 0

  for (const goal of goals) {
    const gw = goal.weight ?? 1
    if (goal.tasks.length === 0) continue

    let taskTotal = 0
    let taskDone = 0
    for (const task of goal.tasks) {
      const tw = task.weight ?? 1
      taskTotal += tw
      if (task.status === 'done') taskDone += tw
    }
    const goalCompletion = taskTotal > 0 ? taskDone / taskTotal : 0
    totalWeight += gw
    completedWeight += gw * goalCompletion
  }

  if (totalWeight === 0) return 0
  return Math.round((completedWeight / totalWeight) * 100)
}
