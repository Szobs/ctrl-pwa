import { Octokit } from '@octokit/rest'
import type { GitHubConfig } from '../types'

const VAPID_PUBLIC_KEY = 'BHuFyaN5i28yatW00PM3amUXQ-WdW3WPVkKr42Kz6drX_Lln0kyKZo5NxUC6uuwqfIt6A4onN9BT4BdrF1-baR4'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from(rawData, c => c.charCodeAt(0))
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) return existing

  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return true
  return sub.unsubscribe()
}

export async function getSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export async function savePushSubscription(
  config: GitHubConfig,
  subscription: PushSubscription,
): Promise<void> {
  const octokit = new Octokit({ auth: config.token })
  const path = 'data/push-subscriptions.json'
  const subJson = subscription.toJSON()

  let existing: PushSubscription[] = []
  let sha: string | undefined

  try {
    const res = await octokit.repos.getContent({ owner: config.owner, repo: config.repo, path })
    const data = res.data as { content: string; sha: string }
    const decoded = JSON.parse(atob(data.content.replace(/\n/g, '')))
    existing = Array.isArray(decoded) ? decoded : []
    sha = data.sha
  } catch {
    // file doesn't exist yet
  }

  // deduplicate by endpoint
  const filtered = existing.filter((s: { endpoint?: string }) => s.endpoint !== subJson.endpoint)
  filtered.push(subJson as unknown as PushSubscription)

  const json = JSON.stringify(filtered, null, 2)
  const encoded = btoa(new TextEncoder().encode(json).reduce((s, b) => s + String.fromCharCode(b), ''))

  await octokit.repos.createOrUpdateFileContents({
    owner: config.owner,
    repo: config.repo,
    path,
    message: 'ctrl: update push subscriptions',
    content: encoded,
    sha,
  })
}

export async function removePushSubscription(
  config: GitHubConfig,
  endpoint: string,
): Promise<void> {
  const octokit = new Octokit({ auth: config.token })
  const path = 'data/push-subscriptions.json'

  try {
    const res = await octokit.repos.getContent({ owner: config.owner, repo: config.repo, path })
    const data = res.data as { content: string; sha: string }
    const existing = JSON.parse(atob(data.content.replace(/\n/g, '')))
    const filtered = existing.filter((s: { endpoint?: string }) => s.endpoint !== endpoint)

    const json = JSON.stringify(filtered, null, 2)
    const encoded = btoa(new TextEncoder().encode(json).reduce((s, b) => s + String.fromCharCode(b), ''))

    await octokit.repos.createOrUpdateFileContents({
      owner: config.owner,
      repo: config.repo,
      path,
      message: 'ctrl: remove push subscription',
      content: encoded,
      sha: data.sha,
    })
  } catch {
    // ignore
  }
}
