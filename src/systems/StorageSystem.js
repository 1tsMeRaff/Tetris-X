/**
 * StorageSystem - Persistence Abstraction
 * Manages LocalStorage data with fail-safe memory fallbacks for restricted environments.
 */

import { STORAGE_KEYS, DEFAULT_DIALS, THEMES } from '../config/theme.config.js';

export class StorageSystem {
    constructor() {
        this.memoryFallback = new Map();
        this.isLocalStorageAvailable = this.checkAvailability();
    }

    checkAvailability() {
        try {
            const testKey = '__storage_test__';
            window.localStorage.setItem(testKey, testKey);
            window.localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }

    get(key, defaultValue = null) {
        if (this.isLocalStorageAvailable) {
            try {
                const val = window.localStorage.getItem(key);
                return val !== null ? val : defaultValue;
            } catch (e) {
                return defaultValue;
            }
        }
        return this.memoryFallback.has(key) ? this.memoryFallback.get(key) : defaultValue;
    }

    set(key, value) {
        if (this.isLocalStorageAvailable) {
            try {
                window.localStorage.setItem(key, String(value));
            } catch (e) {
                // Ignore quota exceeded
            }
        }
        this.memoryFallback.set(key, String(value));
    }

    getHighScore() {
        return parseInt(this.get(STORAGE_KEYS.HIGH_SCORE, '0'), 10) || 0;
    }

    saveHighScore(score) {
        this.set(STORAGE_KEYS.HIGH_SCORE, score);
    }

    getDials() {
        try {
            const saved = this.get(STORAGE_KEYS.DIALS);
            return saved ? JSON.parse(saved) : { ...DEFAULT_DIALS };
        } catch (e) {
            return { ...DEFAULT_DIALS };
        }
    }

    saveDials(dials) {
        try {
            this.set(STORAGE_KEYS.DIALS, JSON.stringify(dials));
        } catch (e) {
            // Ignore
        }
    }

    getTheme() {
        return this.get(STORAGE_KEYS.THEME, THEMES.DARK);
    }

    saveTheme(theme) {
        this.set(STORAGE_KEYS.THEME, theme);
    }
}
