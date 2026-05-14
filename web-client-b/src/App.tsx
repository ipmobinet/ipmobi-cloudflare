import { Routes, Route, Navigate } from 'react-router-dom'
import PortalLayout from './layouts/PortalLayout'
import DashboardPage from './pages/DashboardPage'
import EndpointsPage from './pages/EndpointsPage'
import LogsPage from './pages/LogsPage'
import ApiKeysPage from './pages/ApiKeysPage'

export default function App() {
  return (
    <Routes>
      <Route element={<PortalLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/endpoints" element={<EndpointsPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/api-keys" element={<ApiKeysPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
