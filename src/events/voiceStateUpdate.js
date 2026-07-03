const db = require("../database/mysql");
const { ChannelType } = require("discord.js");
const {
  handleEmptyChannel,
  cancelDelete
} = require("../utils/tempChannels");

module.exports = {
  name: "voiceStateUpdate",

  async execute(oldState, newState) {
    if (!newState.guild) return;

    const guildId = newState.guild.id;

    // ================================
    // 🔥 LOAD SETTINGS
    // ================================
    const [rows] = await db.execute(
      "SELECT * FROM guild_settings WHERE guildId = ?",
      [guildId]
    );

    const settings = rows[0];
    if (!settings) return;

    // ================================
    // 🔵 USER JOINS CREATOR CHANNEL
    // ================================
    if (newState.channelId === settings.creatorChannelId) {
      const member = newState.member;

      const channel = await newState.guild.channels.create({
        name: `${member.user.username}'s room`,
        type: ChannelType.GuildVoice,
        parent: settings.categoryId,
        userLimit: 0
      });

      // 🔥 MOVE USER
      await member.voice.setChannel(channel);

      // ================================
      // 💾 SAVE TEMP CHANNEL
      // ================================
      await db.execute(
        `INSERT INTO temp_channels (channelId, ownerId, guildId, createdAt)
         VALUES (?, ?, ?, ?)`,
        [channel.id, member.id, guildId, Date.now()]
      );

      // ================================
      // 👑 CREATE PERMISSION ENTRY
      // ================================
      await db.execute(
        `INSERT INTO temp_permissions (channelId, ownerId, coOwners)
         VALUES (?, ?, ?)`,
        [channel.id, member.id, JSON.stringify([])]
      );

      // ================================
      // 🎛 CONTROL PANEL (V2 READY)
      // ================================
      try {
        const {
          ActionRowBuilder,
          ButtonBuilder,
          ButtonStyle,
          EmbedBuilder
        } = require("discord.js");

        const embed = new EmbedBuilder()
          .setTitle("🎛 TempVoice Control Panel")
          .setColor("Blue")
          .setDescription(
            "Verwalte deinen Voice Channel direkt hier:\n\n" +
            "🔒 Lock / Unlock\n" +
            "👁 Hide / Show\n" +
            "✏️ Rename\n" +
            "🔢 Limit\n" +
            "🎚 Bitrate"
          );

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("tv_lock")
            .setLabel("🔒 Lock")
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId("tv_unlock")
            .setLabel("🔓 Unlock")
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId("tv_rename")
            .setLabel("✏️ Rename")
            .setStyle(ButtonStyle.Primary)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("tv_hide")
            .setLabel("👁 Hide")
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId("tv_show")
            .setLabel("👁 Show")
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId("tv_limit")
            .setLabel("🔢 Limit")
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId("tv_bitrate")
            .setLabel("🎚 Bitrate")
            .setStyle(ButtonStyle.Secondary)
        );

        await channel.send({
          embeds: [embed],
          components: [row1, row2]
        });

      } catch (err) {
        console.log("❌ Panel Error:", err);
      }
    }

    // ================================
    // 🔴 USER LEAVES CHANNEL
    // ================================
    if (oldState.channel) {

      // ================================
      // 🔥 TEMP CHANNEL CHECK
      // ================================
      const [temp] = await db.execute(
        "SELECT * FROM temp_channels WHERE channelId = ?",
        [oldState.channel.id]
      );

      if (temp.length > 0) {
        cancelDelete(oldState.channel.id);

        // 👇 START DELETE TIMER IF EMPTY
        if (oldState.channel.members.size === 0) {
          handleEmptyChannel(oldState.channel);
        }
      }

      // ================================
      // 👑 CLAIM SYSTEM
      // ================================
      const [perm] = await db.execute(
        "SELECT * FROM temp_permissions WHERE channelId = ?",
        [oldState.channel.id]
      );

      const data = perm[0];

      if (data && oldState.member) {
        if (oldState.member.id === data.ownerId) {

          const members = oldState.channel.members;

          if (members.size > 0) {
            const newOwner = members.first();

            await db.execute(
              "UPDATE temp_permissions SET ownerId = ? WHERE channelId = ?",
              [newOwner.id, oldState.channel.id]
            );

            newOwner.send("👑 Du bist jetzt neuer Channel Owner").catch(() => {});
          }
        }
      }
    }
  }
};


client.once("ready", async () => {
  console.log("Bot online");

  const [rows] = await db.execute("SELECT * FROM temp_channels");

  for (const ch of rows) {
    const channel = client.channels.cache.get(ch.channelId);

    if (!channel) continue;

    try {
      const embed = new EmbedBuilder()
        .setTitle("🎛 TempVoice Control")
        .setColor("Blue");

      await channel.send({ embeds: [embed] });

    } catch (e) {}
  }
});