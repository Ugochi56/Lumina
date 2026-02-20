document.addEventListener('DOMContentLoaded', () => {
    // === 8. SUBSCRIPTION MODAL LOGIC ===
    const subscriptionModal = document.getElementById('subscription-modal');
    const closeSubscriptionModalBtn = document.getElementById('close-subscription-modal');

    // Buttons that open the modal
    const headerSubscribeBtns = document.querySelectorAll('#open-subscription-desktop, #open-subscription-mobile');
    const getStartedBtn = document.querySelector('#content-subscription button'); // "Get Started" in Account Modal

    // Tiers and Checkout
    const tierCards = document.querySelectorAll('.tier-card');
    const proceedCheckoutBtn = document.getElementById('proceed-checkout-btn');
    let selectedTier = null;
    const accountModal = document.getElementById('account-modal'); // For closing account modal if needed

    function openSubscriptionModal() {
        if (!subscriptionModal) return;
        subscriptionModal.classList.remove('hidden');
        subscriptionModal.classList.add('flex');

        // Ensure scroll is prevented on body
        document.body.style.overflow = 'hidden';

        // Close account modal if open
        if (accountModal && !accountModal.classList.contains('hidden')) {
            accountModal.classList.add('hidden');
            accountModal.classList.remove('flex');
        }
    }

    function closeSubscriptionModal() {
        if (!subscriptionModal) return;
        subscriptionModal.classList.add('hidden');
        subscriptionModal.classList.remove('flex');
        document.body.style.overflow = '';
    }

    // Attach Open Events
    if (getStartedBtn) getStartedBtn.addEventListener('click', openSubscriptionModal);

    // Attach header/mobile menu buttons
    headerSubscribeBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', openSubscriptionModal);
    });

    // Attach Close Events
    if (closeSubscriptionModalBtn) closeSubscriptionModalBtn.addEventListener('click', closeSubscriptionModal);
    if (subscriptionModal) {
        subscriptionModal.addEventListener('click', (e) => {
            if (e.target === subscriptionModal) {
                closeSubscriptionModal();
            }
        });
    }

    // Tier Selection Logic
    tierCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove selected class from all cards
            tierCards.forEach(c => c.classList.remove('selected'));

            // Add selected to clicked card
            card.classList.add('selected');

            // Set selected tier
            selectedTier = card.getAttribute('data-tier');

            // Enable the checkout button
            if (proceedCheckoutBtn) {
                proceedCheckoutBtn.disabled = false;
                proceedCheckoutBtn.classList.remove('bg-gray-200', 'text-gray-400', 'cursor-not-allowed', 'border', 'border-gray-300');
                proceedCheckoutBtn.classList.add('bg-gradient-to-r', 'from-orange', 'to-cayenne_red', 'text-white', 'hover:opacity-90', 'border-transparent');
            }
        });
    });

    // Checkout Routing
    if (proceedCheckoutBtn) {
        proceedCheckoutBtn.addEventListener('click', () => {
            if (selectedTier) {
                // Visual feedback
                const originalText = proceedCheckoutBtn.innerText;
                proceedCheckoutBtn.innerText = 'Processing...';
                proceedCheckoutBtn.disabled = true;
                proceedCheckoutBtn.classList.add('opacity-70');

                // Route
                setTimeout(() => {
                    window.location.href = `/api/checkout?tier=${selectedTier}`;
                }, 400);
            }
        });
    }
});
