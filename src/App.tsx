import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useStore } from './store'
import { Setup } from './pages/Setup'
import { MainScreen } from './pages/MainScreen'
import { ProjectPage } from './pages/ProjectPage'
import { NewProject } from './pages/NewProject'
import { CalendarPage } from './pages/CalendarPage'
import { HistoryPage } from './pages/HistoryPage'
import { ReportPage } from './pages/ReportPage'
import { SettingsPage } from './pages/SettingsPage'
import { SessionTimer } from './components/SessionTimer'
import { BottomNav } from './components/BottomNav'

function AppRoutes() {
  const { config } = useStore()
  const location = useLocation()
  const hideNav = !config || location.pathname === '/setup' || location.pathname.startsWith('/project/') || location.pathname === '/new-project'

  return (
    <>
      <Routes>
        {!config ? (
          <>
            <Route path="/setup" element={<Setup />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<MainScreen />} />
            <Route path="/project/:id" element={<ProjectPage />} />
            <Route path="/new-project" element={<NewProject />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
      <SessionTimer />
      {!hideNav && <BottomNav />}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
