import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '../src/core/EventBus.js';
import { GameEngine } from '../src/core/GameEngine.js';

describe('Game Modes Polymorphic Strategies', () => {
    let bus;
    let engine;

    beforeEach(() => {
        bus = new EventBus();
        engine = new GameEngine(bus);
    });

    it('ArcadeMode charges overdrive and activates thermal blast', () => {
        engine.start('arcade');
        expect(engine.state.overdrive).toBe(0);

        // Simulate 4 lines cleared
        engine.activeMode.onLineClear(4, false, [16, 17, 18, 19]);
        expect(engine.state.overdrive).toBe(80);

        // Clear 1 more line
        engine.activeMode.onLineClear(1, false, [19]);
        expect(engine.state.overdrive).toBe(100);
        expect(engine.activeMode.canActivateOverdrive()).toBe(true);

        const activated = engine.activeMode.activateOverdrive();
        expect(activated).toBe(true);
        expect(engine.state.overdrive).toBe(0);
        expect(engine.state.frenzyTimer).toBe(8000);
    });

    it('SprintMode triggers game over victory when target lines reached', () => {
        engine.start('sprint');
        engine.state.lines = 39;

        let gameOverEvent = null;
        bus.on('game:over', data => {
            gameOverEvent = data;
        });

        // Clear 1 line to hit 40
        engine.state.lines += 1;
        engine.activeMode.onLineClear(1);

        expect(gameOverEvent).not.toBeNull();
        expect(gameOverEvent.isVictory).toBe(true);
    });

    it('ZenMode rescues player from game over on top collision', () => {
        engine.start('zen');
        const result = engine.activeMode.checkGameOver(true);

        expect(result.isGameOver).toBe(false);
        expect(result.isVictory).toBe(false);
    });
});
