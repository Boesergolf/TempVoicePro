const FUNNY_TEMPVOICE_NAMES = [
  "Chaos Lounge",
  "Kartoffel Kommando",
  "Daddel Hoehle",
  "Taktik Zentrale",
  "Snack Squad",
  "Pixel Bunker",
  "Tiltfreie Zone",
  "Boss Lobby",
  "Keks Konferenz",
  "Noob Nest",
  "Aim Arena",
  "Lachflash Lobby",
  "Ping Palast",
  "Crew Kabine",
  "Gute Laune Voice",
  "Strategie Sofa"
];

function pickRandomTempVoiceName() {
  const index = Math.floor(Math.random() * FUNNY_TEMPVOICE_NAMES.length);
  return FUNNY_TEMPVOICE_NAMES[index];
}

module.exports = {
  pickRandomTempVoiceName
};
