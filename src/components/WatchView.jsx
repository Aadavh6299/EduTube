import React, { useEffect, useRef, useState, useCallback } from "react";
import { fetchChannelVideoPage } from "../lib/youtube";

export default function WatchView({ video, onBack, onSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [pageToken, setPageToken] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setSuggestions([]);
      setPageToken(null);
      setHasMore(true);
      if (!video.channelId) {
        setLoading(false);
        setHasMore(false);
        return;
      }
      try {
        const { videos, nextPageToken } = await fetchChannelVideoPage(video.channelId, null, 10);
        if (!cancelled) {
          setSuggestions(videos.filter(v => v.id !== video.id));
          setPageToken(nextPageToken);
          setHasMore(!!nextPageToken);
        }
      } catch (e) {
        if (!cancelled) setHasMore(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [video.id, video.channelId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore || !video.channelId) return;
    setLoadingMore(true);
    try {
      const { videos, nextPageToken } = await fetchChannelVideoPage(video.channelId, pageToken, 10);
      setSuggestions(prev => [...prev, ...videos.filter(v => v.id !== video.id)]);
      setPageToken(nextPageToken);
      setHasMore(!!nextPageToken);
    } catch (e) {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, loading, hasMore, video.channelId, video.id, pageToken]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="watch">
      <button className="back" onClick={onBack}>← Back</button>
      <div className="player-wrap">
        <iframe
          className="player"
          src={`https://www.youtube.com/embed/${video.id}`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <h1 className="watch-title">{video.title}</h1>
      <p className="watch-channel">{video.channel}</p>

      <div className="up-next">
        <p className="up-next-heading">Up next</p>
        {suggestions.map(s => (
          <button key={s.id} className="suggestion-card" onClick={() => onSelect(s)}>
            <img src={s.thumbnail} alt="" className="suggestion-thumb" loading="lazy" />
            <div className="suggestion-body">
              <p className="suggestion-title">{s.title}</p>
              <p className="suggestion-channel">{s.channel}</p>
            </div>
          </button>
        ))}
        <div ref={sentinelRef} style={{ height: 1 }} />
        {loadingMore && <p className="up-next-status">Aur suggestions load ho rahe hain...</p>}
        {!loading && !suggestions.length && !hasMore && (
          <p className="up-next-status">Koi aur suggestion nahi mila.</p>
        )}
      </div>
    </div>
  );
}
