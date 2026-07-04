const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const musicPlayer = require("./musicPlayer");

function cleanText(text, max = 1000) {
  const value = String(text || "Keine Daten.").trim();

  if (value.length <= max) {
    return value;
  }

  return value.slice(0, max - 20) + "\n... gekürzt";
}

function safeNowPlaying(guildId) {
  if (typeof musicPlayer.getNowPlayingText !== "function") {
    return "Keine Now-Playing Funktion gefunden.";
  }

  return musicPlayer.getNowPlayingText(guildId);
}

function safeQueue(guildId) {
  if (typeof musicPlayer.getQueueText !== "function") {
    return "Keine Queue Funktion gefunden.";
  }

  return musicPlayer.getQueueText(guildId);
}

function safeVolume(guildId) {
  if (typeof musicPlayer.getVolume !== "function") {
    return "Standard";
  }

  const volume = musicPlayer.getVolume(guildId);

  if (volume === false || volume === null || volume === undefined) {
    return "Standard";
  }

  return String(volume) + "%";
}

function safeLoop(guildId) {
  if (typeof musicPlayer.getLoopMode !== "function") {
    return "Aus";
  }

  const mode = musicPlayer.getLoopMode(guildId);

  if (mode === "track") return "Track";
  if (mode === "queue") return "Queue";

  return "Aus";
}

function createMusicPanelEmbed(guildId) {
  return new EmbedBuilder()
    .setTitle("🎵 Music Player")
    .setColor("Orange")
    .setDescription(
      "Steuere den Musikplayer direkt über die Buttons.\n\n" +
      "Du musst zum Abspielen in einem Voice Channel sein."
    )
    .addFields(
      {
        name: "📡 Status",
        value:
          "🔊 Lautstärke: **" + safeVolume(guildId) + "**\n" +
          "🔁 Loop: **" + safeLoop(guildId) + "**\n" +
          "🔄 Anzeige kann mit Refresh aktualisiert werden."
      },
      {
        name: "🎵 Aktuell",
        value: cleanText(safeNowPlaying(guildId), 1000)
      },
      {
        name: "📜 Queue",
        value: cleanText(safeQueue(guildId), 1000)
      },
      {
        name: "Spotify Hinweis",
        value: "Spotify-Links werden erkannt und über YouTube gesucht."
      }
    )
    .setFooter({
      text: "TempVoicePro Music Panel"
    })
    .setTimestamp();
}

function createMusicPanelRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("mp_play")
      .setLabel("▶ Play")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("mp_playlist")
      .setLabel("📂 Playlist")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("mp_playlists")
      .setLabel("📋 Playlists")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("mp_queue")
      .setLabel("📜 Queue")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("mp_now")
      .setLabel("🎵 Now")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("mp_pause")
      .setLabel("⏸ Pause")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("mp_resume")
      .setLabel("▶ Resume")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("mp_skip")
      .setLabel("⏭ Skip")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("mp_stop")
      .setLabel("⏹ Stop")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("mp_leave")
      .setLabel("👋 Leave")
      .setStyle(ButtonStyle.Danger)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("mp_clear")
      .setLabel("🧹 Clear")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("mp_shuffle")
      .setLabel("🔀 Shuffle")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("mp_remove")
      .setLabel("🗑 Remove")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("mp_volume")
      .setLabel("🔊 Volume")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("mp_refresh")
      .setLabel("🔄 Refresh")
      .setStyle(ButtonStyle.Success)
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("mp_loop")
      .setLabel("🔁 Loop")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("mp_history")
      .setLabel("📜 History")
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2, row3, row4];
}

async function refreshMusicPanelMessage(interaction) {
  try {
    if (!interaction.message || !interaction.message.edit) {
      return false;
    }

    await interaction.message.edit({
      embeds: [createMusicPanelEmbed(interaction.guild.id)],
      components: createMusicPanelRows()
    });

    return true;
  } catch (err) {
    console.error("❌ Music Panel Refresh Fehler:", err.message);
    return false;
  }
}

async function refreshLatestMusicPanel(interaction) {
  try {
    if (!interaction.guild || !interaction.client) {
      return false;
    }

    const panelChannel = interaction.guild.channels.cache.find(channel =>
      channel &&
      channel.name === "music-player" &&
      typeof channel.isTextBased === "function" &&
      channel.isTextBased()
    );

    if (!panelChannel) {
      return false;
    }

    const messages = await panelChannel.messages.fetch({ limit: 25 });

    const panelMessage = messages.find(message =>
      message.author &&
      message.author.id === interaction.client.user.id &&
      message.embeds &&
      message.embeds.some(embed =>
        String(embed.title || "").includes("Music Player")
      )
    );

    if (!panelMessage) {
      return false;
    }

    await panelMessage.edit({
      embeds: [createMusicPanelEmbed(interaction.guild.id)],
      components: createMusicPanelRows()
    });

    return true;
  } catch (err) {
    console.error("❌ Latest Music Panel Refresh Fehler:", err.message);
    return false;
  }
}

module.exports = {
  createMusicPanelEmbed,
  createMusicPanelRows,
  refreshMusicPanelMessage,
  refreshLatestMusicPanel
};
