/**
 * ThemeManager - Theme State & Dark/Light Mode Controller
 * Restrained palette: Off-Black Dark vs Warm Editorial Paper Light.
 */

import { THEMES } from '../config/theme.config.js';

export class ThemeManager {
    /**
     * @param {StorageSystem} storage
     * @param {Function} onThemeChange
     */
    constructor(storage, onThemeChange = null) {
        this.storage = storage;
        this.onThemeChange = onThemeChange;
        this.currentTheme = this.storage ? this.storage.getTheme() : THEMES.DARK;
        this.btnTheme = null;

        this.init();
    }

    init() {
        if (typeof document === 'undefined') return;

        this.applyTheme(this.currentTheme, false);
        this.btnTheme = document.getElementById('btnTheme');

        if (this.btnTheme) {
            this.btnTheme.addEventListener('click', () => this.toggle());
        }
    }

    applyTheme(theme, notify = true) {
        this.currentTheme = theme;
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', theme);
            const icon = document.querySelector('#btnTheme i');
            if (icon) {
                icon.className = theme === 'dark' ? 'ph ph-sun-dim text-base' : 'ph ph-moon text-base';
            }
        }
        if (this.storage) {
            this.storage.saveTheme(theme);
        }
        if (notify && this.onThemeChange) {
            this.onThemeChange(theme);
        }
    }

    toggle() {
        const next = this.currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
        this.applyTheme(next);
        return next;
    }

    getTheme() {
        return this.currentTheme;
    }
}
