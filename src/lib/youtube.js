const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

function uploadsPlaylistId(channelId) {
  return "UU" + channelId.slice(2);
}

function shuffle(array) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function isShortDuration(iso) {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return false;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours === 0 && minutes * 60 + seconds <= 60;
}

export async function fetchChannelVideoPage(channelId, pageToken, maxResults = 12) {
  if (!API_KEY) {
    throw new Error("YouTube API key missing. Add VITE_YOUTUBE_API_KEY in your .env file.");
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
      thumbnail:
        item.snippet.thumbnails?.high?.url ||
        item.snippet.thumbnails?.medium?.url ||
        item.snippet.thumbnails?.default?.url,
      publishedAt: item.snippet.publishedAt,
    }));

  return { videos, nextPageToken: data.nextPageToken || null };
}

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

  return { videos: shuffle(videos), nextPageTokens };
}

export async function fetchShorts(channelIds, maxPerChannel = 15) {
  const pages = await Promise.allSettled(
    channelIds.map(id => fetchChannelVideoPage(id, null, maxPerChannel))
  );

  const candidates = pages
    .filter(p => p.status === "fulfilled")
    .flatMap(p => p.value.videos);

  if (!candidates.length) return [];

  const ids = candidates.map(v => v.id);
  const shortsSet = new Set();

  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url = `${BASE_URL}/videos?part=contentDetails&id=${batch.join(",")}&key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = await res.json();
    (data.items || []).forEach(item => {
      if (isShortDuration(item.contentDetails.duration)) {
        shortsSet.add(item.id);
      }
    });
  }

  return shuffle(candidates.filter(v => shortsSet.has(v.id)));
}
