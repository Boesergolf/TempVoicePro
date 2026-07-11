const UI_COLORS = {
  brand: 0x5865f2,
  success: 0x2ecc71,
  warning: 0xf59e0b,
  danger: 0xe74c3c
};

const STATUS_ICONS = {
  ok: "✅",
  warn: "⚠️",
  fail: "❌"
};

const UI_FOOTERS = {
  noSecrets: "Keine Secrets werden angezeigt.",
  noActionWithoutConfirm: "Keine Aktion ohne Bestätigung."
};

function statusLine(status, text) {
  return (STATUS_ICONS[status] || STATUS_ICONS.warn) + " " + text;
}

module.exports = {
  UI_COLORS,
  STATUS_ICONS,
  UI_FOOTERS,
  statusLine
};
