export const state = {
    selectedGuildId: null,
    guildData: {
        channels: [],
        roles: [],
        settings: {},
        stats: {},
        permissions: {},
        members: [],
        auditLogs: [],
        auditLogEvents: {},
        summary: {},
        modLogs: [],
        leaderboard: []
    },

    setSelectedGuild(guildId, guildName, guildIcon) {
        this.selectedGuildId = guildId;
        localStorage.setItem('selectedGuildId', guildId);
        localStorage.setItem('selectedGuildName', guildName);
        localStorage.setItem('selectedGuildIcon', guildIcon);
    },

    updateGuildData(newData) {
        this.guildData = { ...this.guildData, ...newData };
    }
};