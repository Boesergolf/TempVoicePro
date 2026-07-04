const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

const { hasAccess } = require("../utils/permissions");

module.exports = {
  customId: "tv_limit",

  async execute(interaction) {
    const channel = interaction.member?.voice?.channel;

    if (!channel) {
      return interaction.reply({
        content: "❌ Du bist in keinem Voice Channel.",
        ephemeral: true
      });
    }

    const allowed = await hasAccess(interaction.user.id, channel.id);

    if (!allowed) {
      return interaction.reply({
        content: "❌ Nur Owner oder Co-Owner dürfen das nutzen.",
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("tv_limit_modal")
      .setTitle("User Limit ändern");

    const input = new TextInputBuilder()
      .setCustomId("limit")
      .setLabel("Maximale Nutzer 0-99")
      .setPlaceholder("0 = unbegrenzt")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );

    return interaction.showModal(modal);
  }
};
