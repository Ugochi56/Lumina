document.addEventListener('DOMContentLoaded', () => {
    const COOKIE_CONSENT_KEY = 'lumina_cookie_consent';

    // Check if user has already made a choice
    const userPreference = localStorage.getItem(COOKIE_CONSENT_KEY);

    if (!userPreference) {
        showCookieBanner();
    }

    function showCookieBanner() {
        // Create Banner HTML
        const banner = document.createElement('div');
        banner.id = 'cookie-banner';
        banner.innerHTML = `
            <div class="cookie-content">
                <div class="cookie-title">
                    <span>🍪</span> We value your privacy
                </div>
                <p class="cookie-text">
                    We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. 
                    By clicking "Accept All", you consent to our use of cookies.
                </p>
            </div>
            <div class="cookie-actions">
                <button id="cookie-reject" class="cookie-btn cookie-btn-reject">Reject</button>
                <button id="cookie-necessary" class="cookie-btn cookie-btn-necessary">Necessary Only</button>
                <button id="cookie-accept" class="cookie-btn cookie-btn-accept">Accept All</button>
            </div>
        `;

        document.body.appendChild(banner);

        // Trigger reflow to enable transition/animation if needed, then show
        setTimeout(() => {
            banner.classList.add('visible');
        }, 100);

        // Add Event Listeners
        document.getElementById('cookie-accept').addEventListener('click', () => {
            setConsent('all');
        });

        document.getElementById('cookie-necessary').addEventListener('click', () => {
            setConsent('necessary');
        });

        document.getElementById('cookie-reject').addEventListener('click', () => {
            setConsent('reject');
        });
    }

    function setConsent(level) {
        localStorage.setItem(COOKIE_CONSENT_KEY, level);
        hideCookieBanner();

        // Future: Initialize non-essential scripts here if 'all' is selected
        if (level === 'all') {
            console.log('Cookies accepted. Analytics would start here.');
        }
    }

    function hideCookieBanner() {
        const banner = document.getElementById('cookie-banner');
        if (banner) {
            banner.classList.remove('visible');
            setTimeout(() => {
                banner.remove();
            }, 500); // Wait for animation if any
        }
    }
});
