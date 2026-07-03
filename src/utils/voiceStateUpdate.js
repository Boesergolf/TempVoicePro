const db = require("../database/mysql");
const { ChannelType } = require("discord.js");
const { handleEmptyChannel, cancelDelete } = require("../utils/tempChannels");

module.exports = {
  name: "voiceStateUpdate",

  async execute(oldState, newState) {
    const guild = newState.guild;
    if (!guild) return;

    const [rows] = await db.execute(
      "SELECT * FROM guild_settings WHERE guildId = ?",
      [guild.id]
    );

    const settings = rows[0];
    if (!settings) return;

    // 🔵 JOIN CREATOR CHANNEL
    if (newState.channelId === settings.creatorChannelId) {
      const member = newState.member;

      const channel = await guild.channels.create({
        name: `${member.user.username}'s room`,
        type: ChannelType.GuildVoice,
        parent: settings.categoryId
      });

      await member.voice.setChannel(channel);

      await db.execute(
        `INSERT INTO temp_channels (channelId, ownerId, guildId, createdAt)
         VALUES (?, ?, ?, ?)`,
        [channel.id, member.id, guild.id, Date.now()]
      );
    }

    // 🔴 OLD CHANNEL CHECK (LEAVE)
    if (oldState.channel) {
      const [temp] = await db.execute(
        "SELECT * FROM temp_channels WHERE channelId = ?",
        [oldState.channel.id]
      );

      if (temp.length > 0) {
        cancelDelete(oldState.channel.id);

        if (oldState.channel.members.size === 0) {
          handleEmptyChannel(oldState.channel);
        }
      }
    }
  }
};