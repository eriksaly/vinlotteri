import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LotteryInfo from './pages/LotteryInfo'
import Statistics from './pages/Statistics'
import Login from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LotteryInfo />} />
        <Route path="/statistikk" element={<Statistics />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
