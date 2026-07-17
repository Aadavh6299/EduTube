import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { SpeedInsights } from '@vercel/speed-insights/react';
import { LEVELS } from "./data/channels";
import { fetchLevelPage } from "./lib/youtube";
import Header from "./components/Header";
import LevelPills from "./components/LevelPills";
import VideoGrid from "./components/VideoGrid";
import WatchView from "./components/WatchView";
import BottomNav from "./components/BottomNav";
import Shorts from "./components/Shorts";
import Account from "./components/Account";

const PER_PAGE = 12;

export default function App() {
  const [tab, setTab] = useState("home");
  const [levelId, setLevelId] = useState("school");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(""); 
  const [videos, setVideos] = useState([]);
  const [pageTokens, setPageTokens] = useState({});
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [watching, setWatching] = useState(null);
  const sentinelRef = useRef(null);

  // --- NAYA LOGIC: Back Button Sync ---
  useEffect(() => {
    const handlePopState = () => {
      if (watching) {
        setWatching(null);
      } else if (tab !== "home") {
        setTab("home");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [watching, tab]);

  useEffect(() => {
    if (watching || tab !== "home") {
      window.history.pushState(null, "", window.location.href);
    }
  }, [watching, tab]);
  // ------------------------------------

  const level = LEVELS.find(l => l.id === levelId);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const allChannelIds = useMemo(() => LEVELS.flatMap(l => l.channelIds), []);
  const targetChannelIds = useMemo(() => {
    return debouncedQuery.trim() ? allChannelIds : level.channelIds;
  }, [debouncedQuery, allChannelIds, level.channelIds]);

  useEffect(() => {
    if (tab !== "home") return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setWatching(null);
      setVideos([]);
      setPageTokens({});
      setHasMore(false);

      if (!targetChannelIds.length) {
        setLoading(false);
        return;
      }

      try {
        const { videos: firstPage, nextPageTokens } = await fetchLevelPage(targetChannelIds, {}, PER_PAGE);
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
    return () => { cancelled = true; };
  }, [targetChannelIds, tab]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return;
    const channelsWithMore = targetChannelIds.filter(id => pageTokens[id]);
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
      setHasMore(targetChannelIds.some(id => merged[id]));
    } catch (e) {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, loading, hasMore, targetChannelIds, pageTokens]);

  useEffect(() => {
    if (tab !== "home" || !sentinelRef.current || watching) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore, watching, tab]);

  const filtered = useMemo(() => {
    if (!query.trim()) return videos;
    return videos.filter(v => v.title.toLowerCase().includes(query.toLowerCase()));
  }, [videos, query]);

  return (
    <div className="app">
      <SpeedInsights />
      {tab === "home" && (
        <>
          <Header query={query} onQueryChange={setQuery} onLogoClick={() => setWatching(null)} />
          
          <LevelPills 
            levels={LEVELS} 
            activeId={levelId} 
            onSelect={(id) => {
              setLevelId(id);
              setQuery(""); 
            }} 
          />

          {watching ? (
            <WatchView video={watching} onBack={() => setWatching(null)} onSelect={setWatching} />
          ) : (
            <main className="main">
              {loading && <p className="status">{debouncedQuery.trim() ? "Puri app me videos dhoondh rahe hain..." : `Loading ${level.label} videos...`}</p>}
              {!loading && error && <p className="status error">Kuch gadbad ho gayi: {error}</p>}
              {!loading && !error && !targetChannelIds.length && (
                <p className="status">Is level ke liye abhi koi channel add nahi kiya gaya hai.</p>
              )}
              {!loading && !error && targetChannelIds.length > 0 && filtered.length === 0 && (
                <p className="status">Koi video nahi mila.</p>
              )}
              <VideoGrid videos={filtered} onSelect={setWatching} />
              <div ref={sentinelRef} style={{ height: 1 }} />
              {loadingMore && <p className="status">Aur videos load ho rahe हैं...</p>}
            </main>
          )}
        </>
      )}

      {tab === "shorts" && <Shorts />}
      {tab === "account" && <Account />}

      <BottomNav active={tab} onSelect={setTab} />
    </div>
  );
}
