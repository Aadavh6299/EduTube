import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { LEVELS } from "./data/channels";
import { fetchLevelPage } from "./lib/youtube";
import Header from "./components/Header";
import LevelPills from "./components/LevelPills";
import VideoGrid from "./components/VideoGrid";
import WatchView from "./components/WatchView";

const PER_PAGE = 12;

export default function App() {
  const [levelId, setLevelId] = useState("school");
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState([]);
  const [pageTokens, setPageTokens] = useState({});
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [watching, setWatching] = useState(null);
  const sentinelRef = useRef(null);

  const level = LEVELS.find(l => l.id === levelId);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setWatching(null);
      setVideos([]);
      setPageTokens({});
      setHasMore(false);

      if (!level.channelIds.length) {
        setLoading(false);
        return;
      }

      try {
        const { videos: firstPage, nextPageTokens } = await fetchLevelPage(level.channelIds, {}, PER_PAGE);
        if (!cancelled) {
          setVideos(firstPage);
          setPageTokens(nextPageTokens);
          setHasMore(Object.values(nextPageTokens).some(Boolean));
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return;
    const channelsWithMore = level.channelIds.filter(id => pageTokens[id]);
    if (!channelsWithMore.length) {
      setHasMore(false);
      return;
    }
    setLoadingMore(true);
    try {
      const { videos: nextBatch, nextPageTokens } = await fetchLevelPage(channelsWithMore, pageTokens, PER_PAGE);
      const merged = { ...pageTokens, ...nextPageTokens };
      setVideos(prev => [...prev, ...nextBatch]);
      setPageTokens(merged);
      setHasMore(level.channelIds.some(id => merged[id]));
    } catch (e) {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, loading, hasMore, level, pageTokens]);

  useEffect(() => {
    if (!sentinelRef.current || watching) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore, watching]);

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
          {!loading && error && <p className="status error">Kuch gadbad ho gayi: {error}</p>}
          {!loading && !error && !level.channelIds.length && (
            <p className="status">Is level ke liye abhi koi channel add nahi kiya gaya hai.</p>
          )}
          {!loading && !error && level.channelIds.length > 0 && filtered.length === 0 && (
            <p className="status">Koi video nahi mila.</p>
          )}
          <VideoGrid videos={filtered} onSelect={setWatching} />
          <div ref={sentinelRef} style={{ height: 1 }} />
          {loadingMore && <p className="status">Aur videos load ho rahe hain...</p>}
        </main>
      )}
    </div>
  );
}
