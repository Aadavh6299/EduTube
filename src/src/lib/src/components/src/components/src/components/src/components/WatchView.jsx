import React from "react";

export default function WatchView({ video, onBack }) {
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
    </div>
  );
}
