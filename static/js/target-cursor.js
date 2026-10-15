/**
 * TargetCursor - Pure Vanilla HTML/CSS/Canvas port of React Bits TargetCursor component
 * Styled with Sky Blue & Burnt Copper colors, sole cursor on page.
 */

(function (global) {
  'use strict';

  const CORNER_ANGLES = [0, 90, 180, 270];
  const QUARTER = Math.PI / 2;

  const spring = (state, goal, stiffness, damping, dt) => {
    const steps = 2;
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      state.v += (stiffness * (goal - state.x) - damping * state.v) * h;
      state.x += state.v * h;
    }
  };

  function initTargetCursor(userOptions) {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return null;
    }

    const defaultOptions = {
      targetSelector: '.btn, button, a.btn, input[type="submit"], .cursor-target, .shred-delete-btn, .shredder-item-card',
      cursorColor: '#ffffff', // White cursor
      cursorColorOnTarget: '#ffffff', // White on target
      spinDuration: 2.2,
      hoverDuration: 0.18,
      parallaxOn: true,
      hideDefaultCursor: true,
      size: 34,
      cornerSize: 12,
      thickness: 2.5,
      padding: 6,
      matchRadius: true,
      dotSize: 4,
      blendMode: 'normal',
      showLabel: false,
      clickEffect: true,
    };

    const s = Object.assign({}, defaultOptions, userOptions || {});

    // Ensure CSS hides default cursor
    let cursorStyle = document.getElementById('target-cursor-hide-style');
    if (!cursorStyle) {
      cursorStyle = document.createElement('style');
      cursorStyle.id = 'target-cursor-hide-style';
      cursorStyle.textContent = `
        *, *::before, *::after, html, body, button, a, input, select, textarea {
          cursor: none !important;
        }
      `;
      document.head.appendChild(cursorStyle);
    }

    // Create root container
    const root = document.createElement('div');
    root.className = 'target-cursor-root';
    root.setAttribute('aria-hidden', 'true');
    root.style.position = 'fixed';
    root.style.inset = '0';
    root.style.pointerEvents = 'none';
    root.style.zIndex = '2147483647';
    root.style.opacity = '0';
    root.style.setProperty('--target-cursor-color', s.cursorColor);

    // Create 4 corner spans
    const corners = CORNER_ANGLES.map(() => {
      const el = document.createElement('span');
      el.style.position = 'absolute';
      el.style.top = '0';
      el.style.left = '0';
      el.style.boxSizing = 'border-box';
      el.style.transformOrigin = 'top left';
      el.style.borderStyle = 'solid';
      el.style.borderColor = 'var(--target-cursor-color, #38bdf8)';
      el.style.willChange = 'transform';
      root.appendChild(el);
      return el;
    });

    // Center dot
    const dot = document.createElement('span');
    dot.style.position = 'absolute';
    dot.style.top = '0';
    dot.style.left = '0';
    dot.style.borderRadius = '50%';
    dot.style.backgroundColor = 'var(--target-cursor-color, #38bdf8)';
    dot.style.willChange = 'transform';
    root.appendChild(dot);

    document.body.appendChild(root);

    // State
    const pointer = { x: -100, y: -100, inside: false, seen: false, pressed: false };
    const centerX = { x: 0, v: 0 };
    const centerY = { x: 0, v: 0 };
    const halfW = { x: 0, v: 0 };
    const halfH = { x: 0, v: 0 };
    const radius = { x: 0, v: 0 };
    const turn = { x: 0, v: 0 };
    const lock = { x: 0, v: 0 };
    const press = { x: 0, v: 0 };
    const presence = { x: 0, v: 0 };

    let target = null;
    let targetRadius = 0;
    let quarter = 0;
    let spinSpeed = 0;
    let raf = 0;
    let last = 0;

    const findTarget = (x, y, element) => {
      const node = element || document.elementFromPoint(x, y);
      return node?.closest(s.targetSelector) || null;
    };

    const lockOn = (next) => {
      if (next === target) return;
      target = next;
      if (target) {
        quarter = Math.round(turn.x / QUARTER);
        const comp = getComputedStyle(target);
        targetRadius = parseFloat(comp.borderTopLeftRadius) || 4;
        spinSpeed = 0;
      }
    };

    const frame = (now) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;

      if (target && !target.isConnected) lockOn(null);
      const rect = target ? target.getBoundingClientRect() : null;
      const locked = !!rect && pointer.inside;
      const snapW = 4.6 / s.hoverDuration;
      const snapK = snapW * snapW;
      const snapC = 2 * 0.62 * snapW;

      spring(presence, pointer.inside ? 1 : 0, 260, 32, dt);
      spring(lock, locked ? 1 : 0, snapK, 2 * snapW, dt);
      spring(press, pointer.pressed && s.clickEffect ? 1 : 0, 900, 40, dt);

      let goalX = pointer.x;
      let goalY = pointer.y;
      let goalW = s.size / 2;
      let goalH = s.size / 2;
      let goalR = Math.min(2, s.cornerSize / 4);

      if (locked) {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const lean = s.parallaxOn ? 0.08 : 0;
        goalX = cx + (pointer.x - cx) * lean;
        goalY = cy + (pointer.y - cy) * lean;
        const odd = Math.abs(quarter) % 2 === 1;
        const w = rect.width / 2 + s.padding;
        const h = rect.height / 2 + s.padding;
        goalW = odd ? h : w;
        goalH = odd ? w : h;
        goalR = s.matchRadius ? Math.min(targetRadius + Math.max(0, s.padding), s.cornerSize) : 0;
      }

      if (!pointer.inside && presence.x < 0.01) pointer.seen = false;
      if (!pointer.seen) {
        centerX.x = goalX;
        centerY.x = goalY;
        halfW.x = goalW;
        halfH.x = goalH;
        pointer.seen = pointer.inside;
      }

      const follow = locked ? snapK : 2200;
      const followC = locked ? snapC : 2 * Math.sqrt(2200);
      spring(centerX, goalX, follow, followC, dt);
      spring(centerY, goalY, follow, followC, dt);
      spring(halfW, goalW, snapK, snapC, dt);
      spring(halfH, goalH, snapK, snapC, dt);
      spring(radius, goalR, snapK, 2 * snapW, dt);

      if (locked) {
        spring(turn, quarter * QUARTER, snapK, snapC, dt);
      } else {
        const speed = s.spinDuration > 0 ? (Math.PI * 2) / s.spinDuration : 0;
        spinSpeed += (speed - spinSpeed) * (1 - Math.exp(-dt * 3));
        turn.v = spinSpeed;
        turn.x += spinSpeed * dt;
      }

      const squeeze = 1 - press.x * 0.14;
      const cos = Math.cos(turn.x);
      const sin = Math.sin(turn.x);
      const w = Math.max(0, halfW.x) * squeeze;
      const h = Math.max(0, halfH.x) * squeeze;
      const localCorners = [
        [-w, -h],
        [w, -h],
        [w, h],
        [-w, h],
      ];
      const r = Math.max(0, Math.min(radius.x, s.cornerSize));
      const degrees = (turn.x * 180) / Math.PI;

      corners.forEach((corner, i) => {
        const [lx, ly] = localCorners[i];
        const x = centerX.x + lx * cos - ly * sin;
        const y = centerY.x + lx * sin + ly * cos;
        corner.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${(CORNER_ANGLES[i] + degrees).toFixed(2)}deg)`;
        corner.style.width = `${s.cornerSize}px`;
        corner.style.height = `${s.cornerSize}px`;
        corner.style.borderWidth = `${s.thickness}px 0 0 ${s.thickness}px`;
        corner.style.borderTopLeftRadius = `${r.toFixed(2)}px`;
      });

      if (dot) {
        const dotScale = 1 - press.x * 0.35;
        dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%) scale(${dotScale.toFixed(3)})`;
        dot.style.width = `${s.dotSize}px`;
        dot.style.height = `${s.dotSize}px`;
      }

      // Color transition from sky blue to burnt copper on target
      const targetColor = locked ? s.cursorColorOnTarget : s.cursorColor;
      root.style.setProperty('--target-cursor-color', targetColor);

      root.style.opacity = Math.max(0, Math.min(1, presence.x)).toFixed(3);

      const resting =
        !pointer.inside &&
        presence.x < 0.002 &&
        Math.abs(presence.v) < 0.002 &&
        Math.abs(lock.x) < 0.002 &&
        Math.abs(press.x) < 0.002;
      const spinning = pointer.inside && !locked && spinSpeed > 0.0001;
      const moving =
        Math.abs(centerX.v) + Math.abs(centerY.v) + Math.abs(halfW.v) + Math.abs(halfH.v) + Math.abs(turn.v) > 0.01 ||
        Math.abs(goalX - centerX.x) + Math.abs(goalY - centerY.x) > 0.05 ||
        Math.abs(lock.v) + Math.abs(press.v) + Math.abs(presence.v) > 0.001;

      if (!resting && (spinning || moving || locked)) {
        raf = requestAnimationFrame(frame);
      } else {
        last = 0;
      }
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onPointerMove = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.inside = true;
      lockOn(findTarget(pointer.x, pointer.y, e.target));
      wake();
    };

    const onPointerDown = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      pointer.pressed = true;
      wake();
    };

    const onPointerUp = () => {
      pointer.pressed = false;
      wake();
    };

    const onLeave = () => {
      pointer.inside = false;
      pointer.pressed = false;
      lockOn(null);
      wake();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('scroll', () => {
      if (pointer.inside) {
        lockOn(findTarget(pointer.x, pointer.y));
        wake();
      }
    }, { passive: true, capture: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);

    wake();

    return {
      destroy: () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointerup', onPointerUp);
        document.documentElement.removeEventListener('pointerleave', onLeave);
        window.removeEventListener('blur', onLeave);
        root.remove();
        cursorStyle.remove();
      },
    };
  }

  global.TargetCursor = { init: initTargetCursor };
})(window);
