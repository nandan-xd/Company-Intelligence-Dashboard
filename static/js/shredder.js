/**
 * Shredder - Pure Vanilla HTML/CSS/Canvas port of React Bits Shredder component
 * Matches React Bits physics: mechanical feeding, slice clipping, 3D sinusoidal curling ribbons,
 * gravity fluttering, and smooth list collapse.
 */

(function (global) {
  'use strict';

  const DEG = Math.PI / 180;
  const SLIVER = 3;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const ease = (from, to, dt, tau) => from + (to - from) * (1 - Math.exp(-dt / tau));
  const smooth = (t) => {
    const u = clamp(t, 0, 1);
    return u * u * (3 - 2 * u);
  };
  const pick = (lo, hi) => lo + Math.random() * (hi - lo);
  const side = () => (Math.random() < 0.5 ? -1 : 1);

  function initShredderMachine(wrapperElement, options) {
    if (!wrapperElement) return null;

    const opts = Object.assign(
      {
        feedSpeed: 200,
        stripWidth: 12,
        fallHeight: 160,
        curl: 1.1,
        onShred: null,
      },
      options || {}
    );

    const listEl = wrapperElement.querySelector('.shredder-list');
    const slitHousing = wrapperElement.querySelector('.shredder-slit-housing');
    const slitBar = wrapperElement.querySelector('.shredder-slit-bar');
    const canvas = wrapperElement.querySelector('.shredder-canvas-container canvas');
    if (!listEl || !slitHousing || !canvas) return null;

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = Math.ceil(canvas.offsetWidth * dpr);
      canvas.height = Math.ceil(opts.fallHeight * dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    // Active feeding state
    let activeFeed = null;
    let strips = [];
    let raf = 0;
    let last = 0;
    let simTime = 0;

    function buildTexture(card) {
      const W = card.offsetWidth;
      const H = card.offsetHeight;
      const tex = document.createElement('canvas');
      tex.width = Math.ceil(W * dpr);
      tex.height = Math.ceil(H * dpr);
      const tCtx = tex.getContext('2d');

      // Card Background
      tCtx.fillStyle = '#111111';
      tCtx.fillRect(0, 0, tex.width, tex.height);

      // Card Border
      tCtx.strokeStyle = '#444444';
      tCtx.lineWidth = 2 * dpr;
      tCtx.strokeRect(2, 2, tex.width - 4, tex.height - 4);

      // Card Accent Stripe
      tCtx.fillStyle = '#ffffff';
      tCtx.fillRect(4 * dpr, 4 * dpr, 4 * dpr, tex.height - 8 * dpr);

      // Title & Subtitle text
      const nameEl = card.querySelector('h2, h3, h4, h5, .company-name');
      const text = nameEl ? nameEl.textContent.trim() : 'Company';

      tCtx.fillStyle = '#f8fafc'; // light text
      tCtx.font = `bold ${Math.round(18 * dpr)}px 'Space Grotesk', sans-serif`;
      tCtx.fillText(text, 22 * dpr, 36 * dpr);

      tCtx.fillStyle = '#c0c0c0';
      tCtx.font = `${Math.round(12 * dpr)}px 'Space Grotesk', sans-serif`;
      tCtx.fillText('Click to research again', 22 * dpr, 54 * dpr);

      return { tex, W, H };
    }

    function shredCard(card, deleteUrl) {
      if (activeFeed) return; // Busy shredding

      const { tex, W, H } = buildTexture(card);
      const numStrips = Math.max(12, Math.round(W / opts.stripWidth));
      const sw = W / numStrips;

      strips = [];
      for (let i = 0; i < numStrips; i++) {
        strips.push({
          x: i * sw,
          w: sw,
          H: H,
          phase: 'attached',
          curl: side() * pick(0.4, 0.85) * DEG * opts.curl,
          amp: pick(1.8, 3.8) * DEG * opts.curl,
          freq: (Math.PI * 2) / pick(32, 56),
          wave: pick(0, Math.PI * 2),
          rA: Math.random(),
          rB: Math.random(),
          speed: 160 + Math.random() * 200,
          splay: (Math.random() - 0.5) * 140,
          rest: side() * pick(0.15, 0.45),
          alpha: 1,
          th: 0,
          ax: i * sw + sw / 2,
          ay: 0,
          vx: pick(-16, 16),
          vy: 80,
          hang: 0,
          pts: [],
        });
      }

      // Smoothly hide real card and prepare animation container
      card.style.transition = 'opacity 0.2s ease, transform 0.25s ease';
      card.style.opacity = '0';
      card.style.pointerEvents = 'none';

      activeFeed = {
        card,
        tex,
        W,
        H,
        sw,
        feedProgress: 0, // 0 to 1 as card passes through slit
        deleteUrl,
        consumed: false,
      };

      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    }

    function shapeStrip(st, len, t, tear) {
      const pts = st.pts;
      pts.length = 0;
      let x = st.ax;
      let y = st.ay;
      const steps = Math.ceil(len / SLIVER);
      const swing = (3 + 8 * st.rA) * tear;
      const pace = t * (1.8 + st.rA * 2.2) + st.rA * 6.28;

      for (let j = 0; j <= steps; j++) {
        const d = Math.min(j * SLIVER, len);
        const a = st.th + st.curl * d + st.amp * Math.sin(d * st.freq + st.wave);
        const flutter = swing * Math.sin(d * 0.05 + pace);
        pts.push(x + flutter * Math.cos(a), y - flutter * Math.sin(a), a);
        const h = Math.min(SLIVER, len - d);
        x += Math.sin(a) * h;
        y += Math.cos(a) * h;
      }
    }

    function paintStrip(st, len, feedW) {
      const pts = st.pts;
      if (pts.length < 3) return;

      const half = (st.w * 0.9) / 2;
      const offsetX = (canvas.offsetWidth - feedW) / 2;
      const sx = st.x * dpr;

      ctx.save();
      ctx.globalAlpha = st.alpha;

      for (let j = 0; j + 3 < pts.length; j += 3) {
        const d = (j / 3) * SLIVER;
        const h = Math.min(SLIVER, len - d);
        if (h <= 0) break;

        const ca = Math.cos(pts[j + 2]);
        const sa = Math.sin(pts[j + 2]);
        const px = (pts[j] + offsetX) * dpr;
        const py = pts[j + 1] * dpr;

        ctx.setTransform(dpr * ca, -dpr * sa, dpr * sa, dpr * ca, px, py);

        // Draw texture slice
        ctx.drawImage(
          activeFeed.tex,
          sx,
          d * dpr,
          st.w * dpr,
          h * dpr,
          -half,
          0,
          st.w * 0.9,
          h + 0.5
        );
      }
      ctx.restore();
    }

    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      simTime += dt;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let running = false;

      if (activeFeed) {
        running = true;
        const f = activeFeed;
        f.feedProgress += dt * 1.6; // Speed of card feeding down

        // Mechanical slit vibration
        if (f.feedProgress < 1.1) {
          const jitterX = Math.sin(simTime * 140) * 0.8;
          const jitterY = Math.cos(simTime * 95) * 0.5;
          slitHousing.style.transform = `translate(${jitterX}px, ${jitterY}px)`;
        } else {
          slitHousing.style.transform = 'none';
        }

        const fedLength = Math.min(f.H, f.feedProgress * f.H);

        // Update and draw curling strips on canvas
        strips.forEach((st) => {
          if (fedLength > 4) {
            let len = fedLength;

            if (st.phase === 'attached') {
              st.ax = st.x + st.w / 2;
              st.th = Math.sin(simTime * 6 + st.wave) * 0.04;

              if (f.feedProgress >= 1.0) {
                st.phase = 'free';
                st.ay = 0;
                st.vy = 90 + st.rA * 140;
                st.speed = 150 + st.rA * 180;
                len = st.H;
              }
            }

            if (st.phase === 'free') {
              const tear = Math.min(1, st.ay / opts.fallHeight);
              st.vy += 420 * dt; // Gravity acceleration
              st.ay += st.vy * dt;
              st.ax += st.vx * dt;
              st.th = ease(st.th, st.rest, dt, 0.4);
              st.alpha = Math.max(0, 1 - (st.ay - 30) / (opts.fallHeight - 30));
              len = st.H;
            }

            shapeStrip(st, len, simTime, st.phase === 'free' ? 0.6 : 0.2);
            paintStrip(st, len, f.W);
          }
        });

        // Finished consumption
        if (f.feedProgress >= 1.5) {
          const cardToDelete = f.card;
          const deleteUrl = f.deleteUrl;
          activeFeed = null;
          strips = [];

          // Smooth collapse of the row in the list
          cardToDelete.style.maxHeight = `${cardToDelete.offsetHeight}px`;
          cardToDelete.style.overflow = 'hidden';
          cardToDelete.style.transition = 'max-height 0.25s ease, margin 0.25s ease, padding 0.25s ease';
          requestAnimationFrame(() => {
            cardToDelete.style.maxHeight = '0px';
            cardToDelete.style.paddingTop = '0px';
            cardToDelete.style.paddingBottom = '0px';
            cardToDelete.style.marginTop = '0px';
            cardToDelete.style.marginBottom = '0px';
          });

          setTimeout(() => {
            cardToDelete.remove();
            if (deleteUrl) {
              window.location.href = deleteUrl;
            } else if (opts.onShred) {
              opts.onShred(cardToDelete);
            }
          }, 280);
        }
      }

      if (running) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    // Connect drag & drop and delete buttons on the cards
    const cards = listEl.querySelectorAll('.shredder-item-card');
    cards.forEach((card) => {
      const deleteBtn = card.querySelector('.shred-delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const deleteUrl = deleteBtn.getAttribute('href');
          shredCard(card, deleteUrl);
        });
      }

      // Pointer drag into slit
      let startY = 0;
      let isDragging = false;

      card.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button, a')) return;
        startY = e.clientY;
        isDragging = true;
        card.classList.add('dragging');
        card.setPointerCapture?.(e.pointerId);
      });

      card.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const dy = Math.max(0, e.clientY - startY);
        card.style.transform = `translateY(${dy}px) rotate(${dy * 0.02}deg)`;

        const cardRect = card.getBoundingClientRect();
        const slitRect = slitHousing.getBoundingClientRect();
        if (cardRect.bottom >= slitRect.top) {
          isDragging = false;
          card.classList.remove('dragging');
          card.style.transform = 'none';
          const btn = card.querySelector('.shred-delete-btn');
          const deleteUrl = btn ? btn.getAttribute('href') : null;
          shredCard(card, deleteUrl);
        }
      });

      const endDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        card.classList.remove('dragging');
        card.style.transform = 'none';
      };

      card.addEventListener('pointerup', endDrag);
      card.addEventListener('pointercancel', endDrag);
    });

    return {
      shredCard,
    };
  }

  global.ShredderMachine = {
    init: initShredderMachine,
  };
})(window);
