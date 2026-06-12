import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardLayout from './components/layout/DashboardLayout'
import EntryPage from './pages/EntryPage'
import LogPage from './pages/LogPage'
import SettlementPage from './pages/SettlementPage'
import PricesPage from './pages/PricesPage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500 text-lg">جاري التحميل...</div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <PrivateRoute>
          <DashboardLayout />
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="/entry" replace />} />
        <Route path="entry" element={<EntryPage />} />
        <Route path="log" element={<LogPage />} />
        <Route path="settlement" element={<SettlementPage />} />
        <Route path="prices" element={<PricesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
