/**
 * FolderFloat - Enhanced & Optimized React Bits FolderFloat Component
 * Positioned at bottom-left corner with stabilized hover bridge, ticker tags,
 * smooth spring physics, realistic 3D folder flap, and click-to-pin support.
 */

(function (global) {
    'use strict';

    const DEFAULT_ITEMS = [
        { label: 'Apple Inc.', value: 'Apple' },
        { label: 'Microsoft Corp.', value: 'Microsoft' },
        { label: 'NVIDIA Corp.', value: 'NVIDIA' },
        { label: 'Alphabet Inc.', value: 'Alphabet' },
        { label: 'Amazon.com Inc.', value: 'Amazon' },
        { label: 'Tesla Inc.', value: 'Tesla' }
    ];

    function initFolderFloat(containerEl, options) {
        if (!containerEl) return;

        const opts = Object.assign({
            items: DEFAULT_ITEMS,
            label: 'Quick Search',
            sublabel: '6 Equities',
            onSelect: null
        }, options || {});

        // Stagger positions: tuned fan-out curve for effortless clicking
        const itemPositions = [
            { x: 26,  y: -32,  r: -2.5 },
            { x: 106, y: -68,  r: 2 },
            { x: 30,  y: -106, r: -1.5 },
            { x: 112, y: -142, r: 1.8 },
            { x: 36,  y: -180, r: -2 },
            { x: 118, y: -216, r: 1.2 }
        ];

        containerEl.className = 'folder-float-root';
        containerEl.innerHTML = `
            <div class="folder-float" data-trigger="hover">
                <!-- Invisible hover bridge prevents accidental close when cursor moves up toward pills -->
                <div class="folder-float__hitbridge" aria-hidden="true"></div>

                <div class="folder-float__items" role="menu" aria-label="Quick equity searches">
                    ${opts.items.map((item, i) => {
                        const pos = itemPositions[i] || { x: 50, y: -34 * (i + 1), r: 0 };
                        return `
                            <button type="button" class="folder-float__item" 
                                    role="menuitem"
                                    data-value="${item.value}" 
                                    style="--x: ${pos.x}px; --y: ${pos.y}px; --r: ${pos.r}deg; --i: ${i};"
                                    title="Search ${item.label}">
                                <span class="folder-pill-dot" aria-hidden="true"></span>
                                <span class="folder-pill-label">${item.label}</span>
                                <span class="folder-pill-arrow" aria-hidden="true">&rarr;</span>
                            </button>
                        `;
                    }).join('')}
                </div>

                <div class="folder-float__folder" role="button" aria-haspopup="true" aria-expanded="false" tabindex="0">
                    <span class="folder-float__back" aria-hidden="true"></span>
                    <span class="folder-float__paper" aria-hidden="true">
                        <span class="folder-float__paper-lines"></span>
                    </span>
                    <span class="folder-float__front" aria-hidden="true">
                        <div class="folder-float__front-top">
                            <svg class="folder-svg-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                            </svg>
                            <span class="folder-badge-count font-mono">${opts.items.length}</span>
                        </div>
                        <span class="folder-float__label">${opts.label}</span>
                        <span class="folder-float__sub">${opts.sublabel}</span>
                    </span>
                    <button type="button" class="folder-float__trigger" aria-label="${opts.label} (Click to toggle, hover to view)"></button>
                </div>
            </div>
        `;

        const root = containerEl.querySelector('.folder-float');
        const triggerBtn = containerEl.querySelector('.folder-float__trigger');
        const folderEl = containerEl.querySelector('.folder-float__folder');
        let isOpen = false;
        let isPinned = false;
        let closeTimer = null;

        function setOpen(open) {
            isOpen = open;
            if (isOpen) {
                root.setAttribute('data-open', '');
                folderEl.setAttribute('aria-expanded', 'true');
            } else {
                root.removeAttribute('data-open');
                folderEl.setAttribute('aria-expanded', 'false');
                isPinned = false;
            }
        }

        function cancelClose() {
            if (closeTimer) {
                clearTimeout(closeTimer);
                closeTimer = null;
            }
        }

        function scheduleClose(delay = 320) {
            cancelClose();
            if (!isPinned) {
                closeTimer = setTimeout(() => {
                    setOpen(false);
                }, delay);
            }
        }

        // Hover events with grace delay to eliminate accidental collapsing
        containerEl.addEventListener('mouseenter', () => {
            cancelClose();
            setOpen(true);
        });

        containerEl.addEventListener('mouseleave', () => {
            scheduleClose(300);
        });

        // Click to toggle / pin state
        triggerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            cancelClose();
            if (isOpen && isPinned) {
                setOpen(false);
            } else {
                isPinned = true;
                setOpen(true);
            }
        });

        // Pill clicks
        containerEl.querySelectorAll('.folder-float__item').forEach((btn) => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const val = this.getAttribute('data-value');
                this.classList.add('is-selected');
                setTimeout(() => {
                    if (typeof opts.onSelect === 'function') {
                        opts.onSelect(val);
                    }
                    setOpen(false);
                }, 100);
            });
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (isOpen && !containerEl.contains(e.target)) {
                setOpen(false);
            }
        });

        // Close on escape
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) {
                setOpen(false);
            }
        });
    }

    global.FolderFloat = {
        init: initFolderFloat
    };
})(window);
