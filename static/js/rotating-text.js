/**
 * RotatingText - React Bits inspired Kinetic Rotating Text Component
 * Smooth infinite forward word rotation, dynamic width morphing, zero overlap, perfect baseline alignment.
 */

(function (global) {
    'use strict';

    function initRotatingText(containerEl, options) {
        if (!containerEl) return null;

        const opts = Object.assign({
            words: ['Intelligence', 'Equities', 'Financials', 'Valuations', 'Market Wire'],
            interval: 2800,
            transitionDuration: 420
        }, options || {});

        const words = opts.words;
        if (!words || words.length === 0) return null;

        let currentIndex = 0;
        let isAnimating = false;
        let timer = null;

        // Clean container and apply styling class
        containerEl.classList.add('rotating-words-box');
        containerEl.innerHTML = '';

        // Hidden measuring element that inherits ALL typography styles from container/heading
        const measureSpan = document.createElement('span');
        measureSpan.style.position = 'absolute';
        measureSpan.style.visibility = 'hidden';
        measureSpan.style.whiteSpace = 'nowrap';
        measureSpan.style.pointerEvents = 'none';
        measureSpan.style.left = '-9999px';
        measureSpan.style.top = '-9999px';
        measureSpan.style.font = 'inherit';
        measureSpan.style.fontSize = 'inherit';
        measureSpan.style.fontFamily = 'inherit';
        measureSpan.style.fontWeight = 'inherit';
        measureSpan.style.letterSpacing = 'inherit';
        measureSpan.style.textTransform = 'inherit';
        containerEl.appendChild(measureSpan);

        function getWordWidth(text) {
            measureSpan.textContent = text;
            return Math.ceil(measureSpan.getBoundingClientRect().width) + 4; // slight cushion
        }

        // Active element tracker (stored in variable so it is properly updated each turn)
        let activeWordEl = document.createElement('span');
        activeWordEl.className = 'rotating-word is-active';
        activeWordEl.textContent = words[0];
        containerEl.appendChild(activeWordEl);

        // Set initial width based on first word
        const initialWidth = getWordWidth(words[0]);
        containerEl.style.width = initialWidth + 'px';

        function rotateToNext() {
            if (isAnimating) return;
            if (document.hidden) return; // Don't animate when tab is in background

            isAnimating = true;
            const nextIndex = (currentIndex + 1) % words.length;
            const nextText = words[nextIndex];

            // 1. Smoothly morph container width to next word's exact rendered width
            const nextWidth = getWordWidth(nextText);
            containerEl.style.width = nextWidth + 'px';

            // 2. Create the incoming word below the active one
            const nextWordEl = document.createElement('span');
            nextWordEl.className = 'rotating-word is-entering';
            nextWordEl.textContent = nextText;
            containerEl.appendChild(nextWordEl);

            // Force browser layout reflow before triggering CSS transitions
            void nextWordEl.offsetWidth;

            // 3. Animate: old word slides up & exits, new word slides in & becomes active
            const exitingWordEl = activeWordEl;
            exitingWordEl.className = 'rotating-word is-exiting';
            nextWordEl.className = 'rotating-word is-active';

            // 4. Update the activeWordEl reference IMMEDIATELY so the next cycle tracks the correct element
            activeWordEl = nextWordEl;
            currentIndex = nextIndex;

            // 5. Clean up the exiting word from the DOM when the transition completes
            setTimeout(() => {
                if (exitingWordEl && exitingWordEl.parentNode === containerEl) {
                    containerEl.removeChild(exitingWordEl);
                }
                // Also remove any rogue inactive words that might have accumulated
                const wordsInDom = containerEl.querySelectorAll('.rotating-word');
                wordsInDom.forEach(el => {
                    if (el !== activeWordEl && el !== measureSpan) {
                        el.remove();
                    }
                });
                isAnimating = false;
            }, opts.transitionDuration);
        }

        function startTimer() {
            stopTimer();
            timer = setInterval(rotateToNext, opts.interval);
        }

        function stopTimer() {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
        }

        startTimer();

        // Pause when tab is hidden to save resources and avoid desync
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopTimer();
            } else {
                startTimer();
            }
        });

        // Recalculate width on window resize to ensure responsive correctness
        window.addEventListener('resize', () => {
            containerEl.style.width = getWordWidth(words[currentIndex]) + 'px';
        }, { passive: true });

        return {
            next: rotateToNext,
            stop: stopTimer,
            start: startTimer
        };
    }

    global.RotatingText = {
        init: initRotatingText
    };
})(window);
