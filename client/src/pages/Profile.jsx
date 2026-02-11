import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Profile() {
  const { user, token, logout, loading: authLoading, setUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "" });
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
    if (!user) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/users/${user.id}`, {
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

  const handleDelete = async () => {
    if (!user) return;
    const ok = window.confirm("Are you sure you want to delete your account? This cannot be undone.");
    if (!ok) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/users/${user.id}`, {
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
    <div className="min-h-screen bg-[#f7fff5] py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-4">My Profile</h1>

        {message && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{message}</div>}
        {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

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
