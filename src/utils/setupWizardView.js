const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder
} = require("discord.js");

const db = require("../database/mysql");
const { PANEL_CHANNEL_NAME } = require("./panelChannel");

const TEMPVOICE_PANEL_CHANNEL_NAME =
  process.env.TEMPVOICE_PANEL_CHANNEL_NAME || "tempvoice-panels";

const MUSIC_TABLES = [
  "music_playlists",
  "music_playlist_items",
  "music_settings"
];

function ok(text) {
  return "✅ " + text;
}

function warn(text) {
  return "⚠️ " + text;
}

function fail(text) {
  return "❌ " + text;
}

async function tableExists(tableName) {
  const [rows] = await db.execute(
    `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     LIMIT 1`,
    [tableName]
  );

  return rows.length > 0;
}

function findTextChannel(guild, name) {
  return guild.channels.cache.find(channel =>
    channel &&
    channel.type === ChannelType.GuildText &&
    channel.name === name
  );
}

async function readTempVoiceStatus(guild) {
  const lines = [];
  const hasSettingsTable = await tableExists("guild_settings");

  let settings = null;

  if (hasSettingsTable) {
    const [rows] = await db.execute(
      "SELECT creatorChannelId, categoryId FROM guild_settings WHERE guildId = ? LIMIT 1",
      [guild.id]
    );

    settings = rows[0] || null;
  }

  const creator = settings && settings.creatorChannelId
    ? guild.channels.cache.get(settings.creatorChannelId)
    : null;
  const category = settings && settings.categoryId
    ? guild.channels.cache.get(settings.categoryId)
    : null;
  const tempVoicePanel = findTextChannel(guild, TEMPVOICE_PANEL_CHANNEL_NAME);

  lines.push(settings ? ok("TempVoice Setup vorhanden") : warn("TempVoice Setup fehlt"));
  lines.push(creator ? ok("Creator Channel gefunden") : warn("Creator Channel fehlt"));
  lines.push(category ? ok("Kategorie gefunden") : warn("Kategorie fehlt"));
  lines.push(
    tempVoicePanel
      ? ok("#" + TEMPVOICE_PANEL_CHANNEL_NAME + " gefunden")
      : warn("#" + TEMPVOICE_PANEL_CHANNEL_NAME + " fehlt")
  );

  return {
    lines,
    setupReady: Boolean(settings && creator && category)
  };
}

async function readPanelStatus(guild) {
  const centralPanel = findTextChannel(guild, PANEL_CHANNEL_NAME);

  return {
    panelReady: Boolean(centralPanel),
    lines: [
      centralPanel
        ? ok("Zentralpanel #" + PANEL_CHANNEL_NAME + " gefunden")
        : warn("Zentralpanel #" + PANEL_CHANNEL_NAME + " fehlt")
    ]
  };
}

async function readMusicStatus() {
  const states = [];

  for (const table of MUSIC_TABLES) {
    states.push({
      table,
      exists: await tableExists(table)
    });
  }

  const missing = states.filter(state => !state.exists).map(state => state.table);

  return {
    ready: missing.length === 0,
    lines: [
      missing.length === 0
        ? ok("Musik/Playlist Tabellen vorhanden")
        : warn("Fehlende Tabellen: " + missing.join(", "))
    ]
  };
}

async function readIntegrationStatus(guild) {
  const lines = [];
  const webEnabled = String(process.env.WEB_PANEL_ENABLED || "false").toLowerCase() === "true";
  const spotifyValues = [
    "SPOTIFY_CLIENT_ID",
    "SPOTIFY_CLIENT_SECRET",
    "SPOTIFY_REDIRECT_URI"
  ];
  const spotifySet = spotifyValues.filter(name => Boolean(process.env[name])).length;
  const hasModlogTable = await tableExists("guild_moderation_settings");

  let modlogLine = warn("Modlog nicht eingerichtet");

  if (hasModlogTable) {
    const [rows] = await db.execute(
      "SELECT modLogChannelId, enabled FROM guild_moderation_settings WHERE guildId = ? LIMIT 1",
      [guild.id]
    );

    const settings = rows[0] || null;
    const modlogChannel = settings && settings.modLogChannelId
      ? guild.channels.cache.get(settings.modLogChannelId)
      : null;

    if (settings && Number(settings.enabled) === 1 && modlogChannel) {
      modlogLine = ok("Modlog aktiv: " + modlogChannel.toString());
    } else if (settings && Number(settings.enabled) === 1) {
      modlogLine = warn("Modlog aktiv, Channel fehlt");
    }
  }

  lines.push(webEnabled ? ok("Webpanel aktiv") : warn("Webpanel deaktiviert"));
  lines.push(
    spotifySet === spotifyValues.length
      ? ok("Spotify ENV gesetzt")
      : warn("Spotify ENV unvollständig (" + spotifySet + "/" + spotifyValues.length + ")")
  );
  lines.push(modlogLine);

  return { lines };
}

function buildRecommendedStep(tempVoiceStatus, panelStatus, musicStatus) {
  if (!tempVoiceStatus.setupReady) {
    return "⚠️ Als nächstes `/setup` ausführen oder bestehende TempVoice-Kanäle prüfen.";
  }

  if (!panelStatus.panelReady) {
    return "⚠️ Als nächstes Zentralpanel rebuild oder `/panels` im gewünschten Panel-Channel ausführen.";
  }

  if (!musicStatus.ready) {
    return "⚠️ Als nächstes Datenbanktabellen mit `npm run db:init` prüfen.";
  }

  return "✅ Grundsetup sieht gut aus.";
}

function buildNextSteps(tempVoiceStatus) {
  if (!tempVoiceStatus.setupReady) {
    return [
      "1. TempVoice mit `/setup` einrichten oder prüfen.",
      "2. Zentralpanel mit `/panelhub` oder `/panelrebuild confirm:True` vorbereiten.",
      "3. Detaildiagnose bei Bedarf über `/botstatus` öffnen."
    ];
  }

  return [
    "1. TempVoice ist grundsätzlich bereit.",
    "2. Zentralpanel und Integrationen prüfen.",
    "3. Detaildiagnose bei Bedarf über `/botstatus` öffnen."
  ];
}

function createComponents(tempVoiceStatus) {
  const tempVoiceLabel = tempVoiceStatus.setupReady
    ? "TempVoice prüfen"
    : "TempVoice einrichten";

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("setupwizard_tempvoice")
        .setLabel(tempVoiceLabel)
        .setEmoji("🎙️")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("setupwizard_panelrebuild")
        .setLabel("Zentralpanel rebuild")
        .setEmoji("🧭")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("setupwizard_botstatus")
        .setLabel("Botstatus öffnen")
        .setEmoji("🧪")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("setupwizard_refresh")
        .setLabel("Setup aktualisieren")
        .setEmoji("🔄")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("setupwizard_close")
        .setLabel("Schließen")
        .setEmoji("✖️")
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function createPanelRebuildConfirmMessage(targetChannelName) {
  const embed = new EmbedBuilder()
    .setTitle("Zentralpanel neu aufbauen?")
    .setColor(0xf59e0b)
    .setDescription(
      "Möchtest du das Zentralpanel wirklich neu aufbauen?\n\n" +
      "Ziel-Channel: **#" + targetChannelName + "**\n\n" +
      "Dabei wird die bestehende Panel-Rebuild-Logik genutzt. " +
      "Normale User-Nachrichten werden nicht gelöscht."
    )
    .setFooter({
      text: "Keine Aktion ohne Bestätigung."
    })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("setupwizard_panelrebuild_confirm")
      .setLabel("Ja, Zentralpanel neu aufbauen")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("setupwizard_panelrebuild_cancel")
      .setLabel("Abbrechen")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [row]
  };
}

async function createSetupWizardMessage(guild) {
  const tempVoiceStatus = await readTempVoiceStatus(guild);
  const panelStatus = await readPanelStatus(guild);
  const musicStatus = await readMusicStatus();
  const integrationStatus = await readIntegrationStatus(guild);

  const embed = new EmbedBuilder()
    .setTitle("TempVoicePro Setup-Assistent")
    .setColor(0x5865f2)
    .setDescription(
      "Geführter Admin-Überblick für `" + guild.name + "`. " +
      "Der Assistent prüft nur und löscht oder baut nichts ungefragt um."
    )
    .addFields(
      {
        name: "Nächster empfohlener Schritt",
        value: buildRecommendedStep(tempVoiceStatus, panelStatus, musicStatus)
      },
      {
        name: "TempVoice",
        value: tempVoiceStatus.lines.join("\n")
      },
      {
        name: "Zentralpanel",
        value: panelStatus.lines.join("\n")
      },
      {
        name: "Musik & Playlists",
        value: musicStatus.lines.join("\n")
      },
      {
        name: "Webpanel, Spotify & Modlog",
        value: integrationStatus.lines.join("\n")
      },
      {
        name: "Nächste Schritte",
        value: buildNextSteps(tempVoiceStatus).join("\n")
      }
    )
    .setFooter({
      text: "Keine Secrets werden angezeigt."
    })
    .setTimestamp();

  return {
    embeds: [embed],
    components: createComponents(tempVoiceStatus)
  };
}

module.exports = {
  createSetupWizardMessage,
  createPanelRebuildConfirmMessage
};
