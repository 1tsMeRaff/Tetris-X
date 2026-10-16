/**
 * Type-Safe Publish/Subscribe Event Bus
 * Facilitates decoupled communication between Core, Systems, and Presentation layers.
 */

export class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event
     * @param {Function} callback
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event
     * @param {Function} callback
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    /**
     * Emit an event to all registered listeners
     * @param {string} event
     * @param {*} data
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            for (const cb of this.listeners.get(event)) {
                try {
                    cb(data);
                } catch (err) {
                    console.error(`Error in EventBus listener for "${event}":`, err);
                }
            }
        }
    }

    /**
     * Clear all listeners
     */
    clear() {
        this.listeners.clear();
    }
}
