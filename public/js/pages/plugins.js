import { api } from '../api.js';
import { state } from '../state.js';
import * as ui from '../ui.js';
import { saveSettings } from '../app.js';

function initializeSortable(gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    new Sortable(grid, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
    });
}

export async function initPluginsPage() {
    // Sürükle-bırak özelliğini başlat
    document.querySelectorAll('.plugins-grid').forEach(grid => initializeSortable(grid.id));

    // Bu sayfaya özel olay dinleyicilerini kur
    setupPluginPageListeners();
}

export function setupPluginPageListeners() {
    const pluginsPage = document.getElementById('plugins-page');
    if (!pluginsPage || pluginsPage.dataset.listenerAttached === 'true') {
        return; // Dinleyici zaten kuruluysa, tekrar kurma.
    }

    pluginsPage.addEventListener('click', (e) => {
        const target = e.target;

        // Eklenti kartlarını daralt/genişlet
        const header = target.closest('.plugin-header');
        if (header && !target.closest('.switch')) {
            header.closest('.plugin-card')?.classList.toggle('collapsed');
        } // Bu kısım app.js'e taşındı, ancak burada kalması zararsızdır.

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
            // Davet ödülü ekleme mantığı buraya eklenebilir.
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

    // Ayar girdilerinde değişiklik olduğunda kaydetme butonunu işaretle
    pluginsPage.addEventListener('change', (e) => {
        const settingInput = e.target.closest('[data-setting]');
        if (settingInput) {
            ui.markUnsavedChanges(settingInput);
        }
        if (e.target.classList.contains('enable-toggle')) {
            e.target.closest('.plugin-card, .sub-plugin')?.classList.toggle('enabled', e.target.checked);
        }
    });

    pluginsPage.addEventListener('input', (e) => {
        const settingInput = e.target.closest('[data-setting]');
        if (settingInput) {
            ui.markUnsavedChanges(settingInput);
        }
    });

    pluginsPage.dataset.listenerAttached = 'true'; // Dinleyicinin kurulduğunu işaretle.
}