import React from "react";

export default function VideoGrid({ videos, onSelect }) {
  if (!videos.length) return null;

  return (
    <div className="grid">
      {videos.map(v => (
        <button key={v.id} className="card" onClick={() => onSelect(v)}>
          <img src={v.thumbnail} alt="" className="thumb" loading="lazy" />
          <div className="card-body">
            <p className="title">{v.title}</p>
            <p className="channel">{v.channel}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
