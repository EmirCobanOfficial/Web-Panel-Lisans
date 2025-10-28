const { SlashCommandBuilder, PermissionFlagsBits, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Bilet sistemi ile ilgili komutlar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Bilet oluşturma panelini kurar.')
                .addChannelOption(option =>
                    option.setName('kanal')
                        .setDescription('Panelin gönderileceği kanal.')
                        .setRequired(true)
                )
        ),
    async execute(interaction, serverSettings) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (interaction.options.getSubcommand() === 'setup') {
            const channel = interaction.options.getChannel('kanal');
            const settings = serverSettings[interaction.guild.id]?.tickets;

            if (!settings || !settings.topics || settings.topics.length === 0) {
                return interaction.editReply({
                    content: 'Bilet sistemi konuları henüz ayarlanmamış. Lütfen önce panelden en az bir konu ekleyin.',
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('Destek Talebi Oluştur')
                .setDescription('Bir destek talebi oluşturmak için lütfen aşağıdaki menüden bir konu seçin.')
                .setFooter({ text: `${interaction.guild.name} Destek Sistemi` });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('create_ticket_select')
                .setPlaceholder('Bir konu seçin...')
                .addOptions(
                    settings.topics.map(topic => ({
                        label: topic.label,
                        description: topic.description?.substring(0, 100) || undefined,
                        value: topic.id,
                        emoji: topic.emoji || undefined,
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply({ content: `Bilet paneli başarıyla ${channel} kanalına kuruldu.` });
        }
    },
};