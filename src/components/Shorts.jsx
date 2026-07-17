import React, { useEffect, useRef, useState } from "react";
import { LEVELS } from "../data/channels";
import { fetchShorts } from "../lib/youtube";

function ShortItem({ short, isActive, registerRef }) {
  return (
    <div className="shorts-item" ref={el => registerRef(el, short.id)} data-id={short.id}>
      {isActive ? (
        <iframe
          className="shorts-player"
          src={`https://www.youtube.com/embed/${short.id}?playsinline=1&rel=0&autoplay=1`}
          title={short.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <img className="shorts-thumb" src={short.thumbnail} alt="" loading="lazy" />
      )}
      <div className="shorts-overlay">
        <p className="shorts-title">{short.title}</p>
        <p className="shorts-channel">{short.channel}</p>
      </div>
    </div>
  );
}

export default function Shorts() {
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const itemRefs = useRef(new Map());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const allChannelIds = LEVELS.flatMap(l => l.channelIds);
        const results = await fetchShorts(allChannelIds, 10);
        if (!cancelled) {
          setShorts(results);
          if (results.length) setActiveId(results[0].id);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!shorts.length) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            setActiveId(entry.target.dataset.id);
          }
        });
      },
      { threshold: [0.6] }
    );
    itemRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [shorts]);

  function registerRef(el, id) {
    if (el) itemRefs.current.set(id, el);
  }

  if (loading) return <div className="shorts-status">Shorts load ho rahe hain...</div>;
  if (error) return <div className="shorts-status">Kuch gadbad ho gayi: {error}</div>;
  if (!shorts.length) return <div className="shorts-status">Abhi koi short video nahi mila.</div>;

  return (
    <div className="shorts-feed">
      {shorts.map(s => (
        <ShortItem key={s.id} short={s} isActive={activeId === s.id} registerRef={registerRef} />
      ))}
    </div>
  );
}
