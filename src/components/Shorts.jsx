import React, { useEffect, useState } from "react";
import { LEVELS } from "../data/channels";
import { fetchShorts } from "../lib/youtube";

export default function Shorts() {
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const allChannelIds = LEVELS.flatMap(l => l.channelIds);
        const results = await fetchShorts(allChannelIds, 10);
        if (!cancelled) setShorts(results);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="shorts-status">Shorts load ho rahe hain...</div>;
  if (error) return <div className="shorts-status">Kuch gadbad ho gayi: {error}</div>;
  if (!shorts.length) return <div className="shorts-status">Abhi koi short video nahi mila.</div>;

  return (
    <div className="shorts-feed">
      {shorts.map(s => (
        <div key={s.id} className="shorts-item">
          <iframe
            className="shorts-player"
            src={`https://www.youtube.com/embed/${s.id}?playsinline=1&rel=0`}
            title={s.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <div className="shorts-overlay">
            <p className="shorts-title">{s.title}</p>
            <p className="shorts-channel">{s.channel}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
