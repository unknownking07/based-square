// WebGL Particle System - Dense Cube Formation

const ParticleSystem = {
    // Configuration
    config: {
        particleCount: 12000,
        baseSize: 2.5,
        maxSpeed: 15,
        damping: 0.92,
        attractionStrength: 0.4,
        noiseStrength: 0.2,
        trailAlpha: 0.12,
        cubeSize: 0.28,       // Percentage of min dimension - smaller = denser
        gridNoise: 1.5,       // Less noise for tighter formation
        formationSpeed: 0.15, // How fast particles rush to cube
    },

    // State
    canvas: null,
    gl: null,
    particles: [],
    cubePositions: [],
    handLandmarks: [],
    time: 0,
    handCenter: { x: 0, y: 0 },

    // WebGL resources
    program: null,
    positionBuffer: null,
    alphaBuffer: null,

    // Shaders
    vertexShaderSource: `
        attribute vec2 a_position;
        attribute float a_alpha;
        uniform vec2 u_resolution;
        uniform float u_pointSize;
        varying float v_alpha;
        
        void main() {
            vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
            gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
            gl_PointSize = u_pointSize;
            v_alpha = a_alpha;
        }
    `,

    fragmentShaderSource: `
        precision mediump float;
        varying float v_alpha;
        uniform vec3 u_color;
        uniform float u_glowIntensity;
        
        void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            
            // Soft circular falloff with stronger core
            float alpha = smoothstep(0.5, 0.1, dist);
            alpha *= v_alpha;
            
            // Enhanced glow effect
            vec3 glowColor = u_color * (1.0 + u_glowIntensity * 0.5);
            
            gl_FragColor = vec4(glowColor * alpha, alpha);
        }
    `,

    // Initialize the particle system
    init(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl', {
            alpha: true,
            premultipliedAlpha: false,
            antialias: true
        });

        if (!this.gl) {
            console.error('WebGL not supported');
            return false;
        }

        this.resize();
        this.initShaders();
        this.initParticles();
        this.calculateCubePositions();

        // Enable blending for glow effect
        const gl = this.gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Additive blending

        return true;
    },

    // Create and compile shaders
    initShaders() {
        const gl = this.gl;

        const vertexShader = this.compileShader(gl.VERTEX_SHADER, this.vertexShaderSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Shader program failed to link:', gl.getProgramInfoLog(this.program));
            return;
        }

        gl.useProgram(this.program);

        // Get attribute and uniform locations
        this.locations = {
            position: gl.getAttribLocation(this.program, 'a_position'),
            alpha: gl.getAttribLocation(this.program, 'a_alpha'),
            resolution: gl.getUniformLocation(this.program, 'u_resolution'),
            pointSize: gl.getUniformLocation(this.program, 'u_pointSize'),
            color: gl.getUniformLocation(this.program, 'u_color'),
            glowIntensity: gl.getUniformLocation(this.program, 'u_glowIntensity')
        };

        // Create buffers
        this.positionBuffer = gl.createBuffer();
        this.alphaBuffer = gl.createBuffer();
    },

    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    },

    // Initialize particles scattered across screen
    initParticles() {
        const { particleCount } = this.config;
        this.particles = [];

        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: Utils.randomRange(-2, 2),
                vy: Utils.randomRange(-2, 2),
                targetX: 0,
                targetY: 0,
                alpha: Utils.randomRange(0.4, 1),
                baseAlpha: Utils.randomRange(0.4, 1),
                noiseOffset: Math.random() * 1000,
                // For staggered animation
                delay: Math.random() * 0.3
            });
        }
    },

    // Calculate dense grid positions for cube formation
    calculateCubePositions() {
        const { particleCount, cubeSize, gridNoise } = this.config;
        const minDim = Math.min(this.canvas.width, this.canvas.height);
        const size = minDim * cubeSize;

        // Calculate grid dimensions for a square
        const gridSize = Math.ceil(Math.sqrt(particleCount));
        const spacing = size / gridSize;

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const startX = centerX - size / 2;
        const startY = centerY - size / 2;

        this.cubePositions = [];

        for (let i = 0; i < particleCount; i++) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;

            // Add slight noise for organic feel but keep tight
            this.cubePositions.push({
                x: startX + col * spacing + spacing / 2 + Utils.randomRange(-gridNoise, gridNoise),
                y: startY + row * spacing + spacing / 2 + Utils.randomRange(-gridNoise, gridNoise)
            });
        }
    },

    // Resize canvas and recalculate
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        if (this.gl) {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }

        if (this.particles.length > 0) {
            this.calculateCubePositions();
        }
    },

    // Update hand landmarks
    setHandLandmarks(landmarks) {
        this.handLandmarks = landmarks || [];

        // Calculate hand center for attraction
        if (this.handLandmarks.length > 0 && this.handLandmarks[0].length > 0) {
            let sumX = 0, sumY = 0, count = 0;
            for (const hand of this.handLandmarks) {
                for (const lm of hand) {
                    sumX += lm.x * this.canvas.width;
                    sumY += lm.y * this.canvas.height;
                    count++;
                }
            }
            this.handCenter = { x: sumX / count, y: sumY / count };
        }
    },

    // Update particle physics
    update(gestureState) {
        this.time += 0.016;
        const { damping, attractionStrength, noiseStrength, maxSpeed, formationSpeed } = this.config;

        const formProgress = gestureState ? gestureState.progress : 0;
        const easedProgress = Utils.easeOutExpo(formProgress); // Faster easing for snappy response

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const cube = this.cubePositions[i];

            // Calculate delayed progress for staggered animation
            const delayedProgress = Utils.clamp((formProgress - p.delay) / (1 - p.delay), 0, 1);
            const easedDelayedProgress = Utils.easeOutExpo(delayedProgress);

            if (formProgress > 0.01) {
                // CUBE FORMATION MODE
                const targetX = cube.x + Math.sin(this.time * 3 + p.noiseOffset) * (2 * (1 - easedDelayedProgress));
                const targetY = cube.y + Math.cos(this.time * 3 + p.noiseOffset) * (2 * (1 - easedDelayedProgress));

                // Strong magnetic pull toward cube position
                const dx = targetX - p.x;
                const dy = targetY - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Accelerate toward target with easing
                const pullStrength = formationSpeed * (1 + easedDelayedProgress * 2);
                p.vx += dx * pullStrength;
                p.vy += dy * pullStrength;

                // Stronger damping when close to target for snappy stop
                const proximityDamping = dist < 50 ? 0.85 : damping;
                p.vx *= proximityDamping;
                p.vy *= proximityDamping;

                // Increase brightness during formation
                p.alpha = Utils.lerp(p.baseAlpha, 1.2, easedDelayedProgress);
            } else {
                // FREE FLOWING MODE - attract to hand
                if (this.handLandmarks.length > 0) {
                    const dx = this.handCenter.x - p.x;
                    const dy = this.handCenter.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > 20 && dist < 400) {
                        // Magnetic attraction with falloff
                        const force = attractionStrength * 150 / (dist + 30);
                        p.vx += (dx / dist) * force;
                        p.vy += (dy / dist) * force;
                    }
                }

                // Organic noise movement
                const noiseX = Utils.noise2D(p.x * 0.003 + this.time * 0.3, p.noiseOffset);
                const noiseY = Utils.noise2D(p.y * 0.003 + this.time * 0.3, p.noiseOffset + 100);

                p.vx += noiseX * noiseStrength;
                p.vy += noiseY * noiseStrength;

                // Apply standard damping
                p.vx *= damping;
                p.vy *= damping;

                // Fade back to base alpha
                p.alpha = Utils.lerp(p.alpha, p.baseAlpha, 0.05);
            }

            // Clamp velocity
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > maxSpeed) {
                p.vx = (p.vx / speed) * maxSpeed;
                p.vy = (p.vy / speed) * maxSpeed;
            }

            // Update position
            p.x += p.vx;
            p.y += p.vy;

            // Wrap around edges (only when not forming)
            if (formProgress < 0.3) {
                if (p.x < -50) p.x = this.canvas.width + 50;
                if (p.x > this.canvas.width + 50) p.x = -50;
                if (p.y < -50) p.y = this.canvas.height + 50;
                if (p.y > this.canvas.height + 50) p.y = -50;
            }
        }
    },

    // Render particles
    render(gestureState) {
        const gl = this.gl;
        const formProgress = gestureState ? gestureState.progress : 0;

        // Clear with trail effect
        gl.clearColor(0, 0, 0, this.config.trailAlpha);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Prepare position data
        const positions = new Float32Array(this.particles.length * 2);
        const alphas = new Float32Array(this.particles.length);

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            positions[i * 2] = p.x;
            positions[i * 2 + 1] = p.y;
            alphas[i] = Math.min(p.alpha, 1.5); // Allow slight over-brightness
        }

        // Update position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(this.locations.position);
        gl.vertexAttribPointer(this.locations.position, 2, gl.FLOAT, false, 0, 0);

        // Update alpha buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.alphaBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, alphas, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(this.locations.alpha);
        gl.vertexAttribPointer(this.locations.alpha, 1, gl.FLOAT, false, 0, 0);

        // Set uniforms
        gl.uniform2f(this.locations.resolution, this.canvas.width, this.canvas.height);

        // Particle size increases during formation for denser look
        const size = this.config.baseSize + formProgress * 1.5;
        gl.uniform1f(this.locations.pointSize, size);

        // Vibrant electric blue color - brighter during formation
        const intensity = 0.9 + formProgress * 0.3;
        gl.uniform3f(this.locations.color, 0.0 * intensity, 0.2 * intensity, 1.0 * intensity);
        gl.uniform1f(this.locations.glowIntensity, formProgress);

        // Draw particles
        gl.drawArrays(gl.POINTS, 0, this.particles.length);
    }
};

// Export
if (typeof module !== 'undefined') {
    module.exports = ParticleSystem;
}
