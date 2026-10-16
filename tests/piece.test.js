import { describe, it, expect } from 'vitest';
import { Piece } from '../src/core/Piece.js';
import { Board } from '../src/core/Board.js';

describe('Piece Model & Rotation Mathematics', () => {
    it('creates a piece with standard dimensions and color', () => {
        const piece = new Piece('T');
        expect(piece.type).toBe('T');
        expect(piece.matrix.length).toBe(3);
        expect(piece.color).toBe('#8C8C96');
        expect(piece.x).toBeGreaterThanOrEqual(0);
        expect(piece.y).toBe(0);
    });

    it('rotates matrix 90 degrees clockwise and counter-clockwise', () => {
        const original = [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ];

        const cw = Piece.rotateMatrix(original, 1);
        expect(cw).toEqual([
            [0, 1, 0],
            [0, 1, 1],
            [0, 1, 0]
        ]);

        const ccw = Piece.rotateMatrix(cw, -1);
        expect(ccw).toEqual(original);
    });

    it('calculates ghost projection Y coordinate accurately', () => {
        const board = new Board(10, 20);
        const piece = new Piece('I');
        piece.x = 3;
        piece.y = 0;

        // Ghost Y for I piece on an empty 20-row board
        const ghostY = piece.getGhostY(board);
        expect(ghostY).toBe(18); // Matrix of I is 4x4, row 1 is [1,1,1,1], so y=18 puts block on row 19

        // If row 19 is occupied, ghost Y should be 17
        board.grid[19][3] = { color: '#FFF' };
        expect(piece.getGhostY(board)).toBe(17);
    });

    it('performs SRS wall kicks when rotating near edges', () => {
        const board = new Board(10, 20);
        const piece = new Piece('T');
        piece.x = -1; // Against the left boundary
        piece.y = 5;

        // For CCW rotation, column 0 contains blocks which forces a wall-kick offset kx = 1
        const rotated = piece.tryRotate(board, -1);
        expect(rotated).toBe(true);
        expect(piece.x).toBeGreaterThanOrEqual(0);
    });

    it('clones a piece independently', () => {
        const piece = new Piece('L');
        piece.x = 4;
        piece.y = 7;

        const clone = piece.clone();
        expect(clone.type).toBe('L');
        expect(clone.x).toBe(4);
        expect(clone.y).toBe(7);

        clone.x = 8;
        expect(piece.x).toBe(4);
    });
});
