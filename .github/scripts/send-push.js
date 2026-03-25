const webpush = require('web-push')
const https = require('https')

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const GH_TOKEN = process.env.GH_TOKEN
const NOTIFY_TYPE = process.env.NOTIFY_TYPE || 'auto'

webpush.setVapidDetails(
  'mailto:andrej.lol.228.1488@gmail.com',
  VAPID_PUBLIC,
  VAPID_PRIVATE
)

async function fetchGitHub(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      headers: {
        'Authorization': `token ${GH_TOKEN}`,
        'User-Agent': 'ctrl-push-bot',
        'Accept': 'application/vnd.github.v3+json',
      },
    }
    https.get(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { resolve(null) }
      })
    }).on('error', reject)
  })
}

async function getSubscriptions() {
  // Read push subscriptions from ctrl-data repo
  const result = await fetchGitHub('/repos/Szobs/ctrl-data/contents/data/push-subscriptions.json')
  if (!result || result.message) return []
  const content = Buffer.from(result.content, 'base64').toString('utf-8')
  return JSON.parse(content)
}

async function getStreakData() {
  const result = await fetchGitHub('/repos/Szobs/ctrl-data/contents/data/streak.json')
  if (!result || result.message) return null
  const content = Buffer.from(result.content, 'base64').toString('utf-8')
  return JSON.parse(content)
}

function getNotificationPayload(type, streakData) {
  const hour = new Date().getUTCHours()

  if (type === 'morning' || (type === 'auto' && hour === 9)) {
    const streak = streakData?.currentStreak || 0
    return {
      title: 'CTRL — Доброе утро',
      body: streak > 0
        ? `Серия ${streak} дней продолжается. Не прерывай!`
        : 'Начни день с прогресса. Открой CTRL.',
      icon: '/ctrl-pwa/icon-192.png',
      badge: '/ctrl-pwa/icon-192.png',
      url: '/ctrl-pwa/',
    }
  }

  if (type === 'streak' || (type === 'auto' && hour === 20)) {
    if (!streakData) return null
    const streak = streakData.currentStreak || 0
    if (streak === 0) return null

    const today = new Date().toISOString().split('T')[0]
    const lastActive = streakData.lastActiveDate
    if (lastActive === today) return null // уже работали сегодня

    return {
      title: `CTRL — Серия ${streak} дней под угрозой!`,
      body: 'Ты ещё не работал сегодня. Открой CTRL и сохрани серию.',
      icon: '/ctrl-pwa/icon-192.png',
      badge: '/ctrl-pwa/icon-192.png',
      url: '/ctrl-pwa/',
      tag: 'streak-warning',
    }
  }

  return null
}

async function main() {
  const [subscriptions, streakData] = await Promise.all([
    getSubscriptions(),
    getStreakData(),
  ])

  if (!subscriptions.length) {
    console.log('No subscriptions found')
    return
  }

  const payload = getNotificationPayload(NOTIFY_TYPE, streakData)
  if (!payload) {
    console.log('No notification needed')
    return
  }

  console.log(`Sending "${payload.title}" to ${subscriptions.length} subscriber(s)`)

  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(sub, JSON.stringify(payload))
    )
  )

  const ok = results.filter(r => r.status === 'fulfilled').length
  const fail = results.filter(r => r.status === 'rejected').length
  console.log(`Sent: ${ok}, Failed: ${fail}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
