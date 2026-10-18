import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AudioSystem } from '../src/systems/AudioSystem.js';
import { EventBus } from '../src/core/EventBus.js';
import { EVENTS } from '../src/config/constants.js';

describe('AudioSystem - Synthesizer & BGM Sequencer', () => {
    let bus;
    let audio;
    let storageMap = {};

    beforeEach(() => {
        bus = new EventBus();
        storageMap = {};

        // Setup clean mock for localStorage
        globalThis.localStorage = {
            getItem: (key) => storageMap[key] || null,
            setItem: (key, val) => { storageMap[key] = String(val); },
            removeItem: (key) => { delete storageMap[key]; },
            clear: () => { storageMap = {}; }
        };

        audio = new AudioSystem(bus);
    });

    afterEach(() => {
        if (audio) {
            audio.stopBgm();
        }
    });

    it('initializes with music and sfx enabled by default', () => {
        expect(audio.sfxEnabled).toBe(true);
        expect(audio.musicEnabled).toBe(true);
        expect(audio.isEngineRunning).toBe(false);
        expect(audio.isEnginePaused).toBe(false);
    });

    it('toggles music state and persists to localStorage', () => {
        const state1 = audio.toggleMusic();
        expect(state1).toBe(false);
        expect(audio.musicEnabled).toBe(false);
        expect(globalThis.localStorage.getItem('tetrix_music_enabled')).toBe('false');

        const state2 = audio.toggleMusic();
        expect(state2).toBe(true);
        expect(audio.musicEnabled).toBe(true);
        expect(globalThis.localStorage.getItem('tetrix_music_enabled')).toBe('true');
    });

    it('toggles sfx state correctly', () => {
        expect(audio.toggleSfx()).toBe(false);
        expect(audio.sfxEnabled).toBe(false);
        expect(audio.toggleSfx()).toBe(true);
        expect(audio.sfxEnabled).toBe(true);
    });

    it('responds to GAME_START, GAME_PAUSE, GAME_RESUME, and GAME_OVER events', () => {
        bus.emit(EVENTS.GAME_START);
        expect(audio.isEngineRunning).toBe(true);
        expect(audio.isEnginePaused).toBe(false);

        bus.emit(EVENTS.GAME_PAUSE);
        expect(audio.isEnginePaused).toBe(true);

        bus.emit(EVENTS.GAME_RESUME);
        expect(audio.isEnginePaused).toBe(false);

        bus.emit(EVENTS.GAME_OVER);
        expect(audio.isEngineRunning).toBe(false);
    });

    it('executes sound effects without throwing in headless environment', () => {
        expect(() => {
            audio.move();
            audio.rotate();
            audio.softDrop();
            audio.hardDrop();
            audio.hold();
            audio.lineClear(1, 0);
            audio.lineClear(4, 2);
            audio.explosion();
            audio.gameOver();
        }).not.toThrow();
    });

    it('contains complete score matrix for Lo-Fi Korobeiniki', () => {
        expect(audio.melodyScore.length).toBeGreaterThan(15);
        expect(audio.chordScore.length).toBeGreaterThan(8);
        expect(audio.bassScore.length).toBeGreaterThan(10);
        expect(audio.totalSteps).toBe(64);
        expect(audio.stepDuration).toBeCloseTo(0.1923, 3);
    });
});
