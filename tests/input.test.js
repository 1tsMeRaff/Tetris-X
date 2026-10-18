import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InputSystem } from '../src/systems/InputSystem.js';
import { GameEngine } from '../src/core/GameEngine.js';
import { EventBus } from '../src/core/EventBus.js';

describe('InputSystem - Modern DAS/ARR & Precision Controls', () => {
    let bus;
    let engine;
    let input;

    beforeEach(() => {
        vi.useFakeTimers();
        globalThis.window = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        };
        globalThis.document = {
            getElementById: vi.fn(() => null)
        };
        bus = new EventBus();
        engine = new GameEngine(bus);
        engine.start('classic');
        input = new InputSystem(engine);
    });

    afterEach(() => {
        input.detach();
        delete globalThis.window;
        delete globalThis.document;
        vi.restoreAllMocks();
    });

    it('initializes with default DAS (130ms), ARR (28ms), and SDF (32ms)', () => {
        expect(input.DAS_DELAY).toBe(130);
        expect(input.ARR_RATE).toBe(28);
        expect(input.SDF_RATE).toBe(32);
        expect(input.currentHorizontalDir).toBe(0);
        expect(input.hardDropLocked).toBe(false);
    });

    it('attaches and detaches event listeners cleanly', () => {
        input.attach();
        expect(input.attached).toBe(true);

        input.detach();
        expect(input.attached).toBe(false);
        expect(input.currentHorizontalDir).toBe(0);
        expect(input.heldKeys.size).toBe(0);
    });

    it('executes instant shift and starts DAS/ARR on directional keydown', () => {
        const moveSpy = vi.spyOn(engine, 'movePiece');

        // Initial keydown: immediate shift
        input.onKeyDown({ code: 'ArrowLeft', preventDefault: vi.fn(), repeat: false });
        expect(moveSpy).toHaveBeenCalledTimes(1);
        expect(moveSpy).toHaveBeenCalledWith(-1);
        expect(input.currentHorizontalDir).toBe(-1);

        // Before DAS expires (at 100ms): no extra move
        vi.advanceTimersByTime(100);
        expect(moveSpy).toHaveBeenCalledTimes(1);

        // After DAS expires (130ms): ARR starts firing
        vi.advanceTimersByTime(30);
        expect(input.arrTimer).not.toBeNull();

        // 2 ARR steps (2 * 28ms = 56ms)
        vi.advanceTimersByTime(60);
        expect(moveSpy.mock.calls.length).toBeGreaterThanOrEqual(3);

        // KeyUp stops DAS/ARR
        input.onKeyUp({ code: 'ArrowLeft' });
        expect(input.currentHorizontalDir).toBe(0);
        expect(input.dasTimer).toBeNull();
        expect(input.arrTimer).toBeNull();
    });

    it('resolves SOCD: pressing Right while Left is held immediately switches direction', () => {
        const moveSpy = vi.spyOn(engine, 'movePiece');

        // Hold Left
        input.onKeyDown({ code: 'KeyA', preventDefault: vi.fn(), repeat: false });
        expect(input.currentHorizontalDir).toBe(-1);
        expect(moveSpy).toHaveBeenLastCalledWith(-1);

        // Press Right while Left is still held
        input.onKeyDown({ code: 'KeyD', preventDefault: vi.fn(), repeat: false });
        expect(input.currentHorizontalDir).toBe(1);
        expect(moveSpy).toHaveBeenLastCalledWith(1);

        // Release Right: switches back to remaining held Left key
        input.onKeyUp({ code: 'KeyD' });
        expect(input.currentHorizontalDir).toBe(-1);
        expect(moveSpy).toHaveBeenLastCalledWith(-1);

        // Release Left
        input.onKeyUp({ code: 'KeyA' });
        expect(input.currentHorizontalDir).toBe(0);
    });

    it('handles rapid soft drop on KeyDown and stops on KeyUp', () => {
        const softDropSpy = vi.spyOn(engine, 'softDrop');

        input.onKeyDown({ code: 'ArrowDown', preventDefault: vi.fn(), repeat: false });
        expect(softDropSpy).toHaveBeenCalledTimes(1);
        expect(input.softDropTimer).not.toBeNull();

        // Advance timers by 100ms (~3 SDF ticks)
        vi.advanceTimersByTime(100);
        expect(softDropSpy.mock.calls.length).toBeGreaterThanOrEqual(3);

        input.onKeyUp({ code: 'ArrowDown' });
        expect(input.softDropTimer).toBeNull();
    });

    it('prevents repeated hard drops with debounce lock', () => {
        const hardDropSpy = vi.spyOn(engine, 'hardDrop');

        // First press: executes hard drop
        input.onKeyDown({ code: 'Space', preventDefault: vi.fn(), repeat: false });
        expect(hardDropSpy).toHaveBeenCalledTimes(1);
        expect(input.hardDropLocked).toBe(true);

        // Repeated keydown while held (OS repeat): ignored
        input.onKeyDown({ code: 'Space', preventDefault: vi.fn(), repeat: true });
        expect(hardDropSpy).toHaveBeenCalledTimes(1);

        // KeyUp unlocks hard drop
        input.onKeyUp({ code: 'Space' });
        expect(input.hardDropLocked).toBe(false);

        // Subsequent press works
        input.onKeyDown({ code: 'Space', preventDefault: vi.fn(), repeat: false });
        expect(hardDropSpy).toHaveBeenCalledTimes(2);
    });

    it('triggers rotate CW and CCW cleanly', () => {
        const rotateSpy = vi.spyOn(engine, 'rotatePiece');

        // CW: ArrowUp, KeyW, KeyX
        input.onKeyDown({ code: 'ArrowUp', preventDefault: vi.fn(), repeat: false });
        expect(rotateSpy).toHaveBeenLastCalledWith(1);

        input.onKeyDown({ code: 'KeyW', preventDefault: vi.fn(), repeat: false });
        expect(rotateSpy).toHaveBeenLastCalledWith(1);

        input.onKeyDown({ code: 'KeyX', preventDefault: vi.fn(), repeat: false });
        expect(rotateSpy).toHaveBeenLastCalledWith(1);

        // CCW: KeyZ
        input.onKeyDown({ code: 'KeyZ', preventDefault: vi.fn(), repeat: false });
        expect(rotateSpy).toHaveBeenLastCalledWith(-1);
    });

    it('triggers hold piece on KeyC and Shift', () => {
        const holdSpy = vi.spyOn(engine, 'holdPiece');

        input.onKeyDown({ code: 'KeyC', preventDefault: vi.fn(), repeat: false });
        expect(holdSpy).toHaveBeenCalledTimes(1);

        input.onKeyDown({ code: 'ShiftLeft', preventDefault: vi.fn(), repeat: false });
        expect(holdSpy).toHaveBeenCalledTimes(2);
    });

    it('toggles pause on KeyP and Escape without repeat', () => {
        const pauseSpy = vi.spyOn(engine, 'togglePause');

        input.onKeyDown({ code: 'KeyP', preventDefault: vi.fn(), repeat: false });
        expect(pauseSpy).toHaveBeenCalledTimes(1);

        input.onKeyDown({ code: 'Escape', preventDefault: vi.fn(), repeat: false });
        expect(pauseSpy).toHaveBeenCalledTimes(2);

        // Repeated keydown ignored
        input.onKeyDown({ code: 'KeyP', preventDefault: vi.fn(), repeat: true });
        expect(pauseSpy).toHaveBeenCalledTimes(2);
    });

    it('clears all held keys and timers on window blur', () => {
        input.onKeyDown({ code: 'ArrowLeft', preventDefault: vi.fn(), repeat: false });
        expect(input.heldKeys.has('ArrowLeft')).toBe(true);
        expect(input.currentHorizontalDir).toBe(-1);

        input.onBlur();
        expect(input.heldKeys.size).toBe(0);
        expect(input.currentHorizontalDir).toBe(0);
        expect(input.dasTimer).toBeNull();
        expect(input.arrTimer).toBeNull();
    });
});
