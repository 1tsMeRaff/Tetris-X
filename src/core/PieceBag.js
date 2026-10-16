/**
 * 7-Bag Randomizer Generator & Piece Queue
 * Standard Tetris randomizer preventing long drought of any single tetromino.
 */

import { Piece } from './Piece.js';

export class PieceBag {
    constructor() {
        this.bag = [];
        this.queue = [];
        this.pieceModifier = null; // Optional modifier hook for game modes (e.g., Arcade bomb)
    }

    /**
     * Set a custom modifier function (e.g. for spawning bomb blocks)
     * @param {Function|null} modifierFn
     */
    setPieceModifier(modifierFn) {
        this.pieceModifier = modifierFn;
    }

    /**
     * Refill the 7-bag with a randomly shuffled permutation of the 7 pieces
     */
    refillBag() {
        const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
        for (let i = types.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [types[i], types[j]] = [types[j], types[i]];
        }
        this.bag.push(...types);
    }

    /**
     * Create a piece, applying any active modifier
     * @param {string} type
     * @returns {Piece}
     */
    createPiece(type) {
        const piece = new Piece(type);
        if (this.pieceModifier) {
            this.pieceModifier(piece);
        }
        return piece;
    }

    /**
     * Ensure queue has at least minCount upcoming pieces
     * @param {number} minCount
     */
    ensureQueue(minCount = 3) {
        while (this.bag.length < 7) {
            this.refillBag();
        }
        while (this.queue.length < minCount) {
            const type = this.bag.shift();
            this.queue.push(this.createPiece(type));
        }
    }

    /**
     * Pull next piece from queue and append a newly generated one
     * @returns {Piece}
     */
    pullNext() {
        this.ensureQueue(3);
        const next = this.queue.shift();
        if (this.bag.length === 0) {
            this.refillBag();
        }
        this.queue.push(this.createPiece(this.bag.shift()));
        return next;
    }

    /**
     * Reset the bag and queue
     */
    reset() {
        this.bag = [];
        this.queue = [];
    }
}
