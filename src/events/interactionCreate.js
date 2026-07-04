const fs = require("fs");
const path = require("path");
const db = require("../database/mysql");
const { addTracks, setVolume, removeTrack } = require("../utils/musicPlayer");
const { detectSource, getMetadataForUrl } = require("../utils/musicMetadata");


function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function playMusicInput(interaction, input) {
  const value = String(input || "").trim();

  if (!value) {
    return interaction.editReply("❌ Bitte gib einen Song, YouTube-Link oder Spotify-Link ein.");
  }

  let track;

  if (isHttpUrl(value)) {
    const source = detectSource(value);
    let title = null;

    if (source === "spotify") {
      const metadata = await getMetadataForUrl(value).catch(() => null);
      title = metadata?.displayTitle || metadata?.title || null;
    }

    track = {
      source,
      url: value,
      title
    };
  } else {
    track = {
      source: "search",
      query: value,
      title: value
    };
  }

  await addTracks(interaction, [track]);

  return interaction.editReply("✅ Track wurde zur Queue hinzugefügt.");
}

async function safeReply(interaction, options) {
  try {
    if (interaction.replied || interaction.deferred) {
      return interaction.followUp(options);
    }

    return interaction.reply(options);
  } catch (err) {
    console.error("❌ Reply Fehler:", err.message);
  }
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

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {
    /**
     * SLASH COMMANDS
     */
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        return safeReply(interaction, {
          content: "❌ Dieser Command wurde nicht gefunden.",
          ephemeral: true
        });
      }

      try {
        return await command.execute(interaction, client);
      } catch (err) {
        console.error(`❌ Command Fehler /${interaction.commandName}:`, err);

        return safeReply(interaction, {
          content: "❌ Fehler beim Ausführen des Commands.",
          ephemeral: true
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

        return safeReply(interaction, {
          content: "❌ Button-System ist nicht eingerichtet.",
          ephemeral: true
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

      return safeReply(interaction, {
        content: "❌ Unbekannter Button.",
        ephemeral: true
      });
    }

    /**
     * MODALS
     */
    if (interaction.isModalSubmit()) {

      if (interaction.customId === "mp_play_modal") {
        await interaction.deferReply({ ephemeral: true });

        const input = interaction.fields.getTextInputValue("input");

        try {
          return await playMusicInput(interaction, input);
        } catch (err) {
          console.error("❌ Music Panel Play Fehler:", err);
          return interaction.editReply("❌ Fehler: " + err.message);
        }
      }


      if (interaction.customId === "mp_volume_modal") {
        await interaction.deferReply({ ephemeral: true });

        const raw = interaction.fields.getTextInputValue("percent");
        const percent = Number.parseInt(raw, 10);

        if (Number.isNaN(percent) || percent < 0 || percent > 200) {
          return interaction.editReply("❌ Bitte gib eine Zahl zwischen 0 und 200 ein.");
        }

        const volume = setVolume(interaction.guild.id, percent);

        if (volume === false) {
          return interaction.editReply("❌ Es läuft aktuell keine Musik.");
        }

        return interaction.editReply("🔊 Lautstärke gesetzt auf **" + volume + "%**.");
      }

      if (interaction.customId === "mp_remove_modal") {
        await interaction.deferReply({ ephemeral: true });

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

      const channel = interaction.member?.voice?.channel;

      if (!channel) {
        return safeReply(interaction, {
          content: "❌ Du bist in keinem Voice Channel.",
          ephemeral: true
        });
      }

      const allowed = await hasTempVoiceAccess(interaction.user.id, channel.id);

      if (!allowed) {
        return safeReply(interaction, {
          content: "❌ Nur Owner oder Co-Owner dürfen das nutzen.",
          ephemeral: true
        });
      }

      /**
       * LIMIT MODAL
       */
      if (interaction.customId === "tv_limit_modal") {
        const rawLimit = interaction.fields.getTextInputValue("limit");
        const limit = Number.parseInt(rawLimit, 10);

        if (Number.isNaN(limit) || limit < 0 || limit > 99) {
          return safeReply(interaction, {
            content: "❌ Bitte gib ein gültiges Limit zwischen 0 und 99 ein.",
            ephemeral: true
          });
        }

        await channel.setUserLimit(limit);

        return safeReply(interaction, {
          content: `🔢 Limit gesetzt auf **${limit}**.`,
          ephemeral: true
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
          return safeReply(interaction, {
            content: "❌ Der Channelname muss zwischen 1 und 100 Zeichen lang sein.",
            ephemeral: true
          });
        }

        await channel.setName(newName);

        return safeReply(interaction, {
          content: `✏️ Kanal umbenannt zu **${newName}**.`,
          ephemeral: true
        });
      }

      if (interaction.customId === "tv_addcoowner_modal") {
        const rawUser = interaction.fields
          .getTextInputValue("user")
          .trim();

        const userId = rawUser.replace(/[<@!>]/g, "");

        if (!/^\d{17,20}$/.test(userId)) {
          return safeReply(interaction, {
            content: "❌ Bitte gib eine gültige User-ID oder @Mention ein.",
            ephemeral: true
          });
        }

        const [rows] = await db.execute(
          "SELECT ownerId, coOwners FROM temp_permissions WHERE channelId = ?",
          [channel.id]
        );

        const data = rows[0];

        if (!data || data.ownerId !== interaction.user.id) {
          return safeReply(interaction, {
            content: "❌ Nur der Owner darf Co-Owner hinzufügen.",
            ephemeral: true
          });
        }

        if (userId === data.ownerId) {
          return safeReply(interaction, {
            content: "❌ Der Owner ist bereits Owner und muss kein Co-Owner sein.",
            ephemeral: true
          });
        }

        const targetMember = await interaction.guild.members
          .fetch(userId)
          .catch(() => null);

        if (!targetMember) {
          return safeReply(interaction, {
            content: "❌ User wurde auf diesem Server nicht gefunden.",
            ephemeral: true
          });
        }

        let coOwners = [];

        try {
          coOwners = JSON.parse(data.coOwners || "[]");
        } catch {
          coOwners = [];
        }

        if (coOwners.includes(userId)) {
          return safeReply(interaction, {
            content: "❌ <@" + userId + "> ist bereits Co-Owner.",
            ephemeral: true
          });
        }

        coOwners.push(userId);

        await db.execute(
          "UPDATE temp_permissions SET coOwners = ? WHERE channelId = ?",
          [JSON.stringify(coOwners), channel.id]
        );

        return safeReply(interaction, {
          content: "🤝 <@" + userId + "> ist jetzt Co-Owner.",
          ephemeral: true
        });
      }

      if (interaction.customId === "tv_removecoowner_modal") {
        const rawUser = interaction.fields
          .getTextInputValue("user")
          .trim();

        const userId = rawUser.replace(/[<@!>]/g, "");

        if (!/^\d{17,20}$/.test(userId)) {
          return safeReply(interaction, {
            content: "❌ Bitte gib eine gültige User-ID oder @Mention ein.",
            ephemeral: true
          });
        }

        const [rows] = await db.execute(
          "SELECT ownerId, coOwners FROM temp_permissions WHERE channelId = ?",
          [channel.id]
        );

        const data = rows[0];

        if (!data || data.ownerId !== interaction.user.id) {
          return safeReply(interaction, {
            content: "❌ Nur der Owner darf Co-Owner entfernen.",
            ephemeral: true
          });
        }

        let coOwners = [];

        try {
          coOwners = JSON.parse(data.coOwners || "[]");
        } catch {
          coOwners = [];
        }

        if (!coOwners.includes(userId)) {
          return safeReply(interaction, {
            content: "❌ <@" + userId + "> ist kein Co-Owner.",
            ephemeral: true
          });
        }

        coOwners = coOwners.filter(id => id !== userId);

        await db.execute(
          "UPDATE temp_permissions SET coOwners = ? WHERE channelId = ?",
          [JSON.stringify(coOwners), channel.id]
        );

        return safeReply(interaction, {
          content: "❌ <@" + userId + "> ist kein Co-Owner mehr.",
          ephemeral: true
        });
      }

      return safeReply(interaction, {
        content: "❌ Unbekanntes Modal.",
        ephemeral: true
      });
    }
  }
};
