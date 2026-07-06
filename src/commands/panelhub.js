const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const {
  createPanelHubMessage
} = require("../utils/panelHub");

function isPanelHubMessage(message, botId) {
  if (!message || !message.author || message.author.id !== botId) {
    return false;
  }

  const embed = message.embeds && message.embeds[0];

  if (!embed) {
    return false;
  }

  const title = embed.title || "";
  const footer = embed.footer && embed.footer.text ? embed.footer.text : "";

  return title.includes("TempVoicePro Kontrollzentrum") ||
    footer.includes("TempVoicePro Zentralpanel") ||
    footer.includes("TempVoicePro Panel Hub");
}

async function findExistingPanelHub(channel, botId) {
  const messages = await channel.messages.fetch({
    limit: 100
  });

  return messages.find(message => isPanelHubMessage(message, botId)) || null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("panelhub")
    .setDescription("Erstellt oder aktualisiert das zentrale TempVoicePro Kontrollzentrum.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.reply({
      content: "🧭 Kontrollzentrum wird gesucht...",
      flags: 64
    });

    const botId = interaction.client.user.id;
    const existingHub = await findExistingPanelHub(interaction.channel, botId);

    if (existingHub) {
      await existingHub.edit(createPanelHubMessage());

      return interaction.editReply({
        content: "✅ Vorhandenes Kontrollzentrum wurde aktualisiert."
      });
    }

    await interaction.channel.send(createPanelHubMessage());

    return interaction.editReply({
      content: "✅ Kontrollzentrum wurde erstellt."
    });
  }
};
