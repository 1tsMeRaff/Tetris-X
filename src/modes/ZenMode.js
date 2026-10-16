/**
 * Zen Endless Game Mode Strategy
 * Constant relaxed drop speed with automatic emergency board reset upon topping out.
 */

import { BaseMode } from './BaseMode.js';
import { EVENTS } from '../config/constants.js';

export class ZenMode extends BaseMode {
    constructor() {
        super('Zen Tanpa Batas', 'zen-infinite');
    }

    /**
     * Prevent game over on top out: trigger automated bottom row clear instead
     * @param {boolean} topCollisionOccurred
     * @returns {{ isGameOver: boolean, isVictory: boolean }}
     */
    checkGameOver(topCollisionOccurred) {
        if (topCollisionOccurred) {
            this.engine.board.zenReset(6);

            this.engine.bus.emit(EVENTS.ZEN_RESET, { rowsCleared: 6 });
            this.engine.bus.emit(EVENTS.SCREEN_SHAKE, { intensity: 'lg' });
            this.engine.bus.emit(EVENTS.FLOATING_TEXT, {
                text: 'ZEN RESET',
                x: 150,
                y: 280,
                color: '#FF4D00',
                scale: 1.1
            });

            return { isGameOver: false, isVictory: false };
        }

        return { isGameOver: false, isVictory: false };
    }
}
