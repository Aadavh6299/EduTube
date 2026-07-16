const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

function uploadsPlaylistId(channelId) {
  return "UU" + channelId.slice(2);
}

export async function fetchChannelVideos(channelId, maxResults = 8) {
  if (!API_KEY) {
    throw new Error(
      "YouTube API key missing. Add VITE_YOUTUBE_API_KEY in your .env file."
    );
  }

  const playlistId = uploadsPlaylistId(channelId);
  const url = `${BASE_URL}/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${maxResults}&key=${API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `YouTube API error (status ${res.status})`);
  }
  const data = await res.json();

  return (data.items || [])
    .filter(item => item.snippet?.title && item.snippet.title !== "Private video")
    .map(item => ({
      id: item.contentDetails.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      publishedAt: item.snippet.publishedAt,
    }));
}

export async function fetchVideosForLevel(channelIds, maxPerChannel = 8) {
  const outcomes = await Promise.allSettled(
    channelIds.map(id => fetchChannelVideos(id, maxPerChannel))
  );

  const failures = outcomes.filter(o => o.status === "rejected");
  if (failures.length && failures.length === outcomes.length) {
    throw failures[0].reason;
  }

  return outcomes
    .filter(o => o.status === "fulfilled")
    .flatMap(o => o.value)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}
