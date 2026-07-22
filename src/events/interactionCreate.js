const {
  handleModuleSelect
} = require("../utils/modulePanelActions");

const {
  isModuleEnabled
} = require("../utils/guildModules");

const fs = require("fs");
const path = require("path");
const db = require("../database/mysql");
const luckWheel = require("../utils/luckWheel");
const { addTracks, setVolume, removeTrack } = require("../utils/musicPlayer");
const { detectSource, getMetadataForUrl } = require("../utils/musicMetadata");
const { refreshLatestMusicPanel } = require("../utils/musicPanelView");
const {
  refreshCentralPanelInGuild
} = require("../utils/centralPanelAutoRefresh");
const {
  createMusicCentralMessage
} = require("../utils/panelHubMusic");
const {
  getRadioPresetById,
  searchLocalRadioPresets,
  fetchRadioBrowserResults,
  getCachedSearchResult,
  createSearchResultSelectMessage
} = require("../utils/radioPresets");
const {
  installTemporaryInteractionReplyCleanup
} = require("../utils/temporaryInteractionReply");
const {
  deferEphemeral,
  editOrReplyEphemeral,
  replyEphemeral,
  safeReplyEphemeral
} = require("../utils/interactionReplies");
const {
  handlePanelHubModuleSelect,
  handlePanelHubModuleButton
} = require("../utils/panelHubModuleActions");
const {
  handlePlaylistPanelModal,
  handlePlaylistPanelSelect,
  handlePlaylistSelectedButton
} = require("../utils/playlistPanelActions");


function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function refreshMusicPanelsAfterRadioChange(interaction) {
  if (typeof refreshLatestMusicPanel === "function") {
    await refreshLatestMusicPanel(interaction).catch(error => {
      console.warn("⚠️ Radio Music-Panel Refresh fehlgeschlagen:", error.message);
    });
  }

  if (interaction.guild && interaction.client) {
    await refreshCentralPanelInGuild(interaction.guild, interaction.client).catch(error => {
      console.warn("⚠️ Radio Zentralpanel Refresh fehlgeschlagen:", error.message);
    });
  }
}

async function playMusicInput(interaction, input) {
  const value = String(input || "").trim();

  if (!value) {
    return interaction.editReply("❌ Bitte gib einen Song, YouTube-Link oder Spotify-Link ein.");
  }

  if (isHttpUrl(value)) {
    const source = detectSource(value);

    if (source === "spotify") {
      const metadata = await getMetadataForUrl(value).catch(err => {
        console.log("⚠️ Spotify-Metadaten konnten nicht gelesen werden:", err.message);
        return null;
      });

      const title =
        metadata?.displayTitle ||
        metadata?.title ||
        null;

      if (!title) {
        return interaction.editReply(
          "❌ Spotify-Link erkannt, aber ich konnte den Titel nicht lesen. Bitte gib den Songnamen direkt ein."
        );
      }

      console.log("🟢 Spotify-Link erkannt, suche über YouTube:", title);

      await addTracks(interaction, [{
        source: "search",
        query: title,
        title: title,
        originalSource: "spotify",
        originalUrl: value
      }]);

      await refreshLatestMusicPanel(interaction);

      return interaction.editReply(
        "✅ Spotify-Link erkannt. Ich suche **" + title + "** über YouTube und füge es zur Queue hinzu."
      );
    }

    if (source === "youtube") {
      console.log("🔴 YouTube-Link erkannt, spiele direkten Link:", value);

      await addTracks(interaction, [{
        source: "youtube",
        url: value,
        title: value
      }]);

      await refreshLatestMusicPanel(interaction);

      return interaction.editReply("✅ YouTube-Link wurde direkt zur Queue hinzugefügt.");
    }

    console.log("🔗 Link erkannt, spiele direkten Link:", value);

    await addTracks(interaction, [{
      source: source || "url",
      url: value,
      title: value
    }]);

    await refreshLatestMusicPanel(interaction);

    return interaction.editReply("✅ Link wurde direkt zur Queue hinzugefügt.");
  }

  await addTracks(interaction, [{
    source: "search",
    query: value,
    title: value
  }]);

  await refreshLatestMusicPanel(interaction).catch(() => null);

  if (
    interaction.message &&
    interaction.message.edit &&
    interaction.customId === "mp_play_modal"
  ) {
    await interaction.message.edit(
      createMusicCentralMessage(interaction.guild.id)
    ).catch(() => null);
  }

  await interaction.editReply("✅ Track wurde zur Queue hinzugefügt.").catch(() => null);

  setTimeout(() => {
    interaction.deleteReply().catch(() => null);
  }, Number(process.env.EPHEMERAL_REPLY_DELETE_MS || 5000));

  return;
}


function normalizeMusicPlaylistName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

function getMusicPlaylistOwnerKey(scope, userId) {
  return scope === "global" ? "GLOBAL" : userId;
}

async function playMusicPlaylistFromPanel(interaction, playlistName, scopeRaw) {
  const name = normalizeMusicPlaylistName(playlistName);
  const scopeValue = String(scopeRaw || "user").trim().toLowerCase();
  const scope = scopeValue === "global" ? "global" : "user";

  if (!name) {
    return interaction.editReply("❌ Bitte gib einen Playlist-Namen ein.");
  }

  const ownerKey = getMusicPlaylistOwnerKey(scope, interaction.user.id);

  const [playlistRows] = await db.execute(
    "SELECT * FROM music_playlists WHERE guildId = ? AND ownerKey = ? AND scope = ? AND name = ?",
    [interaction.guild.id, ownerKey, scope, name]
  );

  const playlist = playlistRows[0];

  if (!playlist) {
    return interaction.editReply("❌ Playlist wurde nicht gefunden.");
  }

  const [items] = await db.execute(
    "SELECT * FROM music_playlist_items WHERE playlistId = ? ORDER BY position ASC LIMIT 100",
    [playlist.id]
  );

  if (items.length === 0) {
    return interaction.editReply("❌ Diese Playlist ist leer.");
  }

  const tracks = items.map(item => ({
    source: item.source,
    title: item.title,
    url: item.url
  }));

  await addTracks(interaction, tracks);

  return interaction.editReply(
    "✅ Playlist **" + playlist.name + "** wurde gestartet.\n" +
    "Scope: **" + scope + "**\n" +
    "Einträge geladen: **" + tracks.length + "**"
  );
}

async function hasTempVoiceAccess(userId, channelId) {
  const [rows] = await db.execute(
    "SELECT * FROM temp_permissions WHERE channelId = ?",
    [channelId]
  );

  const data = rows[0];
  if (!data) return false;

  let coOwners = [];

  try {
    coOwners = JSON.parse(data.coOwners || "[]");
  } catch {
    coOwners = [];
  }

  return data.ownerId === userId || coOwners.includes(userId);
}

const COMMAND_MODULES = {
  setup: "tempvoice",
  stats: "tempvoice",
  lock: "tempvoice",
  unlock: "tempvoice",
  rename: "tempvoice",
  addcoowner: "tempvoice",
  removecoowner: "tempvoice",

  music: "music",
  playlist: "playlist",

  gluecksrad: "gluecksrad",
  gluecksradpanel: "gluecksrad",

  panels: "panels",
  panelhub: "panels",
  panelrebuild: "panels",
  musicpanel: "panels",
  panelcleanup: "panels",
  panelcheck: "panels",

  chatgpt: "chatgpt",

  modlog: "moderation",
  warn: "moderation",
  warnings: "moderation",
  clearwarnings: "moderation",
  timeout: "moderation",
  untimeout: "moderation",
  kick: "moderation",
  ban: "moderation",
  unban: "moderation",
  cases: "moderation",
  moduser: "moderation",
  automod: "moderation"
};

async function checkCommandModule(interaction) {
  const moduleName = COMMAND_MODULES[interaction.commandName];

  if (!moduleName) {
    return true;
  }

  try {
    const enabled = await isModuleEnabled(interaction.guild.id, moduleName);

    if (enabled) {
      return true;
    }

    await replyEphemeral(interaction, {
      content:
        "❌ Dieses Modul ist auf diesem Server deaktiviert.\n\n" +
        "Modul: `" + moduleName + "`\n" +
        "Aktivieren mit:\n" +
        "`/module enable name:" + moduleName + "`"
    });

    return false;
  } catch (err) {
    console.error("❌ Modul-Check Fehler:", err.message);
    return true;
  }
}


module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {
    installTemporaryInteractionReplyCleanup(interaction);

    if (
      interaction.isModalSubmit &&
      interaction.isModalSubmit() &&
      interaction.customId &&
      interaction.customId.startsWith("playlist_panel_")
    ) {
      try {
        console.log("🎵 Playlist Panel Modal erkannt:", interaction.customId);
        return await handlePlaylistPanelModal(interaction);
      } catch (error) {
        console.error("❌ Playlist Panel Modal Fehler:", error);

        return editOrReplyEphemeral(
          interaction,
          "❌ Playlist-Panel Fehler. Details stehen im Bot-Log."
        ).catch(() => null);
      }
    }

    if (
      interaction.isStringSelectMenu &&
      interaction.isStringSelectMenu() &&
      interaction.customId === "panel_hub_module_select"
    ) {
      try {
        return await handlePanelHubModuleSelect(interaction);
      } catch (error) {
        console.error("❌ PanelHub Module Select Fehler:", error);
        return replyEphemeral(
          interaction,
          "❌ Modul-Auswahl Fehler. Details stehen im Bot-Log."
        ).catch(() => null);
      }
    }

    if (
      interaction.isStringSelectMenu &&
      interaction.isStringSelectMenu() &&
      interaction.customId === "playlist_panel_select"
    ) {
      try {
        return await handlePlaylistPanelSelect(interaction);
      } catch (error) {
        console.error("❌ Playlist Panel Select Fehler:", error);
        return replyEphemeral(
          interaction,
          "❌ Playlist-Auswahl Fehler. Details stehen im Bot-Log."
        ).catch(() => null);
      }
    }

    if (
      interaction.isButton &&
      interaction.isButton() &&
      interaction.customId &&
      interaction.customId.startsWith("panel_hub_module_")
    ) {
      try {
        return await handlePanelHubModuleButton(interaction);
      } catch (error) {
        console.error("❌ PanelHub Module Button Fehler:", error);
        return replyEphemeral(
          interaction,
          "❌ Modul-Aktion Fehler. Details stehen im Bot-Log."
        ).catch(() => null);
      }
    }

    if (
      interaction.isButton &&
      interaction.isButton() &&
      interaction.customId &&
      interaction.customId.startsWith("playlist_selected_")
    ) {
      try {
        return await handlePlaylistSelectedButton(interaction);
      } catch (error) {
        console.error("❌ Playlist Auswahlbutton Fehler:", error);
        return replyEphemeral(
          interaction,
          "❌ Playlist-Aktionsfehler. Details stehen im Bot-Log."
        ).catch(() => null);
      }
    }

    if (
      interaction.isStringSelectMenu &&
      interaction.isStringSelectMenu() &&
      interaction.customId === "module_select"
    ) {
      try {
        return await handleModuleSelect(interaction);
      } catch (err) {
        console.error("❌ module_select Direkt-Handler Fehler:", err);

        return replyEphemeral(
          interaction,
          "❌ Modul-Auswahl konnte nicht verarbeitet werden."
        ).catch(() => {});
      }
    }
    /**
     * SLASH COMMANDS
     */
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        return safeReplyEphemeral(interaction, {
          content: "❌ Dieser Command wurde nicht gefunden."
        });
      }

      try {
        const moduleAllowed = await checkCommandModule(interaction);

        if (!moduleAllowed) {
          return;
        }

        return await command.execute(interaction, client);
      } catch (err) {
        console.error(`❌ Command Fehler /${interaction.commandName}:`, err);

        return safeReplyEphemeral(interaction, {
          content: "❌ Fehler beim Ausführen des Commands."
        });
      }
    }

    /**
     * BUTTONS
     */
    if (interaction.isButton()) {
      const buttonPath = path.join(__dirname, "../buttons");

      if (!fs.existsSync(buttonPath)) {
        console.error("❌ Button-Ordner nicht gefunden:", buttonPath);

        return safeReplyEphemeral(interaction, {
          content: "❌ Button-System ist nicht eingerichtet."
        });
      }

      const buttonFiles = fs
        .readdirSync(buttonPath)
        .filter(file => file.endsWith(".js"));

      for (const file of buttonFiles) {
        try {
          const btn = require(path.join(buttonPath, file));

          if (!btn.customId || typeof btn.execute !== "function") {
            console.warn(`⚠️ Button übersprungen: ${file}`);
            continue;
          }

          if (btn.customId === interaction.customId) {
            return await btn.execute(interaction, client);
          }
        } catch (err) {
          console.error(`❌ Button Ladefehler ${file}:`, err);
        }
      }

      return safeReplyEphemeral(interaction, {
        content: "❌ Unbekannter Button."
      });
    }

    /**
     * MODALS
     */
    
    if (interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
      if (interaction.customId === "mp_radio_saved_select") {
        await deferEphemeral(interaction);

        try {
          const presetId = Number(interaction.values[0]);
          const preset = await getRadioPresetById(interaction.guild.id, presetId);

          if (!preset) {
            return interaction.editReply("❌ Gespeicherter Radiostream wurde nicht gefunden.");
          }

          const {
            playRadioStream
          } = require("../utils/radioPlayer");

          const radio = await playRadioStream(interaction, preset.streamUrl, preset.name);

          await refreshMusicPanelsAfterRadioChange(interaction);

          return interaction.editReply(
            "📻 Gespeicherter Radiostream gestartet: **" +
            radio.title +
            "**\n🔗 " +
            radio.streamUrl
          );
        } catch (err) {
          console.error("❌ Gespeicherten Radiostream starten Fehler:", err.message);
          return interaction.editReply("❌ Radiostream konnte nicht gestartet werden: " + err.message);
        }
      }

      if (
        interaction.customId &&
        interaction.customId.startsWith("mp_radio_search_select:")
      ) {
        await deferEphemeral(interaction);

        const token = interaction.customId.split(":")[1];
        const result = getCachedSearchResult(token, interaction.values[0]);

        if (!result) {
          return interaction.editReply("❌ Dieses Suchergebnis ist abgelaufen. Bitte suche erneut.");
        }

        try {
          const {
            playRadioStream
          } = require("../utils/radioPlayer");

          const radio = await playRadioStream(interaction, result.streamUrl, result.name);

          await refreshMusicPanelsAfterRadioChange(interaction);

          return interaction.editReply(
            "📻 Suchergebnis gestartet: **" +
            radio.title +
            "**\n🔗 " +
            radio.streamUrl
          );
        } catch (err) {
          console.error("❌ Radio Suchergebnis Start Fehler:", err.message);
          return interaction.editReply("❌ Radiostream konnte nicht gestartet werden: " + err.message);
        }
      }

      if (interaction.customId === "gr_select") {
        return luckWheel.handleWheelSelect(interaction);
      }
    }

    if (interaction.isModalSubmit()) {

      if (interaction.customId === "mp_radio_play_modal") {
        console.log("📻 Radio Modal Submit:", interaction.user.tag, interaction.guild ? interaction.guild.id : "no-guild");

        await deferEphemeral(interaction);

        const url = interaction.fields.getTextInputValue("url");
        const name = interaction.fields.getTextInputValue("name") || null;

        await interaction.editReply("📻 Radiostream wird gestartet ...");

        try {
          const {
            playRadioStream
          } = require("../utils/radioPlayer");

          const radio = await playRadioStream(interaction, url, name);

          await refreshMusicPanelsAfterRadioChange(interaction);

          return interaction.editReply(
            "📻 Radiostream gestartet: **" +
            radio.title +
            "**\n🔗 " +
            radio.streamUrl
          );
        } catch (err) {
          console.error("❌ Radio Panel Start Fehler:", err);
          return interaction.editReply("❌ Radio konnte nicht gestartet werden: " + err.message);
        }
      }

      if (interaction.customId === "mp_radio_search_modal") {
        await deferEphemeral(interaction);

        try {
          const query = interaction.fields.getTextInputValue("query");
          const localResults = await searchLocalRadioPresets(interaction.guild.id, query, 10);

          if (localResults.length > 0) {
            return interaction.editReply(
              createSearchResultSelectMessage(
                query,
                localResults.map(row => ({
                  source: "local",
                  name: row.name,
                  streamUrl: row.streamUrl,
                  sourceUrl: row.sourceUrl
                })),
                "Gespeicherte Sender"
              )
            );
          }

          const externalResults = await fetchRadioBrowserResults(query, 10);

          if (externalResults.length === 0) {
            return interaction.editReply(
              "📭 Keine Radiostreams gefunden. Speichere erst Sender oder suche nach einem anderen Namen."
            );
          }

          return interaction.editReply(
            createSearchResultSelectMessage(query, externalResults, "Radio Browser")
          );
        } catch (err) {
          console.error("❌ Radio Suche Fehler:", err.message);
          return interaction.editReply("❌ Radiosuche konnte nicht ausgeführt werden.");
        }
      }

      if (interaction.customId === "gr_list_modal") {
        return luckWheel.handleListModal(interaction);
      }



      if (interaction.customId === "mp_play_modal") {
        await deferEphemeral(interaction);

        const input = interaction.fields.getTextInputValue("input");

        try {
          return await playMusicInput(interaction, input);
        } catch (err) {
          console.error("❌ Music Panel Play Fehler:", err);
          return interaction.editReply("❌ Fehler: " + err.message);
        }
      }


      if (interaction.customId === "mp_volume_modal") {
        await deferEphemeral(interaction);

        const raw = interaction.fields.getTextInputValue("percent");
        const percent = Number.parseInt(raw, 10);

        if (Number.isNaN(percent) || percent < 1 || percent > 100) {
          return interaction.editReply("❌ Bitte gib eine Zahl zwischen 1 und 100 ein.");
        }

        const volume = setVolume(interaction.guild.id, percent);

        if (volume === false) {
          return interaction.editReply("❌ Es läuft aktuell keine Musik oder Radio.");
        }

        await refreshLatestMusicPanel(interaction);
        return interaction.editReply("🔊 Lautstärke gesetzt auf **" + volume + "%**.");
      }

      if (interaction.customId === "mp_remove_modal") {
        await deferEphemeral(interaction);

        const raw = interaction.fields.getTextInputValue("position");
        const position = Number.parseInt(raw, 10);

        if (Number.isNaN(position) || position < 1) {
          return interaction.editReply("❌ Bitte gib eine gültige Position ein.");
        }

        const removed = removeTrack(interaction.guild.id, position);

        if (!removed) {
          return interaction.editReply("❌ An dieser Position wurde kein Track gefunden.");
        }

        return interaction.editReply(
          "🗑 Entfernt: **" + (removed.title || removed.query || removed.url || "Unbekannt") + "**"
        );
      }


      if (interaction.customId === "mp_playlist_modal") {
        await deferEphemeral(interaction);

        const playlist = interaction.fields.getTextInputValue("playlist");
        const scope = interaction.fields.getTextInputValue("scope") || "user";

        try {
          return await playMusicPlaylistFromPanel(interaction, playlist, scope);
        } catch (err) {
          console.error("❌ Music Panel Playlist Fehler:", err);
          return interaction.editReply("❌ Fehler: " + err.message);
        }
      }

      const channel = interaction.member?.voice?.channel;

      if (!channel) {
        return safeReplyEphemeral(interaction, {
          content: "❌ Du bist in keinem Voice Channel."
        });
      }

      const allowed = await hasTempVoiceAccess(interaction.user.id, channel.id);

      if (!allowed) {
        return safeReplyEphemeral(interaction, {
          content: "❌ Nur Owner oder Co-Owner dürfen das nutzen."
        });
      }

      /**
       * LIMIT MODAL
       */
      if (interaction.customId === "tv_limit_modal") {
        const rawLimit = interaction.fields.getTextInputValue("limit");
        const limit = Number.parseInt(rawLimit, 10);

        if (Number.isNaN(limit) || limit < 0 || limit > 99) {
          return safeReplyEphemeral(interaction, {
            content: "❌ Bitte gib ein gültiges Limit zwischen 0 und 99 ein."
          });
        }

        await channel.setUserLimit(limit);

        return safeReplyEphemeral(interaction, {
          content: `🔢 Limit gesetzt auf **${limit}**.`
        });
      }

      /**
       * RENAME MODAL
       */
      if (interaction.customId === "tv_rename_modal") {
        const newName = interaction.fields
          .getTextInputValue("name")
          .trim();

        if (!newName || newName.length < 1 || newName.length > 100) {
          return safeReplyEphemeral(interaction, {
            content: "❌ Der Channelname muss zwischen 1 und 100 Zeichen lang sein."
          });
        }

        await channel.setName(newName);

        const {
          updateTempVoicePanelMessage
        } = require("../utils/tempVoicePanelMessage");

        await updateTempVoicePanelMessage(channel).catch(error => {
          console.error("❌ TempVoice Panel Rename Update Fehler:", error);
        });

        return safeReplyEphemeral(interaction, {
          content: `✏️ Kanal umbenannt zu **${newName}**.`
        });
      }

      if (interaction.customId === "tv_addcoowner_modal") {
        const rawUser = interaction.fields
          .getTextInputValue("user")
          .trim();

        const userId = rawUser.replace(/[<@!>]/g, "");

        if (!/^\d{17,20}$/.test(userId)) {
          return safeReplyEphemeral(interaction, {
            content: "❌ Bitte gib eine gültige User-ID oder @Mention ein."
          });
        }

        const [rows] = await db.execute(
          "SELECT ownerId, coOwners FROM temp_permissions WHERE channelId = ?",
          [channel.id]
        );

        const data = rows[0];

        if (!data || data.ownerId !== interaction.user.id) {
          return safeReplyEphemeral(interaction, {
            content: "❌ Nur der Owner darf Co-Owner hinzufügen."
          });
        }

        if (userId === data.ownerId) {
          return safeReplyEphemeral(interaction, {
            content: "❌ Der Owner ist bereits Owner und muss kein Co-Owner sein."
          });
        }

        const targetMember = await interaction.guild.members
          .fetch(userId)
          .catch(() => null);

        if (!targetMember) {
          return safeReplyEphemeral(interaction, {
            content: "❌ User wurde auf diesem Server nicht gefunden."
          });
        }

        let coOwners = [];

        try {
          coOwners = JSON.parse(data.coOwners || "[]");
        } catch {
          coOwners = [];
        }

        if (coOwners.includes(userId)) {
          return safeReplyEphemeral(interaction, {
            content: "❌ <@" + userId + "> ist bereits Co-Owner."
          });
        }

        coOwners.push(userId);

        await db.execute(
          "UPDATE temp_permissions SET coOwners = ? WHERE channelId = ?",
          [JSON.stringify(coOwners), channel.id]
        );

        return safeReplyEphemeral(interaction, {
          content: "🤝 <@" + userId + "> ist jetzt Co-Owner."
        });
      }

      if (interaction.customId === "tv_removecoowner_modal") {
        const rawUser = interaction.fields
          .getTextInputValue("user")
          .trim();

        const userId = rawUser.replace(/[<@!>]/g, "");

        if (!/^\d{17,20}$/.test(userId)) {
          return safeReplyEphemeral(interaction, {
            content: "❌ Bitte gib eine gültige User-ID oder @Mention ein."
          });
        }

        const [rows] = await db.execute(
          "SELECT ownerId, coOwners FROM temp_permissions WHERE channelId = ?",
          [channel.id]
        );

        const data = rows[0];

        if (!data || data.ownerId !== interaction.user.id) {
          return safeReplyEphemeral(interaction, {
            content: "❌ Nur der Owner darf Co-Owner entfernen."
          });
        }

        let coOwners = [];

        try {
          coOwners = JSON.parse(data.coOwners || "[]");
        } catch {
          coOwners = [];
        }

        if (!coOwners.includes(userId)) {
          return safeReplyEphemeral(interaction, {
            content: "❌ <@" + userId + "> ist kein Co-Owner."
          });
        }

        coOwners = coOwners.filter(id => id !== userId);

        await db.execute(
          "UPDATE temp_permissions SET coOwners = ? WHERE channelId = ?",
          [JSON.stringify(coOwners), channel.id]
        );

        return safeReplyEphemeral(interaction, {
          content: "❌ <@" + userId + "> ist kein Co-Owner mehr."
        });
      }

      return safeReplyEphemeral(interaction, {
        content: "❌ Unbekanntes Modal."
      });
    }
  }
};
