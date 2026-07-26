const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const setupCommand = require('./commands/setup');
const reportCommand = require('./commands/report');

// Initialize Discord Client
// We need Guilds and GuildMembers intents to manage roles and log events
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// Load commands
client.commands = new Collection();
client.commands.set(setupCommand.data.name, setupCommand);
client.commands.set(reportCommand.data.name, reportCommand);

client.once('ready', async () => {
  console.log(`[Discord Bot] Logged in as ${client.user.tag}`);

  // Register commands globally
  try {
    const commandsArray = Array.from(client.commands.values()).map(c => c.data.toJSON());
    await client.application.commands.set(commandsArray);
    console.log('[Discord Bot] Registered slash commands globally.');
  } catch (error) {
    console.error('[Discord Bot] Error registering commands:', error);
  }
});

// Interaction Create Listener (for Slash Commands)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[Discord Bot] Error executing command ${interaction.commandName}:`, error);
    const replyPayload = { 
      content: 'There was an error while executing this command!', 
      ephemeral: true 
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(replyPayload);
    } else {
      await interaction.reply(replyPayload);
    }
  }
});

/**
 * Assigns the verified role to a guild member.
 * @param {string} guildId 
 * @param {string} userId 
 * @returns {Promise<object>} Status of the action
 */
async function grantVerifiedRole(guildId, userId) {
  try {
    const settings = await db.getGuildSettings(guildId);
    if (!settings || !settings.verified_role_id) {
      return { success: false, reason: 'Verification system is not fully setup on this server.' };
    }

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
      return { success: false, reason: 'Guild not found or bot is no longer in this guild.' };
    }

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      return { success: false, reason: 'User is not a member of this Discord server. Did they leave?' };
    }

    const role = await guild.roles.fetch(settings.verified_role_id).catch(() => null);
    if (!role) {
      return { success: false, reason: 'Verified role not found. It might have been deleted.' };
    }

    // Check if user already has the role
    if (member.roles.cache.has(role.id)) {
      return { success: true, alreadyHasRole: true };
    }

    // Assign the role
    await member.roles.add(role, 'Security Verification Passed');
    return { success: true, alreadyHasRole: false };
  } catch (error) {
    console.error('[Discord Bot] Error assigning verified role:', error);
    return { success: false, reason: `Discord API error: ${error.message}` };
  }
}

/**
 * Sends a log embed to the configured log channel in a guild.
 * @param {string} guildId 
 * @param {EmbedBuilder} embed 
 */
async function sendLogMessage(guildId, embed) {
  try {
    const settings = await db.getGuildSettings(guildId);
    if (!settings || !settings.log_channel_id) return;

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;

    const channel = await guild.channels.fetch(settings.log_channel_id).catch(() => null);
    if (!channel) return;

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('[Discord Bot] Error sending log message:', error);
  }
}

/**
 * Sends a log embed to the configured alt log channel in a guild.
 * Falls back to the regular log channel if alt log channel is not explicitly set.
 * @param {string} guildId 
 * @param {EmbedBuilder} embed 
 */
async function sendAltLogMessage(guildId, embed) {
  try {
    const settings = await db.getGuildSettings(guildId);
    if (!settings) return;

    const targetChannelId = settings.alt_log_channel_id || settings.log_channel_id;
    if (!targetChannelId) return;

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;

    const channel = await guild.channels.fetch(targetChannelId).catch(() => null);
    if (!channel) return;

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('[Discord Bot] Error sending alt log message:', error);
  }
}

/**
 * Logs in the Discord Bot using the token.
 */
function startBot() {
  const token = process.env.DISCORD_TOKEN;
  if (!token || token === 'your_discord_bot_token_here') {
    console.warn('[Discord Bot] Warning: DISCORD_TOKEN is not configured. Bot client will not start.');
    return;
  }
  client.login(token);
}

module.exports = {
  startBot,
  grantVerifiedRole,
  sendLogMessage,
  sendAltLogMessage,
  client
};
