/**
 * System-wide Constants & Event Definitions
 */

export const BOARD = {
    COLS: 10,
    ROWS: 20,
    BLOCK_SIZE: 30
};

export const TIMINGS = {
    INITIAL_DROP_INTERVAL: 850,
    ZEN_DROP_INTERVAL: 950,
    MIN_DROP_INTERVAL: 110,
    SPEED_UP_PER_LEVEL: 62,
    OVERDRIVE_DURATION_MS: 8000
};

export const SCORING = {
    LINE_BASE_POINTS: [0, 100, 300, 500, 800],
    COMBO_BONUS_MULTIPLIER: 60,
    BOMB_DETONATION_BONUS: 250,
    OVERDRIVE_ACTIVATION_BONUS: 500,
    SOFT_DROP_POINTS: 1,
    HARD_DROP_POINTS_PER_CELL: 2
};

export const EVENTS = {
    GAME_START: 'game:start',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    GAME_OVER: 'game:over',
    PIECE_SPAWN: 'piece:spawn',
    PIECE_MOVE: 'piece:move',
    PIECE_ROTATE: 'piece:rotate',
    PIECE_HOLD: 'piece:hold',
    PIECE_LOCK: 'piece:lock',
    SOFT_DROP: 'piece:soft_drop',
    HARD_DROP: 'piece:hard_drop',
    LINE_CLEAR: 'board:line_clear',
    BOMB_DETONATE: 'board:bomb_detonate',
    ZEN_RESET: 'board:zen_reset',
    OVERDRIVE_CHARGE: 'overdrive:charge',
    OVERDRIVE_ACTIVATE: 'overdrive:activate',
    OVERDRIVE_EXPIRE: 'overdrive:expire',
    HUD_UPDATE: 'ui:hud_update',
    SCREEN_SHAKE: 'fx:shake',
    PARTICLES_SPAWN: 'fx:particles',
    FLOATING_TEXT: 'fx:floating_text'
};

export const GAME_MODES = {
    ARCADE: 'arcade',
    SPRINT: 'sprint',
    ZEN: 'zen'
};
