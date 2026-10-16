/**
 * Piece Domain Model
 * Encapsulates tetromino representation, rotation mathematics, and SRS wall kicks.
 */

import { TETROMINOES, WALL_KICKS } from '../config/tetrominoes.js';
import { BOARD } from '../config/constants.js';

export class Piece {
    /**
     * @param {string} type - 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z'
     * @param {Array<Array<number>>|null} matrix
     * @param {string|null} color
     * @param {string|null} border
     */
    constructor(type, matrix = null, color = null, border = null) {
        const template = TETROMINOES[type] || TETROMINOES.I;
        this.type = type;
        this.matrix = matrix ? matrix.map(row => [...row]) : template.matrix.map(row => [...row]);
        this.color = color || template.color;
        this.border = border || template.border;

        // Centered horizontal spawn
        this.x = Math.floor(BOARD.COLS / 2) - Math.ceil(this.matrix[0].length / 2);
        this.y = 0;
    }

    /**
     * Rotate square matrix 90 degrees
     * @param {Array<Array<number>>} matrix
     * @param {number} dir - 1 for Clockwise, -1 for Counter-Clockwise
     * @returns {Array<Array<number>>}
     */
    static rotateMatrix(matrix, dir = 1) {
        const N = matrix.length;
        const result = Array.from({ length: N }, () => Array(N).fill(0));
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                if (dir > 0) {
                    result[x][N - 1 - y] = matrix[y][x];
                } else {
                    result[N - 1 - x][y] = matrix[y][x];
                }
            }
        }
        return result;
    }

    /**
     * Attempt rotation with SRS wall kicks against board
     * @param {Board} board
     * @param {number} dir - 1 for CW, -1 for CCW
     * @returns {boolean} True if rotated successfully
     */
    tryRotate(board, dir = 1) {
        const rotated = Piece.rotateMatrix(this.matrix, dir);

        for (const [kx, ky] of WALL_KICKS) {
            if (!board.collides(this, kx, ky, rotated)) {
                this.matrix = rotated;
                this.x += kx;
                this.y += ky;
                return true;
            }
        }
        return false;
    }

    /**
     * Calculate ghost projection Y coordinate
     * @param {Board} board
     * @returns {number}
     */
    getGhostY(board) {
        let ghostY = this.y;
        while (!board.collides(this, 0, ghostY - this.y + 1)) {
            ghostY++;
        }
        return ghostY;
    }

    /**
     * Create an exact independent copy of this piece
     * @returns {Piece}
     */
    clone() {
        const p = new Piece(this.type, this.matrix, this.color, this.border);
        p.x = this.x;
        p.y = this.y;
        return p;
    }
}
