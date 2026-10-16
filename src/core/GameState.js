/**
 * GameState Domain Model
 * Clean encapsulation of game metrics, drop intervals, and active state flags.
 */

import { TIMINGS } from '../config/constants.js';

export class GameState {
    constructor() {
        this.reset();
    }

    /**
     * Reset all state properties for a fresh game
     * @param {string} mode - 'arcade' | 'sprint' | 'zen'
     * @param {number} highScore
     */
    reset(mode = 'arcade', highScore = 0) {
        this.mode = mode;
        this.score = 0;
        this.highScore = highScore;
        this.lines = 0;
        this.level = 1;
        this.combo = -1;
        this.overdrive = 0;
        this.frenzyTimer = 0;
        this.dropCounter = 0;
        this.dropInterval = mode === 'zen' ? TIMINGS.ZEN_DROP_INTERVAL : TIMINGS.INITIAL_DROP_INTERVAL;
        this.running = false;
        this.paused = false;
        this.canHold = true;
        this.startTime = 0;
        this.elapsedSeconds = 0;
        this.currentPiece = null;
        this.holdPiece = null;
    }

    /**
     * Add score points, considering level and frenzy multiplier
     * @param {number} basePoints
     * @returns {number} Actual points added
     */
    addScore(basePoints) {
        const frenzyMult = this.frenzyTimer > 0 ? 2 : 1;
        const total = basePoints * this.level * frenzyMult;
        this.score += total;
        if (this.score > this.highScore) {
            this.highScore = this.score;
        }
        return total;
    }

    /**
     * Add raw points (e.g. from soft drop or hard drop)
     * @param {number} points
     */
    addRawScore(points) {
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
        }
    }

    /**
     * Charge overdrive capacitor (0 - 100%)
     * @param {number} amount
     */
    chargeOverdrive(amount) {
        this.overdrive = Math.min(100, Math.max(0, this.overdrive + amount));
    }

    /**
     * Update level and drop speed based on lines cleared
     */
    updateLevelProgression() {
        if (this.mode !== 'zen') {
            this.level = Math.floor(this.lines / 10) + 1;
            this.dropInterval = Math.max(
                TIMINGS.MIN_DROP_INTERVAL,
                TIMINGS.INITIAL_DROP_INTERVAL - (this.level - 1) * TIMINGS.SPEED_UP_PER_LEVEL
            );
        }
    }
}
