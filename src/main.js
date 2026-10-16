/**
 * Application Entry Point & Dependency Injection Wiring
 * Bootstraps all subsystems, renderers, UI managers, and starts the render loop.
 */

import { EventBus } from './core/EventBus.js';
import { GameEngine } from './core/GameEngine.js';
import { StorageSystem } from './systems/StorageSystem.js';
import { AudioSystem } from './systems/AudioSystem.js';
import { InputSystem } from './systems/InputSystem.js';
import { CanvasRenderer } from './renderers/CanvasRenderer.js';
import { PreviewRenderer } from './renderers/PreviewRenderer.js';
import { FXRenderer } from './renderers/FXRenderer.js';
import { UIManager } from './ui/UIManager.js';
import { ModalManager } from './ui/ModalManager.js';
import { ThemeManager } from './ui/ThemeManager.js';
import { DialsManager } from './ui/DialsManager.js';
import { EVENTS } from './config/constants.js';

function initApp() {
    // 1. Core Event Hub & Persistence
    const bus = new EventBus();
    const storage = new StorageSystem();

    // 2. Core Game Engine
    const engine = new GameEngine(bus, storage);

    // 3. Audio & Input Systems
    const audio = new AudioSystem(bus);
    const input = new InputSystem(engine);
    input.attach();

    // 4. Wire Audio Toggles
    const btnSfx = document.getElementById('btnSfx');
    if (btnSfx) {
        btnSfx.addEventListener('click', () => {
            const enabled = audio.toggleSfx();
            const icon = btnSfx.querySelector('i');
            if (icon) {
                icon.className = enabled
                    ? 'ph ph-speaker-high text-base'
                    : 'ph ph-speaker-slash text-base text-[var(--text-muted)]';
            }
        });
    }

    const btnMusic = document.getElementById('btnMusic');
    if (btnMusic) {
        btnMusic.addEventListener('click', () => {
            const active = audio.toggleMusic();
            const icon = btnMusic.querySelector('i');
            if (icon) {
                icon.className = active
                    ? 'ph-fill ph-waveform text-base text-[var(--accent)]'
                    : 'ph ph-waveform text-base text-[var(--text-secondary)]';
            }
        });
    }

    // Overdrive Trigger Buttons
    const btnOverdriveDesktop = document.getElementById('btnOverdriveDesktop');
    const btnOverdriveMobile = document.getElementById('btnOverdriveMobile');
    if (btnOverdriveDesktop) {
        btnOverdriveDesktop.addEventListener('click', () => engine.activateOverdrive());
    }
    if (btnOverdriveMobile) {
        btnOverdriveMobile.addEventListener('click', () => engine.activateOverdrive());
    }

    // 5. Presentation Canvases & Renderers
    const gameCanvas = document.getElementById('gameCanvas');
    const canvasRenderer = new CanvasRenderer(gameCanvas);

    const previewRenderer = new PreviewRenderer({
        holdDesktop: document.getElementById('holdCanvasDesktop'),
        holdMobile: document.getElementById('holdCanvasMobile'),
        nextDesktop: document.getElementById('nextCanvasDesktop'),
        nextMobile: document.getElementById('nextCanvasMobile')
    });

    const fxRenderer = new FXRenderer(bus, document.getElementById('boardContainer'));

    // 6. UI & State Managers
    const ui = new UIManager(bus);
    const modals = new ModalManager(bus, engine);
    const theme = new ThemeManager(storage, (activeTheme) => {
        canvasRenderer.render(engine.board, engine.state.currentPiece, engine.state.running, activeTheme);
    });
    const dials = new DialsManager(storage, fxRenderer, () => engine.activeMode.slug);

    // 7. Subscribe Preview Renderers to Piece Events
    bus.on(EVENTS.GAME_START, ({ holdPiece, nextQueue }) => {
        previewRenderer.render(holdPiece, nextQueue);
    });

    bus.on(EVENTS.PIECE_SPAWN, ({ holdPiece, nextQueue }) => {
        previewRenderer.render(holdPiece, nextQueue);
    });

    bus.on(EVENTS.PIECE_HOLD, ({ holdPiece }) => {
        previewRenderer.renderHold(holdPiece);
        previewRenderer.renderNext(engine.pieceBag.queue);
    });

    // 8. Main 60fps Game & Animation Loop
    let lastTime = performance.now();

    function gameLoop(time = performance.now()) {
        const deltaTime = time - lastTime;
        lastTime = time;

        // Core physics & gravity update
        engine.update(deltaTime, time);

        // Visual frame render
        canvasRenderer.render(
            engine.board,
            engine.state.currentPiece,
            engine.state.running,
            theme.getTheme()
        );

        // FX & floating telemetry tags
        fxRenderer.render(canvasRenderer.ctx);

        requestAnimationFrame(gameLoop);
    }

    // Initial render
    canvasRenderer.render(engine.board, null, false, theme.getTheme());
    previewRenderer.render(null, []);
    requestAnimationFrame(gameLoop);

    // Initial telemetry display
    ui.updateHUD({
        score: 0,
        highScore: storage.getHighScore(),
        level: 1,
        lines: 0,
        combo: -1,
        overdrive: 0,
        canOverdrive: false,
        elapsedSeconds: 0
    });
}

// Boot on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
