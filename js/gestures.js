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

    // Scatter detection (second hand open)
    lastHandDistance: Infinity,
    clapDetected: false,
    clapCooldown: 0,
    clapPoint: { x: 0, y: 0 },    // Where the scatter occurred
    twoHandsPresent: false,
    secondHandOpen: false,        // Track if second hand is open

    // Initialize
    init() {
        this.state = this.STATES.IDLE;
        this.transitionProgress = 0;
        this.pinchHistory = [];
        this.clapDetected = false;
        this.clapCooldown = 0;
        this.secondHandOpen = false;
    },

    // Calculate palm center from landmarks
    getPalmCenter(landmarks, canvasWidth, canvasHeight) {
        // Use wrist (0) and middle finger base (9) to estimate palm center
        const wrist = landmarks[0];
        const middleBase = landmarks[9];
        return {
            x: ((wrist.x + middleBase.x) / 2) * canvasWidth,
            y: ((wrist.y + middleBase.y) / 2) * canvasHeight
        };
    },

    // Check if hand has spread fingers (open palm)
    isHandOpen(landmarks, canvasWidth, canvasHeight) {
        // Fingertip landmarks: thumb=4, index=8, middle=12, ring=16, pinky=20
        // Base landmarks: index=5, middle=9, ring=13, pinky=17
        const fingertips = [8, 12, 16, 20]; // excluding thumb for simplicity
        const bases = [5, 9, 13, 17];

        let extendedCount = 0;

        for (let i = 0; i < fingertips.length; i++) {
            const tip = landmarks[fingertips[i]];
            const base = landmarks[bases[i]];

            // Finger is extended if tip is further from wrist than base
            const wrist = landmarks[0];
            const tipDist = Utils.distance(tip.x, tip.y, wrist.x, wrist.y);
            const baseDist = Utils.distance(base.x, base.y, wrist.x, wrist.y);

            if (tipDist > baseDist * 1.2) { // Tip at least 20% further than base
                extendedCount++;
            }
        }

        // Hand is open if at least 3 fingers are extended
        return extendedCount >= 3;
    },

    // Update with new hand data
    update(hands, canvasWidth, canvasHeight) {
        // Update cooldowns
        if (this.clapCooldown > 0) {
            this.clapCooldown -= 0.016;
        }

        // Reset clap detected each frame (it's a one-frame event)
        this.clapDetected = false;

        // Check for two-hand gesture (second hand open triggers scatter)
        this.twoHandsPresent = hands && hands.length >= 2;

        if (this.twoHandsPresent && this.clapCooldown <= 0) {
            const hand2 = hands[1]; // Second hand

            if (hand2.landmarks && hand2.landmarks.length >= 21) {
                const isOpen = this.isHandOpen(hand2.landmarks, canvasWidth, canvasHeight);

                // Trigger scatter when second hand becomes open (transition from closed to open)
                if (isOpen && !this.secondHandOpen) {
                    this.clapDetected = true;
                    this.clapCooldown = 0.5; // 500ms cooldown
                    this.clapPoint = this.getPalmCenter(hand2.landmarks, canvasWidth, canvasHeight);
                }

                this.secondHandOpen = isOpen;
            }
        } else if (!this.twoHandsPresent) {
            this.secondHandOpen = false;
        }

        // Original single-hand pinch logic
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
            isHandPresent: this.isHandPresent,
            // Clap state
            clapDetected: this.clapDetected,
            clapPoint: this.clapPoint,
            twoHandsPresent: this.twoHandsPresent
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
