const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const musicPlayer = require("./musicPlayer");

function getQueueSafe(guildId) {
  if (typeof musicPlayer.getQueue !== "function") {
    return null;
  }

  return musicPlayer.getQueue(guildId);
}

function getVolumeSafe(guildId) {
  if (typeof musicPlayer.getVolume !== "function") {
    return "Unbekannt";
  }

  const volume = musicPlayer.getVolume(guildId);

  if (volume === false || volume === null || volume === undefined) {
    return "Standard";
  }

  return String(volume) + "%";
}

function getPlayerStatusLabel(queue) {
  if (!queue) {
    return "⚫ Leer";
  }

  if (queue.paused) {
    return "⏸️ Pausiert";
  }

  if (queue.playing || queue.current) {
    return "▶️ Spielt";
  }

  if (Array.isArray(queue.tracks) && queue.tracks.length > 0) {
    return "📜 Wartet";
  }

  return "⚫ Leer";
}

function getCurrentTrackLabel(queue) {
  if (!queue || !queue.current) {
    return "Kein aktueller Song";
  }

  return queue.current.title ||
    queue.current.query ||
    queue.current.url ||
    "Unbekannter Track";
}

function getQueueLength(queue) {
  if (!queue || !Array.isArray(queue.tracks)) {
    return 0;
  }

  return queue.tracks.length;
}

function getLoopLabel(queue) {
  if (!queue || !queue.loop) {
    return "Aus";
  }

  if (queue.loop === "track") {
    return "Track";
  }

  if (queue.loop === "queue") {
    return "Queue";
  }

  return String(queue.loop);
}

function createMusicCentralEmbed(guildId) {
  const queue = getQueueSafe(guildId);
  const queueLength = getQueueLength(queue);
  const current = getCurrentTrackLabel(queue);

  const nextTracks = queue && Array.isArray(queue.tracks) && queue.tracks.length
    ? queue.tracks.slice(0, 5).map((track, index) => {
        const title = track.title || track.query || track.url || "Unbekannt";
        return "**" + (index + 1) + ".** " + title;
      }).join("\n")
    : "Keine weiteren Songs in der Queue.";

  return new EmbedBuilder()
    .setTitle("🎵 Musiksteuerung")
    .setDescription(
      [
        "Musiksteuerung direkt im Zentralpanel.",
        "",
        "**Status:** " + getPlayerStatusLabel(queue),
        "**Aktueller Song:** " + current,
        "**Queue:** " + queueLength + " weitere Songs",
        "**Lautstärke:** " + getVolumeSafe(guildId),
        "**Loop:** " + getLoopLabel(queue),
        "",
        "**Nächste Songs:**",
        nextTracks
      ].join("\n")
    )
    .setColor(queue && (queue.playing || queue.current) ? 0x22c55e : 0x5865f2)
    .setFooter({ text: "TempVoicePro Musik Zentralpanel" })
    .setTimestamp();
}

function createMusicCentralRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("mp_play")
      .setLabel("Play")
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("mp_pause")
      .setLabel("Pause")
      .setEmoji("⏸️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("mp_resume")
      .setLabel("Weiter")
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("mp_skip")
      .setLabel("Skip")
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("mp_stop")
      .setLabel("Stop")
      .setEmoji("⏹️")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("mp_queue")
      .setLabel("Queue")
      .setEmoji("📜")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("mp_now")
      .setLabel("Now")
      .setEmoji("🎧")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("mp_volume")
      .setLabel("Volume")
      .setEmoji("🔊")
      .setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("mp_playlist")
      .setLabel("Playlist starten")
      .setEmoji("🎚️")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("mp_playlists")
      .setLabel("Playlists")
      .setEmoji("📋")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("panel_hub_music_refresh")
      .setLabel("Aktualisieren")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("panel_hub_home")
      .setLabel("Zurück")
      .setEmoji("⬅️")
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2, row3];
}

function createMusicCentralMessage(guildId) {
  return {
    embeds: [createMusicCentralEmbed(guildId)],
    components: createMusicCentralRows()
  };
}

function isCentralMusicPanelMessage(message) {
  if (!message) {
    return false;
  }

  const embed = message.embeds && message.embeds[0];

  if (!embed) {
    return false;
  }

  const footer = embed.footer && embed.footer.text
    ? embed.footer.text
    : "";

  const title = embed.title || "";

  return footer.includes("TempVoicePro Musik Zentralpanel") ||
    title.includes("Musiksteuerung");
}


function createMusicBackRows() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_hub_music")
      .setLabel("Zurück zur Musik")
      .setEmoji("🎵")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("panel_hub_home")
      .setLabel("Zurück zum Kontrollzentrum")
      .setEmoji("⬅️")
      .setStyle(ButtonStyle.Secondary)
  );

  return [row];
}

function createMusicQueueCentralMessage(guildId) {
  const queue = getQueueSafe(guildId);

  const lines = [];

  if (queue && queue.current) {
    lines.push("▶️ **Jetzt:** " + getCurrentTrackLabel(queue));
    lines.push("");
  }

  if (queue && Array.isArray(queue.tracks) && queue.tracks.length > 0) {
    queue.tracks.slice(0, 20).forEach((track, index) => {
      const title = track.title || track.query || track.url || "Unbekannt";
      lines.push("**" + (index + 1) + ".** " + title);
    });

    if (queue.tracks.length > 20) {
      lines.push("");
      lines.push("... und **" + (queue.tracks.length - 20) + "** weitere Songs.");
    }
  }

  if (lines.length === 0) {
    lines.push("📭 Die Queue ist leer.");
  }

  const embed = new EmbedBuilder()
    .setTitle("📜 Musik Queue")
    .setDescription(lines.join("\n").slice(0, 4000))
    .setColor(0x5865f2)
    .setFooter({ text: "TempVoicePro Musik Queue" })
    .setTimestamp();

  return {
    embeds: [embed],
    components: createMusicBackRows()
  };
}

function createMusicNowCentralMessage(guildId) {
  const queue = getQueueSafe(guildId);

  const current = queue && queue.current
    ? queue.current
    : null;

  const description = current
    ? [
        "▶️ **Jetzt läuft:**",
        current.title || current.query || current.url || "Unbekannter Track",
        "",
        "🔗 Quelle:",
        current.url || current.originalUrl || "Unbekannt",
        "",
        "**Status:** " + getPlayerStatusLabel(queue),
        "**Lautstärke:** " + getVolumeSafe(guildId),
        "**Loop:** " + getLoopLabel(queue)
      ].join("\n")
    : "❌ Es läuft aktuell keine Musik.";

  const embed = new EmbedBuilder()
    .setTitle("🎧 Now Playing")
    .setDescription(description)
    .setColor(current ? 0x22c55e : 0x5865f2)
    .setFooter({ text: "TempVoicePro Musik Now" })
    .setTimestamp();

  return {
    embeds: [embed],
    components: createMusicBackRows()
  };
}

module.exports = {
  createMusicCentralEmbed,
  createMusicCentralRows,
  createMusicCentralMessage,
  createMusicQueueCentralMessage,
  createMusicNowCentralMessage,
  isCentralMusicPanelMessage
};
