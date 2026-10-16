/**
 * Base Abstract Game Mode Strategy
 * Implements Open/Closed Principle & Liskov Substitution Principle.
 */

export class BaseMode {
    /**
     * @param {string} name - Display name
     * @param {string} slug - Short identifier
     */
    constructor(name, slug) {
        if (new.target === BaseMode) {
            throw new TypeError('Cannot construct BaseMode instances directly');
        }
        this.name = name;
        this.slug = slug;
        this.engine = null;
    }

    /**
     * Bind game engine reference
     * @param {Object} engine
     */
    init(engine) {
        this.engine = engine;
    }

    /**
     * Hook called when a piece is created in the PieceBag
     * @param {Piece} piece
     */
    modifyPiece(piece) {
        // Default: no-op
    }

    /**
     * Hook called on line clear
     * @param {number} count
     * @param {boolean} bombTriggered
     * @param {number[]} fullRows
     */
    onLineClear(count, bombTriggered, fullRows) {
        // Default: no-op
    }

    /**
     * Hook called during engine update loop
     * @param {number} deltaTime
     */
    onTick(deltaTime) {
        // Default: no-op
    }

    /**
     * Check if game over condition is met
     * @param {boolean} topCollisionOccurred
     * @returns {{ isGameOver: boolean, isVictory: boolean }}
     */
    checkGameOver(topCollisionOccurred) {
        return {
            isGameOver: topCollisionOccurred,
            isVictory: false
        };
    }

    /**
     * Can overdrive be activated in this mode?
     * @returns {boolean}
     */
    canActivateOverdrive() {
        return false;
    }

    /**
     * Activate overdrive powerup
     * @returns {boolean}
     */
    activateOverdrive() {
        return false;
    }
}
