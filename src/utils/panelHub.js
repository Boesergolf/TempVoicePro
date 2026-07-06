const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

function createPanelHubEmbed() {
  return new EmbedBuilder()
    .setTitle("🧭 TempVoicePro Kontrollzentrum")
    .setDescription(
      [
        "Zentrale Übersicht für die wichtigsten Bot-Panels.",
        "",
        "Damit der Panel-Channel nicht komplett zur Tapetenrolle wird, sollten hier nur die wichtigsten Hauptpanels liegen.",
        "",
        "**Empfohlene Struktur:**",
        "🧭 Kontrollzentrum",
        "🎵 Music Panel",
        "🎚️ Playlist Panel",
        "🎙️ TempVoice Status",
        "🎡 Glücksrad Panel",
        "🧩 Module Panel",
        "",
        "Normale Nachrichten in diesem Channel werden automatisch gelöscht."
      ].join("\n")
    )
    .setColor(0x5865f2)
    .setFooter({ text: "TempVoicePro Panel Hub" })
    .setTimestamp();
}

function createPanelHubComponents() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_hub_music")
      .setLabel("Music Panel")
      .setEmoji("🎵")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("panel_hub_playlist")
      .setLabel("Playlist Panel")
      .setEmoji("🎚️")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("panel_hub_tempvoice")
      .setLabel("TempVoice")
      .setEmoji("🎙️")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_hub_gluecksrad")
      .setLabel("Glücksrad")
      .setEmoji("🎡")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("panel_hub_modules")
      .setLabel("Module")
      .setEmoji("🧩")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("panel_hub_help")
      .setLabel("Hilfe")
      .setEmoji("❔")
      .setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_hub_refresh")
      .setLabel("Aktualisieren")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("panel_hub_cleanup_info")
      .setLabel("Aufräumen")
      .setEmoji("🧹")
      .setStyle(ButtonStyle.Danger)
  );

  return [row1, row2, row3];
}

function createPanelHubMessage() {
  return {
    embeds: [createPanelHubEmbed()],
    components: createPanelHubComponents()
  };
}

module.exports = {
  createPanelHubEmbed,
  createPanelHubComponents,
  createPanelHubMessage
};
