const db = require("../database/mysql");

const {
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const {
  handleEmptyChannel,
  cancelDelete
} = require("../utils/tempChannels");

async function getNextLobbyName(guild, categoryId) {
  const channels = await guild.channels.fetch();
  const usedNumbers = new Set();

  for (const channel of channels.values()) {
    if (!channel) continue;
    if (channel.type !== ChannelType.GuildVoice) continue;

    if (categoryId && channel.parentId !== categoryId) continue;

    const match = channel.name.match(/^Lobby\s+(\d+)$/i);

    if (match) {
      usedNumbers.add(Number(match[1]));
    }
  }

  let number = 1;

  while (usedNumbers.has(number)) {
    number++;
  }

  return "Lobby " + number;
}

async function getPanelChannel(guild, categoryId) {
  const panelName = "tempvoice-panel";

  const channels = await guild.channels.fetch();

  let panelChannel = channels.find(channel =>
    channel &&
    channel.type === ChannelType.GuildText &&
    channel.name === panelName &&
    channel.parentId === categoryId
  );

  if (panelChannel) return panelChannel;

  panelChannel = channels.find(channel =>
    channel &&
    channel.type === ChannelType.GuildText &&
    channel.name === panelName
  );

  if (panelChannel) return panelChannel;

  const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);

  if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    console.log("❌ Kann Panel-Channel nicht erstellen: ManageChannels fehlt.");
    return null;
  }

  return guild.channels.create({
    name: panelName,
    type: ChannelType.GuildText,
    parent: categoryId || null
  });
}

async function sendControlPanel(guild, categoryId, voiceChannel, member) {
  try {
    const panelChannel = await getPanelChannel(guild, categoryId);

    if (!panelChannel || !panelChannel.isTextBased()) {
      console.log("❌ Kein gültiger Textkanal für TempVoice Panel gefunden.");
      return null;
    }

    const embed = new EmbedBuilder()
      .setTitle("🎛 TempVoice Control Panel")
      .setColor("Blue")
      .setDescription(
        "🎙 Channel: " + voiceChannel.toString() + "\n" +
        "👑 Owner: " + member.toString() + "\n\n" +
        "Verwalte deinen Voice Channel über die Buttons."
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
        .setLabel("👀 Show")
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

    const panelMessage = await panelChannel.send({
      embeds: [embed],
      components: [row1, row2]
    });

    console.log("✅ TempVoice Panel gesendet in #" + panelChannel.name);

    return {
      panelChannelId: panelChannel.id,
      panelMessageId: panelMessage.id
    };
  } catch (err) {
    console.error("❌ Panel Fehler:", err);
    return null;
  }
}

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

      if (newState.channelId === settings.creatorChannelId) {
        const member = newState.member;
        if (!member) return;

        const lobbyName = await getNextLobbyName(guild, settings.categoryId);

        const channel = await guild.channels.create({
          name: lobbyName,
          type: ChannelType.GuildVoice,
          parent: settings.categoryId || null,
          userLimit: 0
        });

        await member.voice.setChannel(channel);

        await db.execute(
          `INSERT INTO temp_channels
           (channelId, ownerId, guildId, createdAt)
           VALUES (?, ?, ?, ?)`,
          [channel.id, member.id, guildId, Date.now()]
        );

        await db.execute(
          `INSERT INTO temp_permissions
           (channelId, ownerId, coOwners)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE
             ownerId = VALUES(ownerId),
             coOwners = VALUES(coOwners)`,
          [channel.id, member.id, JSON.stringify([])]
        );

        const panelData = await sendControlPanel(
          guild,
          settings.categoryId,
          channel,
          member
        );

        if (panelData) {
          await db.execute(
            `UPDATE temp_channels
             SET panelChannelId = ?, panelMessageId = ?
             WHERE channelId = ?`,
            [
              panelData.panelChannelId,
              panelData.panelMessageId,
              channel.id
            ]
          );
        }
      }

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
