function cleanText(value) {
  if (!value) return null;

  return String(value)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

function detectSource(url) {
  const lower = url.toLowerCase();

  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    return "youtube";
  }

  if (lower.includes("spotify.com")) {
    return "spotify";
  }

  return "url";
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TempVoicePro/1.0"
      }
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getYouTubeMetadata(url) {
  const apiUrl =
    "https://www.youtube.com/oembed?format=json&url=" +
    encodeURIComponent(url);

  const data = await fetchJson(apiUrl);

  if (!data) return null;

  const title = cleanText(data.title);
  const artist = cleanText(data.author_name);

  return {
    source: "youtube",
    title,
    artist,
    displayTitle: title || null
  };
}

async function getSpotifyMetadata(url) {
  const apiUrl =
    "https://open.spotify.com/oembed?url=" +
    encodeURIComponent(url);

  const data = await fetchJson(apiUrl);

  if (!data) return null;

  const title = cleanText(data.title);
  const artist = cleanText(data.author_name);

  let displayTitle = title || null;

  if (title && artist && !title.toLowerCase().includes(artist.toLowerCase())) {
    displayTitle = artist + " - " + title;
  }

  return {
    source: "spotify",
    title,
    artist,
    displayTitle
  };
}

async function getMetadataForUrl(url) {
  const source = detectSource(url);

  if (source === "youtube") {
    return await getYouTubeMetadata(url);
  }

  if (source === "spotify") {
    return await getSpotifyMetadata(url);
  }

  return {
    source,
    title: null,
    artist: null,
    displayTitle: null
  };
}

module.exports = {
  detectSource,
  getMetadataForUrl
};
