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

        // Bind virtual touch buttons
        this.bindTouchButton('ctrlLeft', () => this.engine.movePiece(-1));
        this.bindTouchButton('ctrlRight', () => this.engine.movePiece(1));
        this.bindTouchButton('ctrlDown', () => this.engine.softDrop());
        this.bindTouchButton('ctrlRotate', () => this.engine.rotatePiece(1));
        this.bindTouchButton('ctrlDrop', () => this.engine.hardDrop());
        this.bindTouchButton('ctrlHold', () => this.engine.holdPiece());

        this.attached = true;
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
     * Helper to bind virtual arcade touch buttons
     * @param {string} elementId
     * @param {Function} action
     */
    bindTouchButton(elementId, action) {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            action();
        });
    }
}
