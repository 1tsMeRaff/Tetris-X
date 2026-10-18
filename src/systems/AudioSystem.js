/**
 * AudioSystem - Digital Sound Synthesizer & Lo-Fi BGM Sequencer
 * Tactile, mechanical audio inspired by Teenage Engineering & Braun.
 * Features a cozy, relaxing Lo-Fi Korobeiniki theme with polyphonic Rhodes chords,
 * mellow sub-bass, and a relaxed melodic lead.
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

        // Read music preference from localStorage (defaults to true for immersive experience)
        let savedMusic = null;
        try {
            if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
                savedMusic = localStorage.getItem('tetrix_music_enabled');
            }
        } catch (e) {
            // Handle restricted environments
        }
        this.musicEnabled = savedMusic !== null ? savedMusic === 'true' : true;

        this.bgmSchedulerTimer = null;
        this.currentStep = 0;
        this.nextStepTime = 0;
        this.totalSteps = 64; // 16 beats x 4 (16th notes)
        this.stepDuration = 0.1923; // 78 BPM (quarter = 0.7692s, 16th = 0.1923s)
        this.bgmVolume = 0.18;

        this.bgmGainNode = null;
        this.bgmFilterNode = null;

        this.isEngineRunning = false;
        this.isEnginePaused = false;

        this.setupScoreData();
        this.setupEventListeners();
    }

    /**
     * Setup musical score data for Lo-Fi Korobeiniki (78 BPM, A Minor)
     */
    setupScoreData() {
        // Melodic lead notes: [step, freq, durationSteps]
        const E5 = 659.25, D5 = 587.33, C5 = 523.25, B4 = 493.88, A4 = 440.00;

        this.melodyScore = [
            // Phrase 1 (Am -> E7)
            [0, E5, 4],
            [4, B4, 2],
            [6, C5, 2],
            [8, D5, 4],
            [12, C5, 2],
            [14, B4, 2],
            [16, A4, 4],
            [20, A4, 2],
            [22, C5, 2],
            [24, E5, 4],
            [28, D5, 2],
            [30, C5, 2],
            // Phrase 2 (B4 -> C5 -> D5 -> E5 -> C5 -> A4)
            [32, B4, 5],
            [37, C5, 2],
            [40, D5, 4],
            [44, E5, 4],
            [48, C5, 4],
            [52, A4, 4],
            [56, A4, 6]
        ];

        // Rhodes Chord Progression (step, array of frequencies, durationSteps)
        const A3 = 220.00, C4 = 261.63, D4 = 293.66, E3 = 164.81, Gsh3 = 207.65;
        const B3 = 246.94, F3 = 174.61;
        const D3 = 146.83, E4 = 329.63, F4 = 349.23, G4 = 392.00, A4_chord = 440.00, B4_chord = 493.88;

        this.chordScore = [
            [0, [A3, C4, E4, G4], 8],       // Am7
            [8, [E3, Gsh3, B3, D4], 8],     // E7
            [16, [A3, C4, E4, G4], 8],      // Am7
            [24, [A3, C4, E4], 4],          // Am
            [28, [D3 * 2, F3 * 2, A3], 4],  // Dm
            [32, [E3, Gsh3, B3, D4], 8],    // E7
            [40, [D4, F4, A4_chord], 4],    // Dm
            [44, [E3, Gsh3, B3, E4], 4],    // E7
            [48, [F3, A3, C4, E4], 6],      // Fmaj7
            [54, [E3, Gsh3, B3, D4], 2],    // E7
            [56, [A3, C4, E4, B4_chord], 8] // Am9 (warm resolve)
        ];

        // Mellow Sub-Bass (step, frequency, durationSteps)
        const A2 = 110.00, E2 = 82.41, Gsh2 = 103.83, F2 = 87.31, D2 = 73.42, C2 = 65.41;

        this.bassScore = [
            [0, A2, 4],
            [4, E2, 3],
            [8, Gsh2, 4],
            [12, E2, 3],
            [16, A2, 4],
            [20, E2, 3],
            [24, A2, 4],
            [28, D2, 3],
            [32, E2, 4],
            [36, Gsh2, 3],
            [40, D2, 4],
            [44, E2, 3],
            [48, F2, 4],
            [52, C2, 3],
            [56, A2, 6]
        ];
    }

    /**
     * Initialize Web Audio Context on user gesture & setup master audio graph
     */
    init() {
        if (!this.ctx && (typeof window !== 'undefined')) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }

        if (this.ctx) {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }

            // Create dedicated BGM sub-graph if not already created
            if (!this.bgmGainNode) {
                this.bgmGainNode = this.ctx.createGain();
                this.bgmGainNode.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);

                this.bgmFilterNode = this.ctx.createBiquadFilter();
                this.bgmFilterNode.type = 'lowpass';
                this.bgmFilterNode.frequency.setValueAtTime(1150, this.ctx.currentTime); // Warm lo-fi cutoff
                this.bgmFilterNode.Q.setValueAtTime(0.7, this.ctx.currentTime);

                this.bgmFilterNode.connect(this.bgmGainNode);
                this.bgmGainNode.connect(this.ctx.destination);
            }
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
            if (this.musicEnabled) {
                this.startBgm();
            }
        });

        this.bus.on(EVENTS.GAME_PAUSE, () => {
            this.isEnginePaused = true;
            this.applyPauseMuffle(true);
        });

        this.bus.on(EVENTS.GAME_RESUME, () => {
            this.isEnginePaused = false;
            this.applyPauseMuffle(false);
            if (this.musicEnabled && !this.bgmSchedulerTimer) {
                this.startBgm();
            }
        });

        this.bus.on(EVENTS.GAME_OVER, () => {
            this.isEngineRunning = false;
            this.fadeOutBgm(1.2);
            this.gameOver();
        });
    }

    /**
     * Apply lo-fi muffled underwater filter during game pause
     * @param {boolean} isPaused
     */
    applyPauseMuffle(isPaused) {
        if (!this.ctx || !this.bgmFilterNode || !this.bgmGainNode) return;
        const now = this.ctx.currentTime;
        if (isPaused) {
            // Muffle cutoff to 320 Hz and soften volume
            this.bgmFilterNode.frequency.setTargetAtTime(320, now, 0.15);
            this.bgmGainNode.gain.setTargetAtTime(this.bgmVolume * 0.45, now, 0.15);
        } else {
            // Restore warm 1150 Hz cutoff and normal volume
            this.bgmFilterNode.frequency.setTargetAtTime(1150, now, 0.15);
            this.bgmGainNode.gain.setTargetAtTime(this.bgmVolume, now, 0.15);
        }
    }

    /**
     * Start Lo-Fi Korobeiniki Background Music with precision lookahead scheduler
     */
    startBgm() {
        if (!this.musicEnabled || typeof window === 'undefined') return;
        this.init();
        if (!this.ctx) return;

        this.stopBgm();

        // Restore filter and gain
        if (this.bgmFilterNode && this.bgmGainNode) {
            const now = this.ctx.currentTime;
            this.bgmFilterNode.frequency.setValueAtTime(1150, now);
            this.bgmGainNode.gain.setValueAtTime(0.01, now);
            this.bgmGainNode.gain.linearRampToValueAtTime(this.bgmVolume, now + 0.8); // Gentle fade-in
        }

        this.currentStep = 0;
        this.nextStepTime = this.ctx.currentTime + 0.05;

        // Lookahead scheduler: checks every 25ms, schedules ahead by 120ms
        this.bgmSchedulerTimer = setInterval(() => {
            if (!this.musicEnabled || !this.isEngineRunning || this.isEnginePaused || !this.ctx) return;

            const scheduleAheadTime = 0.12;
            while (this.nextStepTime < this.ctx.currentTime + scheduleAheadTime) {
                this.scheduleStep(this.currentStep, this.nextStepTime);
                this.nextStepTime += this.stepDuration;
                this.currentStep = (this.currentStep + 1) % this.totalSteps;
            }
        }, 25);
    }

    /**
     * Schedule audio events for a single step
     * @param {number} step - Current step (0 to 63)
     * @param {number} time - AudioContext timestamp
     */
    scheduleStep(step, time) {
        if (!this.ctx || !this.bgmFilterNode) return;

        // 1. Check Melody
        const melody = this.melodyScore.find(m => m[0] === step);
        if (melody) {
            this.playMelodyVoice(melody[1], time, melody[2] * this.stepDuration);
        }

        // 2. Check Chords (Rhodes)
        const chord = this.chordScore.find(c => c[0] === step);
        if (chord) {
            this.playRhodesChord(chord[1], time, chord[2] * this.stepDuration);
        }

        // 3. Check Sub-Bass
        const bass = this.bassScore.find(b => b[0] === step);
        if (bass) {
            this.playSubBass(bass[1], time, bass[2] * this.stepDuration);
        }
    }

    /**
     * Synthesize cozy Lo-Fi melody lead voice (soft triangle with subtle vibrato)
     */
    playMelodyVoice(freq, startTime, duration) {
        if (!this.ctx || !this.bgmFilterNode) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        // Subtle lo-fi vibrato for warm acoustic feel
        const vibrato = this.ctx.createOscillator();
        const vibratoGain = this.ctx.createGain();
        vibrato.frequency.setValueAtTime(4.8, startTime); // 4.8 Hz LFO
        vibratoGain.gain.setValueAtTime(freq * 0.005, startTime); // ~0.5% pitch variation
        vibrato.connect(osc.frequency);
        vibrato.start(startTime);
        vibrato.stop(startTime + duration);

        // Soft envelope: 30ms attack, gentle natural decay, 120ms release tail
        const vel = 0.085;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(vel, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(vel * 0.65, startTime + duration * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.12);

        osc.connect(gain);
        gain.connect(this.bgmFilterNode);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.14);

        osc.onended = () => {
            vibrato.disconnect();
            vibratoGain.disconnect();
            osc.disconnect();
            gain.disconnect();
        };
    }

    /**
     * Synthesize lush Rhodes-like electric piano chord pads
     */
    playRhodesChord(freqArray, startTime, duration) {
        if (!this.ctx || !this.bgmFilterNode) return;

        freqArray.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            // Detune across voices for stereo chorus warmth
            osc.type = 'sine';
            const detune = (idx % 2 === 0 ? 3 : -3);
            osc.frequency.setValueAtTime(freq, startTime);
            osc.detune.setValueAtTime(detune, startTime);

            const vel = 0.022; // Layered softly in background
            gain.gain.setValueAtTime(0.0001, startTime);
            gain.gain.linearRampToValueAtTime(vel, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(vel * 0.5, startTime + duration * 0.85);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.25);

            osc.connect(gain);
            gain.connect(this.bgmFilterNode);

            osc.start(startTime);
            osc.stop(startTime + duration + 0.3);

            osc.onended = () => {
                osc.disconnect();
                gain.disconnect();
            };
        });
    }

    /**
     * Synthesize deep, rounded sub-bass pulse
     */
    playSubBass(freq, startTime, duration) {
        if (!this.ctx || !this.bgmFilterNode) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Warm sine wave with subtle attack
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        const vel = 0.065;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(vel, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(vel * 0.7, startTime + duration * 0.8);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.1);

        osc.connect(gain);
        gain.connect(this.bgmFilterNode);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.12);

        osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
        };
    }

    /**
     * Fade out background music smoothly
     * @param {number} durationSeconds
     */
    fadeOutBgm(durationSeconds = 1.0) {
        if (this.ctx && this.bgmGainNode) {
            const now = this.ctx.currentTime;
            this.bgmGainNode.gain.cancelScheduledValues(now);
            this.bgmGainNode.gain.setTargetAtTime(0.0001, now, durationSeconds * 0.4);
            setTimeout(() => this.stopBgm(), durationSeconds * 1000);
        } else {
            this.stopBgm();
        }
    }

    /**
     * Stop background music playback and clear scheduler timer
     */
    stopBgm() {
        if (this.bgmSchedulerTimer) {
            clearInterval(this.bgmSchedulerTimer);
            this.bgmSchedulerTimer = null;
        }
    }

    /**
     * Toggle background music on/off and persist in localStorage
     * @returns {boolean} New state
     */
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        try {
            if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
                localStorage.setItem('tetrix_music_enabled', String(this.musicEnabled));
            }
        } catch (e) {
            // Ignore storage errors in private browsing
        }

        if (this.musicEnabled) {
            this.init();
            if (this.isEngineRunning && !this.isEnginePaused) {
                this.startBgm();
            }
        } else {
            this.stopBgm();
        }

        return this.musicEnabled;
    }

    /**
     * Toggle sound effects on/off
     * @returns {boolean} New state
     */
    toggleSfx() {
        this.sfxEnabled = !this.sfxEnabled;
        return this.sfxEnabled;
    }

    /**
     * Play synthesized SFX frequency tone
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
}
