const db = require("../database/db");

module.exports = {
  customId: "tv_owner",

  async execute(interaction) {
    const channel = interaction.member.voice.channel;
    if (!channel)
      return interaction.reply({ content: "❌ Kein Channel", ephemeral: true });

    const data = db.prepare(
      "SELECT * FROM temp_permissions WHERE channelId = ?"
    ).get(channel.id);

    return interaction.reply({
      content: `👑 Owner: <@${data.ownerId}>`,
      ephemeral: true
    });
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