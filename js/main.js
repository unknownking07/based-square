// Main application controller

const App = {
    // State
    state: 'intro',  // intro, loading, active
    fpsCounter: null,
    animationId: null,

    // Elements
    introScreen: null,
    enableBtn: null,
    cameraContainer: null,
    statusIndicator: null,
    statusText: null,
    particleCanvas: null,

    // Initialize application
    init() {
        // Get DOM elements
        this.introScreen = document.getElementById('intro-screen');
        this.enableBtn = document.getElementById('enable-camera-btn');
        this.cameraContainer = document.getElementById('camera-container');
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');
        this.particleCanvas = document.getElementById('particle-canvas');

        // Set up FPS counter
        this.fpsCounter = Utils.createFPSCounter();

        // Initialize particle system
        if (!ParticleSystem.init(this.particleCanvas)) {
            this.setStatus('WebGL not supported');
            return;
        }

        // Initialize gesture detector
        GestureDetector.init();

        // Set up event listeners
        this.enableBtn.addEventListener('click', () => this.enableCamera());
        window.addEventListener('resize', () => this.handleResize());

        // Set up camera callbacks
        CameraModule.onHandsUpdate = (hands, detected) => this.onHandsUpdate(hands, detected);
        CameraModule.onStatusChange = (status, message) => this.onCameraStatus(status, message);

        // Start render loop (even before camera - shows particles)
        this.startRenderLoop();
    },

    // Handle camera enable button click
    async enableCamera() {
        this.state = 'loading';
        this.setStatus('Initializing camera...');
        this.enableBtn.disabled = true;
        this.enableBtn.textContent = 'Starting...';

        // Initialize camera module
        const initialized = await CameraModule.init();
        if (!initialized) {
            this.setStatus('Failed to initialize camera module');
            return;
        }

        // Start camera
        const started = await CameraModule.start();
        if (!started) {
            this.setStatus('Camera access denied');
            return;
        }

        // Transition to active state
        this.state = 'active';
        this.introScreen.classList.add('hidden');
        this.cameraContainer.classList.remove('hidden');
        this.statusIndicator.classList.remove('hidden');
        this.setStatus('Waiting for hands...');
    },

    // Handle hands update from camera
    onHandsUpdate(hands, detected) {
        // Update particle system with hand landmarks
        ParticleSystem.setHandLandmarks(CameraModule.getLandmarksArray());

        // Update gesture detector
        GestureDetector.update(hands, this.particleCanvas.width, this.particleCanvas.height);

        // Update status
        const gestureState = GestureDetector.getState();

        if (!detected) {
            this.setStatus('Show your hand to begin...');
            this.statusIndicator.className = 'status-indicator';
        } else if (gestureState.isSquare) {
            this.setStatus('Cube formed! Open hand to dissolve');
            this.statusIndicator.className = 'status-indicator forming';
        } else if (gestureState.isForming) {
            this.setStatus('Forming cube... Hold pinch');
            this.statusIndicator.className = 'status-indicator forming';
        } else {
            this.setStatus('Hand detected — Pinch to form cube');
            this.statusIndicator.className = 'status-indicator hands-detected';
        }
    },

    // Handle camera status changes
    onCameraStatus(status, message) {
        if (status === 'error') {
            this.setStatus(`Error: ${message}`);
        }
    },

    // Set status text
    setStatus(text) {
        if (this.statusText) {
            this.statusText.textContent = text;
        }
    },

    // Handle window resize
    handleResize() {
        ParticleSystem.resize();
    },

    // Main render loop
    startRenderLoop() {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);

            // Get gesture state
            const gestureState = GestureDetector.getState();

            // Update and render particles
            ParticleSystem.update(gestureState);
            ParticleSystem.render(gestureState);

            // Update FPS counter
            this.fpsCounter.tick();
        };

        animate();
    },

    // Stop render loop
    stopRenderLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
