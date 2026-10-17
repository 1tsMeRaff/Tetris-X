/**
 * FXRenderer - Visual Particle Physics & Floating Telemetry Engine
 * Square architectural particles and JetBrains Mono tabular telemetry text.
 */

import { EVENTS, BOARD } from '../config/constants.js';

export class FXRenderer {
    /**
     * @param {EventBus} bus
     * @param {HTMLElement} boardContainer
     */
    constructor(bus, boardContainer = null) {
        this.bus = bus;
        this.boardContainer = boardContainer || (typeof document !== 'undefined' ? document.getElementById('boardContainer') : null);
        this.particles = [];
        this.particlePool = [];
        this.floatingTexts = [];
        this.motionIntensity = 6;

        this.setupEventListeners();
    }

    setMotionIntensity(val) {
        this.motionIntensity = val;
    }

    setupEventListeners() {
        if (!this.bus) return;

        this.bus.on(EVENTS.HARD_DROP, ({ piece }) => {
            this.spawnDropParticles(piece);
            this.triggerShake('sm');
        });

        this.bus.on(EVENTS.LINE_CLEAR, ({ count, combo, totalEarned, bombTriggered, fullRows, rowData }) => {
            if (rowData) {
                rowData.forEach(({ cells }) => {
                    cells.forEach(({ x, y, color }) => {
                        this.spawnParticles((x + 0.5) * BOARD.BLOCK_SIZE, (y + 0.5) * BOARD.BLOCK_SIZE, color, 6, 4);
                    });
                });
            }

            const labels = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIX'];
            const centerRowY = fullRows && fullRows.length > 0 ? fullRows[0] * BOARD.BLOCK_SIZE : 200;

            this.addFloatingText(
                `${labels[count]} +${totalEarned}`,
                150,
                Math.max(70, centerRowY),
                count === 4 ? '#FF4D00' : '#F4F4F0',
                count === 4 ? 1.25 : 1.0
            );

            if (combo > 0) {
                this.addFloatingText(`KOMBO ${combo}X`, 150, Math.max(100, centerRowY + 24), '#FF4D00', 0.95);
            }

            if (bombTriggered) {
                this.addFloatingText('INTI BOM +250', 150, Math.max(50, centerRowY - 24), '#FF4D00', 1.05);
                this.triggerShake('lg');
            } else if (count >= 3) {
                this.triggerShake('lg');
            }
        });

        this.bus.on(EVENTS.BOMB_DETONATE, ({ x, y, destroyed }) => {
            if (destroyed) {
                destroyed.forEach(cell => {
                    this.spawnParticles((cell.x + 0.5) * BOARD.BLOCK_SIZE, (cell.y + 0.5) * BOARD.BLOCK_SIZE, '#FF4D00', 8, 5);
                });
            }
        });

        this.bus.on(EVENTS.OVERDRIVE_ACTIVATE, ({ destroyed }) => {
            if (destroyed) {
                destroyed.forEach(cell => {
                    this.spawnParticles((cell.x + 0.5) * BOARD.BLOCK_SIZE, (cell.y + 0.5) * BOARD.BLOCK_SIZE, '#FF4D00', 7, 5.5);
                });
            }
        });

        this.bus.on(EVENTS.SCREEN_SHAKE, ({ intensity }) => {
            this.triggerShake(intensity);
        });

        this.bus.on(EVENTS.FLOATING_TEXT, ({ text, x, y, color, scale }) => {
            this.addFloatingText(text, x, y, color, scale);
        });
    }

    spawnParticles(x, y, color, count = 10, speed = 3.5) {
        if (this.motionIntensity <= 2) return;
        const scaledCount = Math.round((count * this.motionIntensity) / 6);
        for (let i = 0; i < scaledCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const vel = Math.random() * speed + 0.8;
            const pt = this.particlePool.pop() || {};
            pt.x = x;
            pt.y = y;
            pt.vx = Math.cos(angle) * vel;
            pt.vy = Math.sin(angle) * vel - 0.8;
            pt.size = Math.random() * 3 + 1.5;
            pt.color = color;
            pt.alpha = 1;
            pt.decay = Math.random() * 0.03 + 0.02;
            this.particles.push(pt);
        }
    }

    spawnDropParticles(piece) {
        if (this.motionIntensity <= 3 || !piece) return;
        piece.matrix.forEach((row, r) => {
            row.forEach((val, c) => {
                if (val !== 0) {
                    const px = (piece.x + c + 0.5) * BOARD.BLOCK_SIZE;
                    const py = (piece.y + r + 0.5) * BOARD.BLOCK_SIZE;
                    this.spawnParticles(px, py, piece.color, 2, 1.8);
                }
            });
        });
    }

    addFloatingText(text, x, y, color = '#F4F4F0', scale = 1) {
        if (this.motionIntensity <= 1) return;
        this.floatingTexts.push({
            text,
            x,
            y,
            color,
            scale,
            alpha: 1,
            vy: -1.1
        });
    }

    triggerShake(intensity = 'sm') {
        if (this.motionIntensity <= 3 || !this.boardContainer) return;
        const cls = intensity === 'lg' && this.motionIntensity >= 6 ? 'shake-lg' : 'shake-sm';
        this.boardContainer.classList.remove('shake-sm', 'shake-lg');
        requestAnimationFrame(() => {
            if (this.boardContainer) {
                this.boardContainer.classList.add(cls);
            }
        });
    }

    render(ctx) {
        // 1. Render square architectural particles (Zero save/restore, swap-and-pop O(1))
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.vy += 0.12;
            pt.alpha -= pt.decay;

            if (pt.alpha <= 0) {
                if (this.particlePool.length < 300) {
                    this.particlePool.push(pt);
                }
                const last = this.particles.pop();
                if (i < this.particles.length) {
                    this.particles[i] = last;
                }
                continue;
            }

            ctx.globalAlpha = pt.alpha;
            ctx.fillStyle = pt.color;
            ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
        }

        // 2. Render JetBrains Mono floating telemetry tags
        if (this.floatingTexts.length > 0) {
            ctx.textAlign = 'center';

            for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
                const ft = this.floatingTexts[i];
                ft.y += ft.vy;
                ft.alpha -= 0.02;

                if (ft.alpha <= 0) {
                    const last = this.floatingTexts.pop();
                    if (i < this.floatingTexts.length) {
                        this.floatingTexts[i] = last;
                    }
                    continue;
                }

                ctx.globalAlpha = ft.alpha;
                ctx.font = `700 ${Math.round(13 * ft.scale)}px 'JetBrains Mono', monospace`;
                ctx.fillStyle = ft.color;
                ctx.fillText(ft.text, ft.x, ft.y);
            }
        }

        ctx.globalAlpha = 1; // Clean global state reset
    }
}
