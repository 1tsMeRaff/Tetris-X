/**
 * CanvasRenderer - Main Playfield Visual Renderer
 * Renders precision matte blocks, architectural grid, and blueprint ghost piece.
 */

import { BOARD } from '../config/constants.js';

export class CanvasRenderer {
    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cols = BOARD.COLS;
        this.rows = BOARD.ROWS;
        this.blockSize = BOARD.BLOCK_SIZE;
    }

    /**
     * Render the complete board frame
     * @param {Board} board
     * @param {Piece|null} currentPiece
     * @param {boolean} isRunning
     * @param {string} theme - 'dark' | 'light'
     */
    render(board, currentPiece, isRunning, theme = 'dark') {
        const { ctx, canvas } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Architectural Grid Lines
        const gridColor = theme === 'light' ? 'rgba(20, 20, 19, 0.06)' : 'rgba(255, 255, 255, 0.04)';
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;

        for (let x = 1; x < this.cols; x++) {
            ctx.beginPath();
            ctx.moveTo(x * this.blockSize, 0);
            ctx.lineTo(x * this.blockSize, canvas.height);
            ctx.stroke();
        }
        for (let y = 1; y < this.rows; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * this.blockSize);
            ctx.lineTo(canvas.width, y * this.blockSize);
            ctx.stroke();
        }

        // 2. Draw Locked Grid Blocks
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const cell = board.grid[y][x];
                if (cell) {
                    this.drawBlock(
                        ctx,
                        x * this.blockSize,
                        y * this.blockSize,
                        this.blockSize,
                        cell.color,
                        cell.border,
                        1,
                        cell.isBomb
                    );
                }
            }
        }

        // 3. Draw Blueprint Ghost & Active Piece
        if (currentPiece && isRunning) {
            const ghostY = currentPiece.getGhostY(board);

            // Dashed blueprint ghost silhouette
            currentPiece.matrix.forEach((row, r) => {
                row.forEach((val, c) => {
                    if (val !== 0) {
                        const gx = (currentPiece.x + c) * this.blockSize;
                        const gy = (ghostY + r) * this.blockSize;
                        ctx.save();
                        ctx.strokeStyle = theme === 'light' ? 'rgba(20, 20, 19, 0.35)' : 'rgba(244, 244, 240, 0.3)';
                        ctx.lineWidth = 1.25;
                        ctx.setLineDash([3, 3]);
                        ctx.strokeRect(gx + 2.5, gy + 2.5, this.blockSize - 5, this.blockSize - 5);
                        ctx.restore();
                    }
                });
            });

            // Active falling piece
            currentPiece.matrix.forEach((row, r) => {
                row.forEach((val, c) => {
                    if (val !== 0) {
                        this.drawBlock(
                            ctx,
                            (currentPiece.x + c) * this.blockSize,
                            (currentPiece.y + r) * this.blockSize,
                            this.blockSize,
                            currentPiece.color,
                            currentPiece.border,
                            1,
                            val === 2
                        );
                    }
                });
            });
        }
    }

    /**
     * Draw individual architectural block cell
     */
    drawBlock(context, x, y, size, color, border, alpha = 1, isBomb = false) {
        context.save();
        context.globalAlpha = alpha;

        // Matte block fill with 3px architectural corner radius
        context.fillStyle = color;
        context.beginPath();
        context.roundRect(x + 1, y + 1, size - 2, size - 2, 3);
        context.fill();

        // Crisp 1px outline
        context.strokeStyle = border;
        context.lineWidth = 1;
        context.stroke();

        // Subtle top bevel reflection
        context.fillStyle = 'rgba(255, 255, 255, 0.16)';
        context.fillRect(x + 2.5, y + 2, size - 5, 2);

        // Thermal Bomb Core
        if (isBomb) {
            context.fillStyle = '#0A0A0B';
            context.fillRect(x + size * 0.28, y + size * 0.28, size * 0.44, size * 0.44);
            context.fillStyle = '#FF4D00';
            context.fillRect(x + size * 0.36, y + size * 0.36, size * 0.28, size * 0.28);
        }

        context.restore();
    }
}
