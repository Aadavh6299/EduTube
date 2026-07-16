const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

function uploadsPlaylistId(channelId) {
  return "UU" + channelId.slice(2);
}

// Fetches one page of videos from a channel's uploads playlist.
export async function fetchChannelVideoPage(channelId, pageToken, maxResults = 12) {
  if (!API_KEY) {
    throw new Error(
      "YouTube API key missing. Add VITE_YOUTUBE_API_KEY in your .env file."
    );
  }

  const playlistId = uploadsPlaylistId(channelId);
  let url = `${BASE_URL}/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${maxResults}&key=${API_KEY}`;
  if (pageToken) url += `&pageToken=${pageToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `YouTube API error (status ${res.status})`);
  }
  const data = await res.json();

  const videos = (data.items || [])
    .filter(item => item.snippet?.title && item.snippet.title !== "Private video")
    .map(item => ({
      id: item.contentDetails.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      publishedAt: item.snippet.publishedAt,
    }));

  return { videos, nextPageToken: data.nextPageToken || null };
}

// Fetches one page from every channel in a level and merges the results.
// Returns each channel's nextPageToken too, so more can be loaded later
// (infinite scroll) without losing place in any channel.
export async function fetchLevelPage(channelIds, pageTokens = {}, maxPerChannel = 12) {
  const outcomes = await Promise.allSettled(
    channelIds.map(id => fetchChannelVideoPage(id, pageTokens[id] || null, maxPerChannel))
  );

  const failures = outcomes.filter(o => o.status === "rejected");
  if (failures.length && failures.length === outcomes.length) {
    throw failures[0].reason;
  }

  const nextPageTokens = {};
  let videos = [];

  outcomes.forEach((outcome, i) => {
    const channelId = channelIds[i];
    if (outcome.status === "fulfilled") {
      videos = videos.concat(outcome.value.videos);
      nextPageTokens[channelId] = outcome.value.nextPageToken;
    } else {
      nextPageTokens[channelId] = pageTokens[channelId] || null;
    }
  });

  videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  return { videos, nextPageTokens };
}
