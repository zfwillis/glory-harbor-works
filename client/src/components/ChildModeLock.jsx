import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { exitChildMode, getActiveChildModeId } from "../utils/childMode";

export default function ChildModeLock({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const activeChildId = getActiveChildModeId();
  const isChildModeRoute = location.pathname.startsWith("/child-mode");

  if (loading) {
    return children;
  }

  if (!isAuthenticated && activeChildId) {
    exitChildMode();
    return children;
  }

  if (isAuthenticated && activeChildId && !isChildModeRoute) {
    return <Navigate to={`/child-mode/${activeChildId}`} replace />;
  }

  return children;
}
