document.addEventListener('DOMContentLoaded', () => {
    // === 7. ACCOUNT MODAL LOGIC ===
    const accountModal = document.getElementById('account-modal');
    const myAccountBtn = document.querySelector('#nav-auth button:first-child'); // First button in nav-auth is "My account"
    const mobileMyAccountBtn = document.getElementById('mobile-my-account-btn');
    const closeAccountBtn = document.getElementById('close-account-modal');

    // Tabs
    const tabGeneral = document.getElementById('tab-general');
    const tabSubscription = document.getElementById('tab-subscription');

    const wrapperGeneral = document.getElementById('wrapper-general');
    const contentGeneral = document.getElementById('content-general');

    const wrapperSubscription = document.getElementById('wrapper-subscription');
    const contentSubscription = document.getElementById('content-subscription');

    // Data Fields
    const accountEmail = document.getElementById('account-email');
    const accountProvider = document.getElementById('account-provider');
    const accountCreated = document.getElementById('account-created');
    const accountId = document.getElementById('account-id');

    function openAccountModal() {
        if (!accountModal) return;
        accountModal.classList.remove('hidden');
        accountModal.classList.add('flex');

        // Close mobile menu if open
        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu) {
            mobileMenu.classList.add('hidden');
            mobileMenu.classList.remove('flex');
        }

        // Fetch latest user data when opening
        fetch('/auth/status')
            .then(res => res.json())
            .then(data => {
                if (data.authenticated) {
                    accountEmail.textContent = data.user.email;
                    accountProvider.textContent = data.user.provider === 'local' ? 'Lumina Account' : (data.user.provider.charAt(0).toUpperCase() + data.user.provider.slice(1) + ' Account');
                    // Mock data if DB fields missing
                    accountCreated.textContent = "18/02/2026";
                    accountId.textContent = "u-" + (data.user.id || "12345");

                    const accountTier = document.getElementById('account-tier');
                    if (accountTier && data.user.subscription_tier) {
                        accountTier.textContent = data.user.subscription_tier;
                    }
                }
            });
    }

    if (myAccountBtn) {
        myAccountBtn.addEventListener('click', openAccountModal);
    }

    if (mobileMyAccountBtn) {
        mobileMyAccountBtn.addEventListener('click', openAccountModal);
    }

    if (closeAccountBtn) {
        closeAccountBtn.addEventListener('click', () => {
            accountModal.classList.add('hidden');
            accountModal.classList.remove('flex');
        });
    }

    // Tab Switching
    function setTab(tab) {
        if (!wrapperGeneral || !wrapperSubscription || !contentGeneral || !contentSubscription) return;

        if (tab === 'general') {
            tabGeneral.classList.add('bg-white', 'shadow-sm', 'text-black', 'border', 'border-gray-200');
            tabGeneral.classList.remove('text-gray-500', 'hover:bg-gray-200');

            tabSubscription.classList.remove('bg-white', 'shadow-sm', 'text-black', 'border', 'border-gray-200');
            tabSubscription.classList.add('text-gray-500', 'hover:bg-gray-200');

            wrapperGeneral.style.gridTemplateRows = "1fr";
            contentGeneral.classList.remove('opacity-0', 'pointer-events-none');
            contentGeneral.classList.add('opacity-100');

            wrapperSubscription.style.gridTemplateRows = "0fr";
            contentSubscription.classList.remove('opacity-100');
            contentSubscription.classList.add('opacity-0', 'pointer-events-none');
        } else {
            tabSubscription.classList.add('bg-white', 'shadow-sm', 'text-black', 'border', 'border-gray-200');
            tabSubscription.classList.remove('text-gray-500', 'hover:bg-gray-200');

            tabGeneral.classList.remove('bg-white', 'shadow-sm', 'text-black', 'border', 'border-gray-200');
            tabGeneral.classList.add('text-gray-500', 'hover:bg-gray-200');

            wrapperSubscription.style.gridTemplateRows = "1fr";
            contentSubscription.classList.remove('opacity-0', 'pointer-events-none');
            contentSubscription.classList.add('opacity-100');

            wrapperGeneral.style.gridTemplateRows = "0fr";
            contentGeneral.classList.remove('opacity-100');
            contentGeneral.classList.add('opacity-0', 'pointer-events-none');
        }
    }

    if (tabGeneral) tabGeneral.addEventListener('click', () => setTab('general'));
    if (tabSubscription) tabSubscription.addEventListener('click', () => setTab('subscription'));

    // Close on click outside
    if (accountModal) {
        accountModal.addEventListener('click', (e) => {
            if (e.target === accountModal) {
                accountModal.classList.add('hidden');
                accountModal.classList.remove('flex');
            }
        });
    }
});
