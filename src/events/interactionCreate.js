const fs = require("fs");
const path = require("path");

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {

    // =========================
    // 🎯 SLASH COMMANDS
    // =========================
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(err);

        if (!interaction.replied) {
          return interaction.reply({
            content: "❌ Fehler beim Ausführen des Commands",
            ephemeral: true
          });
        }
      }
    }

    // =========================
    // 🔘 BUTTONS
    // =========================
    if (interaction.isButton()) {
      const buttonPath = path.join(__dirname, "../buttons");

      let buttonFiles;
      try {
        buttonFiles = fs.readdirSync(buttonPath);
      } catch (err) {
        console.error("Button folder error:", err);
        return;
      }

      for (const file of buttonFiles) {
        const btn = require(`../buttons/${file}`);

        if (btn.customId === interaction.customId) {
          try {
            return await btn.execute(interaction, client);
          } catch (err) {
            console.error("Button error:", err);

            if (!interaction.replied) {
              return interaction.reply({
                content: "❌ Button Fehler",
                ephemeral: true
              });
            }
          }
        }
      }
    }

    // =========================
    // 🪟 MODALS
    // =========================
    if (interaction.isModalSubmit()) {

      // =========================
      // 🔧 LIMIT MODAL
      // =========================
      if (interaction.customId === "tv_limit_modal") {
        const limit = parseInt(
          interaction.fields.getTextInputValue("limit")
        );

        const channel = interaction.member.voice.channel;
        if (!channel) {
          return interaction.reply({
            content: "❌ Du bist in keinem Voice Channel",
            ephemeral: true
          });
        }

        await channel.setUserLimit(limit);

        return interaction.reply({
          content: `🔢 Limit gesetzt auf **${limit}**`,
          ephemeral: true
        });
      }

      // =========================
      // ✏️ RENAME MODAL
      // =========================
      if (interaction.customId === "tv_rename_modal") {
        const newName =
          interaction.fields.getTextInputValue("name");

        const channel = interaction.member.voice.channel;
        if (!channel) {
          return interaction.reply({
            content: "❌ Du bist in keinem Voice Channel",
            ephemeral: true
          });
        }

        await channel.setName(newName);

        return interaction.reply({
          content: `✏️ Kanal umbenannt zu **${newName}**`,
          ephemeral: true
        });
      }
    }
  }
};