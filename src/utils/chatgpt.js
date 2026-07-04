const OpenAI = require("openai");

let client = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY fehlt in der .env Datei.");
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  return client;
}

function trimDiscordText(text, maxLength = 3900) {
  if (!text) return "Keine Antwort erhalten.";

  const clean = String(text).trim();

  if (clean.length <= maxLength) {
    return clean;
  }

  return clean.slice(0, maxLength - 20) + "\n\n... gekürzt";
}

async function askChatGPT(question, userTag) {
  const openai = getClient();
  const model = process.env.OPENAI_MODEL || "gpt-5.2";

  const response = await openai.responses.create({
    model,
    instructions:
      "Du bist TempVoicePro AI, ein hilfreicher Assistent in einem Discord Server. " +
      "Antworte freundlich, klar und auf Deutsch. " +
      "Halte Antworten möglichst kurz und praktisch. " +
      "Wenn du etwas nicht sicher weißt, sage das ehrlich.",
    input:
      "Discord User: " + userTag + "\n\n" +
      "Frage:\n" + question,
    max_output_tokens: 700
  });

  if (response.output_text) {
    return trimDiscordText(response.output_text);
  }

  return "Keine Antwort erhalten.";
}

module.exports = {
  askChatGPT,
  trimDiscordText
};
