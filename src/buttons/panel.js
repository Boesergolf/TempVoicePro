const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

module.exports = {
  customId: "tv_panel",

  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setTitle("🎛 TempVoice Panel")
      .setDescription("Verwalte deinen Voice Channel")
      .setColor("Blue");

    // 🧠 CONTROL ROW 1
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("tv_rename")
        .setLabel("📝 Rename")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("tv_limit")
        .setLabel("👥 Limit")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("tv_lock")
        .setLabel("🔒 Lock")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("tv_unlock")
        .setLabel("🔓 Unlock")
        .setStyle(ButtonStyle.Secondary)
    );

    // 🧠 CONTROL ROW 2
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("tv_hide")
        .setLabel("👁 Hide")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("tv_show")
        .setLabel("👀 Show")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("tv_owner")
        .setLabel("👑 Owner")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("tv_coowner")
        .setLabel("⭐ Co-Owner")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row1, row2],
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