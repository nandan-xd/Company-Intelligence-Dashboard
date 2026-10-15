/**
 * TechText - Pure Vanilla HTML/CSS/Canvas port of React Bits TechText component
 * Pure black typography and animation, larger size, hover-only activation.
 */

(function (global) {
  'use strict';

  const LABEL_FONT = '11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const FALLOFF_STEPS = 8;
  const SPRING = 320;
  const DAMPING = 22;

  const approach = (current, target, dt, seconds) =>
    current + (target - current) * (1 - Math.exp(-dt / seconds));

  const hexToRgb = (hex) => {
    let h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.replace(/./g, (c) => c + c);
    const n = parseInt(h.slice(0, 6), 16);
    return Number.isNaN(n) ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  const rgba = (hex, alpha) => {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const noise = (...values) => {
    let h = 2166136261;
    for (const value of values) {
      h = Math.imul(h ^ (value | 0), 16777619);
      h ^= h >>> 13;
      h = Math.imul(h, 0x5bd1e995);
      h ^= h >>> 15;
    }
    return (h >>> 0) / 4294967296;
  };

  const signed = (value) => (value > 0 ? `+${value}` : value < 0 ? `−${-value}` : '0');

  function initTechText(container, userOptions) {
    if (!container) return null;

    const defaultOptions = {
      text: 'Company Intelligence',
      fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
      fontWeight: 700,
      fontSize: 130, // Much bigger heading size
      letterSpacing: -0.02,
      color: '#000000', // Pure black text
      accentColor: '#000000', // Pure black animation as requested!
      reach: 150,
      softness: 0.7,
      dashLength: 5,
      dashGap: 2.5,
      strokeWidth: 2,
      lineStyle: 'dashed',
      reveal: 'letter',
      specks: 12,
      selection: true,
      labels: true,
      draggable: true,
      sweep: false, // Hover-only activation
      speed: 1,
    };

    const s = Object.assign({}, defaultOptions, userOptions || {});

    // Ensure container styling
    container.style.position = 'relative';
    container.style.touchAction = 'pan-y';
    container.style.userSelect = 'none';

    // Canvas elements
    let canvas = container.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'tech-text-canvas';
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      container.appendChild(canvas);
    }
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', s.text);

    const ctx = canvas.getContext('2d');
    const scratch = document.createElement('canvas');
    const scratchCtx = scratch.getContext('2d');
    if (!ctx || !scratchCtx) return null;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let width = 1;
    let height = 1;
    let dpr = 1;
    let raf = 0;
    let last = performance.now();
    let visible = true;
    let alive = true;
    let layoutKey = '';
    let requestedFont = '';
    let word = null;
    let glyphs = [];
    let presence = 0;
    let clock = 0;
    let pulse = 0;
    let placed = false;
    let dragging = -1;
    const pointer = { x: 0, y: 0, inside: false };
    const grab = { x: 0, y: 0 };
    const lens = { x: 0, y: 0 };
    const frame = { x1: 0, y1: 0, x2: 0, y2: 0, alpha: 0, index: -1 };

    const family = (opts) => opts.fontFamily || getComputedStyle(container).fontFamily || 'sans-serif';
    const fontFor = (opts, size) => `${opts.fontWeight} ${size}px ${family(opts)}`;

    const setFont = (target, opts, size) => {
      target.font = fontFor(opts, size);
      if ('letterSpacing' in target) {
        target.letterSpacing = `${opts.letterSpacing * size}px`;
      }
      target.textAlign = 'left';
      target.textBaseline = 'alphabetic';
    };

    const refreshFonts = () => {
      layoutKey = '';
      wake();
    };

    const sprite = (opts, view, glyph, stroke) => {
      const pad = Math.ceil(opts.strokeWidth * 2 + 6);
      const left = glyph.box.x1 - pad;
      const top = glyph.box.y1 - pad;
      const w = glyph.box.x2 - glyph.box.x1 + pad * 2;
      const h = glyph.box.y2 - glyph.box.y1 + pad * 2;
      const image = document.createElement('canvas');
      image.width = Math.max(1, Math.ceil(w * dpr));
      image.height = Math.max(1, Math.ceil(h * dpr));
      const c = image.getContext('2d');
      if (!c) return { image, left, top };

      c.setTransform(dpr, 0, 0, dpr, -left * dpr, -top * dpr);
      setFont(c, opts, view.size);

      if (stroke) {
        c.lineJoin = 'round';
        c.lineWidth = opts.strokeWidth * 2;
        c.lineCap = 'butt';
        c.strokeStyle = opts.accentColor || opts.color;
        if (opts.lineStyle !== 'solid') {
          c.setLineDash([Math.max(1, opts.dashLength), Math.max(1, opts.dashGap)]);
        }
        c.strokeText(glyph.char, glyph.x, view.baseline);
        c.setLineDash([]);
        c.globalCompositeOperation = 'destination-out';
        c.fillStyle = '#000000';
        c.fillText(glyph.char, glyph.x, view.baseline);
        c.globalCompositeOperation = 'source-over';
      } else {
        c.fillStyle = opts.color;
        c.fillText(glyph.char, glyph.x, view.baseline);
      }
      return { image, left, top };
    };

    const ensureLayout = (opts) => {
      const key = [
        opts.text,
        family(opts),
        opts.fontWeight,
        opts.fontSize,
        opts.letterSpacing,
        opts.color,
        opts.accentColor,
        opts.dashLength,
        opts.dashGap,
        opts.strokeWidth,
        opts.lineStyle,
        width,
        height,
        dpr,
      ].join('|');

      if (key === layoutKey && word) return word;
      layoutKey = key;

      const wanted = fontFor(opts, 64);
      if (document.fonts && wanted !== requestedFont) {
        requestedFont = wanted;
        document.fonts.load(wanted, opts.text).then(refreshFonts, refreshFonts);
      }

      const probe = scratchCtx;
      setFont(probe, opts, opts.fontSize);
      let m = probe.measureText(opts.text);
      const inkWidth = Math.max(1, (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || m.width || 1));
      const inkHeight = Math.max(1, (m.actualBoundingBoxAscent || opts.fontSize * 0.8) + (m.actualBoundingBoxDescent || opts.fontSize * 0.2));

      const fit = Math.min(
        1,
        (width * 0.98) / inkWidth,
        (height * 0.80) / inkHeight
      );
      const size = Math.max(16, opts.fontSize * fit);
      setFont(probe, opts, size);
      m = probe.measureText(opts.text);

      const actualInkWidth = (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || m.width || 1);
      const actualInkHeight = (m.actualBoundingBoxAscent || size * 0.8) + (m.actualBoundingBoxDescent || size * 0.2);
      const x = (width - actualInkWidth) / 2 + (m.actualBoundingBoxLeft || 0);
      const baseline = (height - actualInkHeight) / 2 + (m.actualBoundingBoxAscent || size * 0.8);

      const next = {
        size,
        baseline,
        left: x - (m.actualBoundingBoxLeft || 0),
        right: x + (m.actualBoundingBoxRight || m.width || 1),
        top: baseline - (m.actualBoundingBoxAscent || size * 0.8),
        bottom: baseline + (m.actualBoundingBoxDescent || size * 0.2),
      };
      word = next;

      const chars = Array.from(opts.text);
      const previous = glyphs;
      glyphs = [];
      let prefix = '';

      chars.forEach((char, i) => {
        prefix += char;
        const own = probe.measureText(char);
        const gx = x + probe.measureText(prefix).width - own.width;
        if (!char.trim()) return;

        const charAscent = own.actualBoundingBoxAscent || size * 0.8;
        const charDescent = own.actualBoundingBoxDescent || size * 0.2;
        const charLeft = own.actualBoundingBoxLeft || 0;
        const charRight = own.actualBoundingBoxRight || own.width || 1;

        const base = {
          char,
          x: gx,
          box: {
            x1: gx - charLeft,
            y1: baseline - charAscent,
            x2: gx + charRight,
            y2: baseline + charDescent,
          },
        };
        const kept = previous[glyphs.length];
        glyphs.push({
          ...base,
          offset: kept?.char === char ? kept.offset : { x: 0, y: 0 },
          velocity: { x: 0, y: 0 },
          outline: 0,
          index: i,
          fill: sprite(opts, next, base, false),
          dashes: sprite(opts, next, base, true),
        });
      });

      dragging = -1;
      frame.index = -1;
      return next;
    };

    const glyphAt = (px, py) => {
      if (!word || py < word.top - 24 || py > word.bottom + 24) return -1;
      let best = -1;
      let bestDistance = Infinity;
      glyphs.forEach((glyph, i) => {
        const x1 = glyph.box.x1 + glyph.offset.x;
        const x2 = glyph.box.x2 + glyph.offset.x;
        const d = px < x1 ? x1 - px : px > x2 ? px - x2 : 0;
        if (d < bestDistance) {
          bestDistance = d;
          best = i;
        }
      });
      return bestDistance < 32 ? best : -1;
    };

    const blit = (target, art, dx, dy, originX, originY) => {
      target.drawImage(
        art.image,
        Math.round((art.left + dx) * dpr - originX),
        Math.round((art.top + dy) * dpr - originY)
      );
    };

    const crisp = (value) => (Math.round(value * dpr) + 0.5) / dpr;

    const perimeterPoint = (distance, w, h) => {
      const total = 2 * (w + h);
      let d = ((distance % total) + total) % total;
      if (d < w) return [frame.x1 + d, frame.y1, 0, -1];
      d -= w;
      if (d < h) return [frame.x2, frame.y1 + d, 1, 0];
      d -= h;
      if (d < w) return [frame.x2 - d, frame.y2, 0, 1];
      d -= h;
      return [frame.x1, frame.y2 - d, -1, 0];
    };

    const drawSpecks = (opts, a) => {
      const w = frame.x2 - frame.x1;
      const h = frame.y2 - frame.y1;
      if (w < 2 || h < 2) return;
      const perimeter = 2 * (w + h);
      const seed = frame.index + 1;
      const grid = 3;

      for (let k = 0; k < opts.specks; k++) {
        const period = 0.5 + noise(seed, k, 11) * 1.2;
        const t = pulse / period + noise(seed, k, 17);
        const cycle = Math.floor(t);
        const life = t - cycle;
        if (life > 0.7) continue;

        const [px, py, nx, ny] = perimeterPoint(noise(seed, k, cycle) * perimeter, w, h);
        const pick = noise(seed, k, cycle, 2);
        const size = pick < 0.46 ? 2 : pick < 0.7 ? 3 : pick < 0.84 ? 5 : pick < 0.94 ? 8 : 10;
        const large = size >= 8;
        const out = (large ? 8 : 4) + Math.floor(noise(seed, k, cycle, 1) * 4) * grid;
        const x = frame.x1 + Math.round((px + nx * out - frame.x1) / grid) * grid;
        const y = frame.y1 + Math.round((py + ny * out - frame.y1) / grid) * grid;
        const tone = noise(seed, k, cycle, 3);
        const blink = life < 0.06 || (life > 0.32 && life < 0.36) ? 0.35 : 1;
        const alpha = a * (large ? 0.3 + 0.4 * tone : 0.3 + 0.6 * tone) * blink;
        const left = Math.round(x - size / 2);
        const top = Math.round(y - size / 2);

        if (tone < 0.26 || (large && tone < 0.78)) {
          ctx.strokeStyle = rgba(opts.accentColor, alpha);
          ctx.strokeRect(left + 0.5, top + 0.5, size, size);
          if (large && tone > 0.5) {
            ctx.fillStyle = rgba(opts.accentColor, alpha);
            ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
          }
        } else {
          ctx.fillStyle = rgba(opts.accentColor, alpha);
          ctx.fillRect(left, top, size, size);
        }
      }
    };

    const drawFrame = (opts) => {
      const glyph = glyphs[frame.index];
      if (!glyph || frame.alpha < 0.01) return;
      const a = frame.alpha;
      const x1 = crisp(frame.x1);
      const y1 = crisp(frame.y1);
      const x2 = crisp(frame.x2);
      const y2 = crisp(frame.y2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const moved = Math.hypot(glyph.offset.x, glyph.offset.y);
      if (moved > 1) {
        const hx = (glyph.box.x1 + glyph.box.x2) / 2;
        const hy = (glyph.box.y1 + glyph.box.y2) / 2;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx + glyph.offset.x, hy + glyph.offset.y);
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(opts.accentColor, 0.6 * a);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.rect(Math.round(hx) - 2, Math.round(hy) - 2, 4, 4);
        ctx.fillStyle = rgba(opts.accentColor, 0.85 * a);
        ctx.fill();
      }

      // Black bounding frame
      ctx.beginPath();
      ctx.rect(x1, y1, x2 - x1, y2 - y1);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = rgba(opts.accentColor, 0.7 * a);
      ctx.stroke();

      // Black corner markers
      ctx.beginPath();
      for (const [cx, cy] of [
        [x1, y1],
        [x2, y1],
        [x2, y2],
        [x1, y2],
      ]) {
        ctx.rect(Math.round(cx) - 2, Math.round(cy) - 2, 5, 5);
      }
      ctx.fillStyle = rgba(opts.accentColor, 0.95 * a);
      ctx.fill();

      if (opts.specks > 0) {
        ctx.lineWidth = 1;
        drawSpecks(opts, a);
      }

      if (!opts.labels) return;
      ctx.font = LABEL_FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = rgba(opts.accentColor, 0.9 * a);
      const label =
        moved > 1
          ? `${signed(Math.round(glyph.offset.x))}, ${signed(Math.round(-glyph.offset.y))}`
          : `${glyph.char}  ${Math.round(glyph.box.x2 - glyph.box.x1)}×${Math.round(glyph.box.y2 - glyph.box.y1)}`;
      ctx.fillText(label, Math.round(frame.x1), Math.round(frame.y1) - 6);
    };

    const tick = (now) => {
      raf = 0;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const view = ensureLayout(s);

      const active = pointer.inside || dragging >= 0;
      if (active && !placed) {
        lens.x = pointer.x;
        lens.y = pointer.y;
      }
      if (active) {
        const lag = pointer.inside ? 0.05 : 0.22;
        lens.x = approach(lens.x, pointer.x, dt, lag);
        lens.y = approach(lens.y, pointer.y, dt, lag);
      }
      placed = active;

      let moving = false;
      glyphs.forEach((glyph, i) => {
        if (i === dragging) {
          glyph.offset.x = approach(glyph.offset.x, pointer.x - grab.x, dt, 0.03);
          glyph.offset.y = approach(glyph.offset.y, pointer.y - grab.y, dt, 0.03);
          glyph.velocity.x = 0;
          glyph.velocity.y = 0;
          moving = true;
          return;
        }
        const { offset, velocity } = glyph;
        if (Math.abs(offset.x) < 0.05 && Math.abs(offset.y) < 0.05 && Math.hypot(velocity.x, velocity.y) < 0.5) {
          offset.x = 0;
          offset.y = 0;
          velocity.x = 0;
          velocity.y = 0;
          return;
        }
        velocity.x += (-SPRING * offset.x - DAMPING * velocity.x) * dt;
        velocity.y += (-SPRING * offset.y - DAMPING * velocity.y) * dt;
        offset.x += velocity.x * dt;
        offset.y += velocity.y * dt;
        moving = true;
      });

      const focus = dragging >= 0 ? dragging : active ? glyphAt(lens.x, lens.y) : -1;
      if (focus >= 0 && s.selection) {
        const glyph = glyphs[focus];
        const bx1 = glyph.box.x1 + glyph.offset.x - 5;
        const by1 = glyph.box.y1 + glyph.offset.y - 5;
        const bx2 = glyph.box.x2 + glyph.offset.x + 5;
        const by2 = glyph.box.y2 + glyph.offset.y + 5;
        if (frame.index < 0 || frame.alpha < 0.02) {
          frame.x1 = bx1;
          frame.y1 = by1;
          frame.x2 = bx2;
          frame.y2 = by2;
        }
        const glide = focus === dragging ? 0.02 : 0.08;
        frame.x1 = approach(frame.x1, bx1, dt, glide);
        frame.y1 = approach(frame.y1, by1, dt, glide);
        frame.x2 = approach(frame.x2, bx2, dt, glide);
        frame.y2 = approach(frame.y2, by2, dt, glide);
        frame.index = focus;
      }
      frame.alpha = approach(frame.alpha, focus >= 0 && s.selection ? 1 : 0, dt, 0.1);

      glyphs.forEach((glyph, i) => {
        const target = s.reveal === 'letter' && i === focus && i !== dragging ? 1 : 0;
        glyph.outline = approach(glyph.outline, target, dt, 0.09);
        if (Math.abs(glyph.outline - target) > 0.002) moving = true;
        else glyph.outline = target;
      });

      if (s.draggable) {
        container.style.cursor = dragging >= 0 ? 'grabbing' : focus >= 0 && pointer.inside ? 'grab' : '';
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const glyph of glyphs) {
        const moved = Math.hypot(glyph.offset.x, glyph.offset.y);
        if (moved > 1) {
          ctx.globalAlpha = Math.min(1, moved / 24) * 0.55;
          blit(ctx, glyph.dashes, 0, 0, 0, 0);
          ctx.globalAlpha = 1;
        }
      }

      for (const glyph of glyphs) {
        if (glyph.outline < 0.999) {
          ctx.globalAlpha = 1 - glyph.outline;
          blit(ctx, glyph.fill, glyph.offset.x, glyph.offset.y, 0, 0);
        }
        if (glyph.outline > 0.001) {
          ctx.globalAlpha = glyph.outline;
          blit(ctx, glyph.dashes, glyph.offset.x, glyph.offset.y, 0, 0);
        }
        ctx.globalAlpha = 1;
      }

      drawFrame(s);

      const settling =
        moving ||
        (frame.alpha > 0.01 && frame.alpha < 0.99);
      if ((active || settling) && visible && alive) raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (raf || !visible || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const resize = () => {
      width = Math.max(1, container.clientWidth);
      height = Math.max(1, container.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      layoutKey = '';
      wake();
    };

    const locate = (e) => {
      const rect = container.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };

    const onMove = (e) => {
      locate(e);
      pointer.inside = true;
      wake();
    };

    const onLeave = () => {
      if (dragging >= 0) return;
      pointer.inside = false;
      wake();
    };

    const onDown = (e) => {
      locate(e);
      pointer.inside = true;
      if (s.draggable && (e.pointerType !== 'mouse' || e.button === 0)) {
        const index = glyphAt(pointer.x, pointer.y);
        if (index >= 0) {
          dragging = index;
          grab.x = pointer.x - glyphs[index].offset.x;
          grab.y = pointer.y - glyphs[index].offset.y;
          container.setPointerCapture?.(e.pointerId);
        }
      }
      wake();
    };

    const onUp = (e) => {
      if (dragging >= 0) {
        dragging = -1;
        container.releasePointerCapture?.(e.pointerId);
        const rect = container.getBoundingClientRect();
        pointer.inside =
          e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      }
      wake();
    };

    container.addEventListener('pointermove', onMove, { passive: true });
    container.addEventListener('pointerenter', onMove, { passive: true });
    container.addEventListener('pointerdown', onDown, { passive: true });
    container.addEventListener('pointerup', onUp, { passive: true });
    container.addEventListener('pointercancel', onUp, { passive: true });
    container.addEventListener('pointerleave', onLeave, { passive: true });

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      wake();
    });
    intersectionObserver.observe(container);

    if (document.fonts) {
      document.fonts.ready.then(refreshFonts, refreshFonts);
    }

    resize();

    return {
      destroy: () => {
        alive = false;
        cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        container.removeEventListener('pointermove', onMove);
        container.removeEventListener('pointerenter', onMove);
        container.removeEventListener('pointerdown', onDown);
        container.removeEventListener('pointerup', onUp);
        container.removeEventListener('pointercancel', onUp);
        container.removeEventListener('pointerleave', onLeave);
      },
      update: (newOpts) => {
        Object.assign(s, newOpts);
        refreshFonts();
      },
    };
  }

  global.TechText = { init: initTechText };
})(window);
