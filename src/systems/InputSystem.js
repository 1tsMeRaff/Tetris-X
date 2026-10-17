/**
 * InputSystem - Centralized User Input Handler
 * Dispatches commands to the GameEngine via Keyboard and Virtual Touch Controllers.
 */

export class InputSystem {
    /**
     * @param {GameEngine} engine
     */
    constructor(engine) {
        this.engine = engine;
        this.attached = false;
        this.keydownHandler = this.onKeyDown.bind(this);
    }

    /**
     * Attach global keyboard listeners and virtual touch buttons
     */
    attach() {
        if (this.attached || typeof window === 'undefined') return;

        window.addEventListener('keydown', this.keydownHandler);

        // Bind virtual touch buttons with auto-repeat for directional keys
        this.bindTouchButton('ctrlLeft', () => this.engine.movePiece(-1), true);
        this.bindTouchButton('ctrlRight', () => this.engine.movePiece(1), true);
        this.bindTouchButton('ctrlDown', () => this.engine.softDrop(), true);
        this.bindTouchButton('ctrlRotate', () => this.engine.rotatePiece(1), false, 12);
        this.bindTouchButton('ctrlDrop', () => this.engine.hardDrop(), false, 18);
        this.bindTouchButton('ctrlHold', () => this.engine.holdPiece(), false, 12);

        // Bind direct canvas swipe gestures
        this.bindCanvasGestures();

        this.attached = true;
    }

    /**
     * Trigger light haptic vibration on mobile devices
     * @param {number} duration
     */
    triggerHaptic(duration = 10) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
                navigator.vibrate(duration);
            } catch (e) {
                // Ignore vibration policy rejections
            }
        }
    }

    /**
     * Detach keyboard listeners
     */
    detach() {
        if (!this.attached || typeof window === 'undefined') return;
        window.removeEventListener('keydown', this.keydownHandler);
        this.attached = false;
    }

    /**
     * Keydown dispatcher
     * @param {KeyboardEvent} e
     */
    onKeyDown(e) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            e.preventDefault();
        }

        if (e.code === 'KeyP' || e.code === 'Escape') {
            this.engine.togglePause();
            return;
        }

        if (!this.engine.state.running || this.engine.state.paused) return;

        switch (e.code) {
            case 'ArrowLeft':
            case 'KeyA':
                this.engine.movePiece(-1);
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.engine.movePiece(1);
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.engine.softDrop();
                break;
            case 'ArrowUp':
            case 'KeyW':
            case 'KeyX':
                this.engine.rotatePiece(1);
                break;
            case 'KeyZ':
                this.engine.rotatePiece(-1);
                break;
            case 'Space':
                this.engine.hardDrop();
                break;
            case 'KeyC':
            case 'ShiftLeft':
            case 'ShiftRight':
                this.engine.holdPiece();
                break;
            case 'KeyE':
                this.engine.activateOverdrive();
                break;
        }
    }

    /**
     * Helper to bind virtual arcade touch buttons with Auto-Repeat (DAS/ARR)
     * @param {string} elementId
     * @param {Function} action
     * @param {boolean} repeat
     * @param {number} hapticDuration
     */
    bindTouchButton(elementId, action, repeat = false, hapticDuration = 8) {
        const el = document.getElementById(elementId);
        if (!el) return;

        let dasTimeout = null;
        let arrInterval = null;

        const stopRepeat = () => {
            if (dasTimeout) clearTimeout(dasTimeout);
            if (arrInterval) clearInterval(arrInterval);
            dasTimeout = null;
            arrInterval = null;
        };

        el.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.triggerHaptic(hapticDuration);
            action();

            if (repeat) {
                stopRepeat();
                dasTimeout = setTimeout(() => {
                    arrInterval = setInterval(() => {
                        this.triggerHaptic(5);
                        action();
                    }, 50);
                }, 160);
            }
        });

        el.addEventListener('pointerup', stopRepeat);
        el.addEventListener('pointercancel', stopRepeat);
        el.addEventListener('pointerleave', stopRepeat);
    }

    /**
     * Bind direct canvas swipe & tap gestures
     */
    bindCanvasGestures() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;

        let startX = 0;
        let startY = 0;
        let lastMoveX = 0;
        let startTime = 0;
        let isHorizontalSwipe = false;

        canvas.addEventListener('touchstart', (e) => {
            if (!this.engine.state.running || this.engine.state.paused) return;
            if (e.touches.length === 1) {
                const t = e.touches[0];
                startX = t.clientX;
                startY = t.clientY;
                lastMoveX = t.clientX;
                startTime = performance.now();
                isHorizontalSwipe = false;
            }
        }, { passive: true });

        canvas.addEventListener('touchmove', (e) => {
            if (!this.engine.state.running || this.engine.state.paused) return;
            if (e.touches.length !== 1) return;
            const t = e.touches[0];
            const diffX = t.clientX - lastMoveX;
            const stepThreshold = 26; // pixels per column shift

            if (Math.abs(diffX) >= stepThreshold) {
                const dir = diffX > 0 ? 1 : -1;
                this.engine.movePiece(dir);
                this.triggerHaptic(6);
                lastMoveX = t.clientX;
                isHorizontalSwipe = true;
            }

            const diffY = t.clientY - startY;
            if (diffY > 40 && !isHorizontalSwipe) {
                this.engine.softDrop();
                this.triggerHaptic(5);
                startY = t.clientY;
            }
        }, { passive: true });

        canvas.addEventListener('touchend', (e) => {
            if (!this.engine.state.running || this.engine.state.paused) return;
            const elapsed = performance.now() - startTime;
            if (e.changedTouches.length === 1) {
                const t = e.changedTouches[0];
                const totalDiffX = t.clientX - startX;
                const totalDiffY = t.clientY - startY;
                const distance = Math.hypot(totalDiffX, totalDiffY);

                // Quick tap -> Rotate CW
                if (distance < 15 && elapsed < 250) {
                    this.engine.rotatePiece(1);
                    this.triggerHaptic(10);
                }
                // Flick Down -> Hard Drop
                else if (totalDiffY > 60 && Math.abs(totalDiffX) < 45 && elapsed < 240) {
                    this.engine.hardDrop();
                    this.triggerHaptic(16);
                }
                // Flick Up -> Hold Piece
                else if (totalDiffY < -50 && Math.abs(totalDiffX) < 45 && elapsed < 300) {
                    this.engine.holdPiece();
                    this.triggerHaptic(12);
                }
            }
        }, { passive: true });
    }
}
