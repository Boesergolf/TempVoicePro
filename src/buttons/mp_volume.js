const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

module.exports = {
  customId: "mp_volume",

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("mp_volume_modal")
      .setTitle("Lautstärke einstellen");

    const percent = new TextInputBuilder()
      .setCustomId("percent")
      .setLabel("Lautstärke 1 bis 100")
      .setPlaceholder("20")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(percent)
    );

    return interaction.showModal(modal);
  }
};
