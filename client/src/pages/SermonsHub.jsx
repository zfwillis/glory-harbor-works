import { useEffect, useMemo, useState } from "react";

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

const SermonsHub = () => {
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    speaker: "",
    topic: "",
    series: "",
  });

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

      const queryString = params.toString();
      const endpoint = queryString ? `${API_URL}/sermons?${queryString}` : `${API_URL}/sermons`;
      const response = await fetch(endpoint);
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
    });
  }, []);

  const streamItems = useMemo(
    () =>
      sermons.map((sermon, index) => ({
        ...sermon,
        align: index % 2 === 0 ? "left" : "right",
        embedUrl: sermon.type === "video" ? toEmbedUrl(sermon.url) : sermon.url,
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
    const cleared = { speaker: "", topic: "", series: "" };
    setFilters(cleared);
    await loadSermons(cleared);
  };

  return (
    <div className="min-h-screen bg-[#f7fff5] px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#15436b]">Sermons Hub</h1>
          <p className="text-gray-600 mt-2">Stream recent messages in a conversation-style feed.</p>
        </div>

        <form onSubmit={handleSearch} className="mb-6 bg-white border border-[#d9e6df] rounded-2xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

                  {sermon.type === "video" ? (
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

                  {sermon.description && (
                    <p className="text-gray-700 text-sm mt-3">{sermon.description}</p>
                  )}
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
