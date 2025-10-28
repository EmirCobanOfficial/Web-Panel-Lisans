import { api } from '../api.js';
import { state } from '../state.js';

export async function initStatsPage() {
    const page = document.getElementById('stats-page');
    if (!page) return;

    // Clear previous charts if they exist
    if (window.memberStatusChart) window.memberStatusChart.destroy();
    if (window.channelTypeChart) window.channelTypeChart.destroy();

    try {
        const stats = await api.getGuildStats(state.selectedGuildId);

        // Populate stat cards
        document.getElementById('stats-owner-tag').textContent = stats.ownerTag || '...';
        document.getElementById('stats-created-at').textContent = new Date(stats.createdAt).toLocaleDateString('tr-TR');
        document.getElementById('stats-verification-level').textContent = stats.verificationLevel || '...';
        document.getElementById('stats-boost-tier').textContent = stats.boostTier || '...';
        document.getElementById('stats-boost-count').textContent = stats.boostCount || '0';
        document.getElementById('stats-role-count').textContent = stats.roleCount || '0';

        // Member Status Chart
        const memberCtx = document.getElementById('member-status-chart').getContext('2d');
        window.memberStatusChart = new Chart(memberCtx, {
            type: 'doughnut',
            data: {
                labels: ['Çevrimiçi', 'Boşta', 'Rahatsız Etmeyin', 'Çevrimdışı', 'Botlar'],
                datasets: [{
                    label: 'Üye Durumu',
                    data: [
                        stats.memberStats.online,
                        stats.memberStats.idle,
                        stats.memberStats.dnd,
                        stats.memberStats.offline,
                        stats.memberStats.bots
                    ],
                    backgroundColor: ['#43b581', '#faa61a', '#f04747', '#747f8d', '#7289da'],
                    borderColor: 'var(--bg-secondary)',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom', labels: { color: 'var(--text-primary)' } } }
            }
        });

        // Channel Type Chart
        const channelCtx = document.getElementById('channel-type-chart').getContext('2d');
        const channelData = stats.channelStats;
        const channelLabels = ['Metin', 'Ses', 'Kategori', 'Duyuru', 'Sahne', 'Forum'];
        const channelValues = [
            channelData.text, channelData.voice, channelData.category,
            channelData.announcement, channelData.stage, channelData.forum
        ];

        window.channelTypeChart = new Chart(channelCtx, {
            type: 'bar',
            data: {
                labels: channelLabels,
                datasets: [{
                    label: 'Kanal Sayısı',
                    data: channelValues,
                    backgroundColor: 'rgba(88, 101, 242, 0.6)',
                    borderColor: 'var(--brand-color)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: 'var(--text-secondary)', stepSize: 1 } },
                    y: { ticks: { color: 'var(--text-primary)' } }
                }
            }
        });

    } catch (error) {
        page.innerHTML = `<p style="color: var(--red);">${error.message}</p>`;
    }
}