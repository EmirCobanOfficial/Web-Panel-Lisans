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
import { initCustomCommandsPage } from './pages/customCommands.js'; // YENİ
import { initBackupsPage } from './pages/backups.js';
import { initPluginsPage, setupPluginPageListeners } from './pages/plugins.js';

const pageInitializers = {
    'dashboard-page': initDashboardPage,
    'roles-page': initRolesPage,
    'members-page': initMembersPage, // Hata düzeltildi: initRolesPage -> initMembersPage
    'stats-page': initStatsPage,
    'invites-page': initInvitesPage,
    'leaderboard-page': initLeaderboardPage,
    'audit-log-page': initAuditLogPage,
    'mod-log-page': initModLogPage,
    'custom-commands-page': initCustomCommandsPage,
    'backups-page': initBackupsPage,
    'plugins-page': initPluginsPage,
};

async function switchPage(pageId, force = false) {
    const hasUnsaved = !!document.querySelector('.save-button.has-unsaved-changes');
    if (hasUnsaved && !force) {
        const confirmed = await ui.showConfirmModal('Kaydedilmemiş Değişiklikler', 'Kaydedilmemiş değişiklikleriniz var. Yine de devam etmek istiyor musunuz? Değişiklikleriniz kaybolacak.');
        if (!confirmed) return;
    }

    // Tüm sayfaları gizle
    document.querySelectorAll('.page-content').forEach(page => page.style.display = 'none');
    
    // Eklenti sayfasının özel kapsayıcılarını da gizle
    document.querySelectorAll('.plugins-grid-container').forEach(container => {
        container.style.display = 'none';
    });


    // Tüm navigasyon linklerinden 'active' sınıfını kaldır
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

    const targetPage = document.getElementById(pageId);
    const targetLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);

    if (targetPage) {
        // Sadece hedef sayfayı göster
        targetPage.style.display = 'block';

        // Eğer hedef sayfa eklentiler sayfasıysa, onun özel kapsayıcılarını da göster
        if (pageId === 'plugins-page') {
            document.querySelectorAll('.plugins-grid-container').forEach(container => {
                container.style.display = 'block';
            });
        }

        if (targetLink) {
            targetLink.classList.add('active'); // İlgili menü öğesini aktif yap
        }

        // Sayfanın içerik yükleme fonksiyonunu çalıştır
        const initializer = pageInitializers[pageId];
        if (initializer) {
            await initializer();
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

        // YENİ: Resim önizlemelerini ayarla
        const welcomeBg = settings.welcome?.welcomeBackgroundImage;
        const goodbyeBg = settings.welcome?.goodbyeBackgroundImage;
        const welcomePreview = document.getElementById('welcome-bg-preview');
        const goodbyePreview = document.getElementById('goodbye-bg-preview');
        if (welcomeBg && welcomePreview) { welcomePreview.src = `/uploads/${welcomeBg}`; welcomePreview.style.display = 'block'; }
        else if (welcomePreview) { welcomePreview.style.display = 'none'; }
        if (goodbyeBg && goodbyePreview) { goodbyePreview.src = `/uploads/${goodbyeBg}`; goodbyePreview.style.display = 'block'; }
        else if (goodbyePreview) { goodbyePreview.style.display = 'none'; }
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
        console.log("Sunucu verileri yüklendi ve arayüz güncellendi.", state.guildData);
        await switchPage('dashboard-page', true); // Sayfayı zorla değiştir (kaydedilmemiş değişiklik uyarısı olmadan)
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

    // YENİ: Resim yükleme olay dinleyicisi
    document.addEventListener('change', async (e) => {
        if (e.target.classList.contains('image-upload-input')) {
            const fileInput = e.target;
            const file = fileInput.files[0];
            if (!file) return;

            const imageType = fileInput.dataset.type; // 'welcome' veya 'goodbye'
            const formData = new FormData();
            formData.append('backgroundImage', file);

            try {
                const response = await fetch(`/api/guild/${state.selectedGuildId}/upload-welcome-image/${imageType}`, {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);

                ui.showToast('Resim başarıyla yüklendi ve kaydedildi!', 'success');
                document.getElementById(`${imageType}-bg-preview`).src = result.filePath;
                document.getElementById(`${imageType}-bg-preview`).style.display = 'block';
            } catch (error) {
                ui.showToast(`Resim yüklenemedi: ${error.message}`, 'error');
            }
        }
    });

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
    // Olay dinleyicilerini her zaman en başta kur, böylece sayfa yüklendiği andan itibaren aktif olurlar.
    setupEventListeners();

    const lastGuildId = localStorage.getItem('selectedGuildId');
    if (lastGuildId) {
        state.selectedGuildId = lastGuildId;
        ui.elements.currentServerIcon.src = localStorage.getItem('selectedGuildIcon');
        ui.elements.currentServerName.textContent = localStorage.getItem('selectedGuildName');
        ui.elements.mainContent.style.display = 'block';
        ui.elements.modal.style.display = 'none'; // EKRANI GİZLEMEK İÇİN EKLENEN SATIR
        await loadGuildData(lastGuildId); // Sunucu verilerinin yüklenmesini bekle
    } else {
        await showServerSelector();
    }
}

init();