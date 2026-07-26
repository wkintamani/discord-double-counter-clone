const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
const db = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-verification')
    .setDescription('Configure the security verification system for this server.')
    .addChannelOption(option => 
      option.setName('verify-channel')
        .setDescription('The channel where the verification panel will be sent.')
        .setRequired(true))
    .addChannelOption(option => 
      option.setName('log-channel')
        .setDescription('The channel where verification logs and generic VPN warnings will be sent.')
        .setRequired(true))
    .addChannelOption(option => 
      option.setName('alt-log-channel')
        .setDescription('Optional private staff/moderator channel specifically for Alt Account alert logs.')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId;
    const verifyChannel = interaction.options.getChannel('verify-channel');
    const logChannel = interaction.options.getChannel('log-channel');
    const altLogChannel = interaction.options.getChannel('alt-log-channel');

    // Load role from environment variables
    const verifiedRoleId = process.env.VERIFIED_ROLE_ID;
    if (!verifiedRoleId) {
      return interaction.editReply({
        content: `❌ The \`VERIFIED_ROLE_ID\` is not configured in the bot's \`.env\` file. Please configure it first.`
      });
    }

    const verifiedRole = await interaction.guild.roles.fetch(verifiedRoleId).catch(() => null);
    if (!verifiedRole) {
      return interaction.editReply({
        content: `❌ The Verified Role (ID: \`${verifiedRoleId}\`) could not be found in this server. Please check the role ID in your \`.env\` file.`
      });
    }

    // Basic Permission Checks
    const botMember = interaction.guild.members.me;

    // Check if bot can write to verification channel
    if (!verifyChannel.permissionsFor(botMember).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.EmbedLinks])) {
      return interaction.editReply({
        content: `❌ I do not have permission to send embeds in ${verifyChannel}. Please update my channel permissions.`
      });
    }

    // Check if bot can write to log channel
    if (!logChannel.permissionsFor(botMember).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.EmbedLinks])) {
      return interaction.editReply({
        content: `❌ I do not have permission to send embeds in ${logChannel}. Please update my channel permissions.`
      });
    }

    // Check if bot can write to private alt log channel
    if (altLogChannel && !altLogChannel.permissionsFor(botMember).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.EmbedLinks])) {
      return interaction.editReply({
        content: `❌ I do not have permission to send embeds in the private alt log channel ${altLogChannel}. Please check my permissions on that channel.`
      });
    }

    // Check role hierarchy: can the bot assign this role?
    if (verifiedRole.position >= botMember.roles.highest.position) {
      return interaction.editReply({
        content: `❌ The role ${verifiedRole} is higher than or equal to my highest role. I will not be able to assign it to users. Please drag my bot role above the target role in Server Settings.`
      });
    }

    // Save configurations in the SQLite database
    try {
      await db.saveGuildSettings(guildId, {
        verifyChannelId: verifyChannel.id,
        verifiedRoleId: verifiedRole.id,
        logChannelId: logChannel.id,
        altLogChannelId: altLogChannel ? altLogChannel.id : null
      });
    } catch (err) {
      console.error('Database save error:', err);
      return interaction.editReply({
        content: `❌ Failed to save setup to the database. Error: ${err.message}`
      });
    }

    // Create verification panel plain text message
    const verifyText = 
      `🛡️ **Security Gateway | Verification Required**\n\n` +
      `Welcome to **${interaction.guild.name}**!\n\n` +
      `To ensure a safe and spam-free community, we use an automated gatekeeper to scan for alternative accounts, VPNs, and proxies.\n\n` +
      `**Follow these steps to access the server:**\n` +
      `1️⃣ Click the **Verify Account** button below.\n` +
      `2️⃣ Log in with your Discord account (OAuth2) on our secure portal.\n` +
      `3️⃣ Wait for the system to scan your connection and approve you.\n\n` +
      `⚠️ **Important Guidelines:**\n` +
      `* Disable any **VPN or Proxy** before clicking, or your verification will be denied.\n` +
      `* Only **${process.env.ALT_LIMIT || 1}** Discord account(s) are allowed per IP address.`;

    // Create the Link Button pointing to our Express verification route
    const verifyUrl = `${process.env.BASE_URL}/verify?guild_id=${guildId}`;
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Verify Account')
        .setURL(verifyUrl)
        .setStyle(ButtonStyle.Link)
        .setEmoji('🛡️')
    );

    // Send the verify panel to the specified channel
    try {
      await verifyChannel.send({
        content: verifyText,
        components: [actionRow]
      });

      let statusMsg = `✅ Verification setup complete!\n` +
                      `* **Verification Channel:** ${verifyChannel}\n` +
                      `* **Verified Role:** ${verifiedRole} *(Loaded from .env)*\n` +
                      `* **General Log Channel:** ${logChannel}\n`;
      
      if (altLogChannel) {
        statusMsg += `* **Private Alt Log Channel:** ${altLogChannel}\n`;
      } else {
        statusMsg += `* **Private Alt Log Channel:** *(Same as General Log Channel)*\n`;
      }

      statusMsg += `\nThe verification panel has been successfully posted to ${verifyChannel}.`;

      return interaction.editReply({
        content: statusMsg
      });
    } catch (err) {
      console.error('Error sending verify panel:', err);
      return interaction.editReply({
        content: `❌ Failed to send verification panel to ${verifyChannel}. Error: ${err.message}`
      });
    }
  }
};
