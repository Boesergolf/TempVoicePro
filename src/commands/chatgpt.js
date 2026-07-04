const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags
} = require("discord.js");

const { askChatGPT } = require("../utils/chatgpt");

const cooldowns = new Map();

function getCooldownMs() {
  const value = Number(process.env.OPENAI_COOLDOWN_MS || 15000);

  if (Number.isNaN(value) || value < 0) {
    return 15000;
  }

  return value;
}

function isOnCooldown(userId) {
  const cooldownMs = getCooldownMs();
  const lastUsed = cooldowns.get(userId) || 0;
  const now = Date.now();
  const remaining = lastUsed + cooldownMs - now;

  if (remaining > 0) {
    return Math.ceil(remaining / 1000);
  }

  cooldowns.set(userId, now);
  return 0;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("chatgpt")
    .setDescription("Stelle ChatGPT eine Frage")
    .addStringOption(option =>
      option
        .setName("frage")
        .setDescription("Deine Frage an ChatGPT")
        .setRequired(true)
        .setMaxLength(1500)
    )
    .addBooleanOption(option =>
      option
        .setName("private")
        .setDescription("Antwort nur für dich sichtbar machen")
        .setRequired(false)
    ),

  async execute(interaction) {
    const question = interaction.options.getString("frage").trim();
    const privateAnswer = interaction.options.getBoolean("private") ?? true;

    const remaining = isOnCooldown(interaction.user.id);

    if (remaining > 0) {
      return interaction.reply({
        content: "⏳ Bitte warte noch **" + remaining + "** Sekunden, bevor du ChatGPT erneut nutzt.",
        flags: MessageFlags.Ephemeral
      });
    }

    const deferOptions = {};

    if (privateAnswer) {
      deferOptions.flags = MessageFlags.Ephemeral;
    }

    await interaction.deferReply(deferOptions);

    try {
      const answer = await askChatGPT(
        question,
        interaction.user.tag || interaction.user.username
      );

      const embed = new EmbedBuilder()
        .setTitle("🤖 ChatGPT Antwort")
        .setColor("Blue")
        .addFields(
          {
            name: "Frage",
            value: question.length > 1000 ? question.slice(0, 1000) + "..." : question
          },
          {
            name: "Antwort",
            value: answer
          }
        )
        .setFooter({
          text: "TempVoicePro AI"
        })
        .setTimestamp();

      return interaction.editReply({
        embeds: [embed]
      });
    } catch (err) {
      console.error("❌ ChatGPT Fehler:", err);

      return interaction.editReply(
        "❌ ChatGPT konnte gerade nicht antworten: " + err.message
      );
    }
  }
};
