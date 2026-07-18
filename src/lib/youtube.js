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

async function fetchDurations(ids) {
  const durations = {};
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url = `${BASE_URL}/videos?part=contentDetails&id=${batch.join(",")}&key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = await res.json();
    (data.items || []).forEach(item => {
      durations[item.id] = item.contentDetails.duration;
    });
  }
  return durations;
}

// Cache lasts 6 hours — long enough to save real quota, short enough that
// new uploads still show up same-day. We only ever cache the RAW data;
// shuffling always happens after reading from cache, so the feed still
// looks different every time it's opened.
const CACHE_MS = 6 * 60 * 60 * 1000;

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    const time = localStorage.getItem(`${key}_t`);
    if (raw && time && Date.now() - parseInt(time, 10) < CACHE_MS) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return null;
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem(`${key}_t`, Date.now().toString());
  } catch (e) {}
}

export async function fetchChannelVideoPage(channelId, pageToken, maxResults = 12) {
  if (!API_KEY) {
    throw new Error("YouTube API key missing. Add VITE_YOUTUBE_API_KEY in your .env file.");
  }

  const cacheKey = `yt_ch_${channelId}_${pageToken || "first"}_${maxResults}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

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
      channelId: item.snippet.channelId,
      thumbnail:
        item.snippet.thumbnails?.high?.url ||
        item.snippet.thumbnails?.medium?.url ||
        item.snippet.thumbnails?.default?.url,
      publishedAt: item.snippet.publishedAt,
    }));

  const result = { videos, nextPageToken: data.nextPageToken || null };
  writeCache(cacheKey, result);
  return result;
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

  if (videos.length) {
    const durations = await fetchDurations(videos.map(v => v.id));
    videos = videos.filter(v => {
      const dur = durations[v.id];
      return dur ? !isShortDuration(dur) : true;
    });
  }

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

  const durations = await fetchDurations(candidates.map(v => v.id));

  return shuffle(
    candidates.filter(v => durations[v.id] && isShortDuration(durations[v.id]))
  );
}
