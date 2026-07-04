const fs = require("fs");
const { spawn } = require("child_process");

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

function getYtDlpPath() {
  if (process.env.YTDLP_PATH) {
    return process.env.YTDLP_PATH;
  }

  if (fs.existsSync("/usr/local/bin/yt-dlp")) {
    return "/usr/local/bin/yt-dlp";
  }

  return "yt-dlp";
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
    stopped: false
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
  const searchQuery = cleanTitle(query);

  if (!searchQuery) {
    throw new Error("Kein Suchbegriff gefunden.");
  }

  const results = await play.search(searchQuery, {
    limit: 5,
    source: {
      youtube: "video"
    }
  });

  if (!results || results.length === 0) {
    throw new Error("Kein YouTube-Treffer gefunden.");
  }

  const result = results.find(item => {
    if (!item || !item.url) return false;
    return Boolean(makeYouTubeVideoUrl(item.url));
  });

  if (!result) {
    throw new Error("Kein gültiger YouTube-Video-Treffer gefunden.");
  }

  return {
    title: cleanTitle(result.title || searchQuery),
    url: makeYouTubeVideoUrl(result.url)
  };
}

async function resolveTrack(track) {
  let source = track.source || "url";
  let input = track.url || track.query || track.title;
  let title = cleanTitle(track.title);
  let playableUrl = null;

  if (!input) {
    throw new Error("Kein Track angegeben.");
  }

  if (isHttpUrl(input)) {
    source = detectSource(input);
  }

  if (isYouTubePlaylistUrl(input)) {
    throw new Error("Das ist ein YouTube-Playlist-Link. Bitte nutze zuerst /playlist import und danach /music playlist.");
  }

  if (source === "youtube" && isHttpUrl(input)) {
    playableUrl = makeYouTubeVideoUrl(input);

    if (!playableUrl) {
      throw new Error("Das ist keine gültige YouTube-Video-URL.");
    }

    if (!title) {
      const info = await play.video_basic_info(playableUrl).catch(() => null);
      title = cleanTitle(info?.video_details?.title) || playableUrl;
    }

    return {
      source: "youtube",
      title,
      url: playableUrl,
      playableUrl,
      requestedBy: track.requestedBy
    };
  }

  if (source === "spotify") {
    if (!title && isHttpUrl(input)) {
      const metadata = await getMetadataForUrl(input).catch(() => null);
      title = cleanTitle(metadata?.displayTitle || metadata?.title);
    }

    if (!title) {
      throw new Error("Spotify-Track hat keinen Titel. Bitte speichere ihn mit Titel oder importiere ihn vorher.");
    }

    const result = await searchYouTube(title);

    return {
      source: "youtube",
      title,
      url: track.url || result.url,
      playableUrl: result.url,
      requestedBy: track.requestedBy
    };
  }

  const searchQuery = cleanTitle(track.query || title || input);
  const result = await searchYouTube(searchQuery);

  return {
    source: "youtube",
    title: cleanTitle(title || result.title || searchQuery),
    url: result.url,
    playableUrl: result.url,
    requestedBy: track.requestedBy
  };
}

async function createResource(track) {
  const resolved = await resolveTrack(track);

  if (!resolved.playableUrl) {
    throw new Error("Keine gültige YouTube-URL zum Abspielen gefunden.");
  }

  console.log("🎵 Spiele Track:", resolved.title);
  console.log("🔗 YouTube URL:", resolved.playableUrl);

  const ytDlpPath = getYtDlpPath();

  const args = [
    "-f",
    "bestaudio[ext=webm]/bestaudio/best",
    "-o",
    "-",
    "--no-playlist",
    "--quiet",
    "--no-warnings",
    "--force-ipv4",
    "--extractor-args",
    "youtube:player_client=android,web",
    resolved.playableUrl
  ];

  const child = spawn(ytDlpPath, args, {
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stderr = "";

  child.stderr.on("data", chunk => {
    stderr += chunk.toString();

    if (stderr.length > 5000) {
      stderr = stderr.slice(-5000);
    }
  });

  child.on("error", err => {
    console.error("❌ yt-dlp Startfehler:", err);
  });

  child.on("close", code => {
    if (code !== 0 && code !== null) {
      console.error("❌ yt-dlp beendet mit Code " + code);

      if (stderr.trim()) {
        console.error(stderr.trim());
      }
    }
  });

  const resource = createAudioResource(child.stdout, {
    inputType: StreamType.Arbitrary,
    metadata: resolved
  });

  return {
    resource,
    resolved
  };
}

async function playNext(guildId) {
  const queue = queues.get(guildId);

  if (!queue || queue.stopped) return;

  const nextTrack = queue.tracks.shift();

  if (!nextTrack) {
    queue.current = null;
    queue.playing = false;

    if (queue.textChannel) {
      queue.textChannel
        .send("✅ Queue ist leer.")
        .catch(() => {});
    }

    return;
  }

  try {
    queue.playing = true;

    const data = await createResource(nextTrack);

    queue.current = data.resolved;
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

  await connectToVoice(interaction, queue);

  for (const track of tracks) {
    queue.tracks.push({
      ...track,
      requestedBy: interaction.user.id
    });
  }

  if (!queue.playing) {
    await playNext(interaction.guild.id);
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

function skipTrack(guildId) {
  const queue = getQueue(guildId);

  if (!queue || !queue.playing) {
    return false;
  }

  queue.player.stop(true);
  return true;
}

function stopMusic(guildId) {
  const queue = getQueue(guildId);

  if (!queue) return false;

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

  return queue.player.pause();
}

function resumeMusic(guildId) {
  const queue = getQueue(guildId);

  if (!queue) return false;

  return queue.player.unpause();
}

module.exports = {
  addTracks,
  getQueue,
  getQueueText,
  skipTrack,
  stopMusic,
  pauseMusic,
  resumeMusic
};
