import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const SUPPORTED_VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/ogg"]);
const SUPPORTED_VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".ogv", ".ogg"]);
const MEDIA_FILE_ACCEPT = "video/mp4,video/webm,video/ogg,audio/*";

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

const isIframeVideoEmbedUrl = (url) => {
  if (!url) {
    return false;
  }

  return /youtube\.com\/embed|player\.vimeo\.com\/video/i.test(url);
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

const getFileExtensionFromUrl = (url) => {
  if (!url || typeof url !== "string") {
    return "";
  }

  const withoutQuery = url.split("?")[0];
  const match = withoutQuery.match(/(\.[a-z0-9]+)$/i);
  return (match?.[1] || "").toLowerCase();
};

const isSupportedBrowserVideoFile = (file) => {
  if (!file) {
    return false;
  }

  const mime = (file.type || "").toLowerCase();
  const ext = (file.name.match(/(\.[a-z0-9]+)$/i)?.[1] || "").toLowerCase();

  if (SUPPORTED_VIDEO_MIME_TYPES.has(mime)) {
    return true;
  }

  if (!mime || mime === "application/octet-stream") {
    return SUPPORTED_VIDEO_EXTENSIONS.has(ext);
  }

  return false;
};

const SermonsHub = () => {
  const { token, isAuthenticated, user } = useAuth();
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [likeBusyById, setLikeBusyById] = useState({});
  const [commentInputsById, setCommentInputsById] = useState({});
  const [commentBusyById, setCommentBusyById] = useState({});
  const [commentDeleteBusyById, setCommentDeleteBusyById] = useState({});
  const [editingCommentById, setEditingCommentById] = useState({});
  const [commentEditInputsById, setCommentEditInputsById] = useState({});
  const [commentUpdateBusyById, setCommentUpdateBusyById] = useState({});
  const [uploading, setUploading] = useState(false);
  const [deletingById, setDeletingById] = useState({});
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [editingSermonId, setEditingSermonId] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [removeExistingThumbnail, setRemoveExistingThumbnail] = useState(false);
  const [showManagePanel, setShowManagePanel] = useState(false);
  const [videoPlaybackErrorsById, setVideoPlaybackErrorsById] = useState({});
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
    title: "",
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
    setMediaFile(null);
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
      if (activeFilters.title.trim()) {
        params.set("q", activeFilters.title.trim());
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
      title: "",
      mediaType: "all",
    });
  }, []);

  useEffect(() => {
    setVideoPlaybackErrorsById({});
  }, [sermons]);

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
    const cleared = { speaker: "", topic: "", title: "", mediaType: "all" };
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

  const handleMediaFileChange = (e) => {
    const file = e.target.files?.[0] || null;

    if (file?.type?.startsWith("video/") && !isSupportedBrowserVideoFile(file)) {
      setMediaFile(null);
      e.target.value = "";
      setUploadError("This video format is not supported for in-browser playback. Please upload MP4, WebM, or Ogg video.");
      setUploadSuccess("");
      return;
    }

    setMediaFile(file);

    if (file?.type?.startsWith("audio/")) {
      setUploadForm((prev) => ({ ...prev, type: "audio" }));
    } else if (file?.type?.startsWith("video/")) {
      setUploadForm((prev) => ({ ...prev, type: "video" }));
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
      formData.append("url", uploadForm.url || "");
      formData.append("thumbnailUrl", uploadForm.thumbnailUrl || "");
      formData.append("removeThumbnail", removeExistingThumbnail ? "true" : "false");
      if (thumbnailFile) {
        formData.append("image", thumbnailFile);
      }
      if (mediaFile) {
        formData.append("media", mediaFile);
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
    setMediaFile(null);
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

  const handleCommentInputChange = (sermonId, value) => {
    setCommentInputsById((prev) => ({ ...prev, [sermonId]: value }));
  };

  const addComment = async (sermonId) => {
    const text = commentInputsById[sermonId]?.trim();
    if (!text) {
      return;
    }

    if (!isAuthenticated || !token) {
      setError("Please log in to comment.");
      return;
    }

    setCommentBusyById((prev) => ({ ...prev, [sermonId]: true }));
    setError("");

    try {
      const response = await fetch(`${API_URL}/sermons/${sermonId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not add comment");
      }

      setSermons((prev) =>
        prev.map((sermon) =>
          sermon._id === sermonId
            ? { ...sermon, comments: [...(sermon.comments || []), data.comment] }
            : sermon
        )
      );
      setCommentInputsById((prev) => ({ ...prev, [sermonId]: "" }));
    } catch (err) {
      setError(err.message || "Failed to add comment");
    } finally {
      setCommentBusyById((prev) => ({ ...prev, [sermonId]: false }));
    }
  };

  const startEditingComment = (commentId, currentText) => {
    setEditingCommentById((prev) => ({ ...prev, [commentId]: true }));
    setCommentEditInputsById((prev) => ({ ...prev, [commentId]: currentText || "" }));
    setError("");
  };

  const cancelEditingComment = (commentId) => {
    setEditingCommentById((prev) => ({ ...prev, [commentId]: false }));
    setCommentEditInputsById((prev) => ({ ...prev, [commentId]: "" }));
  };

  const updateComment = async (sermonId, commentId) => {
    const text = commentEditInputsById[commentId]?.trim();
    if (!text) {
      setError("Comment text is required.");
      return;
    }

    if (!isAuthenticated || !token) {
      setError("Please log in to edit comments.");
      return;
    }

    setCommentUpdateBusyById((prev) => ({ ...prev, [commentId]: true }));
    setError("");

    try {
      const response = await fetch(`${API_URL}/sermons/${sermonId}/comments/${commentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update comment");
      }

      setSermons((prev) =>
        prev.map((sermon) =>
          sermon._id === sermonId
            ? {
                ...sermon,
                comments: (sermon.comments || []).map((comment) =>
                  comment._id === commentId ? { ...comment, ...data.comment } : comment
                ),
              }
            : sermon
        )
      );
      cancelEditingComment(commentId);
    } catch (err) {
      setError(err.message || "Failed to update comment");
    } finally {
      setCommentUpdateBusyById((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const deleteComment = async (sermonId, commentId) => {
    if (!isAuthenticated || !token) {
      setError("Please log in to delete comments.");
      return;
    }

    setCommentDeleteBusyById((prev) => ({ ...prev, [commentId]: true }));
    setError("");

    try {
      const response = await fetch(`${API_URL}/sermons/${sermonId}/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not delete comment");
      }

      setSermons((prev) =>
        prev.map((sermon) =>
          sermon._id === sermonId
            ? {
                ...sermon,
                comments: (sermon.comments || []).filter((comment) => comment._id !== commentId),
              }
            : sermon
        )
      );
    } catch (err) {
      setError(err.message || "Failed to delete comment");
    } finally {
      setCommentDeleteBusyById((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-white px-4 py-10">
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
              {editingSermonId ? "Edit Sermon" : "Upload Sermon"}
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
                placeholder="Media URL (optional if uploading a file)"
                required={!mediaFile}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Media File (video/audio, optional)</label>
                <input
                  type="file"
                  accept={MEDIA_FILE_ACCEPT}
                  onChange={handleMediaFileChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#15436b]"
                />
                {mediaFile && (
                  <p className="text-xs text-gray-500 mt-1">Selected media: {mediaFile.name}</p>
                )}
              </div>
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
              name="title"
              value={filters.title}
              onChange={handleFilterChange}
              placeholder="Search by title"
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
            No sermons matched your search. Try another speaker, topic, or title.
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
                    isIframeVideoEmbedUrl(sermon.embedUrl) ? (
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
                        <video
                          controls
                          preload="metadata"
                          className="w-full rounded-lg"
                          onError={() =>
                            setVideoPlaybackErrorsById((prev) => ({
                              ...prev,
                              [sermon._id || `${sermon.title}-${idx}`]: true,
                            }))
                          }
                        >
                          <source src={sermon.url} />
                          Your browser does not support video playback.
                        </video>
                        {videoPlaybackErrorsById[sermon._id || `${sermon.title}-${idx}`] && (
                          <p className="mt-2 text-sm text-amber-700">
                            This video could not be decoded in your browser. Use MP4/WebM/Ogg for uploads, or{" "}
                            <a
                              href={sermon.url}
                              target="_blank"
                              rel="noreferrer"
                              className="underline font-medium"
                              download
                            >
                              download the file
                            </a>
                            {getFileExtensionFromUrl(sermon.url)
                              ? ` (${getFileExtensionFromUrl(sermon.url)})`
                              : ""}{" "}
                            to watch locally.
                          </p>
                        )}
                      </div>
                    )
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

                  <div className="mt-4 border-t pt-3">
                    <h3 className="text-sm font-semibold text-[#15436b] mb-2">Comments</h3>

                    <div className="space-y-2 mb-3">
                      {(sermon.comments || []).length === 0 && (
                        <p className="text-sm text-gray-500">No comments yet.</p>
                      )}
                      {(sermon.comments || []).map((comment) => {
                        const isOwner = comment.userId?.toString?.() === (user?.id || user?._id);
                        const canEditComment =
                          user?.role === "leader" || user?.role === "pastor" || isOwner;
                        const canDeleteComment =
                          user?.role === "leader" ||
                          user?.role === "pastor" ||
                          isOwner;

                        return (
                          <div key={comment._id} className="bg-[#f3f7f5] border border-gray-200 rounded-lg p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2">
                                {comment.avatarUrl ? (
                                  <img
                                    src={comment.avatarUrl}
                                    alt={`${comment.firstName} ${comment.lastName}`}
                                    className="w-8 h-8 rounded-full object-cover border"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center text-[10px] text-gray-600">
                                    {(comment.firstName?.[0] || "")}
                                    {(comment.lastName?.[0] || "")}
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs font-semibold text-gray-700">
                                    {comment.firstName} {comment.lastName}
                                  </p>
                                  {editingCommentById[comment._id] ? (
                                    <div className="mt-1 space-y-2">
                                      <input
                                        type="text"
                                        value={commentEditInputsById[comment._id] || ""}
                                        onChange={(e) =>
                                          setCommentEditInputsById((prev) => ({
                                            ...prev,
                                            [comment._id]: e.target.value,
                                          }))
                                        }
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15436b]"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => updateComment(sermon._id, comment._id)}
                                          disabled={commentUpdateBusyById[comment._id]}
                                          className="text-xs px-2 py-1 rounded border border-[#15436b] text-[#15436b] hover:bg-[#eaf3fb] disabled:opacity-50"
                                        >
                                          {commentUpdateBusyById[comment._id] ? "Saving..." : "Save"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => cancelEditingComment(comment._id)}
                                          disabled={commentUpdateBusyById[comment._id]}
                                          className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-800">{comment.text}</p>
                                  )}
                                </div>
                              </div>

                              {(canEditComment || canDeleteComment) && comment._id && (
                                <div className="flex gap-2">
                                  {canEditComment && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        editingCommentById[comment._id]
                                          ? cancelEditingComment(comment._id)
                                          : startEditingComment(comment._id, comment.text)
                                      }
                                      disabled={commentDeleteBusyById[comment._id] || commentUpdateBusyById[comment._id]}
                                      className="text-xs px-2 py-1 rounded border border-[#15436b] text-[#15436b] hover:bg-[#eaf3fb] disabled:opacity-50"
                                    >
                                      {editingCommentById[comment._id] ? "Close" : "Edit"}
                                    </button>
                                  )}
                                  {canDeleteComment && (
                                    <button
                                      type="button"
                                      onClick={() => deleteComment(sermon._id, comment._id)}
                                      disabled={commentDeleteBusyById[comment._id] || commentUpdateBusyById[comment._id]}
                                      className="text-xs px-2 py-1 rounded border border-red-400 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                    >
                                      {commentDeleteBusyById[comment._id] ? "Deleting..." : "Delete"}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {isAuthenticated ? (
                      <div className="flex gap-2">
                        <input
                          value={commentInputsById[sermon._id] || ""}
                          onChange={(e) => handleCommentInputChange(sermon._id, e.target.value)}
                          placeholder="Write a comment..."
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#15436b]"
                        />
                        <button
                          type="button"
                          onClick={() => addComment(sermon._id)}
                          disabled={commentBusyById[sermon._id]}
                          className="px-3 py-2 rounded-lg bg-[#15436b] text-white text-sm disabled:opacity-50"
                        >
                          {commentBusyById[sermon._id] ? "Posting..." : "Post"}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">Log in to post comments.</p>
                    )}
                  </div>

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
