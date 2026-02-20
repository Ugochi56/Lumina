// --- A. Preloader Logic ---
function hidePreloader() {
    setTimeout(() => {
        const loader = document.getElementById('page-preloader');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.visibility = 'hidden';
            document.body.classList.remove('loading');
        }
    }, 2000);
}

// Make globally available for onload
window.hidePreloader = hidePreloader;

document.addEventListener('DOMContentLoaded', () => {

    // --- B. Image Slider Logic (HOVER TO MOVE) ---
    const sliderBox = document.getElementById('slider-box');
    const overlay = document.getElementById('overlay');
    const handle = document.getElementById('slider-handle');
    const imgBefore = document.getElementById('img-before');

    function slide(x) {
        if (!sliderBox) return;
        const rect = sliderBox.getBoundingClientRect();
        let pos = x - rect.left;

        // Constrain position to keep it within the box
        if (pos < 0) pos = 0;
        if (pos > rect.width) pos = rect.width;

        // Slide the overlay to reveal the image underneath
        if (overlay) overlay.style.width = pos + "px";
        if (handle) handle.style.left = pos + "px";
    }

    if (sliderBox) {
        // DESKTOP: Move on Hover (Mouse Move)
        sliderBox.addEventListener('mousemove', (e) => {
            slide(e.pageX);
        });

        // TOUCH: Keep drag logic for mobile users
        sliderBox.addEventListener('touchmove', (e) => {
            slide(e.touches[0].pageX);
        });
    }

    // Initialize slider at 50% width
    // Use helper to set width
    function initSlider() {
        if (!sliderBox || !imgBefore) return;
        const rect = sliderBox.getBoundingClientRect();
        // Important: Force overlay image width to match container width
        imgBefore.style.width = rect.width + "px";
        slide(rect.left + (rect.width / 2));
    }

    window.addEventListener('load', initSlider);

    // Handle Resize to keep image width correct
    window.addEventListener('resize', () => {
        initSlider();
    });

    // --- C. Demo Switcher Logic ---
    const demos = {
        portrait: {
            before: "../images/before.jpg",
            after: "../images/after.jpg"
        },
        landscape: {
            before: "../images/blur.jpg",
            after: "../images/download.jpg"
        },
        old: {
            before: "../images/noise.jpg",
            after: "../images/old.jpg"
        }
    };

    window.changeDemo = function (type) {
        const data = demos[type];
        const imgBeforeEl = document.getElementById('img-before');
        const imgAfterEl = document.getElementById('img-after');

        if (imgBeforeEl) imgBeforeEl.src = data.before;
        if (imgAfterEl) imgAfterEl.src = data.after;

        // Re-sync widths on image switch
        if (sliderBox && imgBeforeEl) {
            const rect = sliderBox.getBoundingClientRect();
            imgBeforeEl.style.width = rect.width + "px";
        }

        // Highlight active thumbnail
        // Note: 'event' is deprecated using globally, passing it or finding it is better, 
        // but for migration preserving 'event.currentTarget' usage if called from onclick in HTML.
        // Since we are extracting, 'event' global might work in some browsers but it's risky.
        // Better to delegate or find active class. 
        // However, looking at HTML `onclick="changeDemo('portrait')"` relies on global event or passing `event`.
        // Let's assume global event is available or we fix HTML to pass `this`.

        // Fix: Select all buttons and remove class, finding the one that was clicked is harder without `this`.
        // We will modify HTML to pass `this` or use event delegation. 
        // For now, let's try to rely on the fact that inline onclick still works with global javascript functions.

        if (window.event && window.event.currentTarget) {
            const btns = document.querySelectorAll('.slider-container + div button');
            btns.forEach(btn => {
                btn.classList.remove('border-cayenne_red', 'opacity-100');
                btn.classList.add('border-transparent', 'opacity-70');
            });
            window.event.currentTarget.classList.remove('border-transparent', 'opacity-70');
            window.event.currentTarget.classList.add('border-cayenne_red', 'opacity-100');
        }
    };
});
