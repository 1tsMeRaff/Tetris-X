/**
 * InputSystem - Tournament-Grade User Input Handler
 * Features Modern DAS / ARR Engine, Rapid Soft Drop, SOCD Resolution,
 * and Ergonomic Mobile Touch Controller with Anti-Ghosting.
 */

export class InputSystem {
    /**
     * @param {GameEngine} engine
     */
    constructor(engine) {
        this.engine = engine;
        this.attached = false;

        // Keyboard DAS / ARR Configuration (ms)
        this.DAS_DELAY = 130;  // Delayed Auto Shift initial delay
        this.ARR_RATE = 28;    // Auto Repeat Rate
        this.SDF_RATE = 32;    // Soft Drop Factor repeat interval

        // Keyboard state tracking
        this.heldKeys = new Set();
        this.currentHorizontalDir = 0; // -1: Left, 1: Right, 0: None
        this.dasTimer = null;
        this.arrTimer = null;
        this.softDropTimer = null;
        this.hardDropLocked = false;

        this.keydownHandler = this.onKeyDown.bind(this);
        this.keyupHandler = this.onKeyUp.bind(this);
        this.blurHandler = this.onBlur.bind(this);
    }

    /**
     * Attach global keyboard listeners and virtual touch buttons
     */
    attach() {
        if (this.attached || typeof window === 'undefined') return;

        window.addEventListener('keydown', this.keydownHandler);
        window.addEventListener('keyup', this.keyupHandler);
        window.addEventListener('blur', this.blurHandler);

        // Bind virtual mobile touch buttons with precision DAS/ARR
        this.bindTouchButton('ctrlLeft', () => this.engine.movePiece(-1), true, 140, 38, 8);
        this.bindTouchButton('ctrlRight', () => this.engine.movePiece(1), true, 140, 38, 8);
        this.bindTouchButton('ctrlDown', () => this.engine.softDrop(), true, 100, 35, 6);

        // Dual Rotation buttons (CW & CCW)
        this.bindTouchButton('ctrlRotate', () => this.engine.rotatePiece(1), false, 0, 0, 10);
        this.bindTouchButton('ctrlRotateCW', () => this.engine.rotatePiece(1), false, 0, 0, 10);
        this.bindTouchButton('ctrlRotateCCW', () => this.engine.rotatePiece(-1), false, 0, 0, 10);

        // Drop & Hold buttons
        this.bindTouchButton('ctrlDrop', () => this.engine.hardDrop(), false, 0, 0, 18);
        this.bindTouchButton('ctrlHold', () => this.engine.holdPiece(), false, 0, 0, 12);
        this.bindTouchButton('ctrlOverdriveMobile', () => this.engine.activateOverdrive(), false, 0, 0, 14);

        this.attached = true;
    }

    /**
     * Detach keyboard listeners and clear active timers
     */
    detach() {
        if (!this.attached || typeof window === 'undefined') return;

        window.removeEventListener('keydown', this.keydownHandler);
        window.removeEventListener('keyup', this.keyupHandler);
        window.removeEventListener('blur', this.blurHandler);

        this.resetAllTimers();
        this.heldKeys.clear();
        this.attached = false;
    }

    /**
     * Reset all active DAS, ARR, and repeat timers on blur or state change
     */
    resetAllTimers() {
        if (this.dasTimer) clearTimeout(this.dasTimer);
        if (this.arrTimer) clearInterval(this.arrTimer);
        if (this.softDropTimer) clearInterval(this.softDropTimer);
        this.dasTimer = null;
        this.arrTimer = null;
        this.softDropTimer = null;
        this.currentHorizontalDir = 0;
        this.hardDropLocked = false;
    }

    /**
     * Window blur handler: reset all held keys to avoid stuck keys
     */
    onBlur() {
        this.heldKeys.clear();
        this.resetAllTimers();
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
     * Handle Left/Right directional key press with instant shift + DAS + ARR
     * @param {number} dir - (-1 for Left, 1 for Right)
     */
    handleDirectionKeyDown(dir) {
        if (this.currentHorizontalDir === dir) return;

        this.currentHorizontalDir = dir;
        this.clearHorizontalTimers();

        // 1. Immediate instant shift on press
        this.engine.movePiece(dir);
        this.triggerHaptic(5);

        // 2. DAS delay, then rapid ARR repeat
        this.dasTimer = setTimeout(() => {
            this.arrTimer = setInterval(() => {
                if (this.engine.state.running && !this.engine.state.paused) {
                    this.engine.movePiece(this.currentHorizontalDir);
                }
            }, this.ARR_RATE);
        }, this.DAS_DELAY);
    }

    /**
     * Handle Left/Right directional key release with SOCD resolution
     * @param {number} dir
     */
    handleDirectionKeyUp(dir) {
        if (this.currentHorizontalDir !== dir) return;

        this.clearHorizontalTimers();

        // SOCD resolution: If the opposite direction is still held, switch to it immediately
        const oppositeKeyHeld = (dir === -1)
            ? (this.heldKeys.has('ArrowRight') || this.heldKeys.has('KeyD'))
            : (this.heldKeys.has('ArrowLeft') || this.heldKeys.has('KeyA'));

        if (oppositeKeyHeld) {
            this.handleDirectionKeyDown(-dir);
        } else {
            this.currentHorizontalDir = 0;
        }
    }

    /**
     * Clear horizontal DAS and ARR timers
     */
    clearHorizontalTimers() {
        if (this.dasTimer) {
            clearTimeout(this.dasTimer);
            this.dasTimer = null;
        }
        if (this.arrTimer) {
            clearInterval(this.arrTimer);
            this.arrTimer = null;
        }
    }

    /**
     * Handle Soft Drop press: instant drop + rapid repeat
     */
    handleSoftDropKeyDown() {
        if (this.softDropTimer) return;

        this.engine.softDrop();
        this.softDropTimer = setInterval(() => {
            if (this.engine.state.running && !this.engine.state.paused) {
                this.engine.softDrop();
            }
        }, this.SDF_RATE);
    }

    /**
     * Handle Soft Drop release
     */
    handleSoftDropKeyUp() {
        if (this.softDropTimer) {
            clearInterval(this.softDropTimer);
            this.softDropTimer = null;
        }
    }

    /**
     * Keydown dispatcher
     * @param {KeyboardEvent} e
     */
    onKeyDown(e) {
        // Prevent default scrolling for standard game keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            e.preventDefault();
        }

        // Toggle pause
        if (e.code === 'KeyP' || e.code === 'Escape') {
            if (!e.repeat) {
                this.engine.togglePause();
            }
            return;
        }

        this.heldKeys.add(e.code);

        if (!this.engine.state.running || this.engine.state.paused) return;

        switch (e.code) {
            case 'ArrowLeft':
            case 'KeyA':
                this.handleDirectionKeyDown(-1);
                break;

            case 'ArrowRight':
            case 'KeyD':
                this.handleDirectionKeyDown(1);
                break;

            case 'ArrowDown':
            case 'KeyS':
                this.handleSoftDropKeyDown();
                break;

            case 'ArrowUp':
            case 'KeyW':
            case 'KeyX':
                // Rotate CW (no auto-repeat to prevent spinning out)
                if (!e.repeat) {
                    this.engine.rotatePiece(1);
                }
                break;

            case 'KeyZ':
                // Rotate CCW (no auto-repeat)
                if (!e.repeat) {
                    this.engine.rotatePiece(-1);
                }
                break;

            case 'Space':
                // Hard drop with debounce lock
                if (!this.hardDropLocked) {
                    this.hardDropLocked = true;
                    this.engine.hardDrop();
                }
                break;

            case 'KeyC':
            case 'ShiftLeft':
            case 'ShiftRight':
                if (!e.repeat) {
                    this.engine.holdPiece();
                }
                break;

            case 'KeyE':
                if (!e.repeat) {
                    this.engine.activateOverdrive();
                }
                break;
        }
    }

    /**
     * Keyup dispatcher
     * @param {KeyboardEvent} e
     */
    onKeyUp(e) {
        this.heldKeys.delete(e.code);

        switch (e.code) {
            case 'ArrowLeft':
            case 'KeyA':
                // Only release left if neither left key is held
                if (!this.heldKeys.has('ArrowLeft') && !this.heldKeys.has('KeyA')) {
                    this.handleDirectionKeyUp(-1);
                }
                break;

            case 'ArrowRight':
            case 'KeyD':
                // Only release right if neither right key is held
                if (!this.heldKeys.has('ArrowRight') && !this.heldKeys.has('KeyD')) {
                    this.handleDirectionKeyUp(1);
                }
                break;

            case 'ArrowDown':
            case 'KeyS':
                if (!this.heldKeys.has('ArrowDown') && !this.heldKeys.has('KeyS')) {
                    this.handleSoftDropKeyUp();
                }
                break;

            case 'Space':
                this.hardDropLocked = false;
                break;
        }
    }

    /**
     * Bind virtual arcade touch buttons with PointerEvents, DAS/ARR, and Haptics
     * @param {string} elementId
     * @param {Function} action
     * @param {boolean} repeat
     * @param {number} dasDelay
     * @param {number} arrRate
     * @param {number} hapticDuration
     */
    bindTouchButton(elementId, action, repeat = false, dasDelay = 140, arrRate = 35, hapticDuration = 8) {
        const el = document.getElementById(elementId);
        if (!el) return;

        let dasTimeout = null;
        let arrInterval = null;

        const stopRepeat = (e) => {
            if (dasTimeout) clearTimeout(dasTimeout);
            if (arrInterval) clearInterval(arrInterval);
            dasTimeout = null;
            arrInterval = null;

            if (e && el.hasPointerCapture && el.hasPointerCapture(e.pointerId)) {
                try {
                    el.releasePointerCapture(e.pointerId);
                } catch (err) {}
            }
        };

        el.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (el.setPointerCapture) {
                try {
                    el.setPointerCapture(e.pointerId);
                } catch (err) {}
            }

            this.triggerHaptic(hapticDuration);
            action();

            if (repeat) {
                stopRepeat();
                dasTimeout = setTimeout(() => {
                    arrInterval = setInterval(() => {
                        if (this.engine.state.running && !this.engine.state.paused) {
                            this.triggerHaptic(4);
                            action();
                        }
                    }, arrRate);
                }, dasDelay);
            }
        });

        el.addEventListener('pointerup', stopRepeat);
        el.addEventListener('pointercancel', stopRepeat);
        el.addEventListener('pointerleave', stopRepeat);
    }
}
