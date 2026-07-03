const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

module.exports = {
  customId: "tv_rename",

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("tv_rename_modal")
      .setTitle("Channel umbenennen");

    const input = new TextInputBuilder()
      .setCustomId("name")
      .setLabel("Neuer Kanalname")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );

    await interaction.showModal(modal);
  }
};