/**
 * Tetromino Shapes, Matrices & Architectural Palettes
 * Precision industrial colors conforming to Taste Skill v2
 */

export const TETROMINOES = {
    I: {
        type: 'I',
        matrix: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        color: '#E4E4E0',
        border: '#FFFFFF'
    },
    J: {
        type: 'J',
        matrix: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#5B7C99',
        border: '#8BAAC7'
    },
    L: {
        type: 'L',
        matrix: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#FF4D00',
        border: '#FF854D'
    },
    O: {
        type: 'O',
        matrix: [
            [1, 1],
            [1, 1]
        ],
        color: '#D9A026',
        border: '#F2C15A'
    },
    S: {
        type: 'S',
        matrix: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        color: '#3D8C68',
        border: '#68B892'
    },
    T: {
        type: 'T',
        matrix: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#8C8C96',
        border: '#B8B8C2'
    },
    Z: {
        type: 'Z',
        matrix: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        color: '#C84B31',
        border: '#E57A64'
    }
};

/**
 * Standard rotation wall kicks (SRS test offsets)
 */
export const WALL_KICKS = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [-2, 0],
    [2, 0]
];
