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
  const [debouncedQuery, setDebouncedQuery] = useState(""); // Naya state API limit bachane ke liye
  const [videos, setVideos] = useState([]);
  const [pageTokens, setPageTokens] = useState({});
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [watching, setWatching] = useState(null);
  const sentinelRef = useRef(null);

  const level = LEVELS.find(l => l.id === levelId);

  // 1. Debounce Logic: Typing rukne ke 500ms baad hi backend me search hoga
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  // 2. Universal Search Logic: Agar search box me kuch hai, to sabhi channels le aao, warna sirf level wale
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
        // Yahan level.channelIds ki jagah targetChannelIds use hoga
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
    // Dependency me targetChannelIds rakha hai taaki search universal ho sake
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetChannelIds, tab]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return;
    // Yahan bhi targetChannelIds use hoga
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          
          {/* 3. Nayi category par click karte hi search box clear ho jayega */}
          <LevelPills 
            levels={LEVELS} 
            activeId={levelId} 
            onSelect={(id) => {
              setLevelId(id);
              setQuery(""); 
            }} 
          />

          {watching ? (
            <WatchView video={watching} onBack={() => setWatching(null)} />
          ) : (
            <main className="main">
              {/* Jab universal search chalega to loading text badal jayega */}
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
              {loadingMore && <p className="status">Aur videos load ho rahe hain...</p>}
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
