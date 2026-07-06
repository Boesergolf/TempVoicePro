const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

function backRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_hub_home")
      .setLabel("Zurück zum Kontrollzentrum")
      .setEmoji("⬅️")
      .setStyle(ButtonStyle.Secondary)
  );
}

function createPanelHubEmbed() {
  return new EmbedBuilder()
    .setTitle("🧭 TempVoicePro Kontrollzentrum")
    .setDescription(
      [
        "Ein zentrales Panel für die wichtigsten Bot-Funktionen.",
        "",
        "Die Buttons wechseln die Ansicht **in dieser einen Nachricht**.",
        "So bleibt der Panel-Channel sauber und übersichtlich.",
        "",
        "**Bereiche:**",
        "🎵 Musiksteuerung",
        "🎚️ Playlist-Verwaltung",
        "🎙️ TempVoice",
        "🎡 Glücksrad",
        "🧩 Module",
        "🧹 Panel-Aufräumen"
      ].join("\n")
    )
    .setColor(0x5865f2)
    .setFooter({ text: "TempVoicePro Zentralpanel" })
    .setTimestamp();
}

function createPanelHubComponents() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_hub_music")
      .setLabel("Musik")
      .setEmoji("🎵")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("panel_hub_playlist")
      .setLabel("Playlists")
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
      .setCustomId("panel_hub_cleanup_info")
      .setLabel("Aufräumen")
      .setEmoji("🧹")
      .setStyle(ButtonStyle.Danger)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_hub_refresh")
      .setLabel("Aktualisieren")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("panel_hub_help")
      .setLabel("Hilfe")
      .setEmoji("❔")
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2, row3];
}

function createPanelHubMessage() {
  return {
    embeds: [createPanelHubEmbed()],
    components: createPanelHubComponents()
  };
}

function createMusicHubMessage() {
  const embed = new EmbedBuilder()
    .setTitle("🎵 Musiksteuerung")
    .setDescription(
      [
        "Steuere Musik direkt über dieses Zentralpanel.",
        "",
        "Für Playlists nutze entweder **Playlist starten** oder den Bereich **Playlists**.",
        "",
        "Diese Ansicht ersetzt keine neue Nachricht, sondern wird hier im Zentralpanel angezeigt."
      ].join("\n")
    )
    .setColor(0x5865f2)
    .setFooter({ text: "TempVoicePro Musik" })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("mp_play")
      .setLabel("Play")
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("mp_playlist")
      .setLabel("Playlist starten")
      .setEmoji("🎚️")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("mp_playlists")
      .setLabel("Playlists")
      .setEmoji("📋")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
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
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("mp_stop")
      .setLabel("Stop")
      .setEmoji("⏹️")
      .setStyle(ButtonStyle.Danger)
  );

  const row3 = new ActionRowBuilder().addComponents(
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
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("mp_leave")
      .setLabel("Leave")
      .setEmoji("👋")
      .setStyle(ButtonStyle.Danger)
  );

  return {
    embeds: [embed],
    components: [row1, row2, row3, backRow()]
  };
}

function createTempVoiceHubMessage() {
  const embed = new EmbedBuilder()
    .setTitle("🎙️ TempVoice")
    .setDescription(
      [
        "TempVoice wird über `/setup` eingerichtet.",
        "",
        "Die Steuerung einzelner temporärer Räume läuft weiterhin über die jeweiligen Raum-Panels.",
        "",
        "**Sinnvoll im Zentralpanel:**",
        "• Status anzeigen",
        "• Setup-Hinweis",
        "• später globale TempVoice-Einstellungen"
      ].join("\n")
    )
    .setColor(0x5865f2)
    .setFooter({ text: "TempVoicePro TempVoice" })
    .setTimestamp();

  return {
    embeds: [embed],
    components: [backRow()]
  };
}

function createGluecksradHubMessage() {
  const embed = new EmbedBuilder()
    .setTitle("🎡 Glücksrad")
    .setDescription(
      [
        "Glücksrad-Funktionen im Zentralpanel.",
        "",
        "Für spezielle Team-/Listen-Auswahl bleibt das Glücksrad-Panel aktuell noch separat möglich.",
        "Als nächster Schritt können wir auch das komplett hier integrieren."
      ].join("\n")
    )
    .setColor(0x5865f2)
    .setFooter({ text: "TempVoicePro Glücksrad" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("gr_help")
      .setLabel("Hilfe")
      .setEmoji("❔")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("gr_list")
      .setLabel("Listen")
      .setEmoji("📋")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [row, backRow()]
  };
}

function createModulesHubMessage() {
  const embed = new EmbedBuilder()
    .setTitle("🧩 Module")
    .setDescription(
      [
        "Module direkt im Zentralpanel verwalten.",
        "",
        "Wähle ein Modul im Dropdown aus.",
        "Danach kannst du es aktivieren oder deaktivieren.",
        "",
        "**Hinweis:**",
        "Deaktivierte Module blockieren die zugehörigen Slash-Commands."
      ].join("\n")
    )
    .setColor(0x5865f2)
    .setFooter({ text: "TempVoicePro Module" })
    .setTimestamp();

  const moduleSelect = {
    type: 1,
    components: [
      {
        type: 3,
        custom_id: "panel_hub_module_select",
        placeholder: "Modul auswählen...",
        min_values: 1,
        max_values: 1,
        options: [
          {
            label: "TempVoice",
            value: "tempvoice",
            description: "Temporäre Voice Channels",
            emoji: { name: "🎙️" }
          },
          {
            label: "Music",
            value: "music",
            description: "Musiksystem",
            emoji: { name: "🎵" }
          },
          {
            label: "Playlist",
            value: "playlist",
            description: "Playlist-Verwaltung",
            emoji: { name: "🎚️" }
          },
          {
            label: "Glücksrad",
            value: "gluecksrad",
            description: "Glücksrad und Team-Auswahl",
            emoji: { name: "🎡" }
          },
          {
            label: "Panels",
            value: "panels",
            description: "Panel-System",
            emoji: { name: "🧭" }
          },
          {
            label: "ChatGPT",
            value: "chatgpt",
            description: "ChatGPT Command",
            emoji: { name: "🤖" }
          },
          {
            label: "Moderation",
            value: "moderation",
            description: "Warns, Timeout, Ban, Auto-Mod",
            emoji: { name: "🛡️" }
          }
        ]
      }
    ]
  };

  return {
    embeds: [embed],
    components: [moduleSelect, backRow()]
  };
}

function createCleanupHubMessage() {
  const embed = new EmbedBuilder()
    .setTitle("🧹 Panel-Channel aufräumen")
    .setDescription(
      [
        "Für ein sauberes Ein-Panel-System nutze:",
        "",
        "`/panelrebuild confirm:True`",
        "",
        "Das löscht alte Bot-Panel-Nachrichten und erstellt nur noch das Zentralpanel neu.",
        "",
        "Normale User-Nachrichten werden standardmäßig nicht gelöscht."
      ].join("\n")
    )
    .setColor(0xef4444)
    .setFooter({ text: "TempVoicePro Panel Ordnung" })
    .setTimestamp();

  return {
    embeds: [embed],
    components: [backRow()]
  };
}

function createHelpHubMessage() {
  const embed = new EmbedBuilder()
    .setTitle("❔ Hilfe zum Zentralpanel")
    .setDescription(
      [
        "Dieses Panel soll künftig der zentrale Einstieg sein.",
        "",
        "**Wichtig:**",
        "Die Bereichsbuttons erzeugen keine neuen Panels mehr.",
        "Sie wechseln nur die Ansicht dieser einen Nachricht.",
        "",
        "**Empfehlung:**",
        "Einmal `/panelrebuild confirm:True` ausführen und danach mit diesem Zentralpanel arbeiten."
      ].join("\n")
    )
    .setColor(0x5865f2)
    .setFooter({ text: "TempVoicePro Hilfe" })
    .setTimestamp();

  return {
    embeds: [embed],
    components: [backRow()]
  };
}

module.exports = {
  createPanelHubEmbed,
  createPanelHubComponents,
  createPanelHubMessage,
  createMusicHubMessage,
  createTempVoiceHubMessage,
  createGluecksradHubMessage,
  createModulesHubMessage,
  createCleanupHubMessage,
  createHelpHubMessage
};
