const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const commandFolders = fs.readdirSync(path.join(__dirname, "../commands"));

  for (const file of commandFolders) {
    const command = require(`../commands/${file}`);
    client.commands.set(command.data.name, command);
  }
};