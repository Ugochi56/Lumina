document.addEventListener('DOMContentLoaded', async () => {
    // UI Elements
    const loadingScreen = document.getElementById('loading');
    const adminContainer = document.getElementById('admin-container');

    const kpiUsers = document.getElementById('kpi-users');
    const kpiPhotos = document.getElementById('kpi-photos');
    const kpiEnhanced = document.getElementById('kpi-enhanced');
    const kpiRate = document.getElementById('kpi-rate');

    // Evaluation KPIs
    const kpiLatency = document.getElementById('kpi-latency');
    const kpiBrisque = document.getElementById('kpi-brisque');
    const kpiSatisfaction = document.getElementById('kpi-satisfaction');

    const tierBreakdownContainer = document.getElementById('tier-breakdown-container');
    const toolBreakdownContainer = document.getElementById('tool-breakdown-container');
    const recentPhotosGrid = document.getElementById('recent-photos-grid');
    const usersTableBody = document.getElementById('users-table-body');

    try {
        // Fetch Stats
        const statsRes = await fetch('/admin/stats');

        // Ensure user is authorized
        if (statsRes.status === 401 || statsRes.status === 403) {
            window.location.href = '/login.html';
            return;
        }

        if (!statsRes.ok) throw new Error('Failed to fetch stats');
        const stats = await statsRes.json();

        // 1. Populate KPIs
        kpiUsers.textContent = stats.totalUsers.toLocaleString();
        kpiPhotos.textContent = stats.totalPhotos.toLocaleString();
        kpiEnhanced.textContent = stats.totalEnhanced.toLocaleString();

        // Calculate Enhancement Rate
        if (stats.totalPhotos > 0) {
            const rate = ((stats.totalEnhanced / stats.totalPhotos) * 100).toFixed(1);
            kpiRate.textContent = `${rate}%`;
        } else {
            kpiRate.textContent = `0%`;
        }

        // Evaluation Framework Populate
        if (kpiLatency) kpiLatency.textContent = stats.avgProcessingTime ? `${stats.avgProcessingTime.toLocaleString()} ms` : 'N/A';
        if (kpiBrisque) kpiBrisque.textContent = stats.avgBrisqueScore ? stats.avgBrisqueScore : 'N/A';
        if (kpiSatisfaction) kpiSatisfaction.textContent = stats.satisfactionRate ? `${stats.satisfactionRate}%` : '0%';

        // 2. Populate Tier Breakdown
        const tiers = ['free', 'weekly', 'monthly', 'yearly'];
        let tierHTML = '';
        tiers.forEach(tier => {
            const count = stats.tierBreakdown[tier] || 0;
            const percentage = stats.totalUsers > 0 ? ((count / stats.totalUsers) * 100).toFixed(0) : 0;

            // Choose colors
            let colorClass = 'bg-gray-500';
            if (tier === 'weekly') colorClass = 'bg-blue-500';
            if (tier === 'monthly') colorClass = 'bg-green-500';
            if (tier === 'yearly') colorClass = 'bg-pink-500';

            tierHTML += `
                <div class="flex items-center justify-between">
                    <span class="capitalize text-gray-300 w-24">${tier}</span>
                    <div class="flex-1 mx-4 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div class="h-full ${colorClass}" style="width: ${percentage}%"></div>
                    </div>
                    <span class="font-bold w-12 text-right">${count}</span>
                </div>
            `;
        });
        tierBreakdownContainer.innerHTML = tierHTML;

        // 3. Populate Tool Breakdown
        const tools = ['upscale', 'restore', 'edit', 'lowlight'];
        let toolHTML = '';
        const totalToolsUsed = Object.values(stats.toolBreakdown).reduce((a, b) => a + b, 0);

        tools.forEach(tool => {
            const count = stats.toolBreakdown[tool] || 0;
            const percentage = totalToolsUsed > 0 ? ((count / totalToolsUsed) * 100).toFixed(0) : 0;

            let colorClass = 'bg-gray-500';
            if (tool === 'upscale') colorClass = 'bg-purple-500';
            if (tool === 'restore') colorClass = 'bg-orange';
            if (tool === 'edit') colorClass = 'bg-teal-500';
            if (tool === 'lowlight') colorClass = 'bg-yellow-400';

            toolHTML += `
                <div class="flex items-center justify-between">
                    <span class="capitalize text-gray-300 w-24">${tool}</span>
                    <div class="flex-1 mx-4 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div class="h-full ${colorClass}" style="width: ${percentage}%"></div>
                    </div>
                    <span class="font-bold w-12 text-right">${count}</span>
                </div>
            `;
        });
        if (totalToolsUsed === 0) {
            toolBreakdownContainer.innerHTML = '<p class="text-gray-500 italic text-sm">No enhanced photos yet.</p>';
        } else {
            toolBreakdownContainer.innerHTML = toolHTML;
        }

        // 4. Populate Recent Photos
        if (stats.recentPhotos && stats.recentPhotos.length > 0) {
            recentPhotosGrid.innerHTML = stats.recentPhotos.map(photo => `
                <div class="relative aspect-square rounded-xl overflow-hidden group bg-white/5 border border-white/10">
                    <img src="${photo.enhanced_url || photo.cloudinary_url}" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center text-xs">
                        <div>
                            <span class="block font-bold text-white mb-1 capitalize">${photo.recommended_tool || 'Original'}</span>
                            <span class="text-gray-400">${new Date(photo.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            recentPhotosGrid.innerHTML = '<p class="text-gray-500 italic col-span-full">No photos generated yet.</p>';
        }

        // Fetch Users (Separately to avoid slowing down dashboard load if table is massive)
        const usersRes = await fetch('/admin/users');
        if (!usersRes.ok) throw new Error('Failed to fetch users');
        const usersData = await usersRes.json();

        // 5. Populate Users Table
        if (usersData.users && usersData.users.length > 0) {
            usersTableBody.innerHTML = usersData.users.map(user => `
                <tr class="hover:bg-white/5 transition border-t border-white/5">
                    <td class="px-6 py-4">
                        <div class="font-bold text-white">${user.name || 'N/A'}</div>
                        <div class="text-xs text-gray-500 font-mono" title="${user.id}">...${user.id.substring(user.id.length - 8)}</div>
                    </td>
                    <td class="px-6 py-4 text-gray-300">${user.email}</td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 text-xs rounded-full bg-white/10 capitalize border border-white/10">
                            ${user.provider}
                        </span>
                    </td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 text-xs rounded-full capitalize font-bold ${user.tier === 'free' ? 'text-gray-400' : 'text-pink-400'}">
                            ${user.tier}
                        </span>
                    </td>
                    <td class="px-6 py-4 font-mono">${user.photos_uploaded}</td>
                    <td class="px-6 py-4 text-gray-400 text-sm">${new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
            `).join('');
        } else {
            usersTableBody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500 italic">No users found.</td></tr>`;
        }

        // Swap out loading screen
        loadingScreen.classList.add('hidden');
        adminContainer.classList.remove('hidden');

    } catch (err) {
        console.error("Dashboard Load Error:", err);
        loadingScreen.innerHTML = `
            <div class="text-center">
                <div class="text-red-500 mb-4 scale-150">❌</div>
                <h2 class="text-2xl font-bold mb-2">Access Denied</h2>
                <p class="text-gray-400 mb-6">You do not have permission to view this page or your session expired.</p>
                <a href="/login.html" class="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full transition">Return to Login</a>
            </div>
        `;
    }
});
