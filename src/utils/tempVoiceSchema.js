const db = require("../database/mysql");

let permanentColumnPromise = null;

async function columnExists(tableName, columnName) {
  const [rows] = await db.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );

  return rows.length > 0;
}

async function ensureTempChannelsPermanentColumn() {
  if (!permanentColumnPromise) {
    permanentColumnPromise = (async () => {
      const exists = await columnExists("temp_channels", "isPermanent");

      if (exists) {
        return;
      }

      await db.query(
        "ALTER TABLE temp_channels ADD COLUMN isPermanent TINYINT(1) NOT NULL DEFAULT 0"
      );

      console.log("➕ Spalte erstellt: temp_channels.isPermanent");
    })();
  }

  return permanentColumnPromise;
}

module.exports = {
  ensureTempChannelsPermanentColumn
};
