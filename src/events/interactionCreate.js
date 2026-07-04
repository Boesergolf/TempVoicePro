const fs = require("fs");
const path = require("path");
const db = require("../database/mysql");

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

      return safeReply(interaction, {
        content: "❌ Unbekanntes Modal.",
        ephemeral: true
      });
    }
  }
};
