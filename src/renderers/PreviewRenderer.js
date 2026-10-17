/**
 * PreviewRenderer - Secondary Canvases Renderer (Hold & Next Queues)
 * Keeps desktop and mobile preview canvases synchronized with zero duplicated logic.
 */

export class PreviewRenderer {
    /**
     * @param {Object} canvases
     * @param {HTMLCanvasElement} canvases.holdDesktop
     * @param {HTMLCanvasElement} canvases.holdMobile
     * @param {HTMLCanvasElement} canvases.nextDesktop
     * @param {HTMLCanvasElement} canvases.nextMobile
     */
    constructor(canvases) {
        this.canvases = canvases;
        this.ctxs = {
            holdDesktop: canvases.holdDesktop ? canvases.holdDesktop.getContext('2d') : null,
            holdMobile: canvases.holdMobile ? canvases.holdMobile.getContext('2d') : null,
            nextDesktop: canvases.nextDesktop ? canvases.nextDesktop.getContext('2d') : null,
            nextMobile: canvases.nextMobile ? canvases.nextMobile.getContext('2d') : null
        };
    }

    /**
     * Render both Hold and Next preview queues
     * @param {Piece|null} holdPiece
     * @param {Piece[]} nextQueue
     */
    render(holdPiece, nextQueue) {
        this.renderHold(holdPiece);
        this.renderNext(nextQueue);
    }

    /**
     * Render Hold piece on desktop and mobile canvases
     * @param {Piece|null} piece
     */
    renderHold(piece) {
        const { holdDesktop, holdMobile } = this.canvases;
        const { holdDesktop: ctxD, holdMobile: ctxM } = this.ctxs;

        if (ctxD && holdDesktop) {
            ctxD.clearRect(0, 0, holdDesktop.width, holdDesktop.height);
            this.drawMiniPiece(ctxD, piece, holdDesktop.width / 2, holdDesktop.height / 2, 19);
        }

        if (ctxM && holdMobile) {
            ctxM.clearRect(0, 0, holdMobile.width, holdMobile.height);
            this.drawMiniPiece(ctxM, piece, holdMobile.width / 2, holdMobile.height / 2, 10);
        }
    }

    /**
     * Render Next queue on desktop and mobile canvases
     * @param {Piece[]} queue
     */
    renderNext(queue) {
        const { nextDesktop, nextMobile } = this.canvases;
        const { nextDesktop: ctxD, nextMobile: ctxM } = this.ctxs;

        if (ctxD && nextDesktop) {
            ctxD.clearRect(0, 0, nextDesktop.width, nextDesktop.height);
            queue.slice(0, 3).forEach((p, idx) => {
                this.drawMiniPiece(ctxD, p, nextDesktop.width / 2, 34 + idx * 66, 17);
            });
        }

        if (ctxM && nextMobile) {
            ctxM.clearRect(0, 0, nextMobile.width, nextMobile.height);
            if (queue && queue[0]) {
                this.drawMiniPiece(ctxM, queue[0], nextMobile.width / 2, nextMobile.height / 2, 10);
            }
        }
    }

    /**
     * Draw scaled mini-piece centered inside a bounding box
     */
    drawMiniPiece(context, piece, centerX, centerY, cellSize = 18) {
        if (!piece) return;
        const m = piece.matrix;
        const cols = m[0].length;
        const rows = m.length;
        const offsetX = centerX - (cols * cellSize) / 2;
        const offsetY = centerY - (rows * cellSize) / 2;

        context.lineWidth = 1;

        m.forEach((row, r) => {
            row.forEach((val, c) => {
                if (val !== 0) {
                    const x = offsetX + c * cellSize;
                    const y = offsetY + r * cellSize;

                    context.fillStyle = piece.color;
                    context.beginPath();
                    context.roundRect(x + 1, y + 1, cellSize - 2, cellSize - 2, 2);
                    context.fill();

                    context.strokeStyle = piece.border;
                    context.stroke();

                    if (val === 2) {
                        context.fillStyle = '#FF4D00';
                        context.fillRect(x + cellSize * 0.35, y + cellSize * 0.35, cellSize * 0.3, cellSize * 0.3);
                    }
                }
            });
        });
    }
}
