const db = require("../database/mysql");
const { ChannelType } = require("discord.js");
const {
  handleEmptyChannel,
  cancelDelete
} = require("../utils/tempChannels");

module.exports = {
  name: "voiceStateUpdate",

  async execute(oldState, newState) {
    try {
      const guild = newState.guild || oldState.guild;
      if (!guild) return;

      const guildId = guild.id;

      const [rows] = await db.execute(
        "SELECT * FROM guild_settings WHERE guildId = ?",
        [guildId]
      );

      const settings = rows[0];
      if (!settings) return;

      /**
       * User joint Creator Channel
       */
      if (newState.channelId === settings.creatorChannelId) {
        const member = newState.member;
        if (!member) return;

        const channel = await guild.channels.create({
          name: `${member.user.username}'s room`,
          type: ChannelType.GuildVoice,
          parent: settings.categoryId || null,
          userLimit: 0
        });

        await member.voice.setChannel(channel);

        await db.execute(
          `INSERT INTO temp_channels (channelId, ownerId, guildId, createdAt)
           VALUES (?, ?, ?, ?)`,
          [channel.id, member.id, guildId, Date.now()]
        );

        await db.execute(
          `INSERT INTO temp_permissions (channelId, ownerId, coOwners)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE ownerId = VALUES(ownerId), coOwners = VALUES(coOwners)`,
          [channel.id, member.id, JSON.stringify([])]
        );

        /**
         * Control Panel in Voice-Text senden
         */
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

          if (typeof channel.send === "function") {
            await channel.send({
              embeds: [embed],
              components: [row1, row2]
            });
          }
        } catch (err) {
          console.log("❌ Panel Error:", err.message);
        }
      }

      /**
       * User verlässt alten Channel
       */
      if (oldState.channel) {
        const [tempRows] = await db.execute(
          "SELECT * FROM temp_channels WHERE channelId = ?",
          [oldState.channel.id]
        );

        const isTempChannel = tempRows.length > 0;

        if (isTempChannel) {
          cancelDelete(oldState.channel.id);

          if (oldState.channel.members.size === 0) {
            handleEmptyChannel(oldState.channel);
          }
        }

        /**
         * Owner Transfer, wenn Owner den Channel verlässt
         */
        const [permRows] = await db.execute(
          "SELECT * FROM temp_permissions WHERE channelId = ?",
          [oldState.channel.id]
        );

        const data = permRows[0];

        if (data && oldState.member && oldState.member.id === data.ownerId) {
          const members = oldState.channel.members;

          if (members.size > 0) {
            const newOwner = members.first();

            await db.execute(
              "UPDATE temp_permissions SET ownerId = ? WHERE channelId = ?",
              [newOwner.id, oldState.channel.id]
            );

            await db.execute(
              "UPDATE temp_channels SET ownerId = ? WHERE channelId = ?",
              [newOwner.id, oldState.channel.id]
            );

            newOwner
              .send("👑 Du bist jetzt neuer Channel Owner.")
              .catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error("❌ voiceStateUpdate Fehler:", err);
    }
  }
};
