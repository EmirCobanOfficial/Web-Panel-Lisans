import { state } from './state.js';

// --- Element Selections ---
export const elements = {
    modal: document.getElementById('server-select-modal'),
    serverListContainer: document.getElementById('server-list'),
    mainContent: document.querySelector('.main-content'),
    currentServerHeader: document.getElementById('current-server'),
    currentServerIcon: document.getElementById('current-server-icon'),
    currentServerName: document.getElementById('current-server-name'),
    logoutBtn: document.getElementById('logout-btn'),
    sidebarNav: document.querySelector('.sidebar-nav'),
    unsavedChangesBar: document.getElementById('unsaved-changes-bar'), // EKLENDİ: Kaydedilmemiş değişiklikler çubuğu
    addServerBtn: document.getElementById('add-server-btn'),
};

// --- Toast Notification Functions ---
const createToastContainer = () => {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
};

export const showToast = (message, type = 'success', duration = 3000) => {
    const container = createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} show`;

    let iconClass = 'fa-solid fa-circle-check';
    if (type === 'error') iconClass = 'fa-solid fa-circle-xmark';
    else if (type === 'warning') iconClass = 'fa-solid fa-triangle-exclamation';

    toast.innerHTML = `<i class="${iconClass}"></i> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { toast.parentElement?.removeChild(toast); }, 500);
    }, duration);
};

// --- Confirmation Modal ---
export const showConfirmModal = (title, text) => {
    return new Promise((resolve) => {
        const confirmModal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-modal-title');
        const textEl = document.getElementById('confirm-modal-text');
        const confirmBtn = document.getElementById('confirm-modal-confirm');
        const cancelBtn = document.getElementById('confirm-modal-cancel');

        if (!confirmModal || !titleEl || !textEl || !confirmBtn || !cancelBtn) {
            resolve(window.confirm(`${title}\n${text}`));
            return;
        }

        titleEl.textContent = title;
        textEl.textContent = text;

        const close = (result) => {
            confirmModal.style.display = 'none';
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            document.removeEventListener('keydown', keydownHandler);
            resolve(result);
        };

        const keydownHandler = (e) => { if (e.key === 'Escape') close(false); };

        confirmBtn.onclick = () => close(true);
        cancelBtn.onclick = () => close(false);
        document.addEventListener('keydown', keydownHandler);
        confirmModal.style.display = 'flex';
    });
};

// --- Unsaved Changes Bar ---
export const updateUnsavedChangesBar = () => {
    const bar = document.getElementById('unsaved-changes-bar');
    if (!bar) return;
    const hasUnsaved = !!document.querySelector('.save-button.has-unsaved-changes');
    bar.classList.toggle('visible', hasUnsaved);
};

export const markUnsavedChanges = (element) => {
    const card = element.closest('.plugin-card');
    if (card) {
        const saveButton = card.querySelector('.save-button');
        if (saveButton) {
            saveButton.classList.add('has-unsaved-changes');
        }
    }
    updateUnsavedChangesBar();
};

// --- UI Update Functions ---
export const populateSelect = (select, items, selectedId, options = {}) => {
    const { defaultText, valueKey = 'id', nameKey = 'name' } = options;
    select.innerHTML = defaultText ? `<option value="">${defaultText}</option>` : '';
    if (items && Array.isArray(items)) {
        items.forEach(item => {
            const option = new Option(item[nameKey], item[valueKey]);
            option.selected = item[valueKey] === selectedId;
            select.add(option);
        });
    }
};

// --- Eklentiye Özel Liste Oluşturma Fonksiyonları ---

export function renderProtectedChannelsList(allChannels, protectedIds = []) {
    const listContainer = document.getElementById('protected-channels-list');
    const selectDropdown = document.getElementById('channel-to-protect-select');
    if (!listContainer || !selectDropdown) return;
    listContainer.innerHTML = '';
    if (!Array.isArray(protectedIds)) protectedIds = [];
    populateSelect(selectDropdown, allChannels, null, { defaultText: 'Korumak için kanal seçin...' });
    Array.from(selectDropdown.options).forEach(opt => { opt.disabled = protectedIds.includes(opt.value); });
    protectedIds.forEach(id => {
        const channel = allChannels.find(c => c.id === id);
        if (channel) {
            const item = document.createElement('div');
            item.className = 'protected-item';
            item.innerHTML = `<span>#${channel.name}</span><button type="button" class="remove-item-btn" data-id="${id}" data-type="protected-channel">&times;</button>`;
            listContainer.appendChild(item);
        }
    });
}

export function renderAntiSpamAllowedRoles(allRoles, allowedRoleIds = []) {
    const listContainer = document.getElementById('antispam-allowed-roles-list');
    const selectDropdown = document.getElementById('antispam-role-select');
    if (!listContainer || !selectDropdown) return;

    listContainer.innerHTML = '';
    if (!Array.isArray(allowedRoleIds)) allowedRoleIds = [];

    const availableRoles = allRoles.filter(r => r.name !== '@everyone' && !r.managed);
    populateSelect(selectDropdown, availableRoles, null, { defaultText: 'İzin vermek için rol seçin...' });

    Array.from(selectDropdown.options).forEach(opt => {
        opt.disabled = allowedRoleIds.includes(opt.value);
    });

    allowedRoleIds.forEach(id => {
        const role = allRoles.find(r => r.id === id);
        if (role) {
            const item = document.createElement('div');
            item.className = 'protected-item';
            item.innerHTML = `
                <span><span class="role-color-dot" style="background-color: ${role.color};"></span>@${role.name}</span>
                <button type="button" class="remove-item-btn" data-id="${id}" data-type="antispam-role">&times;</button>`;
            listContainer.appendChild(item);
        }
    });
}

export function renderInviteRewardsList(allRoles, rewardRoles = []) {
    const listContainer = document.getElementById('invite-rewards-list');
    const selectDropdown = document.getElementById('new-reward-role-select');
    if (!listContainer || !selectDropdown) return;

    listContainer.innerHTML = '';
    populateSelect(selectDropdown, allRoles, null, { defaultText: 'Ödül rolü seçin...' });

    const usedRoleIds = rewardRoles.map(r => r.roleId);

    Array.from(selectDropdown.options).forEach(opt => {
        opt.disabled = usedRoleIds.includes(opt.value);
    });

    rewardRoles.sort((a, b) => a.inviteCount - b.inviteCount);

    rewardRoles.forEach(reward => {
        const role = allRoles.find(r => r.id === reward.roleId);
        if (role) {
            const item = document.createElement('div');
            item.className = 'protected-item';
            item.innerHTML = `
                <span><strong>${reward.inviteCount}</strong> davet → @${role.name}</span>
                <button type="button" class="remove-item-btn" data-id="${reward.roleId}" data-type="invite-reward">&times;</button>
            `;
            listContainer.appendChild(item);
        }
    });
}

export function renderTicketTopicsList(topics = []) {
    const listContainer = document.getElementById('ticket-topics-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    if (!Array.isArray(topics) || topics.length === 0) {
        listContainer.innerHTML = '<p class="setting-description" style="text-align: center; margin: 10px 0;">Henüz bilet konusu eklenmemiş.</p>';
        return;
    }

    topics.forEach(topic => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.dataset.topic = JSON.stringify(topic); // Store full topic data

        item.innerHTML = `
            <div class="list-item-content">
                <span class="list-item-label">${topic.emoji || ''} ${topic.label}</span>
                <span class="list-item-description">${topic.description || 'Açıklama yok'}</span>
            </div>
            <div class="list-item-actions">
                <button type="button" class="edit-ticket-topic-btn" title="Düzenle"><i class="fa-solid fa-pencil"></i></button>
                <button type="button" class="delete-ticket-topic-btn" title="Sil"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        listContainer.appendChild(item);
    });
}

export function openTicketTopicModal(guildData, topic = null) {
    const modal = document.getElementById('ticket-topic-modal');
    const form = document.getElementById('ticket-topic-form');
    const title = document.getElementById('ticket-topic-modal-title');
    if (!modal || !form || !title) return;

    form.reset();
    title.textContent = topic ? 'Bilet Konusunu Düzenle' : 'Bilet Konusu Ekle';

    const categorySelect = document.getElementById('ticket-topic-category');
    const roleSelect = document.getElementById('ticket-topic-support-role');

    // Populate dropdowns
    const populateSelectWithDefault = (select, items, selectedId, defaultText) => {
        select.innerHTML = `<option value="">${defaultText}</option>`;
        if (items && Array.isArray(items)) {
            items.forEach(item => {
                const option = new Option(item.name, item.id);
                option.selected = item.id === selectedId;
                select.add(option);
            });
        }
    };

    populateSelectWithDefault(categorySelect, guildData.channels.filter(c => c.type === 4), topic?.categoryId, 'Varsayılan Kategoriyi Kullan');
    populateSelectWithDefault(roleSelect, guildData.roles.filter(r => r.name !== '@everyone'), topic?.supportRoleId, 'Varsayılan Destek Rolünü Kullan');

    if (topic) {
        document.getElementById('ticket-topic-id').value = topic.id;
        document.getElementById('ticket-topic-label').value = topic.label;
        document.getElementById('ticket-topic-description').value = topic.description || '';
        document.getElementById('ticket-topic-emoji').value = topic.emoji || '';
    } else {
        // Yeni bir konu için benzersiz bir ID oluştur
        document.getElementById('ticket-topic-id').value = `topic_${Date.now()}`;
    }

    modal.style.display = 'flex';
}

export function updateSidebarVisibility() {
    // Bu fonksiyonun içeriği app.js'e taşındı, burada boş kalabilir veya kaldırılabilir.
    // Ancak dışa aktarılmış olması, eski kullanımların hata vermemesini sağlar.
}