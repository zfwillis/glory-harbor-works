import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const NOTIFIED_KEY = "notifiedNotificationIds";
const POLL_INTERVAL_MS = 2000;

const readNotifiedIds = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "[]"));
  } catch {
    return new Set();
  }
};

const saveNotifiedIds = (ids) => {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(Array.from(ids).slice(-100)));
};

export default function PushNotifications() {
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const notifiedIdsRef = useRef(readNotifiedIds());
  const [missedNotifications, setMissedNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return undefined;
    }

    let cancelled = false;
    const pollNotifications = async () => {
      if (document.visibilityState !== "visible" && (!("Notification" in window) || Notification.permission !== "granted")) {
        return;
      }

      try {
        const res = await fetch(`${API_URL}/notifications/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!res.ok || cancelled) {
          return;
        }

        const unread = (data.notifications || []).filter((notification) => !notification.read);
        unread.forEach((notification) => {
          if (!notification._id || notifiedIdsRef.current.has(notification._id)) {
            return;
          }

          notifiedIdsRef.current.add(notification._id);
          setMissedNotifications((prev) => [notification, ...prev].slice(0, 20));

          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(notification.title || "Glory Harbor", {
              body: notification.message,
              tag: notification._id,
            });
          }
        });

        saveNotifiedIds(notifiedIdsRef.current);
      } catch {
        // Polling should not interrupt the user if notifications cannot load.
      }
    };

    pollNotifications();
    const intervalId = window.setInterval(pollNotifications, POLL_INTERVAL_MS);
    window.addEventListener("focus", pollNotifications);
    document.addEventListener("visibilitychange", pollNotifications);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", pollNotifications);
      document.removeEventListener("visibilitychange", pollNotifications);
    };
  }, [isAuthenticated, token]);

  useEffect(() => {
    setIsOpen(false);
    if (location.pathname === "/profile") {
      setMissedNotifications([]);
    }
  }, [location.pathname]);

  if (!isAuthenticated || !token) {
    return null;
  }

  const openNotification = (notification) => {
    navigate("/profile#notifications");
    setIsOpen(false);
    setMissedNotifications([]);
  };

  const viewAllNotifications = () => {
    setMissedNotifications([]);
    setIsOpen(false);
    navigate("/profile#notifications");
  };

  return (
    <div className="fixed left-0 top-32 z-50">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative z-10 rounded-r-lg border border-l-0 border-[#15436b] bg-white px-3 py-4 text-[#15436b] shadow-lg hover:bg-[#eef6fc]"
        aria-label={isOpen ? "Close notifications" : "Open notifications"}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {missedNotifications.length > 0 && (
          <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
            {missedNotifications.length}
          </span>
        )}
      </button>

      <aside
        className={`absolute left-0 top-0 w-80 max-w-[calc(100vw-4rem)] rounded-r-lg border border-[#15436b] bg-white shadow-xl transition-transform duration-200 ${
          isOpen ? "translate-x-12" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <h2 className="font-semibold text-[#15436b]">Notifications</h2>
            <p className="text-xs text-gray-500">Since you logged in</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded px-2 py-1 text-xl leading-none text-gray-500 hover:bg-gray-100"
            aria-label="Collapse notifications"
          >
            &lt;
          </button>
        </div>

        {missedNotifications.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">No missed notifications yet.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto p-3">
            {missedNotifications.map((notification) => (
              <button
                type="button"
                key={notification._id}
                onClick={() => openNotification(notification)}
                className="mb-2 w-full rounded-lg border border-gray-200 bg-[#eef6fc] p-3 text-left hover:border-[#15436b]"
              >
                <p className="text-sm font-semibold text-gray-900">
                  {notification.title || "Glory Harbor"}
                </p>
                <p className="mt-1 text-sm text-gray-700">{notification.message}</p>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={viewAllNotifications}
          className="w-full border-t border-gray-100 px-4 py-3 text-left text-sm font-semibold text-[#15436b] hover:bg-gray-50"
        >
          View all notifications
        </button>
      </aside>
    </div>
  );
}
