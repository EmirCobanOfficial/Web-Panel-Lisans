import { state } from './state.js';
import { api } from './api.js';
import * as ui from './ui.js';
import { initDashboardPage } from './pages/dashboard.js';
import { initRolesPage } from './pages/roles.js';
import { initMembersPage } from './pages/members.js';
import { initStatsPage } from './pages/stats.js';
import { initInvitesPage } from './pages/invites.js'; // Bu satır zaten varsa, tekrar eklemeyin.
import { initLeaderboardPage } from './pages/leaderboard.js';
import { initAuditLogPage } from './pages/audit-log.js';
import { initModLogPage } from './pages/mod-log.js';
import { initBackupsPage } from './pages/backups.js';

// Şimdilik sayfa mantıklarını burada tutuyoruz, daha sonra bunları da ayırabiliriz.
const pages = {
    'dashboard-page': { init: initDashboardPage },
    'roles-page': { init: initRolesPage },
    'members-page': { init: initMembersPage },
    'stats-page': { init: initStatsPage },
    'invites-page': { init: initInvitesPage },
    'leaderboard-page': { init: initLeaderboardPage },
    'audit-log-page': { init: initAuditLogPage },
    'mod-log-page': { init: initModLogPage },
    'backups-page': { init: initBackupsPage },
};

async function switchPage(pageId) {
    // Sayfa değiştirirken kaydedilmemiş değişiklikler varsa uyar
    const hasUnsaved = !!document.querySelector('.save-button.has-unsaved-changes');
    if (hasUnsaved) {
        const confirmed = await ui.showConfirmModal('Kaydedilmemiş Değişiklikler', 'Kaydedilmemiş değişiklikleriniz var. Yine de devam etmek istiyor musunuz? Değişiklikleriniz kaybolacak.');
        if (!confirmed) return;
    }

    document.querySelectorAll('.page-content').forEach(page => page.style.display = 'none');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

    const targetPage = document.getElementById(pageId);
    const targetLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);

    if (targetPage) targetPage.style.display = 'block';
    if (targetLink) targetLink.classList.add('active');

    // İlgili sayfanın başlatma fonksiyonunu çağır
    if (pages[pageId] && pages[pageId].init) {
        try {
            await pages[pageId].init();
        } catch (error) {
            ui.showToast(`'${pageId}' sayfası yüklenirken hata: ${error.message}`, 'error');
        }
    }
}

function updatePluginCardsUI() {
    // Her UI güncellemesinde, kaydedilmemiş değişiklik göstergelerini temizle
    document.querySelectorAll('.save-button.has-unsaved-changes').forEach(btn => {
        btn.classList.remove('has-unsaved-changes');
    });
    ui.updateUnsavedChangesBar();

    const { settings, channels, roles } = state.guildData;
    if (!settings || !channels || !roles) return;

    document.querySelectorAll('.plugin-card').forEach(card => {
        const moduleName = card.dataset.module;
        const moduleSettings = settings[moduleName];
        if (!moduleSettings) return;

        // Eklentinin aktif/pasif durumunu ayarla
        const enableToggle = card.querySelector('.enable-toggle');
        if (enableToggle) {
            enableToggle.checked = moduleSettings.enabled;
            card.classList.toggle('enabled', moduleSettings.enabled);
        }

        // Diğer tüm ayar girdilerini doldur
        card.querySelectorAll('[data-setting]').forEach(input => {
            const settingName = input.dataset.setting;
            const savedValue = moduleSettings[settingName] ?? (input.type === 'checkbox' ? false : '');

            if (input.type === 'checkbox') {
                input.checked = savedValue;
            } else if (input.tagName.toLowerCase() === 'select') {
                // Kanal veya rol listesi içermesi gereken dinamik select'leri doldur.
                if (settingName.toLowerCase().includes('channelid') || settingName.toLowerCase().includes('categoryid')) {
                    const isCategorySelect = settingName.toLowerCase().includes('categoryid');
                    const dataSource = isCategorySelect ? channels.filter(c => c.type === 4) : channels.filter(c => [0, 5, 10, 11, 12].includes(c.type)); // Tüm metin bazlı kanallar
                    ui.populateSelect(input, dataSource, savedValue, { defaultText: 'Bir kanal seçin...' });
                } else if (settingName.toLowerCase().includes('roleid')) {
                    ui.populateSelect(input, roles, savedValue, { defaultText: 'Bir rol seçin...' });
                } else {
                    input.value = savedValue;
                }
            } else {
                input.value = savedValue;
            }
        });
    });

    // Özel liste render fonksiyonlarını çağır (ui.js'den gelenler)
    if (settings.moderation) {
        ui.renderProtectedChannelsList(channels, settings.moderation.protectedChannelIds);
    }
    if (settings.inviteTracker) {
        ui.renderInviteRewardsList(roles, settings.inviteTracker.rewardRoles);
    }
    if (settings.antiSpam) {
        ui.renderAntiSpamAllowedRoles(roles, settings.antiSpam.allowedRoles);
    }
    if (settings.tickets) {
        ui.renderTicketTopicsList(settings.tickets.topics);
    }
    // Bilet sistemi gibi daha karmaşık listeler için de buraya ekleme yapılabilir.
}

async function loadGuildData(guildId) {
    try {
        const [settings, channels, roles] = await Promise.all([
            api.getGuildSettings(guildId),
            api.getGuildChannels(guildId),
            api.getGuildRoles(guildId),
        ]);
        state.updateGuildData({ settings, channels, roles });
        updatePluginCardsUI(); // EKLENEN SATIR: Arayüzü gelen verilerle doldur.
        console.log("Sunucu verileri yüklendi", state.guildData);
        switchPage('dashboard-page');
    } catch (error) {
        ui.showToast(`Sunucu verileri yüklenemedi: ${error.message}`, 'error');
        showServerSelector();
    }
}

async function showServerSelector() {
    try {
        const [userGuilds, botGuildIds] = await Promise.all([api.getUserGuilds(), api.getBotGuilds()]);
        ui.elements.serverListContainer.innerHTML = '';
        userGuilds.forEach(guild => {
            const icon = guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';
            const card = document.createElement('div');
            card.className = 'server-card';
            card.dataset.guildId = guild.id;
            card.dataset.guildName = guild.name;
            card.dataset.guildIcon = icon;
            const isBotInGuild = botGuildIds.includes(guild.id);
            card.innerHTML = `<img class="server-icon" src="${icon}" alt="icon"><span class="server-name">${guild.name}</span>`;
            if (!isBotInGuild) {
                card.classList.add('not-in-server');
                card.dataset.inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}&disable_guild_select=true`;
                card.innerHTML += `<span class="warning-text"><i class="fa-solid fa-triangle-exclamation"></i> Bot sunucuda değil. Ekleme için tıklayın.</span>`;
            }
            ui.elements.serverListContainer.appendChild(card);
        });
        ui.elements.modal.style.display = 'flex';
    } catch (error) {
        ui.showToast(`Sunucu listesi alınamadı: ${error.message}`, 'error');
    }
}

function setupEventListeners() {
    ui.elements.sidebarNav.addEventListener('click', (e) => {
        const navLink = e.target.closest('.nav-link');
        if (navLink && navLink.dataset.page) {
            e.preventDefault();
            switchPage(navLink.dataset.page);
        }
    });

    ui.elements.serverListContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.server-card');
        if (!card) return;

        if (card.classList.contains('not-in-server')) {
            window.open(card.dataset.inviteUrl, '_blank');
            return;
        }
        
        state.setSelectedGuild(card.dataset.guildId, card.dataset.guildName, card.dataset.guildIcon);
        ui.elements.currentServerIcon.src = card.dataset.guildIcon;
        ui.elements.currentServerName.textContent = card.dataset.guildName;
        ui.elements.modal.style.display = 'none';
        ui.elements.mainContent.style.display = 'block';
        loadGuildData(card.dataset.guildId);
    });

    ui.elements.logoutBtn.addEventListener('click', () => {
        window.location.href = '/auth/logout';
    });

    ui.elements.currentServerHeader.addEventListener('click', () => {
        // Kullanıcının sunucu değiştirmesine izin ver
        showServerSelector();
    });

    // --- EKSİK OLAN GENEL OLAY DİNLEYİCİLERİ ---

    // Tek bir eklenti ayarını kaydetme
    document.addEventListener('click', async (e) => {
        const saveBtn = e.target.closest('.save-button');
        if (saveBtn) {
            await handleSave(saveBtn);
        }
    });
    document.addEventListener('click', (e) => {
        // Eklenti kartlarını daralt/genişlet
        const header = e.target.closest('.plugin-header');
        if (header && !e.target.closest('.switch')) {
            header.closest('.plugin-card')?.classList.toggle('collapsed');
        }
    });

    // Ayar girdilerinde değişiklik olduğunda kaydetme butonunu işaretle
    const handleSettingChange = (e) => {
        const settingInput = e.target.closest('[data-setting]');
        if (settingInput && settingInput.closest('.plugin-card')) {
            ui.markUnsavedChanges(settingInput);
        }
    };
    document.addEventListener('input', handleSettingChange);
    document.addEventListener('change', (e) => {
        handleSettingChange(e);
        // Eklenti enable/disable switch'i
        if (e.target.classList.contains('enable-toggle')) {
            e.target.closest('.plugin-card, .sub-plugin')?.classList.toggle('enabled', e.target.checked);
        }
    });

    // "Tümünü Kaydet" butonu
    const saveAllBtn = document.getElementById('save-all-changes-btn');
    if (saveAllBtn) {
        saveAllBtn.addEventListener('click', async () => {
            const unsavedButtons = document.querySelectorAll('.save-button.has-unsaved-changes');
            if (unsavedButtons.length === 0) {
                ui.showToast('Kaydedilecek değişiklik yok.', 'warning');
                return;
            }
            saveAllBtn.disabled = true;
            saveAllBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kaydediliyor...';
            const savePromises = Array.from(unsavedButtons).map(button => handleSave(button));
            try {
                await Promise.all(savePromises);
                ui.showToast('Tüm değişiklikler başarıyla kaydedildi!', 'success');
            } catch (error) {
                ui.showToast('Tüm ayarlar kaydedilirken bir hata oluştu.', 'error');
            } finally {
                saveAllBtn.disabled = false;
                saveAllBtn.textContent = 'Tümünü Kaydet';
            }
        });
    }

    // Ayarları içe/dışa aktarma ve sıfırlama
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.reset-all-settings-btn')) {
            const confirmed = await ui.showConfirmModal('Tüm Ayarları Sıfırla', 'Bu sunucu için yapılandırılmış TÜM eklenti ayarlarını varsayılan değerlerine sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.');
            if (!confirmed) return;
            try {
                await api.resetAllSettings(state.selectedGuildId);
                ui.showToast('Tüm ayarlar başarıyla sıfırlandı. Panel yenileniyor...', 'success');
                setTimeout(() => loadGuildData(state.selectedGuildId), 1500);
            } catch (error) {
                ui.showToast(`Hata: ${error.message}`, 'error');
            }
        }

        if (e.target.closest('.export-settings-btn')) {
            const settingsToExport = state.guildData.settings;
            if (!settingsToExport || Object.keys(settingsToExport).length === 0) {
                ui.showToast('Dışa aktarılacak ayar bulunamadı.', 'warning');
                return;
            }
            const dataStr = JSON.stringify(settingsToExport, null, 4);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sunucu-ayarlari-${state.selectedGuildId}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        if (e.target.closest('.import-settings-btn')) {
            document.getElementById('import-settings-input')?.click();
        }
    });

    // --- EKLENTİ KARTI İÇİNDEKİ BUTON OLAYLARI ---
    document.addEventListener('click', (e) => {
        const target = e.target;

        // Listeye öğe ekleme butonları
        if (target.id === 'add-protected-channel-btn') {
            const select = document.getElementById('channel-to-protect-select');
            const list = document.getElementById('protected-channels-list');
            const idToAdd = select.value;
            if (!idToAdd || list.querySelector(`.remove-item-btn[data-id="${idToAdd}"]`)) return;
            const name = select.options[select.selectedIndex].text;
            const listItem = document.createElement('div');
            listItem.className = 'protected-item';
            listItem.innerHTML = `<span>#${name}</span><button type="button" class="remove-item-btn" data-id="${idToAdd}" data-type="protected-channel">&times;</button>`;
            list.appendChild(listItem);
            if (select.selectedIndex > 0) select.options[select.selectedIndex].disabled = true;
            select.selectedIndex = 0;
            ui.markUnsavedChanges(target);
        } else if (target.id === 'add-antispam-role-btn') {
            const select = document.getElementById('antispam-role-select');
            const list = document.getElementById('antispam-allowed-roles-list');
            const idToAdd = select.value;
            if (!idToAdd || list.querySelector(`.remove-item-btn[data-id="${idToAdd}"]`)) return;
            const role = state.guildData.roles.find(r => r.id === idToAdd);
            if (role) {
                const listItem = document.createElement('div');
                listItem.className = 'protected-item';
                listItem.innerHTML = `<span><span class="role-color-dot" style="background-color: ${role.color};"></span>@${role.name}</span><button type="button" class="remove-item-btn" data-id="${idToAdd}" data-type="antispam-role">&times;</button>`;
                list.appendChild(listItem);
                if (select.selectedIndex > 0) select.options[select.selectedIndex].disabled = true;
                select.selectedIndex = 0;
                ui.markUnsavedChanges(target);
            }
        } else if (target.id === 'add-invite-reward-btn') {
            const countInput = document.getElementById('new-reward-count');
            const roleSelect = document.getElementById('new-reward-role-select');
            const list = document.getElementById('invite-rewards-list');
            const count = parseInt(countInput.value, 10);
            const roleId = roleSelect.value;
            const roleName = roleSelect.options[roleSelect.selectedIndex].text;

            if (!count || count < 1 || !roleId || list.querySelector(`.remove-item-btn[data-id="${roleId}"]`)) {
                ui.showToast('Lütfen geçerli bir davet sayısı ve listede olmayan bir rol seçin.', 'warning');
                return;
            }
            const item = document.createElement('div');
            item.className = 'protected-item';
            item.innerHTML = `<span><strong>${count}</strong> davet → @${roleName}</span><button type="button" class="remove-item-btn" data-id="${roleId}" data-type="invite-reward">&times;</button>`;
            list.appendChild(item);
            // Sıralama ve input temizleme işlemleri eklenebilir.
            ui.markUnsavedChanges(target);
        }

        // Listeden öğe silme butonu (remove-item-btn)
        const removeBtn = target.closest('.remove-item-btn');
        if (removeBtn) {
            const idToRemove = removeBtn.dataset.id;
            // İlgili select menüsündeki opsiyonu tekrar aktif etme mantığı buraya eklenebilir.
            removeBtn.parentElement.remove();
            ui.markUnsavedChanges(removeBtn);
        }
    });

    // --- BİLET SİSTEMİ OLAYLARI ---
    const addTicketTopicBtn = document.getElementById('add-ticket-topic-btn');
    if (addTicketTopicBtn) {
        addTicketTopicBtn.addEventListener('click', () => ui.openTicketTopicModal(state.guildData));
    }

    const ticketTopicModal = document.getElementById('ticket-topic-modal');
    if (ticketTopicModal) {
        ticketTopicModal.addEventListener('click', (e) => {
            if (e.target === ticketTopicModal || e.target.id === 'ticket-topic-modal-cancel') {
                ticketTopicModal.style.display = 'none';
            }
        });
    }

    const ticketTopicForm = document.getElementById('ticket-topic-form');
    if (ticketTopicForm) {
        ticketTopicForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const form = event.target;
            const topicData = {
                id: form.querySelector('#ticket-topic-id').value,
                label: form.querySelector('#ticket-topic-label').value.trim(),
                description: form.querySelector('#ticket-topic-description').value.trim(),
                emoji: form.querySelector('#ticket-topic-emoji').value.trim(),
                categoryId: form.querySelector('#ticket-topic-category').value || null,
                supportRoleId: form.querySelector('#ticket-topic-support-role').value || null,
            };

            if (!topicData.label) {
                ui.showToast('Konu başlığı boş bırakılamaz.', 'error');
                return;
            }

            const ticketSettings = state.guildData.settings.tickets;
            if (!ticketSettings.topics) ticketSettings.topics = [];

            const existingIndex = ticketSettings.topics.findIndex(t => t.id === topicData.id);
            if (existingIndex > -1) {
                ticketSettings.topics[existingIndex] = topicData;
            } else {
                ticketSettings.topics.push(topicData);
            }
            ui.renderTicketTopicsList(ticketSettings.topics);
            ui.markUnsavedChanges(form);
            ticketTopicModal.style.display = 'none';
            ui.showToast('Konu kaydedildi. Değişiklikleri kalıcı hale getirmek için "Ayarları Kaydet" butonuna tıklayın.', 'success');
        });
    }

    const ticketTopicsList = document.getElementById('ticket-topics-list');
    if (ticketTopicsList) {
        ticketTopicsList.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.edit-ticket-topic-btn');
            const deleteBtn = e.target.closest('.delete-ticket-topic-btn');

            if (editBtn) {
                const listItem = editBtn.closest('.list-item');
                if (listItem && listItem.dataset.topic) ui.openTicketTopicModal(state.guildData, JSON.parse(listItem.dataset.topic));
            } else if (deleteBtn) {
                const listItem = deleteBtn.closest('.list-item');
                if (listItem && listItem.dataset.topic) {
                    const topicData = JSON.parse(listItem.dataset.topic);
                    const confirmed = await ui.showConfirmModal('Konuyu Sil', `'${topicData.label}' konusunu silmek istediğinizden emin misiniz?`);
                    if (confirmed) {
                        state.guildData.settings.tickets.topics = state.guildData.settings.tickets.topics.filter(t => t.id !== topicData.id);
                        ui.renderTicketTopicsList(state.guildData.settings.tickets.topics);
                        ui.markUnsavedChanges(listItem);
                        ui.showToast('Konu silindi. Değişiklikleri kalıcı hale getirmek için "Ayarları Kaydet" butonuna tıklayın.', 'success');
                    }
                }
            }
        });
    }

}

async function handleSave(button) {
    const card = button.closest('.plugin-card');
    if (!card) return;
    const moduleName = card.dataset.module;
    const settings = {};

    card.querySelectorAll('[data-setting]').forEach(input => {
        let value;
        if (input.type === 'checkbox') {
            value = input.checked;
        } else if (input.type === 'number') {
            value = Number(input.value);
        } else {
            value = input.value;
        }
        if (input.dataset.type === 'seconds') {
            value *= 1000;
        }
        settings[input.dataset.setting] = value;
    });

    // Listelerden gelen verileri de ayarlara ekle
    if (moduleName === 'moderation') {
        settings.protectedChannelIds = Array.from(document.querySelectorAll('#protected-channels-list .remove-item-btn')).map(btn => btn.dataset.id);
    }
    if (moduleName === 'inviteTracker') {
        settings.rewardRoles = Array.from(document.querySelectorAll('#invite-rewards-list .protected-item')).map(item => {
            const count = parseInt(item.querySelector('strong')?.textContent, 10) || 0;
            const roleId = item.querySelector('.remove-item-btn')?.dataset.id;
            return { inviteCount: count, roleId: roleId };
        }).filter(r => r.roleId && r.inviteCount > 0);
    }
    if (moduleName === 'antiSpam') {
        settings.allowedRoles = Array.from(document.querySelectorAll('#antispam-allowed-roles-list .remove-item-btn')).map(btn => btn.dataset.id);
    }
    if (moduleName === 'tickets') {
        // Bilet konularını doğrudan state'den alıp kaydetme verisine ekleyin
        settings.topics = state.guildData.settings.tickets?.topics || [];
    }

    const isGlobalModule = moduleName === 'botStatus';
    const guildIdToSave = isGlobalModule ? 'global' : state.selectedGuildId;

    try {
        await api.saveSettings(guildIdToSave, moduleName, settings);
        ui.showToast(`${moduleName} ayarları başarıyla kaydedildi!`);
        button.classList.remove('has-unsaved-changes');
        ui.updateUnsavedChangesBar();
    } catch (error) {
        ui.showToast(`Ayarlar kaydedilirken hata: ${error.message}`, 'error');
        throw error; // Promise.all'un hatayı yakalaması için fırlat
    }
}

async function init() {
    setupEventListeners();
    const lastGuildId = localStorage.getItem('selectedGuildId');
    if (lastGuildId) {
        state.selectedGuildId = lastGuildId;
        ui.elements.currentServerIcon.src = localStorage.getItem('selectedGuildIcon');
        ui.elements.currentServerName.textContent = localStorage.getItem('selectedGuildName');
        ui.elements.mainContent.style.display = 'block';
        ui.elements.modal.style.display = 'none'; // EKRANI GİZLEMEK İÇİN EKLENEN SATIR
        await loadGuildData(lastGuildId);
    } else {
        await showServerSelector();
    }
}

init();