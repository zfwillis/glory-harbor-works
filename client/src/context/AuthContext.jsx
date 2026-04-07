import { createContext, useContext, useState, useEffect, useRef } from "react";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef(null);

  // API Base URL
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const inactivityMinutes = Number(import.meta.env.VITE_INACTIVITY_LOGOUT_MINUTES || 15);
  const inactivityTimeoutMs = Number.isFinite(inactivityMinutes) && inactivityMinutes > 0 ? inactivityMinutes * 60 * 1000 : 15 * 60 * 1000;
  const LAST_ACTIVITY_KEY = "lastActivityAt";

  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  const forceLocalLogout = () => {
    clearInactivityTimer();
    localStorage.removeItem("token");
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setToken(null);
    setUser(null);
  };

  const scheduleAutoLogout = (timeoutMs = inactivityTimeoutMs) => {
    clearInactivityTimer();
    inactivityTimerRef.current = setTimeout(() => {
      forceLocalLogout();
    }, Math.max(0, timeoutMs));
  };

  const recordActivity = () => {
    if (!localStorage.getItem("token")) {
      return;
    }

    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    scheduleAutoLogout();
  };

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        try {
          const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            setToken(storedToken);
          } else {
            localStorage.removeItem("token");
            setToken(null);
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          localStorage.removeItem("token");
          setToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    forceLocalLogout();
  };

  useEffect(() => {
    if (loading || !token) {
      clearInactivityTimer();
      return;
    }

    const now = Date.now();
    const lastActivityRaw = localStorage.getItem(LAST_ACTIVITY_KEY);
    const lastActivityAt = Number(lastActivityRaw);
    const hasValidLastActivity = Number.isFinite(lastActivityAt) && lastActivityAt > 0;

    if (!hasValidLastActivity) {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      scheduleAutoLogout();
    } else {
      const elapsed = now - lastActivityAt;
      if (elapsed >= inactivityTimeoutMs) {
        forceLocalLogout();
      } else {
        scheduleAutoLogout(inactivityTimeoutMs - elapsed);
      }
    }

    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    const onActivity = () => recordActivity();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        recordActivity();
      }
    };
    const onStorage = (event) => {
      if (event.key === "token" && !event.newValue) {
        forceLocalLogout();
        return;
      }

      if (event.key === LAST_ACTIVITY_KEY && event.newValue) {
        scheduleAutoLogout();
      }
    };

    activityEvents.forEach((eventName) => window.addEventListener(eventName, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("storage", onStorage);

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, onActivity));
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("storage", onStorage);
      clearInactivityTimer();
    };
  }, [loading, token]);

  const value = {
    user,
    token,
    setUser,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
