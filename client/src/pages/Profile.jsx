import { useState, useEffect, useRef, useCallback } from "react";
import Cropper from "react-easy-crop";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

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
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
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
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-4">My Profile</h1>

        {message && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{message}</div>}
        {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

        <div className="mb-6 p-4 border rounded-lg bg-white">
          <div className="flex flex-col items-center gap-4">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="Profile" className="w-40 h-40 rounded-full object-cover border" />
            ) : (
              <div className="w-40 h-40 rounded-full border bg-gray-100" />
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
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveCroppedAvatar}
                    disabled={loading}
                    className="px-4 py-2 bg-[#15436b] text-white rounded disabled:opacity-50"
                  >
                    {loading ? "Uploading..." : "Save Picture"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarPreview("");
                      setAvatarFile(null);
                      setZoom(1);
                      if (avatarInputRef.current) {
                        avatarInputRef.current.value = "";
                      }
                    }}
                    disabled={loading}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
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
      </div>
    </div>
  );
}
