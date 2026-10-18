/**
 * ThemeSwitcher - Top-left Sun/Moon Theme Switcher with React Bits Pixel Transition
 * https://reactbits.dev/animations/pixel-transition
 * Pure 60fps Canvas-based pixel dissolve ripple for light/dark theme switching.
 */

(function () {
    'use strict';

    // Apply saved theme immediately on load to prevent any flash
    const savedTheme = localStorage.getItem('cid-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    let isTransitioning = false;

    // React Bits Pixel Transition Controller
    function runPixelTransition(originX, originY, nextTheme, onMidpoint) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            onMidpoint();
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.id = 'pixel-transition-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '999999';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.scale(dpr, dpr);

        // Optimal pixel tile size (crisp retro-modern pixel blocks)
        const tileSize = Math.max(26, Math.min(42, Math.floor(Math.min(width, height) / 24)));
        const cols = Math.ceil(width / tileSize);
        const rows = Math.ceil(height / tileSize);

        // Colors for pixel cover
        const fillColor = nextTheme === 'dark' ? '#080808' : '#FAFAFA';
        const ditherColor = nextTheme === 'dark' ? '#181818' : '#ECECEC';

        // Precompute grid items and randomized wave delay
        const tiles = [];
        const maxDist = Math.hypot(
            Math.max(originX, width - originX),
            Math.max(originY, height - originY)
        );

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const centerX = c * tileSize + tileSize / 2;
                const centerY = r * tileSize + tileSize / 2;
                const dist = Math.hypot(centerX - originX, centerY - originY);
                // Radial wave delay with pseudo-random dither
                const dither = (Math.sin(c * 12.9898 + r * 78.233) * 43758.5453 % 1);
                const normalizedDist = dist / (maxDist || 1);
                const delay = normalizedDist * 0.52 + (dither * 0.12);
                tiles.push({
                    x: c * tileSize,
                    y: r * tileSize,
                    delay: delay,
                    isDither: dither > 0.72
                });
            }
        }

        const duration = 540; // Total transition duration in ms
        const halfDuration = duration * 0.48; // Phase 1 cover duration
        let startTime = null;
        let midpointTriggered = false;

        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        function easeInCubic(t) {
            return t * t * t;
        }

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);

            ctx.clearRect(0, 0, width, height);

            // Midpoint: switch actual DOM theme under the solid pixel curtain
            if (elapsed >= halfDuration && !midpointTriggered) {
                midpointTriggered = true;
                if (typeof onMidpoint === 'function') {
                    onMidpoint();
                }
            }

            // Draw pixel grid
            for (let i = 0; i < tiles.length; i++) {
                const tile = tiles[i];
                let scale = 0;

                if (elapsed < halfDuration) {
                    // Phase 1: Grow in outward from origin
                    const tileProgress = Math.max(0, Math.min(1, (elapsed / halfDuration - tile.delay * 0.6) / 0.4));
                    scale = easeOutCubic(tileProgress);
                } else {
                    // Phase 2: Shrink out outward from origin
                    const phase2Elapsed = elapsed - halfDuration;
                    const phase2Total = duration - halfDuration;
                    const tileProgress = Math.max(0, Math.min(1, (phase2Elapsed / phase2Total - tile.delay * 0.6) / 0.4));
                    scale = 1 - easeInCubic(tileProgress);
                }

                if (scale > 0.001) {
                    const currentSize = tileSize * scale;
                    const offset = (tileSize - currentSize) / 2;
                    ctx.fillStyle = tile.isDither ? ditherColor : fillColor;
                    ctx.fillRect(
                        tile.x + offset,
                        tile.y + offset,
                        currentSize + 0.5, // slight overlap to prevent hairline seams
                        currentSize + 0.5
                    );
                }
            }

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                // Cleanup canvas
                if (canvas.parentNode) {
                    canvas.parentNode.removeChild(canvas);
                }
                isTransitioning = false;
            }
        }

        isTransitioning = true;
        requestAnimationFrame(step);
    }

    function initSwitcher() {
        const toggleBtn = document.getElementById('theme-toggle-btn');
        if (!toggleBtn) return;

        function updateIcon(theme) {
            const isDark = theme === 'dark';
            toggleBtn.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
            toggleBtn.setAttribute('title', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
            toggleBtn.setAttribute('data-active-theme', theme);
        }

        updateIcon(document.documentElement.getAttribute('data-theme') || 'dark');

        toggleBtn.addEventListener('click', function (e) {
            if (isTransitioning) return;

            const rect = toggleBtn.getBoundingClientRect();
            const originX = rect.left + rect.width / 2;
            const originY = rect.top + rect.height / 2;

            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';

            runPixelTransition(originX, originY, next, function () {
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('cid-theme', next);
                updateIcon(next);
                window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: next } }));
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSwitcher);
    } else {
        initSwitcher();
    }
})();
