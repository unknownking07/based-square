// Utility functions for particle simulation

const Utils = {
    // Easing functions
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
    easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    easeOutExpo: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

    // Linear interpolation
    lerp: (start, end, t) => start + (end - start) * t,

    // Clamp value between min and max
    clamp: (value, min, max) => Math.min(Math.max(value, min), max),

    // Distance between two points
    distance: (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),

    // Random float in range
    randomRange: (min, max) => Math.random() * (max - min) + min,

    // Random integer in range
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,

    // Map value from one range to another
    map: (value, inMin, inMax, outMin, outMax) => {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    },

    // Normalize a vector
    normalize: (x, y) => {
        const len = Math.sqrt(x * x + y * y);
        if (len === 0) return { x: 0, y: 0 };
        return { x: x / len, y: y / len };
    },

    // Get centroid of points
    getCentroid: (points) => {
        if (points.length === 0) return { x: 0, y: 0 };
        const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
        return { x: sum.x / points.length, y: sum.y / points.length };
    },

    // Smooth step
    smoothstep: (edge0, edge1, x) => {
        const t = Utils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    },

    // Perlin-like noise (simplified)
    noise2D: (() => {
        const permutation = [];
        for (let i = 0; i < 256; i++) permutation[i] = i;
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
        }
        const p = [...permutation, ...permutation];
        
        const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
        const grad = (hash, x, y) => {
            const h = hash & 3;
            const u = h < 2 ? x : y;
            const v = h < 2 ? y : x;
            return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
        };

        return (x, y) => {
            const X = Math.floor(x) & 255;
            const Y = Math.floor(y) & 255;
            x -= Math.floor(x);
            y -= Math.floor(y);
            const u = fade(x);
            const v = fade(y);
            const A = p[X] + Y, B = p[X + 1] + Y;
            return Utils.lerp(
                Utils.lerp(grad(p[A], x, y), grad(p[B], x - 1, y), u),
                Utils.lerp(grad(p[A + 1], x, y - 1), grad(p[B + 1], x - 1, y - 1), u),
                v
            );
        };
    })(),

    // FPS Counter
    createFPSCounter: () => {
        let frames = 0;
        let lastTime = performance.now();
        let fps = 60;

        return {
            tick: () => {
                frames++;
                const now = performance.now();
                if (now - lastTime >= 1000) {
                    fps = frames;
                    frames = 0;
                    lastTime = now;
                }
            },
            getFPS: () => fps
        };
    }
};

// Export for module usage if needed
if (typeof module !== 'undefined') {
    module.exports = Utils;
}
