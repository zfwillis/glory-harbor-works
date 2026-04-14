import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { enterChildMode } from "../utils/childMode";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const emptyForm = { firstName: "", lastName: "", dateOfBirth: "", allergies: "", notes: "", otherParentEmail: "" };
const today = new Date().toISOString().slice(0, 10);

export default function MyChildren() {
  const { user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id || user?._id;

  const [children, setChildren] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // "list" | "create" | "view" | "edit"
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const clearAlerts = () => { setMessage(""); setError(""); };

  const isoToInputDate = (iso) => {
    if (!iso) return "";
    return iso.slice(0, 10);
  };

  const isPrimaryParent = (child) =>
    String(child.parent?._id || child.parent) === String(userId);

  // ── Fetch all children ────────────────────────────────────────────────────
  const fetchChildren = async () => {
    setLoading(true);
    clearAlerts();
    try {
      const res = await fetch(`${API_URL}/children`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load children.");
      setChildren(data.children || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch pending invitations ─────────────────────────────────────────────
  const fetchInvitations = async () => {
    try {
      const res = await fetch(`${API_URL}/children/invitations/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setInvitations(data.invitations || []);
    } catch {
      // silently ignore
    }
  };

  useEffect(() => {
    if (token) {
      fetchChildren();
      fetchInvitations();
    }
  }, [token]);

  // ── Form handlers ─────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    clearAlerts();
  };

  // Helper: call link/unlink depending on what the email field contains
  const syncOtherParent = async (childId, newEmail, currentSecondParent) => {
    const currentEmail = currentSecondParent?.email || "";
    const trimmed = newEmail.trim();

    if (trimmed === currentEmail) return; // no change

    if (currentEmail && !trimmed) {
      // unlink
      await fetch(`${API_URL}/children/${childId}/co-parent`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } else if (trimmed) {
      // link (replaces existing if different)
      const res = await fetch(`${API_URL}/children/${childId}/co-parent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Couldn't link other parent.");
    }
  };

  // ── M5 Create ─────────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }
    setLoading(true);
    clearAlerts();
    try {
      const res = await fetch(`${API_URL}/children`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          dateOfBirth: form.dateOfBirth || undefined,
          allergies: form.allergies.trim(),
          notes: form.notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create child profile.");

      if (form.otherParentEmail.trim()) {
        await syncOtherParent(data.child._id, form.otherParentEmail, null);
      }

      setMessage("Child profile created!");
      setForm(emptyForm);
      setView("list");
      await fetchChildren();
      await fetchInvitations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── M7 Update ─────────────────────────────────────────────────────────────
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }
    setLoading(true);
    clearAlerts();
    try {
      const res = await fetch(`${API_URL}/children/${selected._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          dateOfBirth: form.dateOfBirth || undefined,
          allergies: form.allergies.trim(),
          notes: form.notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update child profile.");

      if (isPrimaryParent(selected)) {
        await syncOtherParent(selected._id, form.otherParentEmail, selected.secondParent);
      }

      setMessage("Child profile updated!");
      setView("list");
      setSelected(null);
      await fetchChildren();
      await fetchInvitations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── M8 Delete ─────────────────────────────────────────────────────────────
  const handleDelete = async (child) => {
    if (!window.confirm(`Remove ${child.firstName} ${child.lastName} from your profile? This cannot be undone.`)) return;
    setLoading(true);
    clearAlerts();
    try {
      const res = await fetch(`${API_URL}/children/${child._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete child profile.");
      setMessage("Child profile removed.");
      await fetchChildren();
      await fetchInvitations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Accept / Decline invitation ───────────────────────────────────────────
  const handleInvitationResponse = async (childId, action) => {
    setLoading(true);
    clearAlerts();
    try {
      const res = await fetch(`${API_URL}/children/${childId}/co-parent/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to ${action} invitation.`);
      setMessage(data.message);
      await fetchChildren();
      await fetchInvitations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Navigation helpers ────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(emptyForm);
    clearAlerts();
    setView("create");
  };

  const openView = (child) => {
    setSelected(child);
    clearAlerts();
    setView("view");
  };

  const openEdit = (child) => {
    setSelected(child);
    setForm({
      firstName: child.firstName || "",
      lastName: child.lastName || "",
      dateOfBirth: isoToInputDate(child.dateOfBirth),
      allergies: child.allergies || "",
      notes: child.notes || "",
      otherParentEmail: child.secondParent?.email || "",
    });
    clearAlerts();
    setView("edit");
  };

  const startChildMode = (child) => {
    enterChildMode(child._id);
    navigate(`/child-mode/${child._id}`);
  };

  const backToList = () => {
    setView("list");
    setSelected(null);
    setForm(emptyForm);
    clearAlerts();
  };

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (authLoading) return <div className="p-8">Checking authentication...</div>;
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-8 bg-white rounded shadow text-center">
          <p className="mb-4">You must be logged in to manage children profiles.</p>
          <button onClick={() => navigate("/login")} className="px-4 py-2 bg-[#15436b] text-white rounded">
            Login
          </button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Children</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your children's church profiles</p>
          </div>
          {view === "list" && (
            <button onClick={openCreate} className="px-4 py-2 bg-[#15436b] text-white rounded text-sm">
              + Add Child
            </button>
          )}
          {view !== "list" && (
            <button onClick={backToList} className="px-4 py-2 border rounded text-sm text-gray-700">
              ← Back
            </button>
          )}
        </div>

        {/* Alerts */}
        {message && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{message}</div>}
        {error   && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

        {/* ── LIST VIEW ── */}
        {view === "list" && (
          <>
            {/* Pending invitations for this user */}
            {invitations.length > 0 && (
              <div className="mb-6">
                <h2 className="text-base font-semibold text-gray-700 mb-2">Pending Invitations</h2>
                <ul className="space-y-2">
                  {invitations.map((inv) => (
                    <li key={inv._id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">
                          {inv.firstName} {inv.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          Invited by {inv.parent?.firstName} {inv.parent?.lastName} ({inv.parent?.email})
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleInvitationResponse(inv._id, "accept")}
                          disabled={loading}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleInvitationResponse(inv._id, "decline")}
                          disabled={loading}
                          className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {loading && <p className="text-gray-500">Loading...</p>}
            {!loading && children.length === 0 && invitations.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No children added yet. Click <strong>+ Add Child</strong> to get started.
              </p>
            )}
            {!loading && children.length === 0 && invitations.length > 0 && (
              <p className="text-gray-500 text-center py-4">
                No children on your profile yet. Accept an invitation or click <strong>+ Add Child</strong>.
              </p>
            )}
            <ul className="space-y-3">
              {children.map((child) => (
                <li key={child._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">
                      {child.firstName} {child.lastName}
                    </p>
                    {child.dateOfBirth && (
                      <p className="text-sm text-gray-500">
                        DOB: {new Date(child.dateOfBirth).toLocaleDateString()}
                      </p>
                    )}
                    {child.secondParent && child.secondParentStatus === "accepted" && (
                      <p className="text-xs text-blue-600 mt-0.5">
                        Other parent: {child.secondParent.firstName} {child.secondParent.lastName}
                      </p>
                    )}
                    {child.secondParent && child.secondParentStatus === "pending" && isPrimaryParent(child) && (
                      <p className="text-xs text-yellow-600 mt-0.5">
                        Invitation sent to {child.secondParent.email}. Acceptance pending.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startChildMode(child)}
                      className="px-3 py-1 text-sm border rounded text-green-700 hover:bg-green-50"
                    >
                      Child Mode
                    </button>
                    <button
                      onClick={() => openView(child)}
                      className="px-3 py-1 text-sm border rounded text-[#15436b] hover:bg-gray-50"
                    >
                      View
                    </button>
                    <button
                      onClick={() => openEdit(child)}
                      className="px-3 py-1 text-sm border rounded text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    {isPrimaryParent(child) && (
                      <button
                        onClick={() => handleDelete(child)}
                        disabled={loading}
                        className="px-3 py-1 text-sm border rounded text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* ── CREATE VIEW (M5) ── */}
        {view === "create" && (
          <>
            <h2 className="text-xl font-semibold mb-4">Add Child</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First name *</label>
                  <input name="firstName" value={form.firstName} onChange={handleChange} className="w-full px-4 py-2 border rounded" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last name *</label>
                  <input name="lastName" value={form.lastName} onChange={handleChange} className="w-full px-4 py-2 border rounded" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label>
                <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} max={today} className="w-full px-4 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                <input name="allergies" value={form.allergies} onChange={handleChange} placeholder="e.g. peanuts, dairy" className="w-full px-4 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="Any additional notes for children's church staff..." className="w-full px-4 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Other parent's email</label>
                <input type="email" name="otherParentEmail" value={form.otherParentEmail} onChange={handleChange} placeholder="Leave blank if not applicable" className="w-full px-4 py-2 border rounded" />
                <p className="text-xs text-gray-400 mt-1">The other parent must already have an account. An invitation will be sent for them to accept before they can access this profile.</p>
              </div>
              <div className="flex gap-4">
                <button type="submit" disabled={loading} className="px-4 py-2 bg-[#15436b] text-white rounded disabled:opacity-50">
                  {loading ? "Saving..." : "Create Profile"}
                </button>
                <button type="button" onClick={backToList} className="px-4 py-2 border rounded text-gray-700">Cancel</button>
              </div>
            </form>
          </>
        )}

        {/* ── VIEW DETAIL (M6) ── */}
        {view === "view" && selected && (
          <>
            <h2 className="text-xl font-semibold mb-4">
              {selected.firstName} {selected.lastName}
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex gap-2">
                <dt className="font-medium text-gray-600 w-36">Date of birth</dt>
                <dd>{selected.dateOfBirth ? new Date(selected.dateOfBirth).toLocaleDateString() : "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium text-gray-600 w-36">Allergies</dt>
                <dd>{selected.allergies || "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium text-gray-600 w-36">Notes</dt>
                <dd className="whitespace-pre-wrap">{selected.notes || "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium text-gray-600 w-36">Parent</dt>
                <dd>
                  {selected.parent
                    ? `${selected.parent.firstName} ${selected.parent.lastName} (${selected.parent.email})`
                    : "—"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium text-gray-600 w-36">Other parent</dt>
                <dd>
                  {selected.secondParent
                    ? <>
                        {selected.secondParent.firstName} {selected.secondParent.lastName} ({selected.secondParent.email})
                        {selected.secondParentStatus === "pending" && (
                          <span className="ml-2 inline-block text-xs text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">awaiting acceptance</span>
                        )}
                      </>
                    : "—"}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex gap-3">
              <button onClick={() => startChildMode(selected)} className="px-4 py-2 border rounded text-green-700 text-sm">
                Start Child Mode
              </button>
              <button onClick={() => openEdit(selected)} className="px-4 py-2 bg-[#15436b] text-white rounded text-sm">
                Edit
              </button>
              {isPrimaryParent(selected) && (
                <button
                  onClick={() => handleDelete(selected)}
                  className="px-4 py-2 border rounded text-red-600 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
          </>
        )}

        {/* ── EDIT VIEW (M7) ── */}
        {view === "edit" && selected && (
          <>
            <h2 className="text-xl font-semibold mb-4">
              Edit — {selected.firstName} {selected.lastName}
            </h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First name *</label>
                  <input name="firstName" value={form.firstName} onChange={handleChange} className="w-full px-4 py-2 border rounded" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last name *</label>
                  <input name="lastName" value={form.lastName} onChange={handleChange} className="w-full px-4 py-2 border rounded" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label>
                <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} max={today} className="w-full px-4 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                <input name="allergies" value={form.allergies} onChange={handleChange} placeholder="e.g. peanuts, dairy" className="w-full px-4 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="Any additional notes for children's church staff..." className="w-full px-4 py-2 border rounded" />
              </div>
              {isPrimaryParent(selected) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other parent's email</label>
                  {selected.secondParent && selected.secondParentStatus === "pending" && (
                    <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                      Invitation sent to <strong>{selected.secondParent.email}</strong> — awaiting their acceptance.
                      Clear this field and save to revoke the invitation.
                    </div>
                  )}
                  <input type="email" name="otherParentEmail" value={form.otherParentEmail} onChange={handleChange} placeholder="Leave blank to remove" className="w-full px-4 py-2 border rounded" />
                  <p className="text-xs text-gray-400 mt-1">Clear this field and save to remove the other parent.</p>
                </div>
              )}
              <div className="flex gap-4">
                <button type="submit" disabled={loading} className="px-4 py-2 bg-[#15436b] text-white rounded disabled:opacity-50">
                  {loading ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" onClick={backToList} className="px-4 py-2 border rounded text-gray-700">Cancel</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
