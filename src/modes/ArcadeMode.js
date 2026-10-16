/**
 * Arcade Overdrive Game Mode Strategy
 * Features thermal bomb cores (3x3 explosion) and Overdrive Capacitor with 2X Frenzy Multiplier.
 */

import { BaseMode } from './BaseMode.js';
import { EVENTS, TIMINGS, SCORING } from '../config/constants.js';

export class ArcadeMode extends BaseMode {
    constructor() {
        super('Arcade Overdrive', 'arcade-overdrive');
    }

    /**
     * Arcade pieces have an 18% chance to contain a thermal bomb core (matrix val = 2)
     * @param {Piece} piece
     */
    modifyPiece(piece) {
        if (Math.random() < 0.18) {
            const coords = [];
            piece.matrix.forEach((r, y) => r.forEach((val, x) => {
                if (val === 1) coords.push([y, x]);
            }));
            if (coords.length > 0) {
                const [by, bx] = coords[Math.floor(Math.random() * coords.length)];
                piece.matrix[by][bx] = 2; // Bomb marker
            }
        }
    }

    /**
     * Charge Overdrive Capacitor on line clear
     * @param {number} count
     * @param {boolean} bombTriggered
     */
    onLineClear(count, bombTriggered) {
        const comboBonus = this.engine.state.combo > 0 ? 8 : 0;
        const charge = count * 20 + comboBonus;
        this.engine.state.chargeOverdrive(charge);
        this.engine.bus.emit(EVENTS.OVERDRIVE_CHARGE, {
            overdrive: this.engine.state.overdrive
        });
    }

    /**
     * Check if capacitor is ready to activate
     * @returns {boolean}
     */
    canActivateOverdrive() {
        return this.engine.state.overdrive >= 100 && this.engine.state.running && !this.engine.state.paused;
    }

    /**
     * Fire thermal pulse: blast bottom 3 rows and engage 2X frenzy
     * @returns {boolean}
     */
    activateOverdrive() {
        if (!this.canActivateOverdrive()) return false;

        this.engine.state.overdrive = 0;
        this.engine.state.frenzyTimer = TIMINGS.OVERDRIVE_DURATION_MS;

        // Blast 3 bottom rows
        const destroyed = this.engine.board.blastBottomRows(3);

        // Add bonus score
        this.engine.state.addScore(SCORING.OVERDRIVE_ACTIVATION_BONUS);

        this.engine.bus.emit(EVENTS.OVERDRIVE_ACTIVATE, {
            destroyed,
            frenzyDuration: TIMINGS.OVERDRIVE_DURATION_MS
        });

        this.engine.bus.emit(EVENTS.SCREEN_SHAKE, { intensity: 'lg' });
        this.engine.bus.emit(EVENTS.FLOATING_TEXT, {
            text: 'OVERDRIVE 2X AKTIF',
            x: 150,
            y: 260,
            color: '#FF4D00',
            scale: 1.2
        });

        this.engine.emitHudUpdate();
        return true;
    }
}
