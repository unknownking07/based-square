// Camera and MediaPipe Hand Tracking

const CameraModule = {
    // Elements
    video: null,
    overlay: null,

    // MediaPipe
    hands: null,
    camera: null,

    // State
    isInitialized: false,
    handsDetected: false,
    currentHands: [],

    // Callbacks
    onHandsUpdate: null,
    onStatusChange: null,

    // Initialize the camera module
    async init() {
        this.video = document.getElementById('camera-video');
        this.overlay = document.getElementById('hand-overlay');

        if (!this.video || !this.overlay) {
            console.error('Camera elements not found');
            return false;
        }

        // Initialize MediaPipe Hands
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.3
        });

        this.hands.onResults((results) => this.onResults(results));

        return true;
    },

    // Start camera capture
    async start() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });

            this.video.srcObject = stream;

            await new Promise((resolve) => {
                this.video.onloadedmetadata = resolve;
            });

            // Set up overlay canvas dimensions
            this.overlay.width = this.video.videoWidth;
            this.overlay.height = this.video.videoHeight;

            // Start MediaPipe camera
            this.camera = new Camera(this.video, {
                onFrame: async () => {
                    await this.hands.send({ image: this.video });
                },
                width: 640,
                height: 480
            });

            await this.camera.start();
            this.isInitialized = true;

            if (this.onStatusChange) {
                this.onStatusChange('initialized');
            }

            return true;
        } catch (error) {
            console.error('Camera access error:', error);
            if (this.onStatusChange) {
                this.onStatusChange('error', error.message);
            }
            return false;
        }
    },

    // Handle MediaPipe results
    onResults(results) {
        const ctx = this.overlay.getContext('2d');
        ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);

        this.currentHands = [];
        this.handsDetected = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;

        if (this.handsDetected) {
            // Process each hand
            for (const landmarks of results.multiHandLandmarks) {
                // Store landmarks for particle system (mirror the x coordinate)
                const mirroredLandmarks = landmarks.map(lm => ({
                    x: 1 - lm.x,  // Mirror for natural interaction
                    y: lm.y,
                    z: lm.z
                }));

                this.currentHands.push({ landmarks: mirroredLandmarks });

                // Draw hand skeleton on overlay
                this.drawHand(ctx, landmarks);
            }
        }

        // Call update callback
        if (this.onHandsUpdate) {
            this.onHandsUpdate(this.currentHands, this.handsDetected);
        }
    },

    // Draw hand skeleton with glowing effect
    drawHand(ctx, landmarks) {
        const w = this.overlay.width;
        const h = this.overlay.height;

        // Hand connections
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8],       // Index
            [0, 9], [9, 10], [10, 11], [11, 12], // Middle
            [0, 13], [13, 14], [14, 15], [15, 16], // Ring
            [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
            [5, 9], [9, 13], [13, 17]              // Palm
        ];

        // Draw connections with glow
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 10;

        for (const [i, j] of connections) {
            const start = landmarks[i];
            const end = landmarks[j];

            ctx.beginPath();
            ctx.moveTo(start.x * w, start.y * h);
            ctx.lineTo(end.x * w, end.y * h);
            ctx.stroke();
        }

        // Draw joints with bright glow
        ctx.fillStyle = '#00d4ff';
        ctx.shadowBlur = 15;

        for (const lm of landmarks) {
            ctx.beginPath();
            ctx.arc(lm.x * w, lm.y * h, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.shadowBlur = 0;
    },

    // Get current hands data
    getHands() {
        return this.currentHands;
    },

    // Get hand landmarks in format for particle system
    getLandmarksArray() {
        return this.currentHands.map(hand => hand.landmarks);
    },

    // Check if hands are detected
    hasHands() {
        return this.handsDetected;
    }
};

// Export
if (typeof module !== 'undefined') {
    module.exports = CameraModule;
}
