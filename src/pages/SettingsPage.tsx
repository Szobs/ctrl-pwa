import { useState, useEffect } from 'react'
import { useStore } from '../store'
import {
  subscribeToPush,
  unsubscribeFromPush,
  getSubscription,
  savePushSubscription,
  removePushSubscription,
} from '../lib/push'

export function SettingsPage() {
  const { config } = useStore()
  const [pushEnabled, setPushEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    getSubscription().then(sub => setPushEnabled(!!sub))
  }, [])

  const togglePush = async () => {
    if (!config) return
    setLoading(true)
    setStatus('')

    if (pushEnabled) {
      const sub = await getSubscription()
      if (sub) {
        await removePushSubscription(config, sub.endpoint)
        await unsubscribeFromPush()
      }
      setPushEnabled(false)
      setStatus('Уведомления отключены')
    } else {
      const sub = await subscribeToPush()
      if (!sub) {
        setStatus('Не удалось подключить уведомления. Разреши их в настройках браузера.')
        setLoading(false)
        return
      }
      await savePushSubscription(config, sub)
      setPushEnabled(true)
      setStatus('Уведомления включены!')
    }

    setLoading(false)
  }

  const supportsNotifications = 'Notification' in window && 'serviceWorker' in navigator

  return (
    <div
      className="min-h-svh pb-24"
      style={{ backgroundColor: '#1E1B2E', color: '#F0EEFF' }}
    >
      {/* Header */}
      <div
        className="px-5 pt-14 pb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h1 className="text-xl font-bold">Настройки</h1>
      </div>

      <div className="px-5 py-6 flex flex-col gap-4">

        {/* Push notifications */}
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: '#252236' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-sm">Push-уведомления</p>
              <p className="text-xs mt-0.5" style={{ color: '#9B98B8' }}>
                Утреннее напоминание и предупреждение о стрике
              </p>
            </div>
            {supportsNotifications ? (
              <button
                onClick={togglePush}
                disabled={loading}
                className="relative flex-shrink-0 w-12 h-6 rounded-full transition-all disabled:opacity-50"
                style={{
                  backgroundColor: pushEnabled ? '#7C3AED' : 'rgba(255,255,255,0.15)',
                }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                  style={{
                    left: pushEnabled ? '26px' : '2px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }}
                />
              </button>
            ) : (
              <span className="text-xs" style={{ color: '#EF4444' }}>Не поддерживается</span>
            )}
          </div>

          {status && (
            <p
              className="text-xs px-3 py-2 rounded-xl"
              style={{
                backgroundColor: status.includes('Не удалось') ? '#EF444422' : '#7C3AED22',
                color: status.includes('Не удалось') ? '#EF4444' : '#A855F7',
              }}
            >
              {status}
            </p>
          )}

          {pushEnabled && (
            <div
              className="mt-3 text-xs px-3 py-2 rounded-xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#9B98B8' }}
            >
              📅 09:00 UTC — утреннее напоминание<br />
              ⚠️ 20:00 UTC — предупреждение о стрике
            </div>
          )}
        </div>

        {/* Account info */}
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: '#252236' }}
        >
          <p className="font-semibold text-sm mb-3">Аккаунт</p>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: '#9B98B8' }}>GitHub</span>
              <span className="text-xs font-medium">{config?.owner || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: '#9B98B8' }}>Репозиторий</span>
              <span className="text-xs font-medium">{config?.repo || '—'}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
