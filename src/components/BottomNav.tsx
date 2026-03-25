import { useNavigate, useLocation } from 'react-router-dom'

const TABS = [
  { path: '/', icon: '⊞', label: 'Главная' },
  { path: '/calendar', icon: '📅', label: 'Календарь' },
  { path: '/history', icon: '📊', label: 'История' },
  { path: '/report', icon: '📋', label: 'Отчёт' },
]

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 pb-safe"
      style={{
        backgroundColor: '#16132A',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        paddingTop: 10,
        zIndex: 50,
      }}
    >
      {TABS.map(tab => {
        const active = location.pathname === tab.path
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all active:scale-90"
            style={{
              color: active ? '#7C3AED' : '#9B98B8',
              backgroundColor: active ? '#7C3AED18' : 'transparent',
              minWidth: 60,
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
