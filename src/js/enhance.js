document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM Elements
    const imgBefore = document.getElementById('img-before');
    const imgAfter = document.getElementById('img-after');
    const thumbnailFilmstrip = document.getElementById('thumbnail-filmstrip');
    const sliderContainer = document.getElementById('slider-box');
    const sliderHandle = document.getElementById('slider-handle');

    // Tools
    const tools = document.querySelectorAll('.tool-selector');
    const applyBtn = document.getElementById('apply-btn');
    const aiStatusIndicator = document.getElementById('ai-status-indicator');
    const loaderOverlay = document.getElementById('loader-overlay');

    // Bottom bar elements
    const imgWidth = document.getElementById('img-width');
    const imgHeight = document.getElementById('img-height');

    // Limits
    const tierMax = document.getElementById('tier-max');
    const tierProgressBar = document.getElementById('tier-progress-bar');
    const errorContainer = document.getElementById('error-state-container');

    let currentPhotoId = null;
    let currentImageUrl = null;
    let isProcessing = false;
    let selectedTool = 'upscale'; // upscale corresponds to Face Enhance

    // 2. Parse URL ID
    const urlParams = new URLSearchParams(window.location.search);
    const photoIdParam = urlParams.get('id');

    if (!photoIdParam) {
        alert("No photo ID provided. Redirecting to upload page.");
        window.location.href = '/login.html';
        return;
    }

    currentPhotoId = photoIdParam;

    // 3. Tool Selection Logic
    function selectTool(toolName) {
        selectedTool = toolName;
        tools.forEach(el => {
            if (el.dataset.tool === toolName) {
                // Active styles
                el.classList.remove('bg-white/5', 'border-transparent', 'text-gray-200');
                el.classList.add('bg-white/10', 'border-white', 'text-white', 'shadow-lg');
                const title = el.querySelector('.tool-title');
                if (title) {
                    title.classList.remove('text-gray-200');
                    title.classList.add('text-white');
                }
            } else {
                // Inactive styles
                el.classList.add('bg-white/5', 'border-transparent', 'text-gray-200');
                el.classList.remove('bg-white/10', 'border-white', 'text-white', 'shadow-lg');
                const title = el.querySelector('.tool-title');
                if (title) {
                    title.classList.remove('text-white');
                    title.classList.add('text-gray-200');
                }
            }
        });
    }

    tools.forEach(el => {
        el.addEventListener('click', () => {
            selectTool(el.dataset.tool);
        });
    });

    // 4. Slider Logic (Width based like index.html)
    const overlay = document.getElementById('overlay');

    // Ensure the overlay container hides the overflow so the image inside crops instead of squishing
    if (overlay) {
        overlay.style.overflow = 'hidden';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.bottom = '0';
        overlay.style.left = '0';
    }

    if (sliderContainer && overlay && sliderHandle) {
        let isDown = false;

        const moveSlider = (clientX) => {
            const rect = sliderContainer.getBoundingClientRect();
            let x = clientX - rect.left;
            // Constrain
            if (x < 0) x = 0;
            if (x > rect.width) x = rect.width;

            // Calculate percentage
            let p = (x / rect.width) * 100;

            // Apply
            sliderHandle.style.left = p + '%';
            overlay.style.width = p + '%';

            // Keep the inner image visually stationary
            if (imgBefore) {
                imgBefore.style.width = rect.width + 'px';
                imgBefore.style.height = rect.height + 'px';
                imgBefore.style.maxWidth = 'none';
            }
        };

        const resetSliderDimensions = () => {
            const rect = sliderContainer.getBoundingClientRect();
            if (imgBefore) {
                imgBefore.style.width = rect.width + 'px';
                imgBefore.style.height = rect.height + 'px';
                imgBefore.style.maxWidth = 'none';
            }
        };

        // Initialize at 50%
        overlay.style.width = '50%';
        sliderHandle.style.left = '50%';

        // Initial setup for image width
        setTimeout(resetSliderDimensions, 100);

        // Recalculate correctly when window is resized or images are loaded
        window.addEventListener('resize', resetSliderDimensions);
        if (imgAfter) imgAfter.addEventListener('load', resetSliderDimensions);
        if (imgBefore) imgBefore.addEventListener('load', resetSliderDimensions);

        sliderContainer.addEventListener('mousedown', (e) => { isDown = true; moveSlider(e.clientX); });
        window.addEventListener('mouseup', () => { isDown = false; });
        window.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            requestAnimationFrame(() => moveSlider(e.clientX));
        });

        // Touch support
        sliderContainer.addEventListener('touchstart', (e) => { isDown = true; moveSlider(e.touches[0].clientX); });
        window.addEventListener('touchend', () => { isDown = false; });
        window.addEventListener('touchmove', (e) => {
            if (!isDown) return;
            requestAnimationFrame(() => moveSlider(e.touches[0].clientX));
        });
    }

    // 5. Fetch Photo & Init
    async function loadPhotoData() {
        try {
            // First, load the specific active photo data
            const res = await fetch(`/api/photos/${currentPhotoId}`);
            if (!res.ok) throw new Error("Failed to load photo data.");
            const activePhoto = await res.json();

            // Set main editor state
            updateEditorView(activePhoto);

            // Fetch User details for limits
            fetchUserData();

            // Populate the filmstrip with ONLY the initial session photo
            if (thumbnailFilmstrip) {
                thumbnailFilmstrip.innerHTML = renderThumbnail(activePhoto, true);
                bindThumbnailClicks();
            }

            // Start polling AI status
            pollRecommendationStatus();

        } catch (error) {
            console.error(error);
            alert("Could not load your image. Redirecting...");
            window.location.href = '/myalbums.html';
        }
    }

    function updateEditorView(photo) {
        currentPhotoId = photo.id;
        currentImageUrl = photo.cloudinary_url;

        if (imgBefore) imgBefore.src = currentImageUrl;

        if (photo.enhanced_url) {
            if (imgAfter) imgAfter.src = photo.enhanced_url;
            if (applyBtn) applyBtn.textContent = 'Re-Enhance';

            if (sliderHandle) {
                sliderHandle.classList.remove('hidden');
                sliderHandle.style.left = '50%';
            }
            if (overlay) document.getElementById('overlay').style.width = '50%';
        } else {
            if (imgAfter) imgAfter.src = currentImageUrl;
            if (applyBtn) applyBtn.textContent = 'Apply';
            if (sliderHandle) sliderHandle.classList.add('hidden');
            if (overlay) document.getElementById('overlay').style.width = '0%';
        }

        if (imgAfter) {
            imgAfter.onload = () => {
                if (imgWidth) imgWidth.textContent = imgAfter.naturalWidth + ' px';
                if (imgHeight) imgHeight.textContent = imgAfter.naturalHeight + ' px';
            };
        }

        // Hide error state if it was showing
        if (errorContainer) {
            errorContainer.classList.add('hidden');
            errorContainer.classList.remove('flex');
        }
        if (sliderContainer) {
            sliderContainer.classList.remove('hidden');
        }

        // Update URL to match
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?id=' + currentPhotoId;
        window.history.pushState({ path: newUrl }, '', newUrl);
    }

    // populateFilmstrip removed in favor of session-based loading

    function renderThumbnail(photo, isActive) {
        const borderClass = isActive ? 'border-amber_flame opacity-100' : 'border-white/20 opacity-60 hover:opacity-100';
        const checkMark = isActive ? `
            <div class="absolute top-2 left-2 bg-amber_flame rounded-full p-1 shadow-sm skeleton">
                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                </svg>
            </div>
        ` : '';
        const imgUrl = photo.enhanced_url || photo.cloudinary_url;

        return `
            <div class="thumbnail-item relative w-full aspect-video bg-black rounded-lg overflow-hidden border-2 ${borderClass} shadow-lg cursor-pointer transition-all duration-200" data-id="${photo.id}">
                <img src="${imgUrl}" class="w-full h-full object-cover" alt="Thumbnail">
                ${checkMark}
            </div>
        `;
    }

    function bindThumbnailClicks() {
        const thumbs = document.querySelectorAll('.thumbnail-item');
        thumbs.forEach(thumb => {
            thumb.addEventListener('click', async (e) => {
                const newId = e.currentTarget.getAttribute('data-id');
                if (newId == currentPhotoId) return; // Already active

                // Show loader while fetching new photo
                if (loaderOverlay) {
                    loaderOverlay.classList.remove('hidden');
                    loaderOverlay.classList.add('flex');
                    const loaderTitle = loaderOverlay.querySelector('h2');
                    if (loaderTitle) loaderTitle.textContent = "Loading photo...";
                }

                try {
                    const res = await fetch(`/api/photos/${newId}`);
                    if (!res.ok) throw new Error("Load failed");
                    const newPhoto = await res.json();

                    updateEditorView(newPhoto);

                    // Repaint filmstrip visually without re-fetching
                    document.querySelectorAll('.thumbnail-item').forEach(t => {
                        const id = t.getAttribute('data-id');
                        t.outerHTML = renderThumbnail(newPhoto.id == id ? newPhoto : { id, enhanced_url: t.querySelector('img').src, cloudinary_url: t.querySelector('img').src }, id == newId);
                    });
                    bindThumbnailClicks(); // Rebind since outerHTML replaces elements

                    // Restart AI polling for the new active photo
                    pollRecommendationStatus();

                } catch (err) {
                    console.error("Switch error:", err);
                    alert("Failed to load that photo.");
                } finally {
                    if (loaderOverlay) {
                        loaderOverlay.classList.add('hidden');
                        loaderOverlay.classList.remove('flex');
                        const loaderTitle = loaderOverlay.querySelector('h2');
                        if (loaderTitle) loaderTitle.textContent = "Enhancing your photo...";
                    }
                }
            });
        });
    }

    // 6. Fetch User Tier Data
    async function fetchUserData() {
        try {
            const res = await fetch('/auth/me');
            if (res.ok) {
                const data = await res.json();
                const user = data.user;
                if (!user) return;

                let limit = 15;
                if (user.subscription_tier === 'monthly') limit = 20;
                if (user.subscription_tier === 'yearly') limit = Infinity;

                if (tierCurrent) tierCurrent.textContent = user.photos_uploaded;
                if (tierMax) tierMax.textContent = limit === Infinity ? '∞' : limit;

                if (tierProgressBar && limit !== Infinity) {
                    const percent = Math.min((user.photos_uploaded / limit) * 100, 100);
                    tierProgressBar.style.width = percent + '%';
                } else if (tierProgressBar && limit === Infinity) {
                    tierProgressBar.style.width = '100%';
                    tierProgressBar.classList.replace('bg-gradient-to-r', 'bg-green-500');
                    tierProgressBar.classList.replace('from-amber_flame', 'from-green-400');
                    tierProgressBar.classList.replace('to-cayenne_red', 'to-green-600');
                }
            }
        } catch (e) { console.error("Error fetching user stats", e); }
    }

    // 7. Poll AI Status
    async function pollRecommendationStatus() {
        if (!currentPhotoId) return;

        try {
            const statusRes = await fetch(`/api/photos/${currentPhotoId}/status`);
            if (!statusRes.ok) return;

            const statusData = await statusRes.json();

            if (statusData.status === 'ready') {
                const tool = statusData.recommended_tool || 'upscale';
                selectTool(tool);

                if (aiStatusIndicator) {
                    aiStatusIndicator.classList.add('hidden');
                    aiStatusIndicator.classList.remove('flex');
                }

                // Show Handle
                if (sliderHandle) sliderHandle.classList.remove('hidden');

            } else if (statusData.status === 'failed') {
                if (aiStatusIndicator) {
                    aiStatusIndicator.innerHTML = `<span class="text-red-500 font-bold p-2 text-center text-xs">AI analysis failed. Manually select tool.</span>`;
                }
            } else {
                // Show parsing indicator
                if (aiStatusIndicator) {
                    aiStatusIndicator.classList.remove('hidden');
                    aiStatusIndicator.classList.add('flex');
                }
                setTimeout(pollRecommendationStatus, 1500);
            }
        } catch (error) {
            console.error("Polling Error:", error);
            if (aiStatusIndicator) {
                aiStatusIndicator.innerHTML = `<span class="text-red-500 font-bold p-2 text-center text-xs">Connection lost.</span>`;
            }
        }
    }

    // 8. Execute Enhancement
    const processEnhancement = async () => {
        if (!currentImageUrl || !currentPhotoId || isProcessing) return;
        isProcessing = true;

        if (loaderOverlay) {
            loaderOverlay.classList.remove('hidden');
            loaderOverlay.classList.add('flex');
        }

        const sliderBox = document.getElementById('slider-box');
        const errorContainer = document.getElementById('error-state-container');

        // Reset visibility just in case
        if (errorContainer) {
            errorContainer.classList.add('hidden');
            errorContainer.classList.remove('flex');
        }
        if (sliderBox) {
            sliderBox.classList.remove('hidden');
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
            if (imgAfter) {
                // Preload the image so it doesn't blink
                const newImg = new Image();
                newImg.onload = () => {
                    imgAfter.src = enhanceData.output;
                    // Move handle to center if it was moved
                    if (sliderHandle) sliderHandle.style.left = '50%';
                    if (overlay) document.getElementById('overlay').style.width = '50%';

                    if (imgWidth) imgWidth.textContent = newImg.naturalWidth + ' px';
                    if (imgHeight) imgHeight.textContent = newImg.naturalHeight + ' px';
                };
                newImg.src = enhanceData.output;
            }

        } catch (error) {
            console.error("Enhancement Error:", error);
            // Hide slider, show error state
            if (sliderBox) {
                sliderBox.classList.add('hidden');
            }
            if (errorContainer) {
                errorContainer.classList.remove('hidden');
                errorContainer.classList.add('flex');
            }
        } finally {
            isProcessing = false;
            if (loaderOverlay) {
                loaderOverlay.classList.add('hidden');
                loaderOverlay.classList.remove('flex');
            }
        }
    };

    if (applyBtn) {
        applyBtn.addEventListener('click', processEnhancement);
    }

    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', processEnhancement);
    }

    // 9. New In-Page Upload Logic
    const addPhotosBtn = document.getElementById('add-photos-btn');
    const newUploadBtn = document.getElementById('new-upload-btn');

    // Create a persistent hidden file input
    const hiddenFileInput = document.createElement('input');
    hiddenFileInput.type = 'file';
    hiddenFileInput.accept = 'image/*';
    hiddenFileInput.classList.add('hidden');
    document.body.appendChild(hiddenFileInput);

    const triggerUpload = () => hiddenFileInput.click();
    if (addPhotosBtn) addPhotosBtn.addEventListener('click', triggerUpload);
    if (newUploadBtn) newUploadBtn.addEventListener('click', triggerUpload);

    hiddenFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (loaderOverlay) {
            loaderOverlay.classList.remove('hidden');
            loaderOverlay.classList.add('flex');
            const loaderTitle = loaderOverlay.querySelector('h2');
            if (loaderTitle) loaderTitle.textContent = "Uploading your photo...";
        }

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            // Fetch the newly created photo details
            const newPhotoRes = await fetch(`/api/photos/${data.photoId}`);
            const newPhoto = await newPhotoRes.json();

            // Switch main view
            updateEditorView(newPhoto);

            // Re-fetch filmstrip to include new photo at top, or just prepend HTML
            const newThumbHtml = renderThumbnail(newPhoto, true);
            if (thumbnailFilmstrip) {
                // Change old active thumbnail to inactive
                const oldActive = thumbnailFilmstrip.querySelector('.border-amber_flame');
                if (oldActive) {
                    const oldId = oldActive.getAttribute('data-id');
                    oldActive.outerHTML = renderThumbnail({ id: oldId, enhanced_url: oldActive.querySelector('img').src }, false);
                }

                // Prepend new active upload
                thumbnailFilmstrip.insertAdjacentHTML('afterbegin', newThumbHtml);
                bindThumbnailClicks();
            }

            // Refresh tier count now that upload succeeded
            fetchUserData();

            // Restart AI polling for the new upload
            pollRecommendationStatus();

            if (loaderOverlay) {
                loaderOverlay.classList.add('hidden');
                loaderOverlay.classList.remove('flex');
            }

        } catch (error) {
            console.error("Upload Error:", error);
            alert(error.message);
            if (loaderOverlay) {
                loaderOverlay.classList.add('hidden');
                loaderOverlay.classList.remove('flex');
            }
        }

        // Reset input so the same file can be selected again if needed
        hiddenFileInput.value = '';
    });

    // 10. Download Logic
    const downloadBtn = document.querySelector('button.bg-\\[\\#ff4d6d\\]');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            if (!imgAfter || !imgAfter.src || imgAfter.src.includes('placeholder.jpg')) {
                alert("Please enhance an image first.");
                return;
            }

            try {
                // Fetch the image as a blob to force a download instead of opening a new tab
                const response = await fetch(imgAfter.src);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `lumina_enhanced_${Date.now()}.jpg`;
                document.body.appendChild(a);
                a.click();

                // Cleanup
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (err) {
                console.error("Download fail:", err);
                alert("Failed to download image. You can right-click the image and select 'Save Image As...'");
            }
        });
    }

    // Init Page
    loadPhotoData();
});
