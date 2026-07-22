const radios = new Map();

function getRadioState(guildId) {
  return radios.get(guildId) || null;
}

function setRadioState(guildId, radio) {
  radios.set(guildId, radio);
  return radio;
}

function deleteRadioState(guildId) {
  return radios.delete(guildId);
}

module.exports = {
  getRadioState,
  setRadioState,
  deleteRadioState
};
