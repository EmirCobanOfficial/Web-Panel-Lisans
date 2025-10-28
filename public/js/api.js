async function fetchJSON(url, options = {}) {
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        return data;
    } catch (error) {
        console.error(`API isteği hatası (${url}):`, error);
        throw error; // Hatanın daha üst katmanlarda yakalanabilmesi için tekrar fırlat
    }
}

export const api = {
    // GET istekleri
    getUserGuilds: () => fetchJSON('/api/user/guilds'),
    getBotGuilds: () => fetchJSON('/api/bot/guilds'),
    getGuildSettings: (guildId) => fetchJSON(`/api/settings?guildId=${guildId}`),
    getGuildChannels: (guildId) => fetchJSON(`/api/guild/${guildId}/channels`),
    getGuildRoles: (guildId) => fetchJSON(`/api/guild/${guildId}/roles`),
    getGuildMembers: (guildId) => fetchJSON(`/api/guild/${guildId}/members`),
    getGuildSummary: (guildId) => fetchJSON(`/api/guild/${guildId}/summary`),
    getGuildStats: (guildId) => fetchJSON(`/api/guild/${guildId}/stats`),
    getGuildInvites: (guildId) => fetchJSON(`/api/guild/${guildId}/invites`),
    getGuildAuditLogs: (guildId) => fetchJSON(`/api/guild/${guildId}/audit-logs`),
    getGuildModLogs: (guildId) => fetchJSON(`/api/guild/${guildId}/mod-logs`),
    getGuildLeaderboard: (guildId) => fetchJSON(`/api/guild/${guildId}/leaderboard`),
    getGuildBackups: (guildId) => fetchJSON(`/api/guild/${guildId}/backups`),
    getPermissions: () => fetchJSON('/api/permissions'),
    getAuditLogEvents: () => fetchJSON('/api/audit-log-events'),

    // POST, PATCH, DELETE istekleri
    saveSettings: (guildId, moduleName, newSettings) => fetchJSON('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId, module: moduleName, newSettings }),
    }),
    deleteRole: (guildId, roleId) => fetchJSON(`/api/guild/${guildId}/roles/${roleId}`, { method: 'DELETE' }),
    createRole: (guildId, roleData) => fetchJSON(`/api/guild/${guildId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData)
    }),
    updateRole: (guildId, roleId, roleData) => fetchJSON(`/api/guild/${guildId}/roles/${roleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData)
    }),
    updateMemberRoles: (guildId, memberId, roles) => fetchJSON(`/api/guild/${guildId}/members/${memberId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles })
    }),
    deleteInvite: (guildId, inviteCode) => fetchJSON(`/api/guild/${guildId}/invites/${inviteCode}`, { method: 'DELETE' }),
    resetAllSettings: (guildId) => fetchJSON(`/api/guild/${guildId}/settings`, { method: 'DELETE' }),
    importSettings: (guildId, settings) => fetchJSON(`/api/guild/${guildId}/settings/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
    }),
    createBackup: (guildId) => fetchJSON(`/api/guild/${guildId}/backup`, { method: 'POST' }),
    deleteBackup: (guildId, backupId) => fetchJSON(`/api/guild/${guildId}/backups/${backupId}`, { method: 'DELETE' }),
    restoreBackup: (guildId, backupData) => fetchJSON(`/api/guild/${guildId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData)
    }),
};