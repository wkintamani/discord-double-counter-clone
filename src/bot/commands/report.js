const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  AttachmentBuilder,
  EmbedBuilder
} = require('discord.js');
const db = require('../../database/db');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Export a detailed Excel spreadsheet of verified users, alt accounts, and device fingerprints.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Use ephemeral reply so that sensitive verification data (IP hashes, device fingerprints)
    // is kept confidential and visible only to the administrator.
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId;
    const guildName = interaction.guild.name;

    try {
      // 1. Fetch all verification data for the guild from the database
      const records = await db.getAllVerificationsWithAlts(guildId);

      if (!records || records.length === 0) {
        return interaction.editReply({
          content: '❌ No verification logs found for this server. Please ensure users have verified.'
        });
      }

      // 2. Fetch all guild members to populate the cache for fast user resolution
      await interaction.guild.members.fetch().catch(() => null);

      // 3. Create Excel Workbook and Worksheet
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Anti-Alt Verification Bot';
      workbook.lastModifiedBy = 'Anti-Alt Verification Bot';
      workbook.created = new Date();
      workbook.modified = new Date();

      const worksheet = workbook.addWorksheet('Verifications Report');

      // Define structure and headers
      worksheet.columns = [
        { header: 'Discord User ID', key: 'userId', width: 22 },
        { header: 'Username / Tag', key: 'username', width: 25 },
        { header: 'Verified At (Local)', key: 'verifiedAt', width: 25 },
        { header: 'IP Hash (SHA-256)', key: 'ipHash', width: 35 },
        { header: 'Connection Type', key: 'ipType', width: 18 },
        { header: 'Device Fingerprint', key: 'deviceFp', width: 35 },
        { header: 'Alt Accounts (Same IP)', key: 'altIps', width: 45 },
        { header: 'Alt Accounts (Same Device)', key: 'altDevices', width: 45 }
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.height = 28;
      headerRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' } // Sleek slate dark background
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Apply borders to header cells
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF334155' } },
          left: { style: 'thin', color: { argb: 'FF334155' } },
          bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
          right: { style: 'thin', color: { argb: 'FF334155' } }
        };
      });

      // Helper to resolve usernames/tags from cache
      const resolveUserTag = (id, includeAt = false) => {
        const member = interaction.guild.members.cache.get(id);
        if (member) return includeAt ? `@${member.user.tag}` : member.user.tag;
        const user = interaction.client.users.cache.get(id);
        if (user) return includeAt ? `@${user.tag}` : user.tag;
        return includeAt ? `@${id} (Left Server)` : `${id} (Left Server)`;
      };

      // 4. Populate rows and style them
      records.forEach((v, index) => {
        const username = resolveUserTag(v.user_id);
        const verifiedDate = new Date(v.verified_at).toLocaleString('en-US');

        // Resolve Alt IP User IDs to usernames
        const altIpList = v.alt_ips 
          ? v.alt_ips.split(',').map(id => resolveUserTag(id, true)).join(', ')
          : 'None';

        // Resolve Alt Device User IDs to usernames
        const altDeviceList = v.alt_devices
          ? v.alt_devices.split(',').map(id => resolveUserTag(id, true)).join(', ')
          : 'None';

        const row = worksheet.addRow({
          userId: v.user_id,
          username: username,
          verifiedAt: verifiedDate,
          ipHash: v.ip_hash || 'N/A',
          ipType: v.ip_type || 'N/A',
          deviceFp: v.device_fp || 'N/A',
          altIps: altIpList,
          altDevices: altDeviceList
        });

        // Default styling for data rows
        row.height = 22;
        row.font = { name: 'Segoe UI', size: 10 };

        // Zebra striping (alternate row colors)
        const isEven = index % 2 === 1;
        const rowBgColor = isEven ? 'FFF8FAFC' : 'FFFFFFFF'; // Light slate for even, white for odd

        row.eachCell((cell, colNumber) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowBgColor }
          };

          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };

          // Alignment
          if (colNumber === 1 || colNumber === 3 || colNumber === 5) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }

          // Highlight Risk Factors
          const ipTypeLower = (v.ip_type || '').toLowerCase();
          const isVpnOrProxy = ipTypeLower.includes('vpn') || ipTypeLower.includes('proxy') || ipTypeLower.includes('hosting');
          const hasAltIps = !!v.alt_ips;
          const hasAltDevices = !!v.alt_devices;

          // Highlight VPN / Proxy connection type
          if (colNumber === 5 && isVpnOrProxy) {
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFD97706' } }; // Amber/Orange
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FEF3C7' } // Light amber fill
            };
          }

          // Highlight Alt accounts from same IP
          if (colNumber === 7 && hasAltIps) {
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFDC2626' } }; // Red
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FEE2E2' } // Light red fill
            };
          }

          // Highlight Alt accounts from same browser/device fingerprint
          if (colNumber === 8 && hasAltDevices) {
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFDC2626' } }; // Red
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FEE2E2' } // Light red fill
            };
          }
        });
      });

      // 5. Generate and write workbook to a temporary file path
      const reportsDir = path.join(__dirname, '../../../data/reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const fileName = `verification_report_${guildId}_${Date.now()}.xlsx`;
      const tempFilePath = path.join(reportsDir, fileName);

      await workbook.xlsx.writeFile(tempFilePath);

      // Create attachment
      const attachment = new AttachmentBuilder(tempFilePath, { name: `Verification_Report_${guildName.replace(/\s+/g, '_')}.xlsx` });

      // Create embed details report
      const embed = new EmbedBuilder()
        .setTitle('📊 Verification Database Exported')
        .setDescription(`Successfully generated the verification logs and security report for **${guildName}**.`)
        .setColor('#10B981') // Premium green
        .addFields(
          { name: 'Total Registered Verified Users', value: String(records.length), inline: true },
          { name: 'Server Name', value: guildName, inline: true },
          { name: 'Report Generated At', value: new Date().toLocaleString(), inline: false }
        )
        .setFooter({ text: 'Anti-Alt & VPN Shield Security' })
        .setTimestamp();

      // Reply with the excel attachment
      await interaction.editReply({
        embeds: [embed],
        files: [attachment]
      });

      // 6. Delete temporary file safely after sending
      fs.unlink(tempFilePath, (err) => {
        if (err) {
          console.error('[Report Command] Error deleting temporary excel file:', err);
        }
      });

    } catch (error) {
      console.error('[Report Command] Error executing report command:', error);
      return interaction.editReply({
        content: `❌ An error occurred while generating the Excel report: ${error.message}`
      });
    }
  }
};
