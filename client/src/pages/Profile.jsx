import { useState, useEffect, useRef, useCallback } from "react";
import Cropper from "react-easy-crop";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

async function getCroppedImageFile(imageSrc, cropAreaPixels) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = cropAreaPixels.width;
  canvas.height = cropAreaPixels.height;

  context.drawImage(
    image,
    cropAreaPixels.x,
    cropAreaPixels.y,
    cropAreaPixels.width,
    cropAreaPixels.height,
    0,
    0,
    cropAreaPixels.width,
    cropAreaPixels.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create cropped image."));
          return;
        }
        resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  });
}

export default function Profile() {
  const { user, token, logout, loading: authLoading, setUser } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id || user?._id;
  const avatarInputRef = useRef(null);

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;

    setNotificationsLoading(true);
    setNotificationsError("");

    try {
      const res = await fetch(`${API_URL}/notifications/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load notifications.");
      setNotifications(data.notifications || []);
    } catch (err) {
      setNotificationsError(err.message || "Could not load notifications.");
    } finally {
      setNotificationsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
    setError("");
    setMessage("");
  };

  const handlePasswordChangeInput = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    setError("");
    setMessage("");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");

      setMessage("Profile updated successfully.");
      // update local auth user if setUser exists
      if (setUser) setUser(data.user || { ...user, ...data.user });
    } catch (err) {
      console.error("Profile update error:", err);
      setError(err.message || "Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async () => {
    if (!userId || !avatarFile) {
      setError("Please select an image first.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("image", avatarFile);

      const res = await fetch(`${API_URL}/users/${userId}/avatar`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Avatar update failed");

      setMessage("Profile picture updated successfully.");
      setAvatarFile(null);
      setAvatarPreview("");
      setZoom(1);
      if (setUser) {
        setUser(data.user || { ...user, avatarUrl: data.user?.avatarUrl });
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      setError(err.message || "Error uploading profile picture");
    } finally {
      setLoading(false);
    }
  };

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleAvatarSelection = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError("");
    setMessage("");
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result?.toString() || "");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCroppedAvatar = async () => {
    if (!avatarPreview || !croppedAreaPixels) {
      setError("Please select and crop an image.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const croppedFile = await getCroppedImageFile(avatarPreview, croppedAreaPixels);
      setAvatarFile(croppedFile);
      await (async () => {
        if (!userId || !croppedFile) {
          setError("Please select an image first.");
          return;
        }

        const formData = new FormData();
        formData.append("image", croppedFile);

        const res = await fetch(`${API_URL}/users/${userId}/avatar`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Avatar update failed");

        setMessage("Profile picture updated successfully.");
        setAvatarFile(null);
        setAvatarPreview("");
        setZoom(1);
        if (avatarInputRef.current) {
          avatarInputRef.current.value = "";
        }
        if (setUser) {
          setUser(data.user || { ...user, avatarUrl: data.user?.avatarUrl });
        }
      })();
    } catch (err) {
      console.error("Avatar crop/upload error:", err);
      setError(err.message || "Error uploading profile picture");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!userId) return;
    const ok = window.confirm("Are you sure you want to delete your account? This cannot be undone.");
    if (!ok) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");

      // log out locally and redirect
      logout();
      navigate("/");
    } catch (err) {
      console.error("Delete account error:", err);
      setError(err.message || "Error deleting account");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!userId) return;

    setError("");
    setMessage("");

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError("Please complete all password fields.");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirm password must match.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/users/${userId}/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Password update failed");

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setMessage("Password updated successfully.");
    } catch (err) {
      console.error("Password update error:", err);
      setError(err.message || "Error updating password");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChangeResponse = async (action) => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/users/me/role-change`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Could not update role request.");
      }

      if (setUser) {
        setUser(data.user || user);
      }
      setMessage(data.message || (action === "accept" ? "New position accepted." : "Position declined."));
    } catch (err) {
      setError(err.message || "Could not update role request.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      const res = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Could not update notification.");
      }

      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === notificationId ? { ...notification, read: true } : notification
        )
      );
    } catch (err) {
      setNotificationsError(err.message || "Could not update notification.");
    }
  };

  const handleEnableBrowserNotifications = async () => {
    if (!("Notification" in window)) {
      setNotificationsError("This browser does not support push notifications.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setMessage("Push notifications enabled.");
      setNotificationsError("");
    } else {
      setNotificationsError("Push notifications were not enabled.");
    }
  };

  const formatNotificationDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  if (authLoading) return <div className="p-8">Checking authentication...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-8 bg-white rounded shadow text-center">
          <p className="mb-4">You are not logged in.</p>
          <button onClick={() => navigate("/login")} className="px-4 py-2 bg-[#15436b] text-white rounded">Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mx-auto max-w-6xl rounded-lg bg-white p-8 shadow">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">My Profile</h1>
          <Link
            to="/my-children"
            className="px-4 py-2 bg-[#15436b] text-white rounded text-sm font-medium hover:bg-[#1a5482] transition-colors"
          >
            My Children
          </Link>
        </div>

        {message && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{message}</div>}
        {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
        {user.pendingRole && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <h2 className="text-lg font-semibold text-yellow-900">New Position Request</h2>
            <p className="mt-2 text-sm text-yellow-800">
              An admin invited you to become a {user.pendingRole.replace("_", " ")}. Your current role will not change unless you accept.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleRoleChangeResponse("accept")}
                disabled={loading}
                className="rounded bg-[#15436b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Accept Position
              </button>
              <button
                type="button"
                onClick={() => handleRoleChangeResponse("decline")}
                disabled={loading}
                className="rounded border border-yellow-700 px-4 py-2 text-sm font-semibold text-yellow-800 disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        <div className="mb-6 p-4 border rounded-lg bg-white">
          <div className="flex flex-col items-center gap-4">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="Profile" className="w-36 h-36 rounded-full object-cover border" />
            ) : (
              <div className="w-36 h-36 rounded-full border bg-gray-100" />
            )}

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelection}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="px-4 py-2 bg-[#15436b] text-white rounded"
            >
              {!user.avatarUrl ? "Upload" : "Edit Picture"}
            </button>

            {avatarPreview && (
              <div className="w-full max-w-md">
                <div className="relative w-full h-64 bg-gray-900 rounded overflow-hidden">
                  <Cropper
                    image={avatarPreview}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </div>
                <div className="mt-3">
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveCroppedAvatar}
                  disabled={loading}
                  className="mt-3 px-4 py-2 bg-[#15436b] text-white rounded disabled:opacity-50"
                >
                  {loading ? "Uploading..." : "Save Picture"}
                </button>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
            <input name="firstName" value={form.firstName} onChange={handleChange} className="w-full px-4 py-2 border rounded" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
            <input name="lastName" value={form.lastName} onChange={handleChange} className="w-full px-4 py-2 border rounded" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full px-4 py-2 border rounded" />
          </div>

          <div className="flex gap-4">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-[#15436b] text-white rounded">
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" onClick={handleDelete} disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded">
              {loading ? "Deleting..." : "Delete Account"}
            </button>
          </div>
        </form>

        <div className="mt-8 border-t pt-8">
          <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
              <input
                type="password"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChangeInput}
                className="w-full px-4 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input
                type="password"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordChangeInput}
                className="w-full px-4 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChangeInput}
                className="w-full px-4 py-2 border rounded"
              />
            </div>

            <button type="submit" disabled={loading} className="px-4 py-2 bg-[#15436b] text-white rounded">
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
          </div>

          <aside id="notifications" className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                <p className="text-sm text-gray-500">Announcements and updates from church staff.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={fetchNotifications}
                  disabled={notificationsLoading}
                  className="rounded border border-[#15436b] px-3 py-1 text-sm font-semibold text-[#15436b] disabled:opacity-50"
                >
                  Refresh
                </button>
                {"Notification" in window && Notification.permission !== "granted" && (
                  <button
                    type="button"
                    onClick={handleEnableBrowserNotifications}
                    className="rounded bg-[#15436b] px-3 py-1 text-sm font-semibold text-white"
                  >
                    Enable Push
                  </button>
                )}
              </div>
            </div>

            {notificationsError && (
              <div className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{notificationsError}</div>
            )}

            {notificationsLoading ? (
              <p className="mt-4 text-sm text-gray-500">Loading notifications...</p>
            ) : notifications.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No notifications yet.</p>
            ) : (
              <div className="mt-4 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`rounded-lg border p-3 ${
                      notification.read ? "border-gray-200 bg-gray-50" : "border-[#15436b] bg-[#eef6fc]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {notification.title || "Announcement"}
                        </p>
                        <p className="mt-1 text-sm text-gray-700">{notification.message}</p>
                        <p className="mt-2 text-xs text-gray-500">
                          {formatNotificationDate(notification.timeSent || notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <button
                          type="button"
                          onClick={() => handleMarkNotificationRead(notification._id)}
                          className="rounded bg-[#15436b] px-3 py-1 text-xs font-semibold text-white"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
