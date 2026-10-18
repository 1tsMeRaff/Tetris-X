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

    it('detonates 3x3 surrounding cells when allowDownward is true', () => {
        // Fill 3x3 area
        for (let y = 10; y <= 12; y++) {
            for (let x = 4; x <= 6; x++) {
                board.grid[y][x] = { color: '#E4E4E0', border: '#FFF', isBomb: (x === 5 && y === 11) };
            }
        }

        const destroyed = board.detonateBombArea(5, 11, true);
        expect(destroyed.length).toBe(9);

        // Verify 3x3 area is now null
        for (let y = 10; y <= 12; y++) {
            for (let x = 4; x <= 6; x++) {
                expect(board.grid[y][x]).toBeNull();
            }
        }
    });

    it('detonates upward and horizontally without destroying bottom row when allowDownward is false', () => {
        // Fill 3x3 area around center (5, 11)
        for (let y = 10; y <= 12; y++) {
            for (let x = 4; x <= 6; x++) {
                board.grid[y][x] = { color: '#E4E4E0', border: '#FFF', isBomb: (x === 5 && y === 11) };
            }
        }

        // Bomb detonates with default allowDownward = false
        const destroyed = board.detonateBombArea(5, 11, false);
        expect(destroyed.length).toBe(6); // 3 from y=10 (above), 3 from y=11 (current)

        // Verify y=10 and y=11 are cleared
        for (let y = 10; y <= 11; y++) {
            for (let x = 4; x <= 6; x++) {
                expect(board.grid[y][x]).toBeNull();
            }
        }

        // Verify bottom row y=12 is completely intact (foundation protected!)
        for (let x = 4; x <= 6; x++) {
            expect(board.grid[12][x]).not.toBeNull();
            expect(board.grid[12][x].color).toBe('#E4E4E0');
        }
    });

    it('applyCascadeGravity collapses floating blocks down to fill bottom gaps', () => {
        // Column 0: gap at bottom (y=19), block at y=18, gap at y=17, block at y=16
        board.grid[18][0] = { color: '#FF4D00', border: '#FFF', isBomb: false };
        board.grid[16][0] = { color: '#00F0FF', border: '#FFF', isBomb: false };

        expect(board.grid[19][0]).toBeNull();
        expect(board.grid[18][0]).not.toBeNull();
        expect(board.grid[17][0]).toBeNull();
        expect(board.grid[16][0]).not.toBeNull();

        const moved = board.applyCascadeGravity();
        expect(moved).toBe(2);

        // Blocks must now be stacked solidly at bottom (y=19 and y=18)
        expect(board.grid[19][0]).not.toBeNull();
        expect(board.grid[19][0].color).toBe('#FF4D00');
        expect(board.grid[18][0]).not.toBeNull();
        expect(board.grid[18][0].color).toBe('#00F0FF');
        expect(board.grid[17][0]).toBeNull();
        expect(board.grid[16][0]).toBeNull();
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

    it('line clear with bomb cleans line first, detonates upward, and settles grid without leaving holes below', () => {
        // Row 19: Bottom foundation with blocks at cols 0, 1, 2 and 7, 8, 9
        [0, 1, 2, 7, 8, 9].forEach(x => {
            board.grid[19][x] = { color: '#444', border: '#666', isBomb: false };
        });

        // Row 18: Full line with a thermal bomb at x=5
        for (let x = 0; x < 10; x++) {
            board.grid[18][x] = { color: '#FF4D00', border: '#FFF', isBomb: (x === 5) };
        }

        // Row 17: Stack above bomb at cols 4, 5, 6 (will drop to row 18, destroyed by dy=0)
        [4, 5, 6].forEach(x => {
            board.grid[17][x] = { color: '#00F0FF', border: '#FFF', isBomb: false };
        });

        // Row 14: Surviving block at col 5 (outside blast radius)
        board.grid[14][5] = { color: '#FFE600', border: '#FFF', isBomb: false };

        // 1. Detect full rows
        const { fullRows, bombCells } = board.findFullRows();
        expect(fullRows).toEqual([18]);
        expect(bombCells).toEqual([{ x: 5, y: 18 }]);

        // 2. Clear full rows first
        board.clearRows(fullRows);

        // 3. Detonate bomb upward with allowDownward = false
        const destroyed = board.detonateBombArea(5, 18, false);
        expect(destroyed.length).toBeGreaterThan(0);

        // 4. Cascade gravity
        board.applyCascadeGravity();

        // Foundation at row 19 must NOT have been destroyed (no holes created in bottom foundation!)
        [0, 1, 2, 7, 8, 9].forEach(x => {
            expect(board.grid[19][x]).not.toBeNull();
            expect(board.grid[19][x].color).toBe('#444');
        });

        // The block originally at row 14 (col 5) survived and cascaded down to row 19 (which was empty at col 5)
        expect(board.grid[19][5]).not.toBeNull();
        expect(board.grid[19][5].color).toBe('#FFE600');
    });
});
