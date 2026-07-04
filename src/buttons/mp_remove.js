const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

module.exports = {
  customId: "mp_remove",

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId("mp_remove_modal")
      .setTitle("Track aus Queue entfernen");

    const position = new TextInputBuilder()
      .setCustomId("position")
      .setLabel("Position in der Queue")
      .setPlaceholder("1")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(position)
    );

    return interaction.showModal(modal);
  }
};
