/**
 * Sprint 40-Lines Game Mode Strategy
 * Time-attack challenge: Clear 40 lines as fast as possible.
 */

import { BaseMode } from './BaseMode.js';
import { EVENTS } from '../config/constants.js';

export class SprintMode extends BaseMode {
    constructor() {
        super('Sprint 40 Garis', 'sprint-40l');
        this.targetLines = 40;
    }

    /**
     * Check if 40 lines target is reached
     * @param {number} count
     */
    onLineClear(count) {
        if (this.engine.state.lines >= this.targetLines) {
            this.engine.triggerGameOver(true);
        }
    }

    /**
     * Win if lines >= 40, lose if top out
     * @param {boolean} topCollisionOccurred
     * @returns {{ isGameOver: boolean, isVictory: boolean }}
     */
    checkGameOver(topCollisionOccurred) {
        if (this.engine.state.lines >= this.targetLines) {
            return { isGameOver: true, isVictory: true };
        }
        return { isGameOver: topCollisionOccurred, isVictory: false };
    }
}
