import React, { useEffect, useState, useMemo } from "react";
import { LEVELS } from "./data/channels";
import { fetchVideosForLevel } from "./lib/youtube";
import Header from "./components/Header";
import LevelPills from "./components/LevelPills";
import VideoGrid from "./components/VideoGrid";
import WatchView from "./components/WatchView";

export default function App() {
  const [levelId, setLevelId] = useState("school");
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [watching, setWatching] = useState(null);

  const level = LEVELS.find(l => l.id === levelId);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setWatching(null);

      if (!level.channelIds.length) {
        setVideos([]);
        setLoading(false);
        return;
      }

      try {
        const results = await fetchVideosForLevel(level.channelIds);
        if (!cancelled) setVideos(results);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [levelId]);

  const filtered = useMemo(() => {
    if (!query.trim()) return videos;
    return videos.filter(v => v.title.toLowerCase().includes(query.toLowerCase()));
  }, [videos, query]);

  return (
    <div className="app">
      <Header query={query} onQueryChange={setQuery} onLogoClick={() => setWatching(null)} />
      <LevelPills levels={LEVELS} activeId={levelId} onSelect={setLevelId} />

      {watching ? (
        <WatchView video={watching} onBack={() => setWatching(null)} />
      ) : (
        <main className="main">
          {loading && <p className="status">Loading {level.label} videos...</p>}

          {!loading && error && (
            <p className="status error">Kuch gadbad ho gayi: {error}</p>
          )}

          {!loading && !error && !level.channelIds.length && (
            <p className="status">
              Is level ke liye abhi koi channel add nahi kiya gaya hai.
            </p>
          )}

          {!loading && !error && level.channelIds.length > 0 && filtered.length === 0 && (
            <p className="status">Koi video nahi mila.</p>
          )}

          <VideoGrid videos={filtered} onSelect={setWatching} />
        </main>
      )}
    </div>
  );
}
