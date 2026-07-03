module.exports = {
  customId: "tv_hide",
  async execute(interaction) {
    const channel = interaction.member.voice.channel;
    if (!channel) return;

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      ViewChannel: false
    });

    interaction.reply({ content: "👁 Versteckt", ephemeral: true });
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