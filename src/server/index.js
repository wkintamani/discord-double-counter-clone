const express = require('express');
const { getOAuthUrl, getOAuthToken, getUserInfo } = require('../services/discord');
const { hashIp, checkIp } = require('../services/proxyCheck');
const db = require('../database/db');
const { grantVerifiedRole, sendLogMessage, sendAltLogMessage, client } = require('../bot/index');
const { renderLandingPage, renderSuccessPage, renderErrorPage } = require('./views');
const { EmbedBuilder } = require('discord.js');

const app = express();
app.use(express.json());

// Helper to parse User Agent into readable OS & Browser
function parseUserAgent(ua) {
  if (!ua || ua === 'Unknown') return 'Unknown Device';
  let os = "Unknown OS";
  if (ua.includes("Windows")) os = "Windows OS";
  else if (ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  let browser = "Unknown Browser";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";

  return `${os} (${browser})`;
}

// Helper to extract clean user IP address (handles reverse proxies, cloudflare, ngrok, etc.)
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // If there's a list, the first one is the original client IP
    const ips = Array.isArray(forwarded) ? forwarded : forwarded.split(',');
    return ips[0].trim();
  }
  return req.socket.remoteAddress;
}

/**
 * Route: Start Verification
 * Path: GET /verify?guild_id=XYZ
 * Purpose: Render landing page to begin the verification process.
 */
app.get('/verify', async (req, res) => {
  const { guild_id } = req.query;

  if (!guild_id) {
    return res.status(400).send(renderErrorPage('Invalid request: Guild ID is missing.'));
  }

  try {
    // Verify that the guild is set up in our system
    const settings = await db.getGuildSettings(guild_id);
    if (!settings) {
      return res.status(404).send(renderErrorPage('Verification is not set up on this server. Ask an admin to run `/setup-verification`.'));
    }

    // Fetch Guild details from Discord client
    const guild = await client.guilds.fetch(guild_id).catch(() => null);
    if (!guild) {
      return res.status(404).send(renderErrorPage('Bot is not present in this server. Please re-invite the bot.'));
    }

    const guildName = guild.name;
    const guildIconUrl = guild.iconURL({ dynamic: true });

    // Generate initial state with just the guildId
    const defaultState = Buffer.from(JSON.stringify({ guildId: guild_id })).toString('base64');
    const oauthUrl = getOAuthUrl(defaultState); // pass state parameter into our Discord OAuth url

    const isMockMode = (process.env.PROXYCHECK_API_KEY || 'mock').toLowerCase() === 'mock';

    res.send(renderLandingPage(guildName, guildIconUrl, oauthUrl, isMockMode, guild_id));
  } catch (error) {
    console.error('Error handling /verify route:', error);
    res.status(500).send(renderErrorPage('Internal Server Error while preparing verification.'));
  }
});

/**
 * Route: OAuth2 callback from Discord
 * Path: GET /auth/callback
 * Purpose: Exchanges code for token, fetches user info, runs security scans, and grants access.
 */
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).send(renderErrorPage('Invalid request: missing authorization code or state.'));
  }

  let guildId;
  let simulateVpn = false;
  let simulateProxy = false;
  let simulateAlt = false;
  let simulateDevice = false;

  // 1. Decode state parameter
  try {
    const decoded = Buffer.from(state, 'base64').toString('ascii');
    const stateObj = JSON.parse(decoded);
    guildId = stateObj.guildId;
    simulateVpn = stateObj.simulateVpn === true;
    simulateProxy = stateObj.simulateProxy === true;
    simulateAlt = stateObj.simulateAlt === true;
    simulateDevice = stateObj.simulateDevice === true;
  } catch (err) {
    // Fallback: If it is not a base64 JSON object, treat state as the raw guildId
    guildId = state;
  }

  if (!guildId) {
    return res.status(400).send(renderErrorPage('Invalid state: Guild ID could not be identified.'));
  }

  let userProfile = null;
  let username = 'User';
  let avatarUrl = '';

  try {
    // 2. Load guild settings & check bot status
    const settings = await db.getGuildSettings(guildId);
    if (!settings) {
      return res.status(400).send(renderErrorPage('Verification is not set up on this server.'));
    }

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    const guildName = guild ? guild.name : 'the server';

    // 3. Exchange OAuth2 Code for Access Token
    const accessToken = await getOAuthToken(code);

    // 4. Fetch User Details
    userProfile = await getUserInfo(accessToken);
    const userId = userProfile.id;
    username = userProfile.username;
    
    // Construct avatar URL
    avatarUrl = userProfile.avatar 
      ? `https://cdn.discordapp.com/avatars/${userId}/${userProfile.avatar}.png`
      : 'https://discord.com/assets/f9bbda527b9c5d986b20935786cadb56.png';

    // 5. IP Extraction & Hashing
    const ip = getClientIp(req);
    const ipHash = hashIp(ip);

    // Get Device Fingerprint Details from cookie
    const getCookie = (request, name) => {
      const value = `; ${request.headers.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    
    let deviceData = {
      screen: "Unknown",
      ua: "Unknown",
      tz: "Unknown",
      lang: "Unknown",
      ram: "Unknown",
      cores: "Unknown",
      canvasHash: "Unknown",
      hash: "unknown"
    };

    const rawCookie = getCookie(req, 'device_fp_data');
    if (rawCookie) {
      try {
        const decoded = Buffer.from(rawCookie, 'base64').toString('ascii');
        deviceData = JSON.parse(decoded);
      } catch (err) {
        console.error('Error parsing device fingerprint cookie:', err);
      }
    }

    const deviceFp = deviceData.hash || 'unknown';
    const osBrowser = parseUserAgent(deviceData.ua);

    console.log(`[Verify Flow] Running checks for user: @${username} (${userId}) from IP: ${ip}, Device Fp: ${deviceFp}`);

    // 6a. Security Check: Device Fingerprint Collision (Anti-Alt Device Check)
    const duplicateDevices = await db.getDuplicateDevices(guildId, deviceFp);
    const otherDeviceUsers = duplicateDevices.filter(d => d.user_id !== userId);
    
    // Simulate duplicate device block if sandbox requested it
    const altDeviceDetected = simulateDevice || (otherDeviceUsers.length > 0);

    if (altDeviceDetected) {
      console.warn(`[Verify Flow] Alt account blocked by browser fingerprint for user @${username}. Device fingerprint collision with: ${otherDeviceUsers.map(u => u.user_id).join(', ') || '(simulated-device-alt)'}`);

      // Send warning alert to Private Staff Logs (No text censorship / full hashes)
      const deviceEmbed = new EmbedBuilder()
        .setTitle('🚨 Alt Device Fingerprint Collision')
        .setColor('#EF4444') // Red
        .setThumbnail(avatarUrl)
        .setDescription(`User attempted to verify using a duplicate browser/device fingerprint.`)
        .addFields(
          { name: 'User', value: `<@${userId}> (${username})`, inline: true },
          { name: 'User ID', value: userId, inline: true },
          { name: 'IP Address', value: ip, inline: true },
          { name: 'IP Hash (Full)', value: ipHash, inline: false },
          { name: 'Device Fingerprint Hash (Full)', value: deviceFp, inline: false },
          { name: 'Device OS & Browser', value: osBrowser, inline: true },
          { name: 'Screen Resolution', value: deviceData.screen, inline: true },
          { name: 'RAM Memory', value: `${deviceData.ram} GB`, inline: true },
          { name: 'CPU Cores', value: String(deviceData.cores), inline: true },
          { name: 'Timezone', value: deviceData.tz, inline: true },
          { name: 'Language', value: deviceData.lang, inline: true },
          { name: 'Canvas Signature Hash', value: deviceData.canvasHash, inline: false },
          { name: 'Other accounts on Device', value: otherDeviceUsers.length > 0 ? otherDeviceUsers.map(u => `<@${u.user_id}>`).join(', ') : 'Simulated Alt Device', inline: false }
        )
        .setTimestamp();

      await sendAltLogMessage(guildId, deviceEmbed);
      return res.status(403).send(renderErrorPage('alt', username, avatarUrl, guildName));
    }

    // 6. Security Check: Alt / Multi-Account Check (IP Collision)
    const duplicates = await db.getDuplicateIps(guildId, ipHash);
    const otherUsers = duplicates.filter(d => d.user_id !== userId);
    const altLimit = parseInt(process.env.ALT_LIMIT) || 1;

    // Simulate Alt condition if requested by Sandbox
    const altDetected = simulateAlt || (otherUsers.length + 1 > altLimit);

    if (altDetected) {
      console.warn(`[Verify Flow] Alt account blocked for user @${username}. Hashed IP is already associated with: ${otherUsers.map(u => u.user_id).join(', ') || '(simulated-alt)'}`);
      
      // Send warning alert to Discord Logs (No text censorship / full hashes)
      const altEmbed = new EmbedBuilder()
        .setTitle('🚨 Alt Account Blocked')
        .setColor('#EF4444') // Red
        .setThumbnail(avatarUrl)
        .setDescription(`User attempted to verify from a duplicate IP address.`)
        .addFields(
          { name: 'User', value: `<@${userId}> (${username})`, inline: true },
          { name: 'User ID', value: userId, inline: true },
          { name: 'IP Address', value: ip, inline: true },
          { name: 'IP Hash (Full)', value: ipHash, inline: false },
          { name: 'Device Fingerprint Hash (Full)', value: deviceFp, inline: false },
          { name: 'Device OS & Browser', value: osBrowser, inline: true },
          { name: 'Screen Resolution', value: deviceData.screen, inline: true },
          { name: 'RAM Memory', value: `${deviceData.ram} GB`, inline: true },
          { name: 'CPU Cores', value: String(deviceData.cores), inline: true },
          { name: 'Timezone', value: deviceData.tz, inline: true },
          { name: 'Language', value: deviceData.lang, inline: true },
          { name: 'Canvas Signature Hash', value: deviceData.canvasHash, inline: false },
          { name: 'Other accounts on IP', value: otherUsers.length > 0 ? otherUsers.map(u => `<@${u.user_id}>`).join(', ') : 'Simulated Alt', inline: false }
        )
        .setTimestamp();
      
      await sendAltLogMessage(guildId, altEmbed);
      return res.status(403).send(renderErrorPage('alt', username, avatarUrl, guildName));
    }

    // 7. Security Check: VPN / Proxy detection
    const checkResult = await checkIp(ip, simulateVpn, simulateProxy);

    if (checkResult.isVpn || checkResult.isProxy) {
      const type = checkResult.isVpn ? 'vpn' : 'proxy';
      console.warn(`[Verify Flow] Blocked VPN/Proxy for user @${username}. Type: ${checkResult.type}, Provider: ${checkResult.provider}`);

      // Send warning alert to Discord Logs (No text censorship / full hashes)
      const vpnEmbed = new EmbedBuilder()
        .setTitle('🛡️ VPN/Proxy Connection Blocked')
        .setColor('#F59E0B') // Orange
        .setThumbnail(avatarUrl)
        .addFields(
          { name: 'User', value: `<@${userId}> (${username})`, inline: true },
          { name: 'User ID', value: userId, inline: true },
          { name: 'Connection Type', value: checkResult.type, inline: true },
          { name: 'Provider', value: checkResult.provider, inline: true },
          { name: 'Country', value: checkResult.country, inline: true },
          { name: 'IP Address', value: ip, inline: true },
          { name: 'IP Hash (Full)', value: ipHash, inline: false },
          { name: 'Device Fingerprint Hash (Full)', value: deviceFp, inline: false },
          { name: 'Device OS & Browser', value: osBrowser, inline: true },
          { name: 'Screen Resolution', value: deviceData.screen, inline: true },
          { name: 'RAM Memory', value: `${deviceData.ram} GB`, inline: true },
          { name: 'CPU Cores', value: String(deviceData.cores), inline: true }
        )
        .setTimestamp();

      await sendLogMessage(guildId, vpnEmbed);
      return res.status(403).send(renderErrorPage(type, username, avatarUrl, guildName));
    }

    // 8. Log Verification in DB
    await db.addVerification(userId, guildId, ipHash, checkResult.type, deviceFp);

    // 9. Grant Role on Discord Server
    const roleResult = await grantVerifiedRole(guildId, userId);

    if (!roleResult.success) {
      console.error(`[Verify Flow] Failed to grant role to @${username}: ${roleResult.reason}`);
      
      // Send role error alert to Discord Logs
      const errorLogEmbed = new EmbedBuilder()
        .setTitle('⚠️ Role Assignment Failed')
        .setColor('#EAB308') // Yellow
        .setThumbnail(avatarUrl)
        .setDescription(`User passed the verification scan, but the bot could not assign the role.`)
        .addFields(
          { name: 'User', value: `<@${userId}> (${username})`, inline: true },
          { name: 'Reason', value: roleResult.reason, inline: true }
        )
        .setTimestamp();

      await sendLogMessage(guildId, errorLogEmbed);
      return res.status(500).send(renderErrorPage(`You passed security checks, but the bot encountered an error assigning your role. Please contact an admin. (Reason: ${roleResult.reason})`, username, avatarUrl, guildName));
    }

    // 10. Success: Send Audit Log to Discord Channel
    console.log(`[Verify Flow] User @${username} successfully verified.`);
    
    if (!roleResult.alreadyHasRole) {
      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Member Verified')
        .setColor('#10B981') // Green
        .setThumbnail(avatarUrl)
        .addFields(
          { name: 'User', value: `<@${userId}> (${username})`, inline: true },
          { name: 'User ID', value: userId, inline: true },
          { name: 'Connection Type', value: checkResult.type, inline: true },
          { name: 'Country', value: checkResult.country, inline: true },
          { name: 'Provider', value: checkResult.provider, inline: true },
          { name: 'IP Address', value: ip, inline: true },
          { name: 'IP Hash (Full)', value: ipHash, inline: false },
          { name: 'Device Fingerprint Hash (Full)', value: deviceFp, inline: false },
          { name: 'Device OS & Browser', value: osBrowser, inline: true },
          { name: 'Screen Resolution', value: deviceData.screen, inline: true },
          { name: 'RAM Memory', value: `${deviceData.ram} GB`, inline: true },
          { name: 'CPU Cores', value: String(deviceData.cores), inline: true },
          { name: 'Timezone', value: deviceData.tz, inline: true },
          { name: 'Language', value: deviceData.lang, inline: true },
          { name: 'Canvas Signature Hash', value: deviceData.canvasHash, inline: false }
        )
        .setTimestamp();

      await sendLogMessage(guildId, successEmbed);
    }

    // 11. Render success response to user
    res.send(renderSuccessPage(username, avatarUrl, guildName));

  } catch (error) {
    console.error('[Verify Flow] Critical verification error:', error);
    
    // Detailed error logging
    res.status(500).send(renderErrorPage(error.message || 'A critical error occurred while verifying your connection.'));
  }
});

/**
 * Initializes and starts the Express web server.
 */
function startServer() {
  const port = process.env.PORT || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[Web Server] Running on port ${port}`);
    console.log(`[Web Server] Redirect URI registered as: ${process.env.REDIRECT_URI}`);
  });
}

module.exports = {
  startServer
};
