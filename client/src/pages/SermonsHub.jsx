import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const formatDate = (dateValue) => {
  if (!dateValue) {
    return "Recent";
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "Recent";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const toEmbedUrl = (url) => {
  if (!url) {
    return "";
  }

  if (url.includes("youtube.com/watch?v=")) {
    const videoId = url.split("v=")[1]?.split("&")[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1]?.split("?")[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  return url;
};

const isSoundCloudUrl = (url) => {
  if (!url) {
    return false;
  }

  return /soundcloud\.com|snd\.sc/i.test(url);
};

const toSoundCloudEmbedUrl = (url) => {
  if (!isSoundCloudUrl(url)) {
    return "";
  }

  let normalizedUrl = url;
  try {
    const parsed = new URL(url);
    normalizedUrl = `${parsed.origin}${parsed.pathname}`;
  } catch (error) {
    normalizedUrl = url.split("?")[0];
  }

  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(normalizedUrl)}&color=%2315436b&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false`;
};

const SermonsHub = () => {
  const { token, isAuthenticated, user } = useAuth();
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [likeBusyById, setLikeBusyById] = useState({});
  const [uploading, setUploading] = useState(false);
  const [deletingById, setDeletingById] = useState({});
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [editingSermonId, setEditingSermonId] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [removeExistingThumbnail, setRemoveExistingThumbnail] = useState(false);
  const [showManagePanel, setShowManagePanel] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    speaker: "",
    topic: "",
    series: "",
    description: "",
    type: "video",
    url: "",
    thumbnailUrl: "",
  });
  const [filters, setFilters] = useState({
    speaker: "",
    topic: "",
    series: "",
    mediaType: "all",
  });
  const canUploadSermons = user?.role === "leader" || user?.role === "pastor";

  const resetUploadForm = () => {
    setUploadForm({
      title: "",
      speaker: "",
      topic: "",
      series: "",
      description: "",
      type: "video",
      url: "",
      thumbnailUrl: "",
    });
    setThumbnailFile(null);
    setRemoveExistingThumbnail(false);
    setEditingSermonId(null);
  };

  const loadSermons = async (activeFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (activeFilters.speaker.trim()) {
        params.set("speaker", activeFilters.speaker.trim());
      }
      if (activeFilters.topic.trim()) {
        params.set("topic", activeFilters.topic.trim());
      }
      if (activeFilters.series.trim()) {
        params.set("series", activeFilters.series.trim());
      }
      if (activeFilters.mediaType && activeFilters.mediaType !== "all") {
        params.set("type", activeFilters.mediaType);
      }

      const queryString = params.toString();
      const endpoint = queryString ? `${API_URL}/sermons?${queryString}` : `${API_URL}/sermons`;
      const response = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load sermons");
      }

      setSermons(Array.isArray(data.sermons) ? data.sermons : []);
    } catch (err) {
      setError(err.message || "Failed to fetch sermons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSermons({
      speaker: "",
      topic: "",
      series: "",
      mediaType: "all",
    });
  }, []);

  const streamItems = useMemo(
    () =>
      sermons.map((sermon, index) => ({
        ...sermon,
        align: index % 2 === 0 ? "left" : "right",
        embedUrl: sermon.type === "video" ? toEmbedUrl(sermon.url) : sermon.url,
        isSoundCloud: isSoundCloudUrl(sermon.url),
        soundCloudEmbedUrl: toSoundCloudEmbedUrl(sermon.url),
      })),
    [sermons]
  );

  const handleFilterChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    await loadSermons(filters);
  };

  const clearFilters = async () => {
    const cleared = { speaker: "", topic: "", series: "", mediaType: "all" };
    setFilters(cleared);
    await loadSermons(cleared);
  };

  const handleUploadChange = (e) => {
    const { name, value } = e.target;

    setUploadForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "url" && isSoundCloudUrl(value) ? { type: "audio" } : {}),
    }));
    setUploadError("");
    setUploadSuccess("");
  };

  const handleThumbnailFileChange = (e) => {
    setThumbnailFile(e.target.files?.[0] || null);
    if (e.target.files?.[0]) {
      setRemoveExistingThumbnail(false);
    }
    setUploadError("");
    setUploadSuccess("");
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();

    if (!canUploadSermons) {
      setUploadError("Only leaders and pastors can upload sermons.");
      return;
    }

    if (!token) {
      setUploadError("Please log in to upload sermons.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const isEditing = Boolean(editingSermonId);
      const endpoint = isEditing ? `${API_URL}/sermons/${editingSermonId}` : `${API_URL}/sermons`;
      const method = isEditing ? "PATCH" : "POST";

      const formData = new FormData();
      formData.append("title", uploadForm.title);
      formData.append("speaker", uploadForm.speaker);
      formData.append("topic", uploadForm.topic || "");
      formData.append("series", uploadForm.series || "");
      formData.append("description", uploadForm.description || "");
      formData.append("type", uploadForm.type);
      formData.append("url", uploadForm.url);
      formData.append("thumbnailUrl", uploadForm.thumbnailUrl || "");
      formData.append("removeThumbnail", removeExistingThumbnail ? "true" : "false");
      if (thumbnailFile) {
        formData.append("image", thumbnailFile);
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not upload sermon");
      }

      setUploadSuccess(isEditing ? "Sermon updated successfully." : "Sermon uploaded successfully.");
      resetUploadForm();
      await loadSermons(filters);
    } catch (err) {
      setUploadError(err.message || "Failed to save sermon");
    } finally {
      setUploading(false);
    }
  };

  const startEditSermon = (sermon) => {
    if (!sermon?._id) {
      return;
    }

    setEditingSermonId(sermon._id);
    setUploadForm({
      title: sermon.title || "",
      speaker: sermon.speaker || "",
      topic: sermon.topic || "",
      series: sermon.series || "",
      description: sermon.description || "",
      type: sermon.type || "video",
      url: sermon.url || "",
      thumbnailUrl: sermon.thumbnailUrl || "",
    });
    setThumbnailFile(null);
    setRemoveExistingThumbnail(false);
    setUploadError("");
    setUploadSuccess("");
    setShowManagePanel(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditSermon = () => {
    resetUploadForm();
    setUploadError("");
    setUploadSuccess("");
  };

  const openManagePanel = () => {
    setShowManagePanel(true);
    setUploadError("");
    setUploadSuccess("");
  };

  const closeManagePanel = () => {
    setShowManagePanel(false);
    cancelEditSermon();
  };

  const deleteSermon = async (sermonId) => {
    if (!sermonId || !token || !canUploadSermons) {
      return;
    }

    const confirmed = window.confirm("Delete this sermon? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    setDeletingById((prev) => ({ ...prev, [sermonId]: true }));
    setUploadError("");
    setUploadSuccess("");

    try {
      const response = await fetch(`${API_URL}/sermons/${sermonId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not delete sermon");
      }

      if (editingSermonId === sermonId) {
        resetUploadForm();
      }

      setUploadSuccess("Sermon deleted successfully.");
      await loadSermons(filters);
    } catch (err) {
      setUploadError(err.message || "Failed to delete sermon");
    } finally {
      setDeletingById((prev) => ({ ...prev, [sermonId]: false }));
    }
  };

  const likeSermon = async (sermonId) => {
    if (!sermonId) {
      return;
    }

    if (!isAuthenticated || !token) {
      setError("Please log in to like a sermon.");
      return;
    }

    setLikeBusyById((prev) => ({ ...prev, [sermonId]: true }));
    setError("");
    try {
      const response = await fetch(`${API_URL}/sermons/${sermonId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not like sermon");
      }

      setSermons((prev) =>
        prev.map((sermon) =>
          sermon._id === sermonId
            ? { ...sermon, likesCount: data.sermon?.likesCount ?? sermon.likesCount, liked: true }
            : sermon
        )
      );
    } catch (err) {
      setError(err.message || "Failed to like sermon");
    } finally {
      setLikeBusyById((prev) => ({ ...prev, [sermonId]: false }));
    }
  };

  const unlikeSermon = async (sermonId) => {
    if (!sermonId) {
      return;
    }

    if (!isAuthenticated || !token) {
      setError("Please log in to unlike a sermon.");
      return;
    }

    setLikeBusyById((prev) => ({ ...prev, [sermonId]: true }));
    setError("");
    try {
      const response = await fetch(`${API_URL}/sermons/${sermonId}/like`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not unlike sermon");
      }

      setSermons((prev) =>
        prev.map((sermon) =>
          sermon._id === sermonId
            ? { ...sermon, likesCount: data.sermon?.likesCount ?? sermon.likesCount, liked: false }
            : sermon
        )
      );
    } catch (err) {
      setError(err.message || "Failed to unlike sermon");
    } finally {
      setLikeBusyById((prev) => ({ ...prev, [sermonId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-[#f7fff5] px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#15436b]">Sermons Hub</h1>
          <p className="text-gray-600 mt-2">Stream recent messages in a conversation-style feed.</p>
        </div>

        {canUploadSermons && (
          <div className="mb-6">
            {!showManagePanel ? (
              <button
                type="button"
                onClick={openManagePanel}
                className="bg-[#15436b] text-white px-4 py-2 rounded-lg hover:bg-[#0f3454] transition"
              >
                Manage Sermons
              </button>
            ) : (
              <form onSubmit={handleUploadSubmit} className="bg-white border border-[#d9e6df] rounded-2xl p-4">
            <h2 className="text-xl font-semibold text-[#15436b] mb-3">
              {editingSermonId ? "Edit Sermon" : "Upload Sermon (URL)"}
            </h2>

            {uploadError && (
              <div className="mb-3 bg-red-100 text-red-700 border border-red-300 rounded-lg p-3 text-sm">
                {uploadError}
              </div>
            )}
            {uploadSuccess && (
              <div className="mb-3 bg-green-100 text-green-700 border border-green-300 rounded-lg p-3 text-sm">
                {uploadSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                name="title"
                value={uploadForm.title}
                onChange={handleUploadChange}
                placeholder="Sermon title"
                required
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
              />
              <input
                name="speaker"
                value={uploadForm.speaker}
                onChange={handleUploadChange}
                placeholder="Speaker"
                required
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
              />
              <select
                name="type"
                value={uploadForm.type}
                onChange={handleUploadChange}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
              >
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
              <input
                name="url"
                value={uploadForm.url}
                onChange={handleUploadChange}
                placeholder="Media URL (YouTube/audio link)"
                required
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
              />
              <input
                name="topic"
                value={uploadForm.topic}
                onChange={handleUploadChange}
                placeholder="Topic (optional)"
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
              />
              <input
                name="series"
                value={uploadForm.series}
                onChange={handleUploadChange}
                placeholder="Series (optional)"
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
              />
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image File (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailFileChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
                />
                {thumbnailFile && (
                  <p className="text-xs text-gray-500 mt-1">Selected: {thumbnailFile.name}</p>
                )}
                {editingSermonId && uploadForm.thumbnailUrl && !thumbnailFile && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setRemoveExistingThumbnail((prev) => !prev)}
                      className={`text-sm px-3 py-1.5 rounded-lg border transition ${
                        removeExistingThumbnail
                          ? "border-red-500 text-red-600 bg-red-50"
                          : "border-gray-300 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {removeExistingThumbnail ? "Undo Remove Image" : "Remove Current Image"}
                    </button>
                    {removeExistingThumbnail && (
                      <p className="text-xs text-red-600 mt-1">Current image will be removed when you save changes.</p>
                    )}
                  </div>
                )}
              </div>
              <textarea
                name="description"
                value={uploadForm.description}
                onChange={handleUploadChange}
                rows={3}
                placeholder="Description (optional)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
              />
            </div>

            <div className="mt-3">
              <button
                type="submit"
                disabled={uploading}
                className="bg-[#15436b] text-white px-4 py-2 rounded-lg hover:bg-[#0f3454] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {uploading ? (editingSermonId ? "Saving..." : "Uploading...") : editingSermonId ? "Save Changes" : "Upload Sermon"}
              </button>
              {editingSermonId && (
                <button
                  type="button"
                  onClick={cancelEditSermon}
                  className="ml-3 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="button"
                onClick={closeManagePanel}
                className="ml-3 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Close
              </button>
            </div>
              </form>
            )}
          </div>
        )}

        <form onSubmit={handleSearch} className="mb-6 bg-white border border-[#d9e6df] rounded-2xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              name="speaker"
              value={filters.speaker}
              onChange={handleFilterChange}
              placeholder="Search by speaker"
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
            />
            <input
              name="topic"
              value={filters.topic}
              onChange={handleFilterChange}
              placeholder="Search by topic"
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
            />
            <input
              name="series"
              value={filters.series}
              onChange={handleFilterChange}
              placeholder="Search by series"
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
            />
            <select
              name="mediaType"
              value={filters.mediaType}
              onChange={handleFilterChange}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
            >
              <option value="all">All Media</option>
              <option value="video">Video Only</option>
              <option value="audio">Audio Only</option>
            </select>
          </div>
          <div className="mt-3 flex gap-3">
            <button
              type="submit"
              className="bg-[#15436b] text-white px-4 py-2 rounded-lg hover:bg-[#0f3454] transition"
            >
              Search
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Clear
            </button>
          </div>
        </form>

        {loading && <p className="text-gray-600">Loading sermons...</p>}
        {!loading && error && (
          <div className="bg-red-100 text-red-700 border border-red-300 rounded-lg p-4">{error}</div>
        )}
        {!loading && !error && streamItems.length === 0 && (
          <div className="bg-white border border-[#d9e6df] rounded-xl p-4 text-gray-600">
            No sermons matched your search. Try another speaker, topic, or series.
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-6">
            {streamItems.map((sermon, idx) => (
              <div
                key={sermon._id || `${sermon.title}-${idx}`}
                className={`flex ${sermon.align === "left" ? "justify-start" : "justify-end"}`}
              >
                <div className="w-full md:w-[85%] bg-white border border-[#d9e6df] rounded-2xl shadow-sm p-4">
                  <div className="mb-3">
                    <p className="text-sm text-[#15436b] font-semibold">{sermon.speaker}</p>
                    <h2 className="text-xl font-bold text-gray-900">{sermon.title}</h2>
                    <p className="text-sm text-gray-500">
                      {formatDate(sermon.publishedAt)}
                      {sermon.series ? ` | ${sermon.series}` : ""}
                      {sermon.topic ? ` | ${sermon.topic}` : ""}
                    </p>
                  </div>

                  {sermon.isSoundCloud ? (
                    <div className="rounded-xl overflow-hidden border border-gray-200 bg-[#f3f7f5]">
                      <iframe
                        title={`SoundCloud player - ${sermon.title}`}
                        width="100%"
                        height="166"
                        scrolling="no"
                        frameBorder="no"
                        allow="autoplay"
                        src={sermon.soundCloudEmbedUrl}
                      />
                    </div>
                  ) : sermon.type === "video" ? (
                    <div className="aspect-video overflow-hidden rounded-xl border border-gray-200">
                      <iframe
                        src={sermon.embedUrl}
                        title={sermon.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="bg-[#f3f7f5] rounded-xl p-3 border border-gray-200">
                      <audio controls className="w-full">
                        <source src={sermon.url} />
                        Your browser does not support audio playback.
                      </audio>
                    </div>
                  )}

                  {sermon.thumbnailUrl && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 bg-[#f3f7f5]">
                      <img src={sermon.thumbnailUrl} alt={sermon.title} className="w-full max-h-96 object-contain" />
                    </div>
                  )}

                  {sermon.description && (
                    <p className="text-gray-700 text-sm mt-3">{sermon.description}</p>
                  )}

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={!sermon._id || likeBusyById[sermon._id]}
                      onClick={() => (sermon.liked ? unlikeSermon(sermon._id) : likeSermon(sermon._id))}
                      className="px-3 py-1.5 rounded-lg border border-[#15436b] text-[#15436b] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#15436b] hover:text-white transition"
                    >
                      {likeBusyById[sermon._id]
                        ? sermon.liked
                          ? "Unliking..."
                          : "Liking..."
                        : sermon.liked
                        ? "Unlike"
                        : "Like"}
                    </button>
                    <span className="text-sm text-gray-600">
                      {(sermon.likesCount || 0)} {(sermon.likesCount || 0) === 1 ? "like" : "likes"}
                    </span>
                    {canUploadSermons && showManagePanel && sermon._id && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditSermon(sermon)}
                          className="px-3 py-1.5 rounded-lg border border-gray-400 text-gray-700 hover:bg-gray-100 transition"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingById[sermon._id]}
                          onClick={() => deleteSermon(sermon._id)}
                          className="px-3 py-1.5 rounded-lg border border-red-500 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          {deletingById[sermon._id] ? "Deleting..." : "Delete"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SermonsHub;
