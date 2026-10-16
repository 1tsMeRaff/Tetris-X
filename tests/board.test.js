import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../src/core/Board.js';
import { Piece } from '../src/core/Piece.js';

describe('Board Matrix & Collision Model', () => {
    let board;

    beforeEach(() => {
        board = new Board(10, 20);
    });

    it('initializes a 10x20 empty grid', () => {
        expect(board.grid.length).toBe(20);
        expect(board.grid[0].length).toBe(10);
        expect(board.grid[0][0]).toBeNull();
    });

    it('detects boundary collisions correctly', () => {
        const piece = new Piece('O'); // 2x2 block
        piece.x = 0;
        piece.y = 0;

        // Inside board
        expect(board.collides(piece, 0, 0)).toBe(false);

        // Past left edge
        expect(board.collides(piece, -1, 0)).toBe(true);

        // Past right edge (cols = 10, width = 2, x=9 overflows)
        expect(board.collides(piece, 9, 0)).toBe(true);

        // Past bottom (rows = 20, height = 2, y=19 overflows)
        expect(board.collides(piece, 0, 19)).toBe(true);
    });

    it('locks piece and detects full row lines', () => {
        // Fill 9 columns of row 19
        for (let x = 0; x < 9; x++) {
            board.grid[19][x] = { color: '#FFF', border: '#FFF', isBomb: false };
        }

        // Drop a 1-width block at x=9, y=19
        const customPiece = {
            matrix: [[1]],
            color: '#FF4D00',
            border: '#FF854D',
            x: 9,
            y: 19
        };

        board.lockPiece(customPiece);
        expect(board.grid[19][9]).not.toBeNull();

        const { fullRows } = board.findFullRows();
        expect(fullRows).toEqual([19]);

        board.clearRows(fullRows);
        expect(board.grid.length).toBe(20);
        expect(board.grid[19].every(c => c === null)).toBe(true);
    });

    it('detonates 3x3 surrounding cells on thermal bomb trigger', () => {
        // Fill 3x3 area
        for (let y = 10; y <= 12; y++) {
            for (let x = 4; x <= 6; x++) {
                board.grid[y][x] = { color: '#E4E4E0', border: '#FFF', isBomb: (x === 5 && y === 11) };
            }
        }

        const destroyed = board.detonateBombArea(5, 11);
        expect(destroyed.length).toBe(9);

        // Verify 3x3 area is now null
        for (let y = 10; y <= 12; y++) {
            for (let x = 4; x <= 6; x++) {
                expect(board.grid[y][x]).toBeNull();
            }
        }
    });

    it('blasts bottom 3 rows on overdrive activation', () => {
        board.grid[18][0] = { color: '#FF4D00', border: '#FFF', isBomb: false };
        board.grid[19][0] = { color: '#FF4D00', border: '#FFF', isBomb: false };

        const destroyed = board.blastBottomRows(3);
        expect(destroyed.length).toBe(2);
        expect(board.grid.length).toBe(20);
        expect(board.grid[18][0]).toBeNull();
        expect(board.grid[19][0]).toBeNull();
    });

    it('zenReset clears 6 bottom rows and maintains 20 rows total', () => {
        board.grid[19][0] = { color: '#FFF', border: '#FFF', isBomb: false };
        board.zenReset(6);

        expect(board.grid.length).toBe(20);
        expect(board.grid[19][0]).toBeNull();
    });
});
