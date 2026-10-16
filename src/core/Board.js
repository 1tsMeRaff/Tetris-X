/**
 * Board Matrix Model & Collision Engine
 * Strictly DOM-independent domain logic for 10x20 Tetris grid.
 */

import { BOARD } from '../config/constants.js';

export class Board {
    constructor(cols = BOARD.COLS, rows = BOARD.ROWS) {
        this.cols = cols;
        this.rows = rows;
        this.grid = this.createEmptyGrid();
    }

    /**
     * Create an empty grid
     * @returns {Array<Array<null>>}
     */
    createEmptyGrid() {
        return Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    }

    /**
     * Reset the board to empty state
     */
    reset() {
        this.grid = this.createEmptyGrid();
    }

    /**
     * Check if piece position and orientation collides with board edges or existing locked blocks
     * @param {Object} piece - Piece with x, y, and matrix
     * @param {number} offsetX
     * @param {number} offsetY
     * @param {Array<Array<number>>|null} customMatrix
     * @returns {boolean} True if collision occurs
     */
    collides(piece, offsetX = 0, offsetY = 0, customMatrix = null) {
        const matrix = customMatrix || piece.matrix;
        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[y].length; x++) {
                if (matrix[y][x] !== 0) {
                    const newX = piece.x + x + offsetX;
                    const newY = piece.y + y + offsetY;

                    // Out of bounds horizontally or vertically past bottom
                    if (newX < 0 || newX >= this.cols || newY >= this.rows) {
                        return true;
                    }

                    // Collides with existing locked block on grid
                    if (newY >= 0 && this.grid[newY][newX] !== null) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Lock piece into board grid
     * @param {Object} piece
     */
    lockPiece(piece) {
        piece.matrix.forEach((row, r) => {
            row.forEach((val, c) => {
                if (val !== 0) {
                    const gy = piece.y + r;
                    const gx = piece.x + c;
                    if (gy >= 0 && gy < this.rows && gx >= 0 && gx < this.cols) {
                        this.grid[gy][gx] = {
                            color: piece.color,
                            border: piece.border,
                            isBomb: val === 2
                        };
                    }
                }
            });
        });
    }

    /**
     * Detect full rows and find any bomb triggers
     * @returns {{ fullRows: number[], bombCells: Array<{x: number, y: number}> }}
     */
    findFullRows() {
        const fullRows = [];
        const bombCells = [];

        for (let y = 0; y < this.rows; y++) {
            if (this.grid[y].every(cell => cell !== null)) {
                fullRows.push(y);
                for (let x = 0; x < this.cols; x++) {
                    const cell = this.grid[y][x];
                    if (cell && cell.isBomb) {
                        bombCells.push({ x, y });
                    }
                }
            }
        }

        return { fullRows, bombCells };
    }

    /**
     * Detonate 3x3 area around bomb coordinate
     * @param {number} cx
     * @param {number} cy
     * @returns {Array<{x: number, y: number, color: string}>} Destroyed cells
     */
    detonateBombArea(cx, cy) {
        const destroyed = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const ny = cy + dy;
                const nx = cx + dx;
                if (ny >= 0 && ny < this.rows && nx >= 0 && nx < this.cols && this.grid[ny][nx]) {
                    destroyed.push({
                        x: nx,
                        y: ny,
                        color: this.grid[ny][nx].color
                    });
                    this.grid[ny][nx] = null;
                }
            }
        }
        return destroyed;
    }

    /**
     * Clear specified full rows and shift remaining rows down
     * @param {number[]} rowIndices
     */
    clearRows(rowIndices) {
        // Sort descending to safely splice from bottom up
        const sorted = [...rowIndices].sort((a, b) => b - a);
        sorted.forEach(ry => {
            this.grid.splice(ry, 1);
            this.grid.unshift(Array(this.cols).fill(null));
        });
    }

    /**
     * Blast bottom rows (Overdrive pulse)
     * @param {number} rowCount
     * @returns {Array<{x: number, y: number, color: string}>}
     */
    blastBottomRows(rowCount = 3) {
        const destroyed = [];
        const startY = Math.max(0, this.rows - rowCount);

        for (let r = startY; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c]) {
                    destroyed.push({ x: c, y: r, color: this.grid[r][c].color });
                }
            }
        }

        this.grid.splice(startY, rowCount);
        for (let i = 0; i < rowCount; i++) {
            this.grid.unshift(Array(this.cols).fill(null));
        }

        return destroyed;
    }

    /**
     * Zen mode auto-clear: clear bottom rows when grid hits top
     * @param {number} count
     */
    zenReset(count = 6) {
        this.grid.splice(this.rows - count, count);
        while (this.grid.length < this.rows) {
            this.grid.unshift(Array(this.cols).fill(null));
        }
    }
}
