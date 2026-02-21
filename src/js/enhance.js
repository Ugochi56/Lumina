document.addEventListener('DOMContentLoaded', () => {
    // === 1. IMAGE SLIDER LOGIC ===
    const sliderBox = document.getElementById('slider-box');
    const overlay = document.getElementById('overlay');
    const handle = document.getElementById('slider-handle');
    const imgBefore = document.getElementById('img-before');
    const imgAfter = document.getElementById('img-after');

    function slide(x) {
        if (!sliderBox) return;
        const rect = sliderBox.getBoundingClientRect();
        let pos = x - rect.left;

        // Constrain position
        if (pos < 0) pos = 0;
        if (pos > rect.width) pos = rect.width;

        // Slide
        if (overlay) overlay.style.width = pos + "px";
        if (handle) handle.style.left = pos + "px";
    }

    if (sliderBox) {
        sliderBox.addEventListener('mousemove', (e) => slide(e.pageX));
        sliderBox.addEventListener('touchmove', (e) => slide(e.touches[0].pageX));

        // Init
        const initSlider = () => {
            const rect = sliderBox.getBoundingClientRect();
            if (imgBefore) imgBefore.style.width = rect.width + "px";
            slide(rect.left + (rect.width / 2));
        };

        // Short delay to ensure image loads and layout calculates
        setTimeout(initSlider, 100);
        window.addEventListener('resize', initSlider);
    }

    // === 2. ENHANCE PAGE LOGIC ===
    const aiStatusIndicator = document.getElementById('ai-status-indicator');
    const enhancementActions = document.getElementById('enhancement-actions');
    const mainEnhanceBtn = document.getElementById('main-enhance-btn');
    const mainEnhanceText = document.getElementById('main-enhance-text');
    const manualToolOverride = document.getElementById('manual-tool-override');
    const loaderOverlay = document.getElementById('loader-overlay');

    let currentPhotoId = null;
    let currentImageUrl = null;
    let isProcessing = false;

    // A. Parse URL ID
    const urlParams = new URLSearchParams(window.location.search);
    const photoIdParam = urlParams.get('id');

    if (!photoIdParam) {
        alert("No photo ID provided. Redirecting to upload page.");
        window.location.href = '/login.html';
        return;
    }

    currentPhotoId = photoIdParam;

    // B. Fetch Photo Data
    async function loadPhotoData() {
        try {
            const res = await fetch(`/api/photos/${currentPhotoId}`);
            if (!res.ok) throw new Error("Failed to load photo data.");
            const photo = await res.json();

            currentImageUrl = photo.cloudinary_url;

            // Set slider images
            if (imgBefore) imgBefore.src = currentImageUrl;
            if (imgAfter) imgAfter.src = currentImageUrl; // Same until enhanced

            // Start polling AI status
            pollRecommendationStatus();

        } catch (error) {
            console.error(error);
            alert("Could not load your image. Redirecting...");
            window.location.href = '/login.html';
        }
    }

    // C. Poll AI
    async function pollRecommendationStatus() {
        if (!currentPhotoId) return;

        try {
            const statusRes = await fetch(`/api/photos/${currentPhotoId}/status`);
            if (!statusRes.ok) return;

            const statusData = await statusRes.json();

            if (statusData.status === 'ready') {
                const tool = statusData.recommended_tool || 'upscale';
                const toolNames = { 'upscale': 'Upscaler', 'restore': 'Restorer', 'edit': 'Editor' };

                if (mainEnhanceText) mainEnhanceText.textContent = `Enhance with ${toolNames[tool]}`;
                if (mainEnhanceBtn) mainEnhanceBtn.dataset.tool = tool;
                if (manualToolOverride) manualToolOverride.value = tool;

                if (aiStatusIndicator) {
                    aiStatusIndicator.classList.add('hidden');
                    aiStatusIndicator.classList.remove('flex');
                }
                if (enhancementActions) {
                    enhancementActions.classList.remove('hidden');
                    enhancementActions.classList.add('flex');
                }

            } else if (statusData.status === 'failed') {
                if (aiStatusIndicator) aiStatusIndicator.innerHTML = `<span class="text-red-500 font-bold">AI analysis failed. You can still manually select a tool.</span>`;
                if (enhancementActions) {
                    enhancementActions.classList.remove('hidden');
                    enhancementActions.classList.add('flex');
                }
            } else {
                setTimeout(pollRecommendationStatus, 1500);
            }
        } catch (error) {
            console.error("Polling Error:", error);
            if (aiStatusIndicator) aiStatusIndicator.innerHTML = `<span class="text-red-500 font-bold">Connection lost. Manual selection enabled.</span>`;
            if (enhancementActions) {
                enhancementActions.classList.remove('hidden');
                enhancementActions.classList.add('flex');
            }
        }
    }

    // D. Manual Tool Sync
    if (manualToolOverride) {
        manualToolOverride.addEventListener('change', (e) => {
            const selectedTool = e.target.value;
            if (mainEnhanceBtn) mainEnhanceBtn.dataset.tool = selectedTool;
            const toolNames = { 'upscale': 'Upscaler', 'restore': 'Restorer', 'edit': 'Editor' };
            if (mainEnhanceText) mainEnhanceText.textContent = `Enhance with ${toolNames[selectedTool]}`;
        });
    }

    // E. Execute Enhancement
    if (mainEnhanceBtn) {
        mainEnhanceBtn.addEventListener('click', async () => {
            if (!currentImageUrl || !currentPhotoId || isProcessing) return;
            isProcessing = true;

            const selectedTool = mainEnhanceBtn.dataset.tool;

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
                if (imgAfter) imgAfter.src = enhanceData.output;

                // Reset UI state to show slider clearly
                document.querySelector('.content-overlay').style.pointerEvents = 'none';
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

    // Init Page
    loadPhotoData();
});
