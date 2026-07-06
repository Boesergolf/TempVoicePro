const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

function createPlaylistPanelEmbed() {
  return new EmbedBuilder()
    .setTitle("🎵 Playlist-Verwaltung")
    .setDescription(
      [
        "Verwalte Playlists direkt über dieses Discord-Panel.",
        "",
        "**Funktionen:**",
        "➕ Playlist erstellen",
        "📥 Song oder Link hinzufügen",
        "📋 Playlists anzeigen",
        "🔁 YouTube/Spotify Playlist importieren",
        "▶ Playlist abspielen",
        "🧹 Playlist löschen",
        "",
        "Normale Nachrichten in diesem Channel werden automatisch gelöscht."
      ].join("\n")
    )
    .setColor(0x5865f2)
    .setFooter({ text: "TempVoicePro Playlist Panel" })
    .setTimestamp();
}

function createPlaylistPanelComponents() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("playlist_panel_create")
      .setLabel("Playlist erstellen")
      .setEmoji("➕")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("playlist_panel_add")
      .setLabel("Song hinzufügen")
      .setEmoji("📥")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("playlist_panel_list")
      .setLabel("Anzeigen")
      .setEmoji("📋")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("playlist_panel_import")
      .setLabel("Importieren")
      .setEmoji("🔁")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("playlist_panel_play")
      .setLabel("Abspielen")
      .setEmoji("▶")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("playlist_panel_delete")
      .setLabel("Löschen")
      .setEmoji("🧹")
      .setStyle(ButtonStyle.Danger)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("playlist_panel_refresh")
      .setLabel("Aktualisieren")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2, row3];
}

function createPlaylistPanelMessage() {
  return {
    embeds: [createPlaylistPanelEmbed()],
    components: createPlaylistPanelComponents()
  };
}

module.exports = {
  createPlaylistPanelEmbed,
  createPlaylistPanelComponents,
  createPlaylistPanelMessage
};
