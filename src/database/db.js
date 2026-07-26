const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

let db;

/**
 * Initializes the SQLite database, creating tables if they do not exist.
 */
async function initDatabase() {
  const dbDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'database.sqlite');
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create Guild Settings table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      verify_channel_id TEXT,
      verified_role_id TEXT,
      log_channel_id TEXT,
      alt_log_channel_id TEXT
    )
  `);

  // Migration: Add alt_log_channel_id column if database already exists without it
  try {
    await db.exec(`ALTER TABLE guild_settings ADD COLUMN alt_log_channel_id TEXT`);
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Create Verifications table (tracks user_id + guild_id, with a hashed IP to count alts)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS verifications (
      user_id TEXT,
      guild_id TEXT,
      ip_hash TEXT,
      ip_type TEXT,
      device_fp TEXT,
      status TEXT DEFAULT 'verified',
      verified_at INTEGER,
      PRIMARY KEY (user_id, guild_id)
    )
  `);

  // Migration: Add device_fp column if database already exists without it
  try {
    await db.exec(`ALTER TABLE verifications ADD COLUMN device_fp TEXT`);
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Migration: Add status column if database already exists without it
  try {
    await db.exec(`ALTER TABLE verifications ADD COLUMN status TEXT DEFAULT 'verified'`);
  } catch (e) {
    // Column already exists, safe to ignore
  }

  console.log('Database initialized successfully: ' + dbPath);
}

/**
 * Get the settings for a specific guild.
 * @param {string} guildId 
 * @returns {Promise<object|null>}
 */
async function getGuildSettings(guildId) {
  return await db.get('SELECT * FROM guild_settings WHERE guild_id = ?', [guildId]);
}

/**
 * Save or update settings for a guild.
 * @param {string} guildId 
 * @param {object} settings 
 */
async function saveGuildSettings(guildId, { verifyChannelId, verifiedRoleId, logChannelId, altLogChannelId }) {
  return await db.run(
    `INSERT INTO guild_settings (guild_id, verify_channel_id, verified_role_id, log_channel_id, alt_log_channel_id)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(guild_id) DO UPDATE SET
      verify_channel_id = excluded.verify_channel_id,
      verified_role_id = excluded.verified_role_id,
      log_channel_id = excluded.log_channel_id,
      alt_log_channel_id = excluded.alt_log_channel_id`,
    [guildId, verifyChannelId, verifiedRoleId, logChannelId, altLogChannelId]
  );
}

/**
 * Get verification record for a user in a specific guild.
 * @param {string} userId 
 * @param {string} guildId 
 * @returns {Promise<object|null>}
 */
async function getVerification(userId, guildId) {
  return await db.get('SELECT * FROM verifications WHERE user_id = ? AND guild_id = ?', [userId, guildId]);
}

/**
 * Add a new verification log.
 * @param {string} userId 
 * @param {string} guildId 
 * @param {string} ipHash 
 * @param {string} ipType 
 * @param {string} deviceFp
 * @param {string} status
 */
async function addVerification(userId, guildId, ipHash, ipType, deviceFp, status = 'verified') {
  return await db.run(
    `INSERT INTO verifications (user_id, guild_id, ip_hash, ip_type, device_fp, status, verified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, guild_id) DO UPDATE SET
      ip_hash = excluded.ip_hash,
      ip_type = excluded.ip_type,
      device_fp = excluded.device_fp,
      status = excluded.status,
      verified_at = excluded.verified_at`,
    [userId, guildId, ipHash, ipType, deviceFp || 'unknown', status, Date.now()]
  );
}

/**
 * Get other user IDs that have verified with the same IP in a guild.
 * Useful for finding Alt accounts.
 * @param {string} guildId 
 * @param {string} ipHash 
 * @returns {Promise<Array<object>>}
 */
async function getDuplicateIps(guildId, ipHash) {
  return await db.all("SELECT user_id FROM verifications WHERE guild_id = ? AND ip_hash = ? AND status = 'verified'", [guildId, ipHash]);
}

/**
 * Get other user IDs that have verified with the same Device Fingerprint in a guild.
 * @param {string} guildId 
 * @param {string} deviceFp 
 * @returns {Promise<Array<object>>}
 */
async function getDuplicateDevices(guildId, deviceFp) {
  if (!deviceFp || deviceFp === 'unknown') return [];
  return await db.all("SELECT user_id FROM verifications WHERE guild_id = ? AND device_fp = ? AND status = 'verified'", [guildId, deviceFp]);
}

/**
 * Gets all verification records for a guild, including list of duplicate IPs and duplicate Devices.
 * @param {string} guildId 
 * @returns {Promise<Array<object>>}
 */
async function getAllVerificationsWithAlts(guildId) {
  return await db.all(
    `SELECT 
      v.user_id,
      v.ip_hash,
      v.ip_type,
      v.device_fp,
      v.status,
      v.verified_at,
      (SELECT GROUP_CONCAT(v2.user_id) FROM verifications v2 WHERE v2.guild_id = v.guild_id AND v2.ip_hash = v.ip_hash AND v2.user_id != v.user_id) as alt_ips,
      (SELECT GROUP_CONCAT(v3.user_id) FROM verifications v3 WHERE v3.guild_id = v.guild_id AND v3.device_fp = v.device_fp AND v3.device_fp != 'unknown' AND v3.device_fp IS NOT NULL AND v3.user_id != v.user_id) as alt_devices
     FROM verifications v
     WHERE v.guild_id = ?
     ORDER BY v.verified_at DESC`,
    [guildId]
  );
}

module.exports = {
  initDatabase,
  getGuildSettings,
  saveGuildSettings,
  getVerification,
  addVerification,
  getDuplicateIps,
  getDuplicateDevices,
  getAllVerificationsWithAlts
};
