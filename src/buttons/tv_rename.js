const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");

const { hasAccess } = require("../utils/permissions");

module.exports = {
  customId: "tv_rename",

  async execute(interaction) {
    const channel = interaction.member?.voice?.channel;

    if (!channel) {
      return interaction.reply({
        content: "❌ Du bist in keinem Voice Channel.",
        flags: 64
      });
    }

    const allowed = await hasAccess(interaction.user.id, channel.id);

    if (!allowed) {
      return interaction.reply({
        content: "❌ Nur Owner oder Co-Owner dürfen das nutzen.",
        flags: 64
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("tv_rename_modal")
      .setTitle("Channel umbenennen");

    const input = new TextInputBuilder()
      .setCustomId("name")
      .setLabel("Neuer Channelname")
      .setPlaceholder("z. B. Gaming Room")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );

    return interaction.showModal(modal);
  }
};
