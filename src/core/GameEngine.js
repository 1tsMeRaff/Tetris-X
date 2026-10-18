/**
 * GameEngine - Central Game Logic Coordinator
 * Manages board state, gravity loop, inputs, scoring calculations, and event emissions.
 * Pure DOM-independent core conforming to SRP, DIP, and OCP.
 */

import { Board } from './Board.js';
import { PieceBag } from './PieceBag.js';
import { GameState } from './GameState.js';
import { ArcadeMode } from '../modes/ArcadeMode.js';
import { SprintMode } from '../modes/SprintMode.js';
import { ZenMode } from '../modes/ZenMode.js';
import { EVENTS, SCORING, BOARD } from '../config/constants.js';

export class GameEngine {
    /**
     * @param {EventBus} bus
     * @param {StorageSystem} storage
     */
    constructor(bus, storage = null) {
        this.bus = bus;
        this.storage = storage;
        this.board = new Board(BOARD.COLS, BOARD.ROWS);
        this.pieceBag = new PieceBag();
        this.state = new GameState();

        // Register polymorphic game modes
        this.modes = {
            arcade: new ArcadeMode(),
            sprint: new SprintMode(),
            zen: new ZenMode()
        };

        // Wire engine back-reference to all modes
        Object.values(this.modes).forEach(mode => mode.init(this));
        this.activeMode = this.modes.arcade;
    }

    /**
     * Start a new game session with selected mode
     * @param {string} modeKey - 'arcade' | 'sprint' | 'zen'
     */
    start(modeKey = 'arcade') {
        const selectedMode = this.modes[modeKey] || this.modes.arcade;
        this.activeMode = selectedMode;

        const highScore = this.storage ? this.storage.getHighScore() : 0;
        this.state.reset(modeKey, highScore);
        this.board.reset();
        this.pieceBag.reset();

        // Connect mode-specific piece modifiers (e.g. bomb core generator)
        this.pieceBag.setPieceModifier(piece => this.activeMode.modifyPiece(piece));

        this.state.currentPiece = this.pieceBag.pullNext();
        this.state.running = true;
        this.state.paused = false;
        this.state.startTime = performance.now();

        this.bus.emit(EVENTS.GAME_START, {
            mode: this.activeMode.slug,
            modeName: this.activeMode.name,
            piece: this.state.currentPiece,
            nextQueue: this.pieceBag.queue,
            holdPiece: this.state.holdPiece
        });

        this.emitHudUpdate();
    }

    /**
     * Toggle game pause state
     */
    togglePause() {
        if (!this.state.running) return;
        this.state.paused = !this.state.paused;

        if (this.state.paused) {
            this.bus.emit(EVENTS.GAME_PAUSE);
        } else {
            this.bus.emit(EVENTS.GAME_RESUME);
        }
    }

    /**
     * Game over handler
     * @param {boolean} isVictory
     */
    triggerGameOver(isVictory = false) {
        this.state.running = false;
        if (this.storage) {
            this.storage.saveHighScore(this.state.highScore);
        }

        const elapsedSec = ((performance.now() - this.state.startTime) / 1000).toFixed(1);

        this.bus.emit(EVENTS.GAME_OVER, {
            isVictory,
            mode: this.state.mode,
            score: this.state.score,
            highScore: this.state.highScore,
            isNewRecord: this.state.score >= this.state.highScore && this.state.score > 0,
            elapsedSeconds: elapsedSec
        });
    }

    /**
     * Engine loop tick called by animation frame
     * @param {number} deltaTime
     * @param {number} currentTime
     */
    update(deltaTime, currentTime) {
        if (!this.state.running || this.state.paused) return;

        // Mode tick hook
        this.activeMode.onTick(deltaTime);

        // Update elapsed session timer
        const sec = Math.floor((currentTime - this.state.startTime) / 1000);
        if (sec !== this.state.elapsedSeconds) {
            this.state.elapsedSeconds = sec;
            this.emitHudUpdate();
        }

        // Overdrive frenzy countdown
        if (this.state.frenzyTimer > 0) {
            this.state.frenzyTimer -= deltaTime;
            if (this.state.frenzyTimer <= 0) {
                this.state.frenzyTimer = 0;
                this.bus.emit(EVENTS.OVERDRIVE_EXPIRE);
            }
        }

        // Gravity drop step
        this.state.dropCounter += deltaTime;
        if (this.state.dropCounter > this.state.dropInterval) {
            if (!this.board.collides(this.state.currentPiece, 0, 1)) {
                this.state.currentPiece.y++;
            } else {
                this.lockPiece();
            }
            this.state.dropCounter = 0;
        }
    }

    /**
     * Move active piece horizontally
     * @param {number} dir - -1 for Left, 1 for Right
     */
    movePiece(dir) {
        if (!this.state.running || this.state.paused || !this.state.currentPiece) return;
        if (!this.board.collides(this.state.currentPiece, dir, 0)) {
            this.state.currentPiece.x += dir;
            this.bus.emit(EVENTS.PIECE_MOVE, { dir });
        }
    }

    /**
     * Rotate active piece
     * @param {number} dir - 1 for CW, -1 for CCW
     */
    rotatePiece(dir = 1) {
        if (!this.state.running || this.state.paused || !this.state.currentPiece) return;
        if (this.state.currentPiece.tryRotate(this.board, dir)) {
            this.bus.emit(EVENTS.PIECE_ROTATE, { dir });
        }
    }

    /**
     * Soft drop active piece by 1 row
     */
    softDrop() {
        if (!this.state.running || this.state.paused || !this.state.currentPiece) return;
        if (!this.board.collides(this.state.currentPiece, 0, 1)) {
            this.state.currentPiece.y++;
            this.state.addRawScore(SCORING.SOFT_DROP_POINTS);
            this.state.dropCounter = 0;
            this.bus.emit(EVENTS.SOFT_DROP);
            this.emitHudUpdate();
        } else {
            this.lockPiece();
        }
    }

    /**
     * Instantly hard drop piece to ghost landing
     */
    hardDrop() {
        if (!this.state.running || this.state.paused || !this.state.currentPiece) return;
        const startY = this.state.currentPiece.y;
        const targetY = this.state.currentPiece.getGhostY(this.board);
        const droppedCells = Math.max(0, targetY - startY);

        this.state.currentPiece.y = targetY;
        this.state.addRawScore(droppedCells * SCORING.HARD_DROP_POINTS_PER_CELL);

        this.bus.emit(EVENTS.HARD_DROP, {
            piece: this.state.currentPiece,
            droppedCells
        });

        this.lockPiece();
    }

    /**
     * Hold active piece / swap with hold piece
     */
    holdPiece() {
        if (!this.state.running || this.state.paused || !this.state.canHold || !this.state.currentPiece) return;

        const currentType = this.state.currentPiece.type;
        if (!this.state.holdPiece) {
            this.state.holdPiece = this.pieceBag.createPiece(currentType);
            this.state.currentPiece = this.pieceBag.pullNext();
        } else {
            const swapType = this.state.holdPiece.type;
            this.state.holdPiece = this.pieceBag.createPiece(currentType);
            this.state.currentPiece = this.pieceBag.createPiece(swapType);
        }

        this.state.canHold = false;
        this.bus.emit(EVENTS.PIECE_HOLD, {
            holdPiece: this.state.holdPiece,
            currentPiece: this.state.currentPiece
        });
    }

    /**
     * Lock current piece into board and evaluate lines/bombs
     */
    lockPiece() {
        const piece = this.state.currentPiece;
        this.board.lockPiece(piece);

        this.bus.emit(EVENTS.PIECE_LOCK, { piece });

        this.handleCompletedLines();

        // Pull next piece
        this.state.currentPiece = this.pieceBag.pullNext();
        this.state.canHold = true;
        this.state.dropCounter = 0;

        // Check if new piece top-collides (Game Over check)
        if (this.board.collides(this.state.currentPiece, 0, 0)) {
            const result = this.activeMode.checkGameOver(true);
            if (result.isGameOver) {
                this.triggerGameOver(result.isVictory);
            }
        }

        this.bus.emit(EVENTS.PIECE_SPAWN, {
            currentPiece: this.state.currentPiece,
            nextQueue: this.pieceBag.queue,
            holdPiece: this.state.holdPiece
        });
    }

    /**
     * Check for completed rows, bomb detonations, and scoring
     */
    handleCompletedLines() {
        let totalLinesCleared = 0;
        let round = 0;

        while (round < 10) {
            const { fullRows, bombCells } = this.board.findFullRows();
            if (fullRows.length === 0) break;

            round++;
            const count = fullRows.length;
            totalLinesCleared += count;

            // 1. Capture pristine row colors for particles before any modifications
            const rowData = fullRows.map(ry => ({
                rowIndex: ry,
                cells: this.board.grid[ry].map((c, x) => ({ x, y: ry, color: c ? c.color : '#F4F4F0' }))
            }));

            // 2. Clear full rows FIRST: completed line(s) explode and drop
            this.board.clearRows(fullRows);

            // 3. Detonate thermal bombs AFTER line clear (upward & horizontal only, protecting lower foundation)
            let bombTriggered = false;
            if (bombCells.length > 0) {
                bombTriggered = true;
                bombCells.forEach(({ x, y }) => {
                    // In post-clear board, target epicenter is at y
                    const targetY = Math.min(this.board.rows - 1, y);
                    const destroyed = this.board.detonateBombArea(x, targetY, false);
                    this.bus.emit(EVENTS.BOMB_DETONATE, { x, y: targetY, destroyed });
                });

                // 4. Cascade Gravity: collapse all floating blocks down to fill any gaps
                this.board.applyCascadeGravity();
            }

            this.state.combo++;
            this.state.lines += count;

            const basePoints = SCORING.LINE_BASE_POINTS[count] || (count * 250);
            const comboBonus = this.state.combo > 0 ? this.state.combo * SCORING.COMBO_BONUS_MULTIPLIER : 0;
            const bombBonus = bombTriggered ? SCORING.BOMB_DETONATION_BONUS : 0;

            const totalEarned = this.state.addScore(basePoints + comboBonus + bombBonus);

            // Notify mode strategy
            this.activeMode.onLineClear(count, bombTriggered, fullRows);

            // Update level speed progression
            this.state.updateLevelProgression();

            // Emit events
            this.bus.emit(EVENTS.LINE_CLEAR, {
                count,
                combo: this.state.combo,
                totalEarned,
                bombTriggered,
                fullRows,
                rowData
            });

            // If no bombs detonated in this round, standard drop is strictly uniform; no cascading blocks can form new lines
            if (!bombTriggered) {
                break;
            }
        }

        if (totalLinesCleared === 0) {
            this.state.combo = -1;
        }

        this.emitHudUpdate();
    }

    /**
     * Activate overdrive powerup if supported by active mode
     */
    activateOverdrive() {
        if (this.activeMode.canActivateOverdrive()) {
            this.activeMode.activateOverdrive();
        }
    }

    /**
     * Broadcast current HUD state to presentation listeners
     */
    emitHudUpdate() {
        if (this.storage && this.state.score > this.state.highScore) {
            this.state.highScore = this.state.score;
            this.storage.saveHighScore(this.state.highScore);
        }

        this.bus.emit(EVENTS.HUD_UPDATE, {
            score: this.state.score,
            highScore: this.state.highScore,
            level: this.state.level,
            lines: this.state.lines,
            combo: this.state.combo,
            overdrive: this.state.overdrive,
            frenzyTimer: this.state.frenzyTimer,
            elapsedSeconds: this.state.elapsedSeconds,
            canOverdrive: this.activeMode.canActivateOverdrive()
        });
    }
}
