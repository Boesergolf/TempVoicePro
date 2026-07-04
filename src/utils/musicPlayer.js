const {
  DEFAULT_VOLUME_PERCENT,
  clampVolumePercent,
  getSavedVolumePercent,
  saveVolumePercent
} = require("./musicSettings");

const fs = require("fs");
const { spawn, execFile } = require("child_process");

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
  NoSubscriberBehavior,
  StreamType
} = require("@discordjs/voice");

const play = require("play-dl");

const { detectSource, getMetadataForUrl } = require("./musicMetadata");

const queues = new Map();
const leaveTimers = new Map();

function getYtDlpPath() {
  if (process.env.YTDLP_PATH) {
    return process.env.YTDLP_PATH;
  }

  if (fs.existsSync("/usr/local/bin/yt-dlp")) {
    return "/usr/local/bin/yt-dlp";
  }

  return "yt-dlp";
}


function getYtDlpPlayerClients() {
  const value = String(process.env.YTDLP_PLAYER_CLIENTS || "ios,android,web").trim();

  if (!value) {
    return "ios,android,web";
  }

  return value;
}

function execFilePromise(file, args, options = {}) {
  const timeoutMs = Number(process.env.YTDLP_TIMEOUT_MS || 60000);

  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      {
        maxBuffer: 1024 * 1024 * 20,
        ...options,
        timeout: timeoutMs
      },
      (error, stdout, stderr) => {
        if (error) {
          if (error.killed || error.signal === "SIGTERM") {
            return reject(
              new Error("yt-dlp Timeout nach " + Math.round(timeoutMs / 1000) + " Sekunden.")
            );
          }

          if (stderr) {
            error.message += "\n" + stderr;
          }

          return reject(error);
        }

        return resolve(stdout);
      }
    );
  });
}

async function getYtDlpInfo(url) {
  const ytDlpPath = getYtDlpPath();

  const result = await execFilePromise(ytDlpPath, [
    "--dump-single-json",
    "--no-playlist",
    "--quiet",
    "--no-warnings",
    "--force-ipv4",
    "--extractor-args",
    "youtube:player_client=" + getYtDlpPlayerClients(),
    url
  ]);

  return JSON.parse(result.stdout);
}


function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function cleanTitle(value) {
  if (!value) return null;

  return String(value)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

function getYouTubeVideoId(value) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname
      .replace(/^www\./, "")
      .replace(/^m\./, "");

    const pathParts = parsed.pathname
      .split("/")
      .filter(Boolean);

    if (host === "youtu.be") {
      return pathParts[0] || null;
    }

    if (
      host === "youtube.com" ||
      host === "music.youtube.com" ||
      host.endsWith(".youtube.com")
    ) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }

      if (pathParts[0] === "shorts" && pathParts[1]) {
        return pathParts[1];
      }

      if (pathParts[0] === "embed" && pathParts[1]) {
        return pathParts[1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

function makeYouTubeVideoUrl(value) {
  const videoId = getYouTubeVideoId(value);

  if (!videoId) {
    return null;
  }

  return "https://www.youtube.com/watch?v=" + videoId;
}

function isYouTubePlaylistUrl(value) {
  try {
    const parsed = new URL(value);
    const lower = value.toLowerCase();

    if (
      !lower.includes("youtube.com") &&
      !lower.includes("youtu.be") &&
      !lower.includes("music.youtube.com")
    ) {
      return false;
    }

    return parsed.searchParams.has("list") && !parsed.searchParams.has("v");
  } catch {
    return false;
  }
}

function getOrCreateQueue(guildId) {
  let queue = queues.get(guildId);

  if (queue) return queue;

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play
    }
  });

  queue = {
    guildId,
    tracks: [],
    player,
    connection: null,
    voiceChannel: null,
    textChannel: null,
    current: null,
    playing: false,
    stopped: false,
    volume: DEFAULT_VOLUME_PERCENT
  };

  player.on(AudioPlayerStatus.Idle, () => {
    playNext(guildId).catch(err => {
      console.error("❌ Music Idle Fehler:", err);
    });
  });

  player.on("error", err => {
    console.error("❌ Music Player Fehler:", err);

    if (queue.textChannel) {
      queue.textChannel
        .send("❌ Fehler beim Abspielen. Überspringe Track.")
        .catch(() => {});
    }

    playNext(guildId).catch(error => {
      console.error("❌ Music Next Fehler:", error);
    });
  });

  queues.set(guildId, queue);
  return queue;
}

async function connectToVoice(interaction, queue) {
  const voiceChannel = interaction.member?.voice?.channel;

  if (!voiceChannel) {
    throw new Error("Du bist in keinem Voice Channel.");
  }

  queue.voiceChannel = voiceChannel;
  queue.textChannel = interaction.channel;
  queue.stopped = false;

  let connection = getVoiceConnection(interaction.guild.id);

  if (!connection) {
    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: true
    });
  }

  queue.connection = connection;
  queue.connection.subscribe(queue.player);

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
  } catch {
    throw new Error("Ich konnte dem Voice Channel nicht korrekt beitreten.");
  }
}

async function searchYouTube(query) {
  const cleanQuery = String(query || "").trim();

  if (!cleanQuery) {
    throw new Error("Kein Suchbegriff angegeben.");
  }

  const result = await execFilePromise(getYtDlpPath(), [
    "--dump-single-json",
    "--no-playlist",
    "--no-warnings",
    "--ignore-errors",
    "--force-ipv4",
    "ytsearch5:" + cleanQuery
  ]);

  const raw = typeof result === "string"
    ? result
    : (result.stdout || "");

  if (!raw.trim()) {
    throw new Error("YouTube-Suche hat keine Daten geliefert.");
  }

  const data = JSON.parse(raw);
  const entries = Array.isArray(data.entries) ? data.entries.filter(Boolean) : [];
  const entry = entries[0];

  if (!entry) {
    throw new Error("Kein YouTube-Ergebnis gefunden.");
  }

  let url =
    entry.webpage_url ||
    entry.original_url ||
    entry.url ||
    null;

  if ((!url || !url.includes("youtube.com/watch")) && entry.id) {
    url = "https://www.youtube.com/watch?v=" + entry.id;
  }

  if (!url || (!url.includes("youtube.com/watch") && !url.includes("youtu.be/"))) {
    throw new Error("YouTube-Suche hat keine gültige Video-URL geliefert.");
  }

  return {
    source: "youtube",
    title: entry.title || cleanQuery,
    url,
    duration: entry.duration || null,
    thumbnail: entry.thumbnail || null
  };
}


async function resolveTrack(track) {
  if (!track) {
    throw new Error("Kein Track angegeben.");
  }

  const inputUrl = track.url || null;
  const inputQuery = track.query || track.title || null;

  let source = track.source || null;

  if (!source && inputUrl) {
    source = detectSource(inputUrl);
  }

  if (source === "spotify" && inputUrl) {
    let title = track.title || track.query || null;

    if (!title) {
      const metadata = await getMetadataForUrl(inputUrl).catch(() => null);
      title = metadata?.displayTitle || metadata?.title || null;
    }

    if (!title) {
      throw new Error("Spotify-Link erkannt, aber ich konnte den Titel nicht lesen. Bitte gib den Songnamen direkt ein.");
    }

    console.log("🟢 Spotify-Link erkannt, suche über YouTube:", title);

    const found = await searchYouTube(title);

    return {
      ...track,
      ...found,
      source: "youtube",
      originalSource: "spotify",
      originalUrl: inputUrl,
      title: found.title || title,
      query: title
    };
  }

  if (source === "youtube" && inputUrl) {
    console.log("🔴 YouTube-Link erkannt, nutze direkten Link:", inputUrl);

    return {
      ...track,
      source: "youtube",
      url: inputUrl,
      title: track.title || inputUrl
    };
  }

  if (inputUrl) {
    return {
      ...track,
      source: source || "url",
      url: inputUrl,
      title: track.title || inputUrl
    };
  }

  if (inputQuery) {
    const found = await searchYouTube(inputQuery);

    return {
      ...track,
      ...found,
      source: "youtube",
      title: found.title || inputQuery,
      query: inputQuery
    };
  }

  throw new Error("Kein gültiger Song, Link oder Suchbegriff angegeben.");
}

async function loadSavedVolumeForQueue(guildId, queue) {
  if (!queue) return DEFAULT_VOLUME_PERCENT;

  if (queue.volumeLoaded) {
    return queue.volume ?? DEFAULT_VOLUME_PERCENT;
  }

  try {
    const savedVolume = await getSavedVolumePercent(guildId);

    queue.volume = savedVolume;
    queue.volumeLoaded = true;

    return savedVolume;
  } catch (err) {
    console.error("❌ Gespeicherte Music-Lautstärke konnte nicht geladen werden:", err.message);

    queue.volume = queue.volume ?? DEFAULT_VOLUME_PERCENT;
    queue.volumeLoaded = true;

    return queue.volume;
  }
}

async function createResource(track) {
  const resolved = await resolveTrack(track);

  function getPlayableUrl(data) {
    if (!data) return null;

    function videoIdToUrl(id) {
      const cleanId = String(id || "").trim();

      if (/^[a-zA-Z0-9_-]{11}$/.test(cleanId)) {
        return "https://www.youtube.com/watch?v=" + cleanId;
      }

      return null;
    }

    function normalizeYouTubeUrl(url) {
      const value = String(url || "").trim();

      if (!value) return null;

      const directId = videoIdToUrl(value);
      if (directId) return directId;

      try {
        const parsed = new URL(value);

        if (parsed.hostname.includes("youtube.com")) {
          const v = parsed.searchParams.get("v");
          if (v) return videoIdToUrl(v);

          const shortsMatch = parsed.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
          if (shortsMatch) return videoIdToUrl(shortsMatch[1]);

          const embedMatch = parsed.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
          if (embedMatch) return videoIdToUrl(embedMatch[1]);

          const liveMatch = parsed.pathname.match(/\/live\/([a-zA-Z0-9_-]{11})/);
          if (liveMatch) return videoIdToUrl(liveMatch[1]);
        }

        if (parsed.hostname.includes("youtu.be")) {
          const id = parsed.pathname.replace("/", "").split("?")[0];
          return videoIdToUrl(id);
        }
      } catch {
        return null;
      }

      return null;
    }

    const possibleValues = [
      data.url,
      data.webpage_url,
      data.webpageUrl,
      data.original_url,
      data.originalUrl,
      data.originalUrl,
      data.id,
      data.videoId,
      data.video_id
    ];

    for (const value of possibleValues) {
      const normalized = normalizeYouTubeUrl(value);
      if (normalized) return normalized;
    }

    return null;
  }

  let playableUrl = getPlayableUrl(resolved);

  if (!playableUrl) {
    const retryQuery =
      resolved.query ||
      resolved.title ||
      track.query ||
      track.title ||
      null;

    if (retryQuery) {
      console.log("🔁 Keine direkte YouTube-URL, suche erneut:", retryQuery);

      const found = await searchYouTube(retryQuery);

      Object.assign(resolved, found);

      playableUrl = getPlayableUrl(resolved);
    }
  }

  if (!playableUrl) {
    console.error("❌ Track ohne gültige URL:", resolved);
    throw new Error("Keine gültige YouTube-URL zum Abspielen gefunden.");
  }

  resolved.url = playableUrl;
  resolved.source = "youtube";

  console.log("🎵 Spiele Track:", resolved.title || resolved.query || playableUrl);
  console.log("🔗 YouTube URL:", playableUrl);

  const child = spawn(getYtDlpPath(), [
    "-f",
    "bestaudio[ext=webm]/bestaudio/best",
    "-o",
    "-",
    "--no-playlist",
    "--quiet",
    "--no-warnings",
    "--force-ipv4",
    "--extractor-args",
    "youtube:player_client=" + getYtDlpPlayerClients(),
    playableUrl
  ], {
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stderr.on("data", data => {
    const msg = String(data || "").trim();

    if (!msg) return;
    if (msg.toLowerCase().includes("broken pipe")) return;

    console.error("yt-dlp:", msg);
  });

  child.on("error", err => {
    console.error("❌ yt-dlp Prozess Fehler:", err.message);
  });

  const resource = createAudioResource(child.stdout, {
    inputType: StreamType.Arbitrary,
    inlineVolume: true,
    metadata: {
      ...resolved,
      child
    }
  });

  return { resource, resolved };
}

function cancelLeaveTimer(guildId) {
  const timer = leaveTimers.get(guildId);

  if (timer) {
    clearTimeout(timer);
    leaveTimers.delete(guildId);
  }
}

function scheduleLeaveIfIdle(guildId) {
  cancelLeaveTimer(guildId);

  const timer = setTimeout(() => {
    const queue = queues.get(guildId);

    if (!queue) {
      leaveTimers.delete(guildId);
      return;
    }

    const status = queue.player && queue.player.state
      ? String(queue.player.state.status || "")
      : "";

    const isPaused =
      queue.paused === true ||
      status === "paused" ||
      status === "autopaused";

    const hasCurrent = Boolean(queue.current);
    const hasTracks = Array.isArray(queue.tracks) && queue.tracks.length > 0;

    if (isPaused || hasCurrent || hasTracks || queue.playing) {
      leaveTimers.delete(guildId);
      return;
    }

    let connection = queue.connection || null;

    if (!connection) {
      try {
        const { getVoiceConnection } = require("@discordjs/voice");
        connection = getVoiceConnection(guildId);
      } catch {}
    }

    if (connection) {
      connection.destroy();
      console.log("👋 Music Auto-Leave: Voice Channel verlassen wegen leerer Queue.");
    }

    queue.current = null;
    queue.playing = false;
    queue.paused = false;

    leaveTimers.delete(guildId);
  }, 60_000);

  leaveTimers.set(guildId, timer);
}

async function playNext(guildId) {
  const queue = queues.get(guildId);

  if (!queue || queue.stopped) return;

  const previousTrack = queue.current;
  let nextTrack = null;

  if (queue.loop === "track" && previousTrack && !queue.skipRequested) {
    nextTrack = previousTrack;
  } else {
    if (queue.loop === "queue" && previousTrack) {
      queue.tracks.push(previousTrack);
    }

    nextTrack = queue.tracks.shift();
  }

  queue.skipRequested = false;

  if (!nextTrack) {
    queue.current = null;
    queue.playing = false;

    if (queue.textChannel) {
      queue.textChannel
        .send("✅ Queue ist leer.")
        .catch(() => {});
    }

    scheduleLeaveIfIdle(guildId);

    return;
  }

  try {
    queue.playing = true;
    queue.paused = false;

    await loadSavedVolumeForQueue(guildId, queue);

    const data = await createResource(nextTrack);

    queue.current = data.resolved;

    if (!queue.history) {
      queue.history = [];
    }

    queue.history.unshift(data.resolved);
    queue.history = queue.history.slice(0, 20);

    if (data.resource.volume) {
      data.resource.volume.setVolume((queue.volume ?? DEFAULT_VOLUME_PERCENT) / 100);
    }

    queue.player.play(data.resource);

    if (queue.textChannel) {
      queue.textChannel
        .send("▶️ Spiele jetzt: **" + data.resolved.title + "**")
        .catch(() => {});
    }
  } catch (err) {
    console.error("❌ Track Fehler:", err);

    if (queue.textChannel) {
      queue.textChannel
        .send("❌ Konnte Track nicht abspielen: " + err.message)
        .catch(() => {});
    }

    return playNext(guildId);
  }
}

async function addTracks(interaction, tracks) {
  const queue = getOrCreateQueue(interaction.guild.id);

  await loadSavedVolumeForQueue(interaction.guild.id, queue);

  cancelLeaveTimer(interaction.guild.id);
  queue.paused = false;
  queue.stopped = false;

  await connectToVoice(interaction, queue);

  for (const track of tracks) {
    queue.tracks.push({
      ...track,
      requestedBy: interaction.user.id
    });
  }

  if (!queue.playing) {
    playNext(interaction.guild.id).catch(err => {
      console.error("❌ Music Start Fehler:", err);

      if (queue.textChannel) {
        queue.textChannel
          .send("❌ Musik konnte nicht gestartet werden: " + err.message)
          .catch(() => {});
      }
    });
  }

  return queue;
}

function getQueue(guildId) {
  return queues.get(guildId) || null;
}

function getQueueText(guildId) {
  const queue = getQueue(guildId);

  if (!queue) {
    return "❌ Es läuft aktuell keine Musik.";
  }

  const lines = [];

  if (queue.current) {
    lines.push("▶️ **Jetzt:** " + queue.current.title);
  }

  if (queue.tracks.length > 0) {
    lines.push("");
    lines.push("📜 **Queue:**");

    queue.tracks.slice(0, 10).forEach((track, index) => {
      const title = track.title || track.query || track.url || "Unbekannt";
      lines.push((index + 1) + ". " + title);
    });

    if (queue.tracks.length > 10) {
      lines.push("... und " + (queue.tracks.length - 10) + " weitere.");
    }
  } else {
    lines.push("");
    lines.push("Queue ist leer.");
  }

  return lines.join("\n");
}


function getNowPlayingText(guildId) {
  const queue = getQueue(guildId);

  if (!queue || !queue.current) {
    return "❌ Es läuft aktuell kein Track.";
  }

  return (
    "▶️ **Jetzt läuft:** " + queue.current.title + "\n" +
    "🔗 Quelle: " + (queue.current.url || "Unbekannt")
  );
}

function clearQueue(guildId) {
  const queue = getQueue(guildId);

  if (!queue) return 0;

  const count = queue.tracks.length;
  queue.tracks = [];

  return count;
}

function removeTrack(guildId, position) {
  const queue = getQueue(guildId);

  if (!queue || !queue.tracks.length) {
    return null;
  }

  const index = position - 1;

  if (index < 0 || index >= queue.tracks.length) {
    return null;
  }

  const removed = queue.tracks.splice(index, 1)[0];

  return removed;
}

function shuffleQueue(guildId) {
  const queue = getQueue(guildId);

  if (!queue || queue.tracks.length < 2) {
    return false;
  }

  for (let i = queue.tracks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = queue.tracks[i];
    queue.tracks[i] = queue.tracks[j];
    queue.tracks[j] = temp;
  }

  return true;
}


function setVolume(guildId, percent) {
  const queue = getQueue(guildId);

  if (!queue) return false;

  const volume = clampVolumePercent(percent);

  queue.volume = volume;
  queue.volumeLoaded = true;

  saveVolumePercent(guildId, volume).catch(err => {
    console.error("❌ Music-Lautstärke konnte nicht gespeichert werden:", err.message);
  });

  const resource = queue.player && queue.player.state
    ? queue.player.state.resource
    : null;

  if (resource && resource.volume) {
    resource.volume.setVolume(volume / 100);
  }

  return volume;
}

function getVolume(guildId) {
  const queue = getQueue(guildId);

  if (!queue) {
    return DEFAULT_VOLUME_PERCENT;
  }

  return queue.volume ?? DEFAULT_VOLUME_PERCENT;
}


function getHistoryText(guildId) {
  const queue = getQueue(guildId);

  if (!queue || !queue.history || queue.history.length === 0) {
    return "📜 Es gibt noch keine History.";
  }

  const lines = ["📜 **Zuletzt gespielt:**"];

  queue.history.slice(0, 10).forEach((track, index) => {
    const title = track.title || track.query || track.url || "Unbekannt";
    lines.push((index + 1) + ". " + title);
  });

  return lines.join("\n");
}

function skipTrack(guildId) {
  const queue = getQueue(guildId);

  if (!queue || !queue.playing) {
    return false;
  }

  queue.skipRequested = true;
  queue.player.stop(true);
  return true;
}

function stopMusic(guildId) {
  const queue = getQueue(guildId);

  if (!queue) return false;

  cancelLeaveTimer(guildId);

  queue.stopped = true;
  queue.tracks = [];
  queue.current = null;
  queue.playing = false;

  try {
    queue.player.stop(true);
  } catch {}

  try {
    if (queue.connection) {
      queue.connection.destroy();
    }
  } catch {}

  queues.delete(guildId);
  return true;
}

function pauseMusic(guildId) {
  const queue = getQueue(guildId);

  if (!queue) return false;

  cancelLeaveTimer(guildId);
  queue.paused = true;

  return queue.player.pause();
}

function resumeMusic(guildId) {
  const queue = getQueue(guildId);

  if (!queue) return false;

  cancelLeaveTimer(guildId);
  queue.paused = false;

  return queue.player.unpause();
}


function getLoopMode(guildId) {
  const queue = getQueue(guildId);

  if (!queue || !queue.loop) {
    return "off";
  }

  return queue.loop;
}

function toggleLoop(guildId) {
  const queue = getQueue(guildId);

  if (!queue) {
    return null;
  }

  const current = queue.loop || "off";

  if (current === "off") {
    queue.loop = "track";
  } else if (current === "track") {
    queue.loop = "queue";
  } else {
    queue.loop = "off";
  }

  return queue.loop;
}


function clearHistory(guildId) {
  const queue = getQueue(guildId);

  if (!queue || !queue.history || queue.history.length === 0) {
    return 0;
  }

  const count = queue.history.length;
  queue.history = [];

  return count;
}

module.exports = {
  addTracks,
  getQueue,
  getQueueText,
  getNowPlayingText,
  getHistoryText,
  clearHistory,
  clearQueue,
  removeTrack,
  shuffleQueue,
  setVolume,
  getVolume,
  skipTrack,
  stopMusic,
  pauseMusic,
  resumeMusic,
  getLoopMode,
  toggleLoop
};
