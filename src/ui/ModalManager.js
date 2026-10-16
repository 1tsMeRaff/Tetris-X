/**
 * ModalManager - Overlay Modal & Mode Selection Controller
 * Strictly adheres to Taste Skill Hero Discipline (Headline <= 2 lines, Subtext <= 20 words).
 */

import { EVENTS } from '../config/constants.js';

export class ModalManager {
    /**
     * @param {EventBus} bus
     * @param {GameEngine} engine
     */
    constructor(bus, engine) {
        this.bus = bus;
        this.engine = engine;
        this.overlay = null;
        this.cacheDom();
        this.setupEventListeners();
    }

    cacheDom() {
        if (typeof document === 'undefined') return;

        this.overlay = document.getElementById('overlayMenu');
        this.statusTag = document.getElementById('overlayStatusTag');
        this.title = document.getElementById('overlayTitle');
        this.subtitle = document.getElementById('overlaySubtitle');
        this.finalScoreBox = document.getElementById('finalScoreBox');
        this.finalScoreValue = document.getElementById('finalScoreValue');
        this.newRecordBadge = document.getElementById('newRecordBadge');
        this.resumeBtn = document.getElementById('btnResumeOverlay');
        this.pauseBtn = document.getElementById('btnPause');

        // Mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode || 'arcade';
                this.engine.start(mode);
            });
        });

        if (this.resumeBtn) {
            this.resumeBtn.addEventListener('click', () => this.engine.togglePause());
        }
        if (this.pauseBtn) {
            this.pauseBtn.addEventListener('click', () => this.engine.togglePause());
        }
    }

    setupEventListeners() {
        if (!this.bus) return;

        this.bus.on(EVENTS.GAME_START, () => {
            if (this.overlay) this.overlay.classList.add('hidden');
        });

        this.bus.on(EVENTS.GAME_PAUSE, () => {
            this.showPause();
        });

        this.bus.on(EVENTS.GAME_RESUME, () => {
            if (this.overlay) this.overlay.classList.add('hidden');
        });

        this.bus.on(EVENTS.GAME_OVER, data => {
            this.showGameOver(data);
        });
    }

    showPause() {
        if (!this.overlay) return;
        this.statusTag.textContent = 'DIJEDA';
        this.title.textContent = 'Simulasi Dijeda.';
        this.subtitle.textContent = 'Lanjutkan sesi saat ini atau mulai ulang dengan protokol baru.';
        if (this.finalScoreBox) this.finalScoreBox.classList.add('hidden');
        if (this.resumeBtn) this.resumeBtn.classList.remove('hidden');
        this.overlay.classList.remove('hidden');
    }

    showGameOver({ isVictory, mode, score, isNewRecord, elapsedSeconds }) {
        if (!this.overlay) return;

        if (this.resumeBtn) this.resumeBtn.classList.add('hidden');
        if (this.finalScoreBox) this.finalScoreBox.classList.remove('hidden');

        if (isVictory && mode === 'sprint') {
            this.statusTag.textContent = 'SELESAI';
            this.title.textContent = 'Target 40 Garis Tercapai.';
            this.subtitle.textContent = `Diselesaikan dalam waktu ${elapsedSeconds} detik. Pilih protokol untuk bermain lagi.`;
        } else {
            this.statusTag.textContent = 'SELESAI';
            this.title.textContent = 'Matriks Penuh.';
            this.subtitle.textContent = 'Ruang gerak telah habis. Pilih protokol di bawah untuk sesi baru.';
        }

        if (this.finalScoreValue) {
            this.finalScoreValue.textContent = (score || 0).toLocaleString('id-ID');
        }

        if (this.newRecordBadge) {
            if (isNewRecord) {
                this.newRecordBadge.classList.remove('hidden');
            } else {
                this.newRecordBadge.classList.add('hidden');
            }
        }

        this.overlay.classList.remove('hidden');
    }
}
