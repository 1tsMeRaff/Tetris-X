/**
 * AudioSystem - Digital Sound Synthesizer & BGM Sequencer
 * Tactile, mechanical audio inspired by Teenage Engineering & Braun.
 * Fully decoupled: listens to EventBus events.
 */

import { EVENTS } from '../config/constants.js';

export class AudioSystem {
    /**
     * @param {EventBus} bus
     */
    constructor(bus) {
        this.bus = bus;
        this.ctx = null;
        this.sfxEnabled = true;
        this.musicEnabled = false;
        this.bgmInterval = null;
        this.bgmStep = 0;
        this.isEngineRunning = false;
        this.isEnginePaused = false;

        this.setupEventListeners();
    }

    /**
     * Initialize Web Audio Context on user gesture
     */
    init() {
        if (!this.ctx && (typeof window !== 'undefined')) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Subscribe to game events from EventBus
     */
    setupEventListeners() {
        if (!this.bus) return;

        this.bus.on(EVENTS.PIECE_MOVE, () => this.move());
        this.bus.on(EVENTS.PIECE_ROTATE, () => this.rotate());
        this.bus.on(EVENTS.SOFT_DROP, () => this.softDrop());
        this.bus.on(EVENTS.HARD_DROP, () => this.hardDrop());
        this.bus.on(EVENTS.PIECE_HOLD, () => this.hold());

        this.bus.on(EVENTS.LINE_CLEAR, ({ count, combo }) => {
            this.lineClear(count, combo);
        });

        this.bus.on(EVENTS.BOMB_DETONATE, () => this.explosion());
        this.bus.on(EVENTS.OVERDRIVE_ACTIVATE, () => this.explosion());
        this.bus.on(EVENTS.ZEN_RESET, () => this.explosion());

        this.bus.on(EVENTS.GAME_START, () => {
            this.isEngineRunning = true;
            this.isEnginePaused = false;
            this.init();
        });

        this.bus.on(EVENTS.GAME_PAUSE, () => {
            this.isEnginePaused = true;
        });

        this.bus.on(EVENTS.GAME_RESUME, () => {
            this.isEnginePaused = false;
        });

        this.bus.on(EVENTS.GAME_OVER, () => {
            this.isEngineRunning = false;
            this.gameOver();
        });
    }

    /**
     * Play synthesized frequency tone
     */
    playTone(freq, type = 'sine', duration = 0.06, vol = 0.1, slideFreq = null) {
        if (!this.sfxEnabled || typeof window === 'undefined') return;
        try {
            this.init();
            if (!this.ctx) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            if (slideFreq) {
                osc.frequency.exponentialRampToValueAtTime(slideFreq, this.ctx.currentTime + duration);
            }

            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.onended = () => {
                osc.disconnect();
                gain.disconnect();
            };

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            // Audio context gesture pending
        }
    }

    move() {
        this.playTone(320, 'triangle', 0.03, 0.07, 290);
    }

    rotate() {
        this.playTone(540, 'sine', 0.05, 0.09, 680);
    }

    softDrop() {
        this.playTone(210, 'sine', 0.025, 0.05);
    }

    hardDrop() {
        this.playTone(160, 'square', 0.09, 0.14, 52);
    }

    hold() {
        this.playTone(400, 'triangle', 0.07, 0.09, 520);
    }

    lineClear(lines, combo = 0) {
        const notes = [440, 554.37, 659.25, 880]; // A4 major triad
        const boost = Math.min(combo * 35, 240);
        for (let i = 0; i < Math.min(lines + 1, 4); i++) {
            setTimeout(() => {
                this.playTone(notes[i] + boost, 'triangle', 0.14, 0.13, (notes[i] + boost) * 1.1);
            }, i * 50);
        }
    }

    explosion() {
        this.playTone(95, 'sawtooth', 0.28, 0.18, 32);
        setTimeout(() => this.playTone(760, 'square', 0.16, 0.1, 240), 50);
    }

    gameOver() {
        const notes = [330, 293.66, 261.63, 220];
        notes.forEach((n, idx) => {
            setTimeout(() => this.playTone(n, 'triangle', 0.22, 0.11, n * 0.92), idx * 150);
        });
    }

    toggleSfx() {
        this.sfxEnabled = !this.sfxEnabled;
        return this.sfxEnabled;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled) {
            this.init();
            this.startBgm();
        } else {
            this.stopBgm();
        }
        return this.musicEnabled;
    }

    startBgm() {
        this.stopBgm();
        const sequence = [110, 110, 146.83, 130.81, 164.81, 146.83, 130.81, 98];
        this.bgmInterval = setInterval(() => {
            if (!this.musicEnabled || this.isEnginePaused || !this.isEngineRunning) return;
            const freq = sequence[this.bgmStep % sequence.length];
            this.playTone(freq, 'triangle', 0.14, 0.045, freq * 0.99);
            this.bgmStep++;
        }, 220);
    }

    stopBgm() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }
}
