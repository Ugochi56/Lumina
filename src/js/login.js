document.addEventListener('DOMContentLoaded', () => {
    // === 1. IMAGE SLIDER LOGIC ===
    const sliderBox = document.getElementById('slider-box');
    const overlay = document.getElementById('overlay');
    const handle = document.getElementById('slider-handle');
    const imgBefore = document.getElementById('img-before');

    function slide(x) {
        if (!sliderBox) return;
        const rect = sliderBox.getBoundingClientRect();
        let pos = x - rect.left;

        // Constrain position
        if (pos < 0) pos = 0;
        if (pos > rect.width) pos = rect.width;

        // Slide
        overlay.style.width = pos + "px";
        handle.style.left = pos + "px";
    }

    if (sliderBox) {
        // Mouse Events
        sliderBox.addEventListener('mousemove', (e) => slide(e.pageX));

        // Touch Events
        sliderBox.addEventListener('touchmove', (e) => slide(e.touches[0].pageX));

        // Init
        const rect = sliderBox.getBoundingClientRect();
        imgBefore.style.width = rect.width + "px";
        slide(rect.left + (rect.width / 2));

        // Resize
        window.addEventListener('resize', () => {
            const rect = sliderBox.getBoundingClientRect();
            imgBefore.style.width = rect.width + "px";
            slide(rect.left + (rect.width / 2));
        });
    }


    // === 2. FILE UPLOAD LOGIC ===
    const fileInput = document.getElementById('file-upload');
    const chooseBtn = document.getElementById('choose-files-btn');
    const dropZone = document.getElementById('drop-zone');

    if (chooseBtn && fileInput) {
        chooseBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                console.log("Files selected:", e.target.files);
                // Future: Handle files
            }
        });
    }

    // Drag & Drop
    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });

        function highlight(e) {
            dropZone.classList.add('border-cayenne_red');
            dropZone.classList.add('bg-white/20');
        }

        function unhighlight(e) {
            dropZone.classList.remove('border-cayenne_red');
            dropZone.classList.remove('bg-white/20');
        }

        dropZone.addEventListener('drop', handleDrop, false);

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            console.log("Files dropped:", files);
            // Future: Handle files
        }
    }


    // === 3. AUTH MODAL LOGIC ===
    const authModal = document.getElementById('auth-modal');
    const loginBtns = document.querySelectorAll('.login-trigger');
    const closeModalBtn = document.getElementById('close-auth-modal');

    // Open Modal
    loginBtns.forEach(btn => {
        btn.addEventListener('click', () => {
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
    // === 6. AUTH STATUS CHECK ===
    function checkAuth() {
        fetch('/auth/status')
            .then(res => res.json())
            .then(data => {
                const navGuest = document.getElementById('nav-guest');
                const navAuth = document.getElementById('nav-auth');

                if (data.authenticated) {
                    if (navGuest) navGuest.classList.add('hidden');
                    if (navAuth) navAuth.classList.remove('hidden');
                    if (navAuth) navAuth.classList.add('flex');
                    console.log("User is authenticated:", data.user.name);
                } else {
                    if (navGuest) navGuest.classList.remove('hidden');
                    if (navAuth) navAuth.classList.add('hidden');
                    if (navAuth) navAuth.classList.remove('flex');
                    console.log("User is guest");
                }
            })
            .catch(err => console.error("Auth check failed:", err));
    }

    // === 7. ACCOUNT MODAL LOGIC ===
    const accountModal = document.getElementById('account-modal');
    const myAccountBtn = document.querySelector('#nav-auth button:first-child'); // First button in nav-auth is "My account"
    const closeAccountBtn = document.getElementById('close-account-modal');

    // Tabs
    const tabGeneral = document.getElementById('tab-general');
    const tabSubscription = document.getElementById('tab-subscription');
    const contentGeneral = document.getElementById('content-general');
    const contentSubscription = document.getElementById('content-subscription');

    // Data Fields
    const accountEmail = document.getElementById('account-email');
    const accountProvider = document.getElementById('account-provider');
    const accountCreated = document.getElementById('account-created');
    const accountId = document.getElementById('account-id');

    if (myAccountBtn && accountModal) {
        myAccountBtn.addEventListener('click', () => {
            accountModal.classList.remove('hidden');
            accountModal.classList.add('flex');
            // Fetch latest user data when opening
            fetch('/auth/status')
                .then(res => res.json())
                .then(data => {
                    if (data.authenticated) {
                        accountEmail.textContent = data.user.email;
                        accountProvider.textContent = data.user.provider === 'local' ? 'Lumina Account' : (data.user.provider.charAt(0).toUpperCase() + data.user.provider.slice(1) + ' Account');
                        // accountCreated.textContent = new Date(data.user.created_at).toLocaleDateString(); // Assuming DB has this
                        // accountId.textContent = data.user.id;
                        // Mock data if DB fields missing
                        accountCreated.textContent = "18/02/2026";
                        accountId.textContent = "u-" + (data.user.id || "12345");
                    }
                });
        });
    }

    if (closeAccountBtn) {
        closeAccountBtn.addEventListener('click', () => {
            accountModal.classList.add('hidden');
            accountModal.classList.remove('flex');
        });
    }

    // Tab Switching
    function setTab(tab) {
        if (tab === 'general') {
            tabGeneral.classList.add('bg-white', 'shadow-sm', 'text-black', 'border', 'border-gray-200');
            tabGeneral.classList.remove('text-gray-500', 'hover:bg-gray-200');

            tabSubscription.classList.remove('bg-white', 'shadow-sm', 'text-black', 'border', 'border-gray-200');
            tabSubscription.classList.add('text-gray-500', 'hover:bg-gray-200');

            contentGeneral.classList.remove('hidden');
            contentSubscription.classList.add('hidden');
        } else {
            tabSubscription.classList.add('bg-white', 'shadow-sm', 'text-black', 'border', 'border-gray-200');
            tabSubscription.classList.remove('text-gray-500', 'hover:bg-gray-200');

            tabGeneral.classList.remove('bg-white', 'shadow-sm', 'text-black', 'border', 'border-gray-200');
            tabGeneral.classList.add('text-gray-500', 'hover:bg-gray-200');

            contentSubscription.classList.remove('hidden');
            contentGeneral.classList.add('hidden');
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

    checkAuth();
});
