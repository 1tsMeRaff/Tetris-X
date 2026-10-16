/**
 * DialsManager - Taste Skill 3-Dials Calibration Controller
 * Controls Variance, Motion, Density and layout spacing.
 */

import { DEFAULT_DIALS } from '../config/theme.config.js';

export class DialsManager {
    /**
     * @param {StorageSystem} storage
     * @param {FXRenderer} fxRenderer
     * @param {Function} getModeSlug
     */
    constructor(storage, fxRenderer = null, getModeSlug = () => 'arcade') {
        this.storage = storage;
        this.fxRenderer = fxRenderer;
        this.getModeSlug = getModeSlug;
        this.dials = this.storage ? this.storage.getDials() : { ...DEFAULT_DIALS };

        this.init();
    }

    init() {
        if (typeof document === 'undefined') return;

        // Toggle drawer
        const btnDials = document.getElementById('btnDials');
        const drawer = document.getElementById('dialsDrawer');
        if (btnDials && drawer) {
            btnDials.addEventListener('click', () => {
                drawer.classList.toggle('hidden');
            });
        }

        // Sliders
        ['Variance', 'Motion', 'Density'].forEach(name => {
            const key = name.toLowerCase();
            const slider = document.getElementById(`dial${name}`);
            const valLabel = document.getElementById(`val${name}`);

            if (slider && valLabel) {
                slider.value = this.dials[key];
                valLabel.textContent = this.dials[key];

                slider.addEventListener('input', (e) => {
                    const v = parseInt(e.target.value, 10);
                    this.dials[key] = v;
                    valLabel.textContent = v;
                    if (this.storage) this.storage.saveDials(this.dials);
                    if (key === 'motion' && this.fxRenderer) {
                        this.fxRenderer.setMotionIntensity(v);
                    }
                    this.applyLayout();
                });
            }
        });

        // Copy CLI Command button
        const btnCopyCli = document.getElementById('btnCopyCli');
        if (btnCopyCli) {
            btnCopyCli.addEventListener('click', () => this.copyCliCommand());
        }

        if (this.fxRenderer) {
            this.fxRenderer.setMotionIntensity(this.dials.motion);
        }

        this.applyLayout();
    }

    applyLayout() {
        if (typeof document === 'undefined') return;

        const workspace = document.getElementById('mainWorkspace');
        const ruler = document.getElementById('coordRulerTop');

        if (workspace && ruler) {
            if (this.dials.density >= 7) {
                workspace.classList.remove('gap-8');
                workspace.classList.add('gap-3', 'sm:gap-5');
                ruler.classList.remove('hidden');
            } else {
                workspace.classList.remove('gap-3', 'sm:gap-5');
                workspace.classList.add('gap-8');
                ruler.classList.add('hidden');
            }
        }

        this.updateCliText();
    }

    updateCliText() {
        if (typeof document === 'undefined') return;

        const cliEl = document.getElementById('cliText');
        const mode = this.getModeSlug();
        if (cliEl) {
            cliEl.textContent = `npx tetrix --mode=${mode} --dials=${this.dials.variance},${this.dials.motion},${this.dials.density}`;
        }

        const summaryEl = document.getElementById('dialsSummaryLabel');
        if (summaryEl) {
            summaryEl.textContent = `${this.dials.variance}/${this.dials.motion}/${this.dials.density}`;
        }
    }

    copyCliCommand() {
        const cliEl = document.getElementById('cliText');
        if (!cliEl) return;
        const text = cliEl.textContent;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(() => this.fallbackCopy(text));
        } else {
            this.fallbackCopy(text);
        }

        const icon = document.getElementById('copyIcon');
        if (icon) {
            icon.className = 'ph-bold ph-check text-xs ml-1 text-[var(--accent)]';
            setTimeout(() => {
                icon.className = 'ph ph-copy text-xs ml-1';
            }, 1500);
        }
    }

    fallbackCopy(text) {
        const tempInput = document.createElement('textarea');
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
    }
}
