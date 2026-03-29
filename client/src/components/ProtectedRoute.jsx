import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, user } = useAuth()
  const normalizedUserRole = String(user?.role || "").trim().toLowerCase()

  if (loading) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const normalizedAllowedRoles = Array.isArray(roles)
    ? roles.map((role) => String(role || "").trim().toLowerCase())
    : []

  if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(normalizedUserRole)) {
    return <Navigate to="/" replace />
  }

  return children
}
