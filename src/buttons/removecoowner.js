const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

const { isOwner } = require("../utils/permissions");

module.exports = {
  customId: "tv_removecoowner",

  async execute(interaction) {
    const channel = interaction.member?.voice?.channel;

    if (!channel) {
      return interaction.reply({
        content: "❌ Du bist in keinem Voice Channel.",
        flags: 64
      });
    }

    const owner = await isOwner(interaction.user.id, channel.id);

    if (!owner) {
      return interaction.reply({
        content: "❌ Nur der Owner darf Co-Owner entfernen.",
        flags: 64
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("tv_removecoowner_modal")
      .setTitle("Co-Owner entfernen");

    const userInput = new TextInputBuilder()
      .setCustomId("user")
      .setLabel("User-ID oder @Mention")
      .setPlaceholder("@User oder 123456789012345678")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(userInput)
    );

    return interaction.showModal(modal);
  }
};
