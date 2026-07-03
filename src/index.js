const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../.env") });

const { Client } = require("discord.js");

// 🔥 FIX: sichere Intent Definition
const { Intents } = require("discord.js");

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.MESSAGE_CONTENT
  ]
});

client.once("ready", () => {
  console.log(`✅ Online als ${client.user.tag}`);
});

console.log("🚀 Bot startet...");

client.login(process.env.TOKEN);