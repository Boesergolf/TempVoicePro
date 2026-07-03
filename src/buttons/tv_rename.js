const { hasPermission } = require("../utils/permissions");

module.exports = {
  customId: "tv_rename",

  async execute(interaction) {

    const channel = interaction.member.voice.channel;

    // ❌ Kein Voice Channel
    if (!channel) {
      return interaction.reply({
        content: "❌ Du bist in keinem Voice Channel",
        ephemeral: true
      });
    }

    // 🔒 Owner / Co-Owner Check
    if (!hasPermission(channel.id, interaction.user.id)) {
      return interaction.reply({
        content: "🚫 Nur Owner oder Co-Owner dürfen das nutzen",
        ephemeral: true
      });
    }

    // 🪟 Modal öffnen
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");

    const modal = new ModalBuilder()
      .setCustomId("tv_rename_modal")
      .setTitle("Channel umbenennen");

    const input = new TextInputBuilder()
      .setCustomId("name")
      .setLabel("Neuer Kanalname")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);

    modal.addComponents(row);

    await interaction.showModal(modal);
  }
};

const { hasAccess } = require("../utils/permissions");

module.exports = {
  customId: "tv_lock",

  async execute(interaction) {
    const channel = interaction.member.voice.channel;
    if (!channel) return;

    const allowed = await hasAccess(interaction.user.id, channel.id);

    if (!allowed) {
      return interaction.reply({
        content: "❌ Kein Zugriff (Owner/CoOwner only)",
        ephemeral: true
      });
    }

    await channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      { Connect: false }
    );

    return interaction.reply({
      content: "🔒 Locked",
      ephemeral: true
    });
  }
};

const { checkCooldown } = require("../utils/cooldown");

if (!checkCooldown(interaction.user.id, "tv_lock")) {
  return interaction.reply({
    content: "⏳ Cooldown aktiv",
    ephemeral: true
  });
}