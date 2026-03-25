import { Octokit } from '@octokit/rest'
import type { GitHubConfig, Project, Session, GlobalStreak, Calendar, Board, Journal } from '../types'

type DataKey = 'projects' | 'calendar' | 'sessions' | 'streak'

interface GitHubData {
  projects: Project[]
  sessions: Session[]
  streak: GlobalStreak
  calendar: Calendar
}

function makeOctokit(token: string) {
  return new Octokit({ auth: token })
}

async function readFile(
  octokit: Octokit,
  config: GitHubConfig,
  path: string,
): Promise<{ content: unknown; sha: string }> {
  const res = await octokit.repos.getContent({
    owner: config.owner,
    repo: config.repo,
    path,
  })
  const data = res.data as { content: string; sha: string }
  const binary = atob(data.content.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
  const decoded = JSON.parse(new TextDecoder().decode(bytes))
  return { content: decoded, sha: data.sha }
}

async function writeFile(
  octokit: Octokit,
  config: GitHubConfig,
  path: string,
  content: unknown,
  sha?: string,
): Promise<string> {
  const json = JSON.stringify(content, null, 2)
  const encoded = btoa(new TextEncoder().encode(json).reduce((s, b) => s + String.fromCharCode(b), ''))
  const res = await octokit.repos.createOrUpdateFileContents({
    owner: config.owner,
    repo: config.repo,
    path,
    message: `ctrl: update ${path}`,
    content: encoded,
    sha,
  })
  return (res.data.content as { sha: string }).sha
}

export async function fetchAllData(config: GitHubConfig): Promise<GitHubData & { shas: Record<string, string> }> {
  const octokit = makeOctokit(config.token)
  const keys: DataKey[] = ['projects', 'sessions', 'streak', 'calendar']

  const results = await Promise.all(
    keys.map(k => readFile(octokit, config, `data/${k}.json`).catch(() => ({ content: getDefault(k), sha: '' }))),
  )

  const shas: Record<string, string> = {}
  const data: Record<string, unknown> = {}
  keys.forEach((k, i) => {
    data[k] = results[i].content
    if (results[i].sha) shas[`data/${k}.json`] = results[i].sha
  })

  return { ...(data as unknown as GitHubData), shas }
}

export async function fetchBoard(config: GitHubConfig, projectId: string): Promise<{ board: Board; sha: string }> {
  const octokit = makeOctokit(config.token)
  const path = `boards/${projectId}.json`
  try {
    const result = await readFile(octokit, config, path)
    return { board: result.content as Board, sha: result.sha }
  } catch {
    return { board: { stickers: [], connections: [] }, sha: '' }
  }
}

export async function saveProjects(
  config: GitHubConfig,
  projects: Project[],
  sha?: string,
): Promise<string> {
  const octokit = makeOctokit(config.token)
  return writeFile(octokit, config, 'data/projects.json', projects, sha)
}

export async function saveSessions(
  config: GitHubConfig,
  sessions: Session[],
  sha?: string,
): Promise<string> {
  const octokit = makeOctokit(config.token)
  return writeFile(octokit, config, 'data/sessions.json', sessions, sha)
}

export async function saveStreak(
  config: GitHubConfig,
  streak: GlobalStreak,
  sha?: string,
): Promise<string> {
  const octokit = makeOctokit(config.token)
  return writeFile(octokit, config, 'data/streak.json', streak, sha)
}

export async function saveCalendar(
  config: GitHubConfig,
  calendar: Calendar,
  sha?: string,
): Promise<string> {
  const octokit = makeOctokit(config.token)
  return writeFile(octokit, config, 'data/calendar.json', calendar, sha)
}

export async function saveBoard(
  config: GitHubConfig,
  projectId: string,
  board: Board,
  sha?: string,
): Promise<string> {
  const octokit = makeOctokit(config.token)
  return writeFile(octokit, config, `boards/${projectId}.json`, board, sha)
}

export async function fetchJournal(config: GitHubConfig, projectId: string): Promise<{ journal: Journal; sha: string }> {
  const octokit = makeOctokit(config.token)
  try {
    const result = await readFile(octokit, config, `journals/${projectId}.json`)
    return { journal: result.content as Journal, sha: result.sha }
  } catch {
    return { journal: { entries: [] }, sha: '' }
  }
}

export async function saveJournal(
  config: GitHubConfig,
  projectId: string,
  journal: Journal,
  sha?: string,
): Promise<string> {
  const octokit = makeOctokit(config.token)
  return writeFile(octokit, config, `journals/${projectId}.json`, journal, sha)
}

export async function validateConfig(config: GitHubConfig): Promise<boolean> {
  try {
    const octokit = makeOctokit(config.token)
    await octokit.repos.get({ owner: config.owner, repo: config.repo })
    return true
  } catch {
    return false
  }
}

function getDefault(key: DataKey): unknown {
  switch (key) {
    case 'projects': return []
    case 'sessions': return []
    case 'streak': return {
      currentStreak: 0, maxStreak: 0, totalXP: 0,
      level: 1, rank: 'Подмастерье', lastActiveDate: null,
      weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
    }
    case 'calendar': return { workSchedule: [], plannedSlots: [], blockedTime: [] }
  }
}
