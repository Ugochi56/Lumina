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

    // New UI Elements
    const aiRecommendationUI = document.getElementById('ai-recommendation-ui');
    const aiStatusIndicator = document.getElementById('ai-status-indicator');
    const enhancementActions = document.getElementById('enhancement-actions');
    const mainEnhanceBtn = document.getElementById('main-enhance-btn');
    const mainEnhanceText = document.getElementById('main-enhance-text');
    const manualToolOverride = document.getElementById('manual-tool-override');

    let currentPhotoId = null;
    let currentImageUrl = null;
    let isProcessing = false;

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

        const file = files[0]; // Process single file for now

        // 1. Show pre-upload preview immediately
        const objectUrl = URL.createObjectURL(file);
        document.getElementById('img-before').src = objectUrl;
        document.getElementById('img-after').src = objectUrl; // Same until enhanced

        // Hide dropzone, show AI UI in "analyzing" state
        dropZone.classList.add('hidden');
        aiRecommendationUI.classList.remove('hidden');
        aiRecommendationUI.classList.add('flex');
        aiStatusIndicator.classList.remove('hidden');
        aiStatusIndicator.classList.add('flex');
        enhancementActions.classList.add('hidden');
        enhancementActions.classList.remove('flex');

        // 2. Perform Phase 1 Upload (Sync)
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

            currentPhotoId = uploadData.photoId;
            currentImageUrl = uploadData.imageUrl;

            // Update preview to use Cloudinary URL instead of local ObjectURL
            document.getElementById('img-before').src = currentImageUrl;
            document.getElementById('img-after').src = currentImageUrl;

            // 3. Start Polling for Phase 2 (Async Tagging & Recommendation)
            pollRecommendationStatus();

        } catch (error) {
            console.error("Upload Error:", error);
            alert(error.message);
            // Reset UI on error
            dropZone.classList.remove('hidden');
            aiRecommendationUI.classList.add('hidden');
            aiRecommendationUI.classList.remove('flex');
        }
    }

    async function pollRecommendationStatus() {
        if (!currentPhotoId) return;

        try {
            const statusRes = await fetch(`/api/photos/${currentPhotoId}/status`);
            if (!statusRes.ok) {
                // Stop polling on HTTP error (e.g., 401, 404)
                console.error("Stopping polling due to error status:", statusRes.status);
                return;
            }

            const statusData = await statusRes.json();

            if (statusData.status === 'ready') {
                // Phase 2 complete! Update UI with recommendation
                const tool = statusData.recommended_tool || 'upscale';

                // Map tool to human readable name
                const toolNames = {
                    'upscale': 'Upscaler',
                    'restore': 'Restorer',
                    'edit': 'Editor'
                };

                // Update Button UI
                mainEnhanceText.textContent = `Enhance with ${toolNames[tool]}`;
                mainEnhanceBtn.dataset.tool = tool;
                manualToolOverride.value = tool; // Sync dropdown

                // Transition UI state
                aiStatusIndicator.classList.add('hidden');
                aiStatusIndicator.classList.remove('flex');
                enhancementActions.classList.remove('hidden');
                enhancementActions.classList.add('flex');

            } else if (statusData.status === 'failed') {
                // Handle background failure
                aiStatusIndicator.innerHTML = `<span class="text-red-500 font-bold">AI analysis failed. You can still manually select a tool.</span>`;
                enhancementActions.classList.remove('hidden');
                enhancementActions.classList.add('flex');
            } else {
                // Still processing, poll again in 1.5s
                setTimeout(pollRecommendationStatus, 1500);
            }
        } catch (error) {
            console.error("Polling Error:", error);
            // On network error during polling, gracefully degrade to manual selection
            aiStatusIndicator.innerHTML = `<span class="text-red-500 font-bold">Connection lost. Manual selection enabled.</span>`;
            enhancementActions.classList.remove('hidden');
            enhancementActions.classList.add('flex');
        }
    }

    // Manual Tool Override Sync
    if (manualToolOverride) {
        manualToolOverride.addEventListener('change', (e) => {
            const selectedTool = e.target.value;
            mainEnhanceBtn.dataset.tool = selectedTool;
            const toolNames = {
                'upscale': 'Upscaler',
                'restore': 'Restorer',
                'edit': 'Editor'
            };
            mainEnhanceText.textContent = `Enhance with ${toolNames[selectedTool]}`;
        });
    }

    // Enhance Button Click
    if (mainEnhanceBtn) {
        mainEnhanceBtn.addEventListener('click', async () => {
            if (!currentImageUrl || !currentPhotoId || isProcessing) return;
            isProcessing = true;

            const selectedTool = mainEnhanceBtn.dataset.tool;

            // Show Loader
            if (loaderOverlay) {
                loaderOverlay.classList.remove('hidden');
                loaderOverlay.classList.add('flex');
            }

            try {
                const enhanceRes = await fetch('/api/enhance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        imageUrl: currentImageUrl,
                        tool: selectedTool,
                        photoId: currentPhotoId
                    })
                });

                const enhanceData = await enhanceRes.json();

                if (!enhanceRes.ok) {
                    throw new Error(enhanceData.error || 'Enhancement failed');
                }

                // Success! Update "After" image in slider
                document.getElementById('img-after').src = enhanceData.output;

                // Reset UI state to show slider clearly
                document.querySelector('.content-overlay').style.pointerEvents = 'none'; // let user interact with slider easily
                // Re-enable pointer events on the specific navbar items if needed, but usually login interface hides or moves
                // For this layout, maybe we just hide the right panel entirely to focus on the result
                document.querySelector('.right-panel').style.opacity = '0';
                setTimeout(() => { document.querySelector('.right-panel').classList.add('hidden'); }, 500);

            } catch (error) {
                console.error("Enhancement Error:", error);
                alert(error.message);
                if (loaderOverlay) {
                    loaderOverlay.classList.add('hidden');
                    loaderOverlay.classList.remove('flex');
                }
            } finally {
                isProcessing = false;
                if (loaderOverlay) {
                    loaderOverlay.classList.add('hidden');
                    loaderOverlay.classList.remove('flex');
                }
            }
        });
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
