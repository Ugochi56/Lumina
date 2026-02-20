document.addEventListener('DOMContentLoaded', () => {
    // === 3. AUTH MODAL LOGIC ===
    const authModal = document.getElementById('auth-modal');
    const loginBtns = document.querySelectorAll('.login-trigger');
    const closeModalBtn = document.getElementById('close-auth-modal');

    // Open Modal
    loginBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Close mobile menu if it is open
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('hidden');
                mobileMenu.classList.remove('flex');
            }

            authModal.classList.remove('hidden');
            authModal.classList.add('flex');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        });
    });

    // Close Modal Function
    function closeModal() {
        authModal.classList.add('hidden');
        authModal.classList.remove('flex');
        document.body.style.overflow = ''; // Restore scrolling
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    // Close on click outside
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                closeModal();
            }
        });
    }

    // === 4. LOGIN / SIGNUP TOGGLE LOGIC ===
    const authForm = document.getElementById('auth-form');
    const nameField = document.getElementById('name-field');
    const submitBtn = document.getElementById('submit-btn');
    const toggleAuthBtn = document.getElementById('toggle-auth');
    const toggleText = document.getElementById('toggle-text');

    let isLogin = true;

    if (toggleAuthBtn && authForm) {
        toggleAuthBtn.addEventListener('click', (e) => {
            e.preventDefault();

            isLogin = !isLogin;

            if (isLogin) {
                // Switch to Login
                authForm.action = '/auth/login';
                nameField.classList.add('hidden');
                submitBtn.textContent = 'Log In';
                toggleText.childNodes[0].nodeValue = "Don't have an account? ";
                toggleAuthBtn.textContent = "Sign Up";

                nameField.querySelector('input').removeAttribute('required');
            } else {
                // Switch to Signup
                authForm.action = '/auth/signup';
                nameField.classList.remove('hidden');
                submitBtn.textContent = 'Sign Up';
                toggleText.childNodes[0].nodeValue = "Already have an account? ";
                toggleAuthBtn.textContent = "Log In";

                nameField.querySelector('input').setAttribute('required', 'true');
            }
        });
    }

    // === 5. ERROR HANDLING LOGIC ===
    const urlParams = new URLSearchParams(window.location.search);
    const errorMsg = urlParams.get('error');
    const errorContainer = document.getElementById('error-container');
    const errorMessageSpan = document.getElementById('error-message');

    if (errorMsg && authModal) {
        // 1. Open Modal
        authModal.classList.remove('hidden');
        authModal.classList.add('flex');

        // 2. Show Error
        if (errorContainer && errorMessageSpan) {
            errorMessageSpan.textContent = decodeURIComponent(errorMsg);
            errorContainer.classList.remove('hidden');
        }

        // 3. Clean URL (optional, to prevent showing error on refresh)
        // window.history.replaceState({}, document.title, window.location.pathname);
    }
});
