// Gesture detection for single hand pinch control - More responsive

const GestureDetector = {
    // Gesture states
    STATES: {
        IDLE: 'idle',
        PINCHING: 'pinching',
        CUBE_FORMED: 'cube_formed',
        RELEASING: 'releasing'
    },

    // Current state
    state: 'idle',

    // Transition progress (0 to 1)
    transitionProgress: 0,

    // History for smoothing
    pinchHistory: [],
    historySize: 5,  // Reduced for faster response

    // Thresholds (more generous for normal distance)
    pinchThreshold: 0.25,     // Distance ratio to trigger (larger = works closer to camera)
    releaseThreshold: 0.4,    // Distance ratio to release

    // Hand data
    pinchDistance: 0,
    handScale: 1,
    isHandPresent: false,

    // Initialize
    init() {
        this.state = this.STATES.IDLE;
        this.transitionProgress = 0;
        this.pinchHistory = [];
    },

    // Update with new hand data
    update(hands, canvasWidth, canvasHeight) {
        if (!hands || hands.length === 0) {
            this.isHandPresent = false;
            // Slowly fade out when hand disappears
            this.transitionProgress = Math.max(0, this.transitionProgress - 0.02);

            if (this.transitionProgress === 0 && this.state !== this.STATES.IDLE) {
                this.state = this.STATES.IDLE;
            }
            return;
        }

        this.isHandPresent = true;
        const hand = hands[0];
        if (!hand.landmarks || hand.landmarks.length < 21) return;

        const landmarks = hand.landmarks;

        // Key landmarks for pinch detection
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const wrist = landmarks[0];
        const middleBase = landmarks[9];

        // Calculate hand scale (wrist to middle finger base)
        this.handScale = Utils.distance(
            wrist.x * canvasWidth,
            wrist.y * canvasHeight,
            middleBase.x * canvasWidth,
            middleBase.y * canvasHeight
        );

        // Calculate pinch distance (thumb to index)
        const rawPinchDistance = Utils.distance(
            thumbTip.x * canvasWidth,
            thumbTip.y * canvasHeight,
            indexTip.x * canvasWidth,
            indexTip.y * canvasHeight
        );

        // Normalize by hand scale
        this.pinchDistance = rawPinchDistance / Math.max(this.handScale, 50);

        // Smooth the pinch distance
        this.pinchHistory.push(this.pinchDistance);
        if (this.pinchHistory.length > this.historySize) {
            this.pinchHistory.shift();
        }
        const smoothedPinch = this.pinchHistory.reduce((a, b) => a + b, 0) / this.pinchHistory.length;

        // State machine with faster transitions
        const isPinching = smoothedPinch < this.pinchThreshold;
        const isOpen = smoothedPinch > this.releaseThreshold;

        switch (this.state) {
            case this.STATES.IDLE:
                if (isPinching) {
                    this.state = this.STATES.PINCHING;
                }
                break;

            case this.STATES.PINCHING:
                // Fast progress when pinching
                if (isPinching) {
                    this.transitionProgress = Math.min(1, this.transitionProgress + 0.08);
                } else {
                    this.transitionProgress = Math.max(0, this.transitionProgress - 0.03);
                }

                if (this.transitionProgress >= 1) {
                    this.state = this.STATES.CUBE_FORMED;
                } else if (isOpen && this.transitionProgress < 0.3) {
                    this.state = this.STATES.IDLE;
                    this.transitionProgress = 0;
                }
                break;

            case this.STATES.CUBE_FORMED:
                this.transitionProgress = 1;
                if (isOpen) {
                    this.state = this.STATES.RELEASING;
                }
                break;

            case this.STATES.RELEASING:
                // Fast dissolve when releasing
                this.transitionProgress = Math.max(0, this.transitionProgress - 0.05);

                if (this.transitionProgress <= 0) {
                    this.state = this.STATES.IDLE;
                } else if (isPinching) {
                    this.state = this.STATES.PINCHING;
                }
                break;
        }
    },

    // Get current state info
    getState() {
        return {
            state: this.state,
            progress: this.transitionProgress,
            isForming: this.state === this.STATES.PINCHING || this.state === this.STATES.CUBE_FORMED,
            isSquare: this.state === this.STATES.CUBE_FORMED,
            isCube: this.state === this.STATES.CUBE_FORMED,
            pinchDistance: this.pinchDistance,
            isHandPresent: this.isHandPresent
        };
    },

    // Get eased transition progress
    getEasedProgress() {
        return Utils.easeOutExpo(this.transitionProgress);
    }
};

// Export
if (typeof module !== 'undefined') {
    module.exports = GestureDetector;
}
