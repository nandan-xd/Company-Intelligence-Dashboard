/**
 * LatticeLoader - Pure Vanilla HTML/CSS port of React Bits LatticeLoader component
 * Displays a 3x3 or 4x4 cellular wave animation with live stopwatch timer.
 */

(function (global) {
  'use strict';

  const PATTERNS = {
    orbit: [0, 1, 2, 7, null, 3, 6, 5, 4],
    ripple: [2, 1, 2, 1, 0, 1, 2, 1, 2],
    snake: [0, 1, 2, 5, 4, 3, 6, 7, 8],
    spiral: [0, 1, 2, 7, 8, 3, 6, 5, 4],
  };

  function createLatticeLoader(options) {
    const opts = Object.assign(
      {
        label: 'Searching Intelligence...',
        pattern: 'orbit',
        color: '#ea580c',
        cellSize: 10,
        gap: 4,
        showTimer: true,
      },
      options || {}
    );

    const container = document.createElement('div');
    container.className = 'll-root';

    // Grid container
    const gridEl = document.createElement('div');
    gridEl.className = 'll-grid';
    gridEl.style.display = 'grid';
    gridEl.style.gridTemplateColumns = `repeat(3, ${opts.cellSize}px)`;
    gridEl.style.gap = `${opts.gap}px`;

    const cellIndices = PATTERNS[opts.pattern] || PATTERNS.orbit;
    const step = 110;

    cellIndices.forEach((val) => {
      const cell = document.createElement('span');
      cell.className = 'll-cell animating';
      cell.style.width = `${opts.cellSize}px`;
      cell.style.height = `${opts.cellSize}px`;
      cell.style.backgroundColor = opts.color;
      if (val !== null) {
        cell.style.animationDelay = `${val * step}ms`;
      } else {
        cell.style.opacity = '0.08';
        cell.style.animation = 'none';
      }
      gridEl.appendChild(cell);
    });

    // Label
    const textEl = document.createElement('span');
    textEl.className = 'll-label';
    textEl.style.fontWeight = '600';
    textEl.style.color = '#f3f4f6';
    textEl.textContent = opts.label;

    container.appendChild(gridEl);
    container.appendChild(textEl);

    // Stopwatch Timer
    let timerInterval = null;
    if (opts.showTimer) {
      const timerEl = document.createElement('span');
      timerEl.className = 'll-timer';
      timerEl.textContent = '0.0s';
      container.appendChild(timerEl);

      const startTime = performance.now();
      timerInterval = setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000;
        timerEl.textContent = `${elapsed.toFixed(1)}s`;
      }, 100);
    }

    return {
      element: container,
      stop: () => {
        if (timerInterval) clearInterval(timerInterval);
      },
    };
  }

  // Global helper to show search overlay
  function showSearchLoader(label) {
    let overlay = document.getElementById('lattice-search-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'lattice-search-overlay';
      overlay.className = 'lattice-overlay';

      const card = document.createElement('div');
      card.className = 'lattice-overlay-card';
      overlay.appendChild(card);
      document.body.appendChild(overlay);
    }

    const card = overlay.querySelector('.lattice-overlay-card');
    card.innerHTML = '';
    const loader = createLatticeLoader({
      label: label || 'Fetching Company Financials & News...',
      pattern: 'orbit',
      color: '#ea580c',
      cellSize: 12,
      gap: 5,
      showTimer: true,
    });
    card.appendChild(loader.element);

    overlay.classList.add('active');

    return {
      hide: () => {
        loader.stop();
        overlay.classList.remove('active');
      },
    };
  }

  global.LatticeLoader = {
    create: createLatticeLoader,
    showSearchLoader: showSearchLoader,
  };
})(window);
