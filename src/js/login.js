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


    // === 2. AUTH STATUS CHECK LOGIC ===
    let isAuthenticated = false;

    function checkAuth() {
        fetch('/auth/status')
            .then(res => res.json())
            .then(data => {
                const navGuest = document.getElementById('nav-guest');
                const navAuth = document.getElementById('nav-auth');
                const navGuestMobile = document.getElementById('nav-guest-mobile');
                const navAuthMobile = document.getElementById('nav-auth-mobile');

                isAuthenticated = data.authenticated;

                if (data.authenticated) {
                    // Desktop
                    if (navGuest) navGuest.classList.add('hidden');
                    if (navAuth) navAuth.classList.remove('hidden');
                    if (navAuth) navAuth.classList.add('flex');

                    // Mobile
                    if (navGuestMobile) navGuestMobile.classList.add('hidden');
                    if (navGuestMobile) navGuestMobile.classList.remove('flex'); // Remove flex if it was there
                    if (navAuthMobile) navAuthMobile.classList.remove('hidden');
                    if (navAuthMobile) navAuthMobile.classList.add('flex');

                    console.log("User is authenticated:", data.user.name);
                } else {
                    // Desktop
                    if (navGuest) navGuest.classList.remove('hidden');
                    if (navAuth) navAuth.classList.add('hidden');
                    if (navAuth) navAuth.classList.remove('flex');

                    // Mobile
                    if (navGuestMobile) navGuestMobile.classList.remove('hidden');
                    if (navGuestMobile) navGuestMobile.classList.add('flex');
                    if (navAuthMobile) navAuthMobile.classList.add('hidden');
                    if (navAuthMobile) navAuthMobile.classList.remove('flex');

                    console.log("User is guest");
                }
            })
            .catch(err => console.error("Auth check failed:", err));
    }


    // === 3. FILE UPLOAD & ENHANCE LOGIC ===
    const fileInput = document.getElementById('file-upload');
    const chooseBtn = document.getElementById('choose-files-btn');
    const dropZone = document.getElementById('drop-zone');
    const loaderOverlay = document.getElementById('loader-overlay');

    // New UI Elements (Simplified for Login Page)
    let isUploading = false;

    async function handleFileSelection(files) {
        if (files.length === 0) return;
        if (!isAuthenticated) {
            // Show Auth Modal if not logged in
            const authModal = document.getElementById('auth-modal');
            if (authModal) {
                authModal.classList.remove('hidden');
                authModal.classList.add('flex');
            }
            return;
        }

        if (isUploading) return;
        isUploading = true;

        const file = files[0]; // Process single file for now

        // Show Loader immediately
        if (loaderOverlay) {
            loaderOverlay.classList.remove('hidden');
            loaderOverlay.classList.add('flex');
        }

        const formData = new FormData();
        formData.append('image', file);

        try {
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();

            if (!uploadRes.ok) {
                throw new Error(uploadData.error || 'Upload failed');
            }

            // Redirect to Dedicated Enhance Page with the new Photo ID
            window.location.href = `/enhance.html?id=${uploadData.photoId}`;

        } catch (error) {
            console.error("Upload Error:", error);
            alert(error.message);
            isUploading = false;
            // Hide Loader on error
            if (loaderOverlay) {
                loaderOverlay.classList.add('hidden');
                loaderOverlay.classList.remove('flex');
            }
        }
    }

    if (chooseBtn && fileInput) {
        chooseBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            handleFileSelection(e.target.files);
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
            handleFileSelection(files);
        }
    }

    checkAuth();
});
