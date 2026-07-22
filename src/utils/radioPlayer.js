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

const { spawn, execFile } = require("child_process");
const { stopMusic } = require("./musicPlayer");
const {
  DEFAULT_VOLUME_PERCENT,
  clampVolumePercent,
  getSavedVolumePercent
} = require("./musicSettings");

const radios = new Map();

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

function getRadioTitleFromUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "") || "Radiostream";
  } catch {
    return "Radiostream";
  }
}

function commandAvailable(command) {
  return new Promise(resolve => {
    execFile(command, ["-version"], {
      timeout: 5000
    }, error => {
      resolve(!error);
    });
  });
}

async function ensureFfmpegAvailable() {
  const available = await commandAvailable("ffmpeg");

  if (!available) {
    throw new Error("ffmpeg wurde nicht gefunden. Installiere es mit: apt install -y ffmpeg");
  }
}

function looksLikePlaylistUrl(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();

    return (
      path.endsWith(".m3u") ||
      path.endsWith(".pls")
    );
  } catch {
    return false;
  }
}

async function fetchSmallText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "TempVoicePro Radio Player"
      }
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const text = await response.text();

    return text.slice(0, 20000);
  } finally {
    clearTimeout(timeout);
  }
}

function parseM3u(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .find(line => !line.startsWith("#") && isHttpUrl(line)) || null;
}

function parsePls(text) {
  const lines = String(text || "").split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^File\d+=(.+)$/i);

    if (match && isHttpUrl(match[1].trim())) {
      return match[1].trim();
    }
  }

  return null;
}

async function resolveRadioUrl(url) {
  const cleanUrl = String(url || "").trim();

  if (!isHttpUrl(cleanUrl)) {
    throw new Error("Bitte gib eine gültige http:// oder https:// Stream-URL an.");
  }

  if (!looksLikePlaylistUrl(cleanUrl)) {
    return cleanUrl;
  }

  const text = await fetchSmallText(cleanUrl);
  const lower = cleanUrl.toLowerCase();

  const resolved = lower.endsWith(".pls")
    ? parsePls(text)
    : parseM3u(text);

  if (!resolved) {
    throw new Error("Die Playlist-Datei konnte nicht in eine direkte Stream-URL aufgelöst werden.");
  }

  return resolved;
}

function stopRadio(guildId) {
  const radio = radios.get(guildId);

  if (!radio) {
    return false;
  }

  try {
    if (radio.ffmpeg && !radio.ffmpeg.killed) {
      radio.ffmpeg.kill("SIGTERM");
    }
  } catch {}

  try {
    if (radio.player) {
      radio.player.stop(true);
    }
  } catch {}

  try {
    if (radio.connection) {
      radio.connection.destroy();
    }
  } catch {}

  radios.delete(guildId);

  return true;
}

async function playRadioStream(interaction, inputUrl, name = null) {
  if (!interaction.guild) {
    throw new Error("Radio kann nur auf einem Server gestartet werden.");
  }

  const voiceChannel = interaction.member?.voice?.channel;

  if (!voiceChannel) {
    throw new Error("Du bist in keinem Voice Channel.");
  }

  await ensureFfmpegAvailable();

  const originalUrl = String(inputUrl || "").trim();
  const streamUrl = await resolveRadioUrl(originalUrl);

  stopRadio(interaction.guild.id);
  stopMusic(interaction.guild.id);

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: interaction.guild.id,
    adapterCreator: interaction.guild.voiceAdapterCreator,
    selfDeaf: true
  });

  await entersState(connection, VoiceConnectionStatus.Ready, 20000);

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play
    }
  });

  const ffmpeg = spawn("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "warning",
    "-reconnect",
    "1",
    "-reconnect_streamed",
    "1",
    "-reconnect_delay_max",
    "5",
    "-i",
    streamUrl,
    "-vn",
    "-f",
    "s16le",
    "-ar",
    "48000",
    "-ac",
    "2",
    "pipe:1"
  ], {
    stdio: ["ignore", "pipe", "pipe"]
  });

  ffmpeg.stderr.on("data", chunk => {
    if (process.env.RADIO_DEBUG === "true") {
      const text = String(chunk || "").trim();

      if (text) {
        console.warn("⚠️ Radio ffmpeg:", text.slice(0, 500));
      }
    }
  });

  ffmpeg.on("error", error => {
    console.error("❌ Radio ffmpeg Fehler:", error.message);
  });

  const resource = createAudioResource(ffmpeg.stdout, {
    inputType: StreamType.Raw,
    inlineVolume: true
  });

  let volume = DEFAULT_VOLUME_PERCENT;

  try {
    volume = await getSavedVolumePercent(interaction.guild.id);
  } catch (err) {
    console.error("❌ Gespeicherte Radio-Lautstärke konnte nicht geladen werden:", err.message);
  }

  if (resource.volume) {
    resource.volume.setVolume(clampVolumePercent(volume) / 100);
  }

  const title = cleanTitle(name) || getRadioTitleFromUrl(streamUrl);

  const radio = {
    guildId: interaction.guild.id,
    title,
    originalUrl,
    streamUrl,
    voiceChannelId: voiceChannel.id,
    player,
    connection,
    ffmpeg,
    resource,
    volume: clampVolumePercent(volume),
    startedAt: Date.now(),
    requestedBy: interaction.user.id
  };

  radios.set(interaction.guild.id, radio);

  player.on(AudioPlayerStatus.Idle, () => {
    const current = radios.get(interaction.guild.id);

    if (current && current.ffmpeg === ffmpeg) {
      radios.delete(interaction.guild.id);
    }
  });

  player.on("error", error => {
    console.error("❌ Radio Player Fehler:", error.message);
    stopRadio(interaction.guild.id);
  });

  ffmpeg.once("close", () => {
    const current = radios.get(interaction.guild.id);

    if (current && current.ffmpeg === ffmpeg) {
      radios.delete(interaction.guild.id);
    }
  });

  connection.subscribe(player);
  player.play(resource);

  return radio;
}

function getRadio(guildId) {
  return radios.get(guildId) || null;
}

function setRadioVolume(guildId, percent) {
  const radio = getRadio(guildId);

  if (!radio) {
    return false;
  }

  const volume = clampVolumePercent(percent);

  radio.volume = volume;

  const resource = radio.resource || (
    radio.player && radio.player.state
      ? radio.player.state.resource
      : null
  );

  if (resource && resource.volume) {
    resource.volume.setVolume(volume / 100);
  }

  return volume;
}

function getRadioText(guildId) {
  const radio = getRadio(guildId);

  if (!radio) {
    return "📻 Es läuft aktuell kein Radio.";
  }

  const minutes = Math.max(0, Math.floor((Date.now() - radio.startedAt) / 60000));

  return [
    "📻 **Radio läuft:** " + radio.title,
    "🔗 Stream: " + radio.streamUrl,
    radio.originalUrl !== radio.streamUrl ? "📄 Playlist: " + radio.originalUrl : null,
    "⏱ Läuft seit: " + minutes + " Minute(n)"
  ].filter(Boolean).join("\n");
}

module.exports = {
  playRadioStream,
  stopRadio,
  getRadio,
  setRadioVolume,
  getRadioText,
  resolveRadioUrl
};
