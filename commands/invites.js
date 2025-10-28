const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const invitesPath = path.join(__dirname, '..', 'db', 'invites.json');

// Davet verilerini okumak için yardımcı fonksiyon
function getInviteData() {
    try {
        if (fs.existsSync(invitesPath)) {
            const data = fs.readFileSync(invitesPath, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("Davet verisi okunurken hata oluştu:", error);
    }
    return {};
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('davet')
        .setDescription('Davet sistemi ile ilgili komutlar.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('profil')
                .setDescription('Bir kullanıcının davet sayısını gösterir.')
                .addUserOption(option =>
                    option.setName('kullanıcı')
                        .setDescription('Profilini görmek istediğiniz kullanıcı.')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('liderlik')
                .setDescription('Sunucudaki davet liderlik tablosunu gösterir.')),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const allInviteData = getInviteData();
        const guildInvites = allInviteData[guildId];

        if (interaction.options.getSubcommand() === 'profil') {
            const targetUser = interaction.options.getUser('kullanıcı') || interaction.user;
            const userInvites = guildInvites?.[targetUser.id] || 0;

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setAuthor({ name: `${targetUser.tag}'ın Davet Profili`, iconURL: targetUser.displayAvatarURL() })
                .setDescription(`Bu sunucuda toplam **${userInvites}** davetin bulunuyor.`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

        } else if (interaction.options.getSubcommand() === 'liderlik') {
            if (!guildInvites || Object.keys(guildInvites).length === 0) {
                return interaction.reply({ content: 'Bu sunucuda henüz kimse davet edilmemiş.', flags: MessageFlags.Ephemeral });
            }

            const sortedInvites = Object.entries(guildInvites)
                .map(([userId, count]) => ({ userId, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10); // İlk 10'u al

            let description = '';
            for (let i = 0; i < sortedInvites.length; i++) {
                const invite = sortedInvites[i];
                const user = await interaction.client.users.fetch(invite.userId).catch(() => null);
                const rank = i + 1;
                const userTag = user ? user.tag : `Bilinmeyen Kullanıcı (${invite.userId.slice(0, 6)}...)`;
                description += `**${rank}.** ${userTag} - \`${invite.count}\` davet\n`;
            }

            const embed = new EmbedBuilder()
                .setColor(0xFFD700) // Altın rengi
                .setTitle(`🏆 ${interaction.guild.name} - Davet Liderlik Tablosu`)
                .setDescription(description)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    },
};