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
                proceedCheckoutBtn.classList.add('bg-gradient-to-r', 'from-amber_flame', 'to-cayenne_red', 'text-white', 'hover:opacity-90', 'border-transparent');
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

                // Execute API Call
                fetch('/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tier: selectedTier })
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            // Create Success UI
                            const modalContent = subscriptionModal.querySelector('div'); // The main white box

                            // Save original content in case they open it again later
                            const originalHTML = modalContent.innerHTML;

                            modalContent.innerHTML = `
                            <div class="flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                                <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                    <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                </div>
                                <h2 class="text-3xl font-black text-gray-900 mb-2">Payment Successful!</h2>
                                <p class="text-gray-500 mb-8 text-lg">You are now subscribed to the <span class="font-bold text-gray-900 capitalize">${data.newTier}</span> plan.</p>
                                <button id="success-close-btn" class="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-lg transition transform hover:-translate-y-1">
                                    Start Enhancing
                                </button>
                            </div>
                        `;

                            // Bind close and trigger global update
                            document.getElementById('success-close-btn').addEventListener('click', () => {
                                closeSubscriptionModal();
                                // Dispatch event so enhance.js knows to update limits instantly
                                window.dispatchEvent(new Event('subscriptionUpdated'));

                                // Restore modal after a delay so it's ready for next time
                                setTimeout(() => {
                                    modalContent.innerHTML = originalHTML;
                                    // Reset button state
                                    proceedCheckoutBtn.innerText = originalText;
                                    proceedCheckoutBtn.disabled = true;
                                    proceedCheckoutBtn.classList.replace('opacity-70', 'opacity-100');
                                    proceedCheckoutBtn.classList.add('bg-gray-200', 'text-gray-400', 'cursor-not-allowed', 'border', 'border-gray-300');
                                    proceedCheckoutBtn.classList.remove('bg-gradient-to-r', 'from-amber_flame', 'to-cayenne_red', 'text-white', 'hover:opacity-90', 'border-transparent');
                                    selectedTier = null;
                                }, 500);
                            });

                        } else {
                            throw new Error(data.error || "Subscription failed");
                        }
                    })
                    .catch(err => {
                        console.error("Subscription Error:", err);
                        proceedCheckoutBtn.innerText = 'Error - Try Again';
                        proceedCheckoutBtn.disabled = false;
                        proceedCheckoutBtn.classList.remove('opacity-70');
                    });
            }
        });
    }
});
