function cleanText(value) {
  if (!value) return null;

  return String(value)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

class PlaylistImportError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "PlaylistImportError";
    this.code = code;
    this.isUserFacing = true;
  }
}

function parseSpotifyPlaylistId(url) {
  if (url.startsWith("spotify:playlist:")) {
    return url.replace("spotify:playlist:", "").split("?")[0];
  }

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);

    const playlistIndex = parts.indexOf("playlist");

    if (playlistIndex !== -1 && parts[playlistIndex + 1]) {
      return parts[playlistIndex + 1];
    }

    return null;
  } catch {
    return null;
  }
}

function parseYouTubePlaylistId(url) {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("list");
  } catch {
    return null;
  }
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "TempVoicePro/1.0",
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const error = new Error("HTTP " + response.status + " " + text.slice(0, 200));
      error.status = response.status;
      error.body = text;
      throw error;
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function getSpotifyAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID oder SPOTIFY_CLIENT_SECRET fehlt in .env");
  }

  const auth = Buffer
    .from(clientId + ":" + clientSecret)
    .toString("base64");

  let data;

  try {
    data = await fetchJson("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + auth,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });
  } catch (error) {
    if (error.status === 400 || error.status === 401) {
      throw new PlaylistImportError(
        "❌ Spotify Login fehlgeschlagen. Bitte prüfe `SPOTIFY_CLIENT_ID` und `SPOTIFY_CLIENT_SECRET` in der `.env`.",
        "SPOTIFY_AUTH_FAILED"
      );
    }

    throw error;
  }

  if (!data.access_token) {
    throw new Error("Spotify Access Token konnte nicht erstellt werden.");
  }

  return data.access_token;
}

async function importSpotifyPlaylist(url, maxItems) {
  const playlistId = parseSpotifyPlaylistId(url);

  if (!playlistId) {
    throw new Error("Keine gültige Spotify Playlist-ID gefunden.");
  }

  const token = await getSpotifyAccessToken();

  const items = [];
  let nextUrl =
    "https://api.spotify.com/v1/playlists/" +
    encodeURIComponent(playlistId) +
    "/tracks?limit=50&fields=items(track(name,artists(name),external_urls(spotify))),next";

  while (nextUrl && items.length < maxItems) {
    let data;

    try {
      data = await fetchJson(nextUrl, {
        headers: {
          "Authorization": "Bearer " + token
        }
      });
    } catch (error) {
      if (error.status === 403) {
        throw new PlaylistImportError(
          "❌ Spotify verweigert den Zugriff auf diese Playlist. Sie ist wahrscheinlich privat, nicht öffentlich erreichbar oder für die Spotify API nicht freigegeben. Bitte teste eine öffentliche Spotify-Playlist oder nutze vorerst YouTube-Playlist-Links.",
          "SPOTIFY_PLAYLIST_FORBIDDEN"
        );
      }

      if (error.status === 404) {
        throw new PlaylistImportError(
          "❌ Diese Spotify-Playlist wurde nicht gefunden. Bitte prüfe den Link.",
          "SPOTIFY_PLAYLIST_NOT_FOUND"
        );
      }

      throw error;
    }

    for (const entry of data.items || []) {
      if (items.length >= maxItems) break;

      const track = entry.track;
      if (!track) continue;

      const title = cleanText(track.name);
      const artists = Array.isArray(track.artists)
        ? track.artists.map(a => a.name).filter(Boolean).join(", ")
        : "";

      const displayTitle = cleanText(
        artists ? artists + " - " + title : title
      );

      const trackUrl =
        track.external_urls && track.external_urls.spotify
          ? track.external_urls.spotify
          : url;

      if (!displayTitle || !trackUrl) continue;

      items.push({
        source: "spotify",
        title: displayTitle,
        url: trackUrl
      });
    }

    nextUrl = data.next || null;
  }

  return items;
}

async function importYouTubePlaylist(url, maxItems) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY fehlt in .env");
  }

  const playlistId = parseYouTubePlaylistId(url);

  if (!playlistId) {
    throw new Error("Keine gültige YouTube Playlist-ID gefunden.");
  }

  const items = [];
  let pageToken = "";

  while (items.length < maxItems) {
    let apiUrl =
      "https://www.googleapis.com/youtube/v3/playlistItems" +
      "?part=snippet" +
      "&maxResults=50" +
      "&playlistId=" + encodeURIComponent(playlistId) +
      "&key=" + encodeURIComponent(apiKey);

    if (pageToken) {
      apiUrl += "&pageToken=" + encodeURIComponent(pageToken);
    }

    const data = await fetchJson(apiUrl);

    for (const entry of data.items || []) {
      if (items.length >= maxItems) break;

      const snippet = entry.snippet || {};
      const resourceId = snippet.resourceId || {};
      const videoId = resourceId.videoId;

      if (!videoId) continue;

      const title = cleanText(snippet.title);

      if (!title || title === "Deleted video" || title === "Private video") {
        continue;
      }

      items.push({
        source: "youtube",
        title,
        url: "https://www.youtube.com/watch?v=" + videoId
      });
    }

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return items;
}

async function importPlaylistFromUrl(url, maxItems = 50) {
  const lower = url.toLowerCase();

  if (lower.includes("spotify.com/playlist") || lower.startsWith("spotify:playlist:")) {
    return await importSpotifyPlaylist(url, maxItems);
  }

  if (
    lower.includes("youtube.com") ||
    lower.includes("youtu.be") ||
    lower.includes("music.youtube.com")
  ) {
    return await importYouTubePlaylist(url, maxItems);
  }

  throw new Error("Nur Spotify-Playlist-Links und YouTube-Playlist-Links werden unterstützt.");
}

module.exports = {
  importPlaylistFromUrl
};
