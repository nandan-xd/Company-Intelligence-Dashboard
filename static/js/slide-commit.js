/**
 * SlideCommit - Pure Vanilla implementation of React Bits SlideCommit component
 * Drag / swipe circle arrow to the right to commit search request.
 */

(function (global) {
    'use strict';

    function initSlideCommit(trackEl, onCommit) {
        if (!trackEl) return;

        const knob = trackEl.querySelector('.slide-commit-knob');
        const fill = trackEl.querySelector('.slide-commit-fill');
        const label = trackEl.querySelector('.slide-commit-label');
        if (!knob) return;

        let isDragging = false;
        let startX = 0;
        let currentX = 0;
        let maxSlide = 0;
        let isCommitted = false;

        function updateBounds() {
            maxSlide = Math.max(0, trackEl.clientWidth - knob.offsetWidth - 4);
        }

        updateBounds();
        window.addEventListener('resize', updateBounds);

        function setTranslate(x) {
            const clamped = Math.max(0, Math.min(x, maxSlide));
            knob.style.transform = `translateX(${clamped}px)`;
            if (fill) {
                fill.style.width = `${clamped + knob.offsetWidth / 2}px`;
            }
            if (label) {
                const opacity = 1 - (clamped / maxSlide);
                label.style.opacity = Math.max(0, opacity);
            }
            return clamped;
        }

        function triggerCommit() {
            if (isCommitted) return;
            isCommitted = true;
            trackEl.classList.add('committed');
            setTranslate(maxSlide);
            if (typeof onCommit === 'function') {
                onCommit();
            }
        }

        function onPointerDown(e) {
            if (isCommitted) return;
            updateBounds();
            isDragging = true;
            startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            currentX = 0;
            trackEl.classList.add('dragging');
            knob.setPointerCapture?.(e.pointerId);
        }

        function onPointerMove(e) {
            if (!isDragging || isCommitted) return;
            const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            const deltaX = clientX - startX;
            currentX = setTranslate(deltaX);

            // Threshold: 82% of track length triggers commit
            if (currentX >= maxSlide * 0.82) {
                isDragging = false;
                trackEl.classList.remove('dragging');
                triggerCommit();
            }
        }

        function onPointerUp(e) {
            if (!isDragging || isCommitted) return;
            isDragging = false;
            trackEl.classList.remove('dragging');

            if (currentX >= maxSlide * 0.82) {
                triggerCommit();
            } else {
                // Spring back
                knob.style.transition = 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)';
                if (fill) fill.style.transition = 'width 260ms cubic-bezier(0.16, 1, 0.3, 1)';
                if (label) label.style.transition = 'opacity 260ms ease';
                setTranslate(0);
                setTimeout(() => {
                    knob.style.transition = '';
                    if (fill) fill.style.transition = '';
                    if (label) label.style.transition = '';
                }, 280);
            }
        }

        knob.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        // Also allow direct tap/click on knob to auto-commit
        knob.addEventListener('click', function(e) {
            if (!isCommitted && currentX < 10) {
                triggerCommit();
            }
        });

        return {
            commit: triggerCommit,
            reset: () => {
                isCommitted = false;
                trackEl.classList.remove('committed');
                setTranslate(0);
            }
        };
    }

    global.SlideCommit = {
        init: initSlideCommit
    };
})(window);
