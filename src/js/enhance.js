document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM Elements
    const imgBefore = document.getElementById('enhance-img-before');
    const imgAfter = document.getElementById('enhance-img-after');
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
    const tierCurrent = document.getElementById('tier-current') || document.querySelector('#tier-limit-text span');
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
            const circle = el.firstElementChild;
            const icon = circle ? circle.firstElementChild : null;
            const title = el.querySelector('.tool-title');

            if (el.dataset.tool === toolName) {
                // Active styles
                el.classList.remove('bg-white/5', 'border-transparent', 'text-gray-200', 'text-gray-400');
                if (circle && circle.classList.contains('rounded-full')) {
                    // Mobile circular tool active
                    circle.className = 'w-14 h-14 rounded-full bg-[#ff4d6d] flex items-center justify-center shadow-[0_0_20px_rgba(255,77,109,0.4)] transition-all';
                    if (icon) icon.classList.replace('text-[#ff4d6d]', 'text-white');
                } else {
                    // Desktop tool active
                    el.classList.add('bg-white/10', 'border-white', 'text-white', 'shadow-lg');
                }
                if (title) {
                    title.classList.remove('text-gray-200', 'text-gray-400');
                    title.classList.add('text-white');
                }
            } else {
                // Inactive styles
                el.classList.remove('bg-white/10', 'border-white', 'text-white', 'shadow-lg');
                if (circle && circle.classList.contains('rounded-full')) {
                    // Mobile circular tool inactive
                    circle.className = 'w-14 h-14 rounded-full bg-[#2a1b22] border border-white/5 flex items-center justify-center transition-all group-hover:bg-[#3d2732]';
                    if (icon) icon.classList.replace('text-white', 'text-[#ff4d6d]');
                } else {
                    // Desktop tool inactive
                    el.classList.add('bg-white/5', 'border-transparent', 'text-gray-200');
                }
                if (title) {
                    title.classList.remove('text-white');
                    title.classList.add('text-gray-400'); // Or text-gray-200 for desktop
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

            // Slider Labels Dynamic Centering
            const labelBefore = document.getElementById('label-before');
            const labelAfter = document.getElementById('label-after');
            if (labelBefore) {
                labelBefore.style.left = (p / 2) + '%';
                labelBefore.style.opacity = p < 10 ? '0' : '1';
            }
            if (labelAfter) {
                labelAfter.style.left = p + (100 - p) / 2 + '%';
                labelAfter.style.opacity = p > 90 ? '0' : '1';
            }


            // Keep the inner image visually stationary
            if (imgBefore && imgAfter) {
                // Determine exact rendered size of the after image inside flexbox
                imgBefore.style.width = sliderContainer.offsetWidth + 'px';
                imgBefore.style.height = sliderContainer.offsetHeight + 'px';
                imgBefore.style.maxWidth = 'none';
            }
        };

        const resetSliderDimensions = () => {
            if (imgBefore && imgAfter) {
                imgBefore.style.width = sliderContainer.offsetWidth + 'px';
                imgBefore.style.height = sliderContainer.offsetHeight + 'px';
                imgBefore.style.maxWidth = 'none';

                if (overlay) {
                    overlay.style.top = '0px';
                    overlay.style.bottom = '0px';
                    overlay.style.left = '0px';
                }
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

            // Populate the filmstrip with Session storage logic
            let sessionPhotos = JSON.parse(sessionStorage.getItem('lumina_session_photos') || '[]');

            // Check if active photo is already in session
            const existingIndex = sessionPhotos.findIndex(p => p.id == activePhoto.id);
            if (existingIndex === -1) {
                // Prepend so latest clicked is on top
                sessionPhotos.unshift(activePhoto);
                sessionStorage.setItem('lumina_session_photos', JSON.stringify(sessionPhotos));
            } else {
                // Update photo data just in case URL changed
                sessionPhotos[existingIndex] = activePhoto;
                sessionStorage.setItem('lumina_session_photos', JSON.stringify(sessionPhotos));
            }

            if (thumbnailFilmstrip) {
                thumbnailFilmstrip.innerHTML = sessionPhotos.map(p => renderThumbnail(p, p.id == activePhoto.id)).join('');
                bindThumbnailClicks();
            }

            // Connect WebSocket logic is triggered by fetchUserData which is called on page load
            // or we will call it when switching photos and we already have the user data.
            // (Handled down below in bindThumbnailClicks)
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
            <div class="thumbnail-item relative w-32 md:w-full aspect-video shrink-0 bg-black rounded-lg overflow-hidden border-2 ${borderClass} shadow-lg cursor-pointer transition-all duration-200" data-id="${photo.id}">
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

                    // Retrigger fetchUserData to re-establish WS connection for new photo
                    fetchUserData();

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

                // Update Header Subscription Button
                const subscribeBtn = document.getElementById('open-subscription-desktop');
                if (subscribeBtn && user.subscription_tier) {
                    const tierName = user.subscription_tier === 'free' ? 'Free' : user.subscription_tier.charAt(0).toUpperCase() + user.subscription_tier.slice(1);
                    subscribeBtn.innerHTML = `<span class="text-pink-500">💎</span> ${tierName} Plan`;
                }

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

    // 7. WebSocket Connection
    let activeWs = null;
    let fallbackPollTimeout = null;

    function connectWebSocket(userId, photoId) {
        if (activeWs) {
            activeWs.close(); // Close any existing connection
        }
        if (fallbackPollTimeout) {
            clearTimeout(fallbackPollTimeout);
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}?userId=${userId}`);
        activeWs = ws;

        ws.onopen = () => {
            console.log('WebSocket connected — listening for updates...');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("WebSocket received:", data);

            if (data.type === 'enhancement_preview' && data.photoId == currentPhotoId) {
                // Update the UI immediately after Replicate finishes (before Cloudinary upload finishes)
                if (imgAfter) {
                    const newImg = new Image();
                    const applyLoadedImg = () => {
                        imgAfter.src = data.previewUrl;
                        if (sliderHandle) sliderHandle.style.left = '50%';
                        if (overlay) document.getElementById('overlay').style.width = '50%';
                        if (imgWidth) imgWidth.textContent = newImg.naturalWidth + ' px';
                        if (imgHeight) imgHeight.textContent = newImg.naturalHeight + ' px';

                        // Show Rating
                        const ratingWidget = document.getElementById('rating-widget');
                        const ratingThanks = document.getElementById('rating-thanks');
                        const ratingButtons = document.getElementById('rating-buttons');
                        if (ratingWidget) {
                            if (ratingThanks) ratingThanks.classList.add('hidden');
                            if (ratingButtons) {
                                ratingButtons.classList.remove('hidden');
                                ratingButtons.classList.add('flex');
                            }
                            ratingWidget.classList.remove('hidden');
                            ratingWidget.classList.add('flex');
                            setTimeout(() => ratingWidget.classList.remove('translate-y-4', 'opacity-0'), 50);
                        }
                    };
                    newImg.onload = applyLoadedImg;
                    newImg.onerror = applyLoadedImg;
                    newImg.src = data.previewUrl;
                }
                isProcessing = false;
                if (loaderOverlay) {
                    loaderOverlay.classList.add('hidden');
                    loaderOverlay.classList.remove('flex');
                }
            }

            // Second notification — silently swap to permanent Cloudinary URL
            if (data.type === 'enhancement_complete' && data.photoId == currentPhotoId) {
                swapImageUrl(data.enhancedUrl);
            }

            if (data.type === 'phase2_complete' && data.photoId == currentPhotoId) {
                const tool = data.recommendedTool || 'upscale';
                selectTool(tool);

                if (aiStatusIndicator) {
                    aiStatusIndicator.classList.add('hidden');
                    aiStatusIndicator.classList.remove('flex');
                }
            }
        };

        ws.onerror = () => {
            console.warn('WebSocket failed, falling back to polling');
            startPolling(photoId);
        };

        ws.onclose = () => {
            console.log('WebSocket closed');
        };
    }

    // Helper to silently swap Replicate URL for Cloudinary URL when background upload finishes
    function swapImageUrl(permanentUrl) {
        // Update main image source
        if (imgAfter) imgAfter.src = permanentUrl;

        // Update stored photo data in session storage
        let sessionPhotos = JSON.parse(sessionStorage.getItem('lumina_session_photos') || '[]');
        const index = sessionPhotos.findIndex(p => p.id == currentPhotoId);
        if (index !== -1) {
            sessionPhotos[index].enhanced_url = permanentUrl;
            sessionStorage.setItem('lumina_session_photos', JSON.stringify(sessionPhotos));

            // Re-render thumbnail without triggering a click
            const activeThumb = document.querySelector(`.thumbnail-item[data-id="${currentPhotoId}"] img`);
            if (activeThumb) activeThumb.src = permanentUrl;
        }
    }

    // 7b. Fallback Polling (if WS fails)
    async function startPolling(photoId) {
        if (!photoId || photoId != currentPhotoId) return;

        try {
            const statusRes = await fetch(`/api/photos/${photoId}/status`);
            if (!statusRes.ok) return;

            const statusData = await statusRes.json();

            if (statusData.status === 'ready') {
                const tool = statusData.recommended_tool || 'upscale';
                selectTool(tool);

                if (aiStatusIndicator) {
                    aiStatusIndicator.classList.add('hidden');
                    aiStatusIndicator.classList.remove('flex');
                }

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
                fallbackPollTimeout = setTimeout(() => startPolling(photoId), 1500);
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
                const applyLoadedImg = () => {
                    imgAfter.src = enhanceData.output;
                    // Move handle to center if it was moved
                    if (sliderHandle) sliderHandle.style.left = '50%';
                    if (overlay) document.getElementById('overlay').style.width = '50%';

                    if (imgWidth) imgWidth.textContent = newImg.naturalWidth + ' px';
                    if (imgHeight) imgHeight.textContent = newImg.naturalHeight + ' px';

                    // Show Rating Widget
                    const ratingWidget = document.getElementById('rating-widget');
                    const ratingThanks = document.getElementById('rating-thanks');
                    const ratingButtons = document.getElementById('rating-buttons');

                    if (ratingWidget) {
                        // Reset state in case they are enhancing multiple times
                        ratingThanks.classList.add('hidden');
                        ratingButtons.classList.remove('hidden');
                        ratingButtons.classList.add('flex');

                        ratingWidget.classList.remove('hidden');
                        ratingWidget.classList.add('flex');
                        setTimeout(() => {
                            ratingWidget.classList.remove('translate-y-4', 'opacity-0');
                        }, 50);
                    }
                };
                newImg.onload = applyLoadedImg;
                newImg.onerror = applyLoadedImg;
                newImg.src = enhanceData.output;
            }

        } catch (error) {
            console.error("Enhancement Error:", error);
            // Hide slider, show error state
            if (sliderContainer) {
                sliderContainer.classList.add('hidden');
            }
            const errorMsgEl = document.getElementById('error-message');
            if (errorMsgEl) {
                errorMsgEl.textContent = error.message;
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

    const applyBtnDesktop = document.getElementById('apply-btn');
    const applyBtnMobile = document.getElementById('apply-btn-mobile');
    if (applyBtnDesktop) applyBtnDesktop.addEventListener('click', processEnhancement);
    if (applyBtnMobile) applyBtnMobile.addEventListener('click', processEnhancement);

    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', processEnhancement);
    }

    // 9. New In-Page Upload Logic
    const addPhotosBtn = document.getElementById('add-photos-btn');
    const addPhotosBtnMobile = document.getElementById('add-photos-btn-mobile');
    const desktopUploadBtn = document.getElementById('desktop-upload-btn');

    // Create a persistent hidden file input
    const hiddenFileInput = document.createElement('input');
    hiddenFileInput.type = 'file';
    hiddenFileInput.accept = 'image/*';
    hiddenFileInput.classList.add('hidden');
    document.body.appendChild(hiddenFileInput);

    const triggerUpload = () => hiddenFileInput.click();
    if (addPhotosBtn) addPhotosBtn.addEventListener('click', triggerUpload);
    if (addPhotosBtnMobile) addPhotosBtnMobile.addEventListener('click', triggerUpload);
    if (desktopUploadBtn) desktopUploadBtn.addEventListener('click', triggerUpload);

    hiddenFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (loaderOverlay) {
            loaderOverlay.classList.remove('hidden');
            loaderOverlay.classList.add('flex');
            const loaderTitle = loaderOverlay.querySelector('h2');
            if (loaderTitle) loaderTitle.textContent = "Enhancing your photo...";
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

            // Session Storage Logic for seamless filmstrip
            let currentSession = JSON.parse(sessionStorage.getItem('lumina_session_photos') || '[]');
            currentSession.unshift(newPhoto);
            sessionStorage.setItem('lumina_session_photos', JSON.stringify(currentSession));

            // Re-render filmstrip with all session history
            if (thumbnailFilmstrip) {
                thumbnailFilmstrip.innerHTML = currentSession.map(p => renderThumbnail(p, p.id == newPhoto.id)).join('');
                bindThumbnailClicks();
            }

            // Refresh tier count now that upload succeeded. This also reconnects WS.
            fetchUserData();

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
    const downloadBtns = [
        document.querySelector('header button.bg-\\[\\#ff4d6d\\]'), // Desktop Top Nav Download
        document.getElementById('save-btn-mobile'),         // Mobile Bottom Action Download
        document.getElementById('new-upload-btn')            // Desktop Bottom Action Download Button
    ].filter(Boolean);

    downloadBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
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
    });

    // 11. Subscription Update Listener
    window.addEventListener('subscriptionUpdated', () => {
        console.log("Subscription updated! Refreshing user tier UI...");
        fetchUserData(); // Instantly refresh the progress bar and header badge
    });

    // 12. Rating Widget Listener
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.rate-btn');
        if (btn) {
            const rating = parseInt(btn.dataset.rate, 10);
            const ratingWidget = document.getElementById('rating-widget');
            const ratingThanks = document.getElementById('rating-thanks');
            const ratingButtons = document.getElementById('rating-buttons');

            try {
                const res = await fetch(`/api/photos/${currentPhotoId}/rate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rating })
                });

                if (res.ok) {
                    if (ratingButtons) {
                        ratingButtons.classList.add('hidden');
                        ratingButtons.classList.remove('flex');
                    }
                    if (ratingThanks) ratingThanks.classList.remove('hidden');

                    // Hide entire widget after 3 seconds
                    setTimeout(() => {
                        if (ratingWidget) {
                            ratingWidget.classList.add('translate-y-4', 'opacity-0');
                            setTimeout(() => {
                                ratingWidget.classList.add('hidden');
                                ratingWidget.classList.remove('flex');
                            }, 500);
                        }
                    }, 3000);
                }
            } catch (err) {
                console.error("Failed to submit rating:", err);
            }
        }
    });

    // 13. Zoom and Pan UI & Logic
    const zoomPercentageLabel = document.getElementById('zoom-percentage-label');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomSliderTrack = document.getElementById('zoom-slider-track');
    const zoomSliderHandle = document.getElementById('zoom-slider-handle');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const canvasArea = document.getElementById('canvas-area');

    let currentZoom = 1;
    let panX = 0;
    let panY = 0;
    
    let isPanning = false;
    let isSpacebarDown = false;
    let startPanX = 0;
    let startPanY = 0;
    let initialPanX = 0;
    let initialPanY = 0;

    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 5;

    function applyZoomAndPan() {
        if (!sliderContainer) return;

        // Keep translation percentages so dragging feels 1:1 regardless of zoom level
        sliderContainer.style.transform = `scale(${currentZoom}) translate(${panX}px, ${panY}px)`;
        
        if (zoomPercentageLabel) {
            zoomPercentageLabel.textContent = Math.round(currentZoom * 100) + '%';
        }

        if (zoomSliderTrack && zoomSliderHandle) {
            // Map zoom log scale (roughly) for slider or just linear for simplicity
            // Let's do linear between MIN_ZOOM and MAX_ZOOM
            const trackRect = zoomSliderTrack.getBoundingClientRect();
            let percent = ((currentZoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100;
            percent = Math.max(0, Math.min(100, percent));
            zoomSliderHandle.style.left = percent + '%';
        }
    }

    function setZoom(newZoom) {
        currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
        applyZoomAndPan();
    }

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            setZoom(currentZoom + 0.25);
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            setZoom(currentZoom - 0.25);
        });
    }

    // Zoom slider logic
    if (zoomSliderTrack) {
        let isDraggingZoom = false;

        const handleZoomDrag = (e) => {
            const rect = zoomSliderTrack.getBoundingClientRect();
            // Get x position relative to track
            let clientX = e.clientX;
            if (e.touches && e.touches.length > 0) clientX = e.touches[0].clientX;
            
            let x = clientX - rect.left;
            x = Math.max(0, Math.min(rect.width, x));
            
            const percent = x / rect.width;
            const newZoom = MIN_ZOOM + percent * (MAX_ZOOM - MIN_ZOOM);
            setZoom(newZoom);
        };

        zoomSliderTrack.addEventListener('mousedown', (e) => {
            isDraggingZoom = true;
            handleZoomDrag(e);
        });
        
        zoomSliderTrack.addEventListener('touchstart', (e) => {
            isDraggingZoom = true;
            handleZoomDrag(e);
        });
        
        window.addEventListener('mousemove', (e) => {
            if (isDraggingZoom) handleZoomDrag(e);
        });
        
        window.addEventListener('touchmove', (e) => {
            if (isDraggingZoom) handleZoomDrag(e);
        });
        
        window.addEventListener('mouseup', () => isDraggingZoom = false);
        window.addEventListener('touchend', () => isDraggingZoom = false);
    }
    
    // Reset zoom when clicking 100% text
    if (zoomPercentageLabel) {
        zoomPercentageLabel.addEventListener('click', () => {
            panX = 0;
            panY = 0;
            setZoom(1);
        });
    }

    // Canvas Scroll to Zoom
    if (canvasArea) {
        canvasArea.addEventListener('wheel', (e) => {
            // Prevent default page scroll
            e.preventDefault();
            
            const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
            setZoom(currentZoom + zoomDelta);
        }, { passive: false });

        // Spacebar tracking
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target === document.body) {
                e.preventDefault();
                isSpacebarDown = true;
                canvasArea.style.cursor = 'grab';
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                isSpacebarDown = false;
                canvasArea.style.cursor = 'default';
            }
        });

        // Panning logic
        canvasArea.addEventListener('mousedown', (e) => {
            // Middle click (button 1) OR Spacebar + Left click
            if (e.button === 1 || (e.button === 0 && isSpacebarDown)) {
                e.preventDefault();
                isPanning = true;
                startPanX = e.clientX;
                startPanY = e.clientY;
                initialPanX = panX;
                initialPanY = panY;
                canvasArea.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (isPanning) {
                // Adjust translation relative to zoom scale so it sticks precisely to mouse movement
                const deltaX = (e.clientX - startPanX) / currentZoom;
                const deltaY = (e.clientY - startPanY) / currentZoom;
                
                panX = initialPanX + deltaX;
                panY = initialPanY + deltaY;
                
                applyZoomAndPan();
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (isPanning) {
                isPanning = false;
                canvasArea.style.cursor = isSpacebarDown ? 'grab' : 'default';
            }
        });
        
        // Prevent middle-click scroll opening a weird cursor
        window.addEventListener('mousedown', (e) => {
             if(e.button === 1) e.preventDefault();
        });
    }

    // Fullscreen Toggle
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                if (canvasArea.requestFullscreen) {
                    canvasArea.requestFullscreen();
                } else if (canvasArea.webkitRequestFullscreen) { /* Safari */
                    canvasArea.webkitRequestFullscreen();
                } else if (canvasArea.msRequestFullscreen) { /* IE11 */
                    canvasArea.msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) { /* Safari */
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) { /* IE11 */
                    document.msExitFullscreen();
                }
            }
        });
    }

    // Init Zoom UI matching defaults
    applyZoomAndPan();

    // Init Page
    loadPhotoData();
});
