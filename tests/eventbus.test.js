import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../src/core/EventBus.js';

describe('EventBus', () => {
    it('registers and triggers event callbacks with payload', () => {
        const bus = new EventBus();
        const callback = vi.fn();

        bus.on('test:event', callback);
        bus.emit('test:event', { foo: 'bar' });

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith({ foo: 'bar' });
    });

    it('unsubscribes using the returned unbind function', () => {
        const bus = new EventBus();
        const callback = vi.fn();

        const unsub = bus.on('test:event', callback);
        bus.emit('test:event', 1);
        expect(callback).toHaveBeenCalledTimes(1);

        unsub();
        bus.emit('test:event', 2);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('does not crash when a listener throws an error', () => {
        const bus = new EventBus();
        const badListener = () => { throw new Error('Boom'); };
        const goodListener = vi.fn();

        bus.on('test:event', badListener);
        bus.on('test:event', goodListener);

        expect(() => bus.emit('test:event', 'data')).not.toThrow();
        expect(goodListener).toHaveBeenCalledWith('data');
    });
});
