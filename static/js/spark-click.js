/**
 * React Bits Click Spark Animation
 * Source: https://reactbits.dev/animations/click-spark
 * Pure JavaScript Canvas implementation matching the React Bits component specification.
 */

(function (global) {
    'use strict';

    const CONFIG = {
        sparkColor: '#FFFFFF',
        sparkSize: 12,       // length of spark dash
        sparkRadius: 24,     // travel distance outward
        sparkCount: 8,       // number of sparks per click
        duration: 440,       // animation duration in ms
        extraScale: 1.0,
        lineWidth: 2.5
    };

    let canvas = null;
    let ctx = null;
    let dpr = 1;
    let sparks = [];
    let animationId = null;

    function getSparkColor() {
        // Adapt to light mode if active
        const theme = document.documentElement.getAttribute('data-theme');
        if (theme === 'light') {
            return '#111111';
        }
        return CONFIG.sparkColor;
    }

    function initCanvas() {
        if (canvas) return;

        canvas = document.createElement('canvas');
        canvas.id = 'react-bits-click-spark-canvas';
        canvas.style.position = 'fixed';
        canvas.style.inset = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '999999';
        document.body.appendChild(canvas);

        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas, { passive: true });
    }

    function resizeCanvas() {
        if (!canvas || !ctx) return;
        dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.scale(dpr, dpr);
    }

    // Smooth ease-out quad curve
    function easeOutQuad(t) {
        return t * (2 - t);
    }

    function spawnSparks(originX, originY) {
        initCanvas();
        const color = getSparkColor();
        const startTime = performance.now();
        const count = CONFIG.sparkCount;
        const baseAngle = Math.random() * (Math.PI / 4);

        for (let i = 0; i < count; i++) {
            const angle = baseAngle + (i * 2 * Math.PI) / count;
            sparks.push({
                x: originX,
                y: originY,
                angle: angle,
                startTime: startTime,
                duration: CONFIG.duration,
                color: color,
                radius: CONFIG.sparkRadius * CONFIG.extraScale,
                size: CONFIG.sparkSize
            });
        }

        if (!animationId) {
            animationId = requestAnimationFrame(render);
        }
    }

    function render(currentTime) {
        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        const survivingSparks = [];

        for (let i = 0; i < sparks.length; i++) {
            const spark = sparks[i];
            const elapsed = currentTime - spark.startTime;
            const progress = Math.min(elapsed / spark.duration, 1);

            if (progress < 1) {
                const eased = easeOutQuad(progress);
                const currentDistance = spark.radius * eased;
                const currentLength = spark.size * (1 - progress * 0.4);

                const x1 = spark.x + Math.cos(spark.angle) * currentDistance;
                const y1 = spark.y + Math.sin(spark.angle) * currentDistance;
                const x2 = spark.x + Math.cos(spark.angle) * (currentDistance + currentLength);
                const y2 = spark.y + Math.sin(spark.angle) * (currentDistance + currentLength);

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = spark.color;
                ctx.lineWidth = CONFIG.lineWidth;
                ctx.lineCap = 'round';
                ctx.globalAlpha = Math.max(0, 1 - progress);
                ctx.stroke();
                ctx.restore();

                survivingSparks.push(spark);
            }
        }

        sparks = survivingSparks;

        if (sparks.length > 0) {
            animationId = requestAnimationFrame(render);
        } else {
            animationId = null;
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }
    }

    // Attach click listener globally
    window.addEventListener('pointerdown', function (e) {
        if (e.isPrimary) {
            spawnSparks(e.clientX, e.clientY);
        }
    }, { passive: true });

    global.ClickSpark = {
        trigger: spawnSparks,
        config: CONFIG
    };

})(window);
