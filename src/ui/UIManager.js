/**
 * UIManager - Telemetry & HUD Presentation Layer
 * Coordinates DOM telemetry displays across desktop and mobile bento modules.
 */

import { EVENTS } from '../config/constants.js';

export class UIManager {
    /**
     * @param {EventBus} bus
     */
    constructor(bus) {
        this.bus = bus;
        this.elements = {};
        this.cacheDom();
        this.setupEventListeners();
    }

    cacheDom() {
        if (typeof document === 'undefined') return;

        this.elements = {
            scoreDesktop: document.getElementById('scoreDesktop'),
            scoreMobile: document.getElementById('scoreMobile'),
            highScoreDisplay: document.getElementById('highScoreDisplay'),
            levelDesktop: document.getElementById('levelDesktop'),
            levelMobile: document.getElementById('levelMobile'),
            linesDesktop: document.getElementById('linesDesktop'),
            linesMobile: document.getElementById('linesMobile'),
            comboDesktop: document.getElementById('comboDesktop'),
            timerDesktop: document.getElementById('timerDesktop'),
            overdrivePctDesktop: document.getElementById('overdrivePctDesktop'),
            overdrivePctMobile: document.getElementById('overdrivePctMobile'),
            overdriveBarDesktop: document.getElementById('overdriveBarDesktop'),
            overdriveBarMobile: document.getElementById('overdriveBarMobile'),
            btnOverdriveDesktop: document.getElementById('btnOverdriveDesktop'),
            btnOverdriveMobile: document.getElementById('btnOverdriveMobile'),
            frenzyBanner: document.getElementById('frenzyBanner'),
            modeBadge: document.getElementById('modeBadge')
        };
    }

    setupEventListeners() {
        if (!this.bus) return;

        this.bus.on(EVENTS.HUD_UPDATE, data => this.updateHUD(data));

        this.bus.on(EVENTS.GAME_START, ({ mode }) => {
            if (this.elements.modeBadge) {
                this.elements.modeBadge.textContent = mode;
            }
            if (this.elements.frenzyBanner) {
                this.elements.frenzyBanner.classList.add('hidden');
            }
        });

        this.bus.on(EVENTS.OVERDRIVE_ACTIVATE, () => {
            if (this.elements.frenzyBanner) {
                this.elements.frenzyBanner.classList.remove('hidden');
            }
        });

        this.bus.on(EVENTS.OVERDRIVE_EXPIRE, () => {
            if (this.elements.frenzyBanner) {
                this.elements.frenzyBanner.classList.add('hidden');
            }
        });
    }

    formatTime(sec) {
        const mins = Math.floor(sec / 60);
        const rem = Math.floor(sec % 60);
        return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
    }

    updateHUD(data) {
        const { score, highScore, level, lines, combo, overdrive, canOverdrive, elapsedSeconds } = data;
        const formattedScore = (score || 0).toLocaleString('id-ID');

        if (this.elements.scoreDesktop) this.elements.scoreDesktop.textContent = formattedScore;
        if (this.elements.scoreMobile) this.elements.scoreMobile.textContent = formattedScore;
        if (this.elements.highScoreDisplay) this.elements.highScoreDisplay.textContent = (highScore || 0).toLocaleString('id-ID');

        if (this.elements.levelDesktop) this.elements.levelDesktop.textContent = level;
        if (this.elements.levelMobile) this.elements.levelMobile.textContent = level;
        if (this.elements.linesDesktop) this.elements.linesDesktop.textContent = lines;
        if (this.elements.linesMobile) this.elements.linesMobile.textContent = lines;
        if (this.elements.comboDesktop) this.elements.comboDesktop.textContent = `${Math.max(0, combo)}x`;

        if (this.elements.timerDesktop && elapsedSeconds !== undefined) {
            this.elements.timerDesktop.textContent = this.formatTime(elapsedSeconds);
        }

        const pct = Math.floor(overdrive || 0);
        if (this.elements.overdrivePctDesktop) this.elements.overdrivePctDesktop.textContent = `${pct}%`;
        if (this.elements.overdrivePctMobile) this.elements.overdrivePctMobile.textContent = `${pct}%`;
        if (this.elements.overdriveBarDesktop) this.elements.overdriveBarDesktop.style.width = `${pct}%`;
        if (this.elements.overdriveBarMobile) this.elements.overdriveBarMobile.style.width = `${pct}%`;

        if (this.elements.btnOverdriveDesktop) this.elements.btnOverdriveDesktop.disabled = !canOverdrive;
        if (this.elements.btnOverdriveMobile) this.elements.btnOverdriveMobile.disabled = !canOverdrive;
    }
}
