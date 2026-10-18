/**
 * Crosshair - Pure Vanilla implementation of React Bits Crosshair Component
 * https://reactbits.dev/animations/crosshair
 * Precision CAD / targeting crosshair with live coordinate telemetry & target locking.
 * Added to Login, Register, and Error pages.
 */

(function (global) {
    'use strict';

    function initCrosshair(options) {
        // Only initialize on desktop mouse/trackpad devices
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            return null;
        }

        const opts = Object.assign({
            targetSelector: 'input, button, a, .btn, .editorial-auth-card, .editorial-error-card',
            color: 'var(--text-primary)',
            lineColor: 'rgba(128, 128, 128, 0.22)',
            showCoordinates: true,
            container: document.body
        }, options || {});

        // Hide default browser arrow cursor completely on crosshair pages
        document.documentElement.classList.add('has-crosshair');
        document.body.classList.add('has-crosshair');

        // Root container for crosshair elements
        const root = document.createElement('div');
        root.className = 'reactbits-crosshair-root';
        root.setAttribute('aria-hidden', 'true');
        root.innerHTML = `
            <div class="rb-crosshair-line rb-crosshair-line--x"></div>
            <div class="rb-crosshair-line rb-crosshair-line--y"></div>
            <div class="rb-crosshair-reticle">
                <div class="rb-crosshair-box">
                    <span class="rb-corner rb-corner--tl"></span>
                    <span class="rb-corner rb-corner--tr"></span>
                    <span class="rb-corner rb-corner--bl"></span>
                    <span class="rb-corner rb-corner--br"></span>
                    <span class="rb-crosshair-pip"></span>
                </div>
                <div class="rb-crosshair-telemetry font-mono">
                    <span class="rb-coords">000, 000</span>
                    <span class="rb-target-tag">READY</span>
                </div>
            </div>
        `;
        document.body.appendChild(root);

        const lineX = root.querySelector('.rb-crosshair-line--x'); // Horizontal line
        const lineY = root.querySelector('.rb-crosshair-line--y'); // Vertical line
        const reticle = root.querySelector('.rb-crosshair-reticle');
        const box = root.querySelector('.rb-crosshair-box');
        const coordsEl = root.querySelector('.rb-coords');
        const tagEl = root.querySelector('.rb-target-tag');

        // Physics lerp state
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let currentX = mouseX;
        let currentY = mouseY;
        let isVisible = false;
        let isHoveringTarget = false;
        let hoveredTarget = null;
        let animId = null;

        function updateTelemetry(x, y, targetText) {
            if (coordsEl) {
                const padX = String(Math.max(0, Math.round(x))).padStart(4, '0');
                const padY = String(Math.max(0, Math.round(y))).padStart(4, '0');
                coordsEl.textContent = `X:${padX} Y:${padY}`;
            }
            if (tagEl) {
                if (targetText) {
                    tagEl.textContent = `[LOCK: ${targetText}]`;
                    tagEl.classList.add('is-locked');
                } else {
                    tagEl.textContent = 'SYS_ACTV';
                    tagEl.classList.remove('is-locked');
                }
            }
        }

        function onMouseMove(e) {
            mouseX = e.clientX;
            mouseY = e.clientY;

            if (!isVisible) {
                isVisible = true;
                root.classList.add('is-visible');
            }

            // Check if hovering interactive target
            const hitTarget = e.target ? e.target.closest(opts.targetSelector) : null;
            if (hitTarget && hitTarget !== hoveredTarget) {
                hoveredTarget = hitTarget;
                isHoveringTarget = true;
                root.classList.add('is-targeting');

                let label = hitTarget.getAttribute('aria-label') || hitTarget.getAttribute('placeholder') || hitTarget.textContent.trim();
                if (label.length > 18) label = label.substring(0, 16) + '..';
                const tag = (hitTarget.tagName || 'OBJ').toUpperCase();
                updateTelemetry(mouseX, mouseY, `${tag} ${label ? '· ' + label.toUpperCase() : ''}`);
            } else if (!hitTarget && isHoveringTarget) {
                hoveredTarget = null;
                isHoveringTarget = false;
                root.classList.remove('is-targeting');
                updateTelemetry(mouseX, mouseY, null);
            } else if (!isHoveringTarget) {
                updateTelemetry(mouseX, mouseY, null);
            }
        }

        function onMouseLeave() {
            isVisible = false;
            root.classList.remove('is-visible');
        }

        function render() {
            // Smooth lerp follow for reticle
            const ease = 0.28;
            currentX += (mouseX - currentX) * ease;
            currentY += (mouseY - currentY) * ease;

            // Direct line positioning for razor-sharp responsiveness
            lineX.style.transform = `translate3d(0, ${mouseY}px, 0)`;
            lineY.style.transform = `translate3d(${mouseX}px, 0, 0)`;

            // Reticle positioning
            reticle.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;

            animId = requestAnimationFrame(render);
        }

        window.addEventListener('mousemove', onMouseMove, { passive: true });
        document.addEventListener('mouseleave', onMouseLeave);
        animId = requestAnimationFrame(render);

        return {
            destroy: function () {
                document.documentElement.classList.remove('has-crosshair');
                document.body.classList.remove('has-crosshair');
                window.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseleave', onMouseLeave);
                if (animId) cancelAnimationFrame(animId);
                if (root.parentNode) root.parentNode.removeChild(root);
            }
        };
    }

    global.Crosshair = {
        init: initCrosshair
    };
})(window);
