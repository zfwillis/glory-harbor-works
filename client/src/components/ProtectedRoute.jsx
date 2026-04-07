import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, user } = useAuth()
  const normalizeRole = (role) => String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_")
  const normalizedUserRole = normalizeRole(user?.role)

  if (loading) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const normalizedAllowedRoles = Array.isArray(roles)
    ? roles.map((role) => normalizeRole(role))
    : []

  if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(normalizedUserRole)) {
    return <Navigate to="/" replace />
  }

  return children
}
