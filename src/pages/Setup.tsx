import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { validateConfig } from '../lib/github'

export function Setup() {
  const navigate = useNavigate()
  const { setConfig, syncData } = useStore()
  const [token, setToken] = useState('')
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('ctrl-data')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConnect = async () => {
    if (!token || !owner || !repo) {
      setError('Заполни все поля')
      return
    }
    setLoading(true)
    setError('')
    const config = { token, owner, repo }
    const ok = await validateConfig(config)
    if (!ok) {
      setError('Не удалось подключиться. Проверь токен и название репозитория.')
      setLoading(false)
      return
    }
    setConfig(config)
    await syncData()
    setLoading(false)
    navigate('/')
  }

  return (
    <div className="min-h-svh flex flex-col justify-center px-6" style={{ backgroundColor: '#1E1B2E' }}>
      {/* Logo */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-black tracking-tight mb-2" style={{ color: '#F0EEFF' }}>CTRL</h1>
        <p className="text-sm" style={{ color: '#9B98B8' }}>Персональная операционная система жизни</p>
      </div>

      {/* Card */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: '#252236' }}>
        <h2 className="text-base font-semibold mb-1" style={{ color: '#F0EEFF' }}>Подключение к GitHub</h2>
        <p className="text-xs mb-5" style={{ color: '#9B98B8' }}>
          Все данные хранятся в твоём GitHub репозитории
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs mb-1.5 block font-medium" style={{ color: '#9B98B8' }}>
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="w-full px-3 py-3 rounded-xl text-sm outline-none"
              style={{
                backgroundColor: '#1E1B2E',
                color: '#F0EEFF',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
            <p className="text-xs mt-1" style={{ color: '#9B98B8' }}>
              Нужны права: repo (read/write)
            </p>
          </div>

          <div>
            <label className="text-xs mb-1.5 block font-medium" style={{ color: '#9B98B8' }}>
              GitHub Username
            </label>
            <input
              type="text"
              value={owner}
              onChange={e => setOwner(e.target.value)}
              placeholder="your-username"
              className="w-full px-3 py-3 rounded-xl text-sm outline-none"
              style={{
                backgroundColor: '#1E1B2E',
                color: '#F0EEFF',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
          </div>

          <div>
            <label className="text-xs mb-1.5 block font-medium" style={{ color: '#9B98B8' }}>
              Репозиторий
            </label>
            <input
              type="text"
              value={repo}
              onChange={e => setRepo(e.target.value)}
              placeholder="ctrl-data"
              className="w-full px-3 py-3 rounded-xl text-sm outline-none"
              style={{
                backgroundColor: '#1E1B2E',
                color: '#F0EEFF',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
          </div>
        </div>

        {error && (
          <div
            className="mt-4 px-3 py-2 rounded-xl text-xs"
            style={{ backgroundColor: '#EF444422', color: '#EF4444' }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full mt-5 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-98 disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
            color: '#fff',
            boxShadow: '0 4px 20px #7C3AED44',
          }}
        >
          {loading ? 'Подключение...' : 'Подключить'}
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-6 px-2">
        <p className="text-xs font-semibold mb-2" style={{ color: '#9B98B8' }}>Как начать:</p>
        <ol className="space-y-2">
          {[
            'Создай репозиторий ctrl-data на GitHub (публичный или приватный)',
            'Скопируй содержимое папки ctrl-data в репозиторий',
            'Создай Personal Access Token с правами repo',
            'Введи данные выше и нажми «Подключить»',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: '#7C3AED22', color: '#7C3AED' }}
              >
                {i + 1}
              </span>
              <span className="text-xs" style={{ color: '#9B98B8' }}>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
