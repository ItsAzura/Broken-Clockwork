/*
 * input.js
 * Keyboard event handling. Tracks held keys + edge-triggered "just pressed".
 */

const held = Object.create(null);
const pressed = Object.create(null);

const KEY_ALIASES = {
    'ArrowLeft': 'LEFT',
    'ArrowRight': 'RIGHT',
    'ArrowUp': 'UP',
    'ArrowDown': 'DOWN',
    'a': 'LEFT', 'A': 'LEFT',
    'd': 'RIGHT', 'D': 'RIGHT',
    'w': 'UP', 'W': 'UP',
    's': 'DOWN', 'S': 'DOWN',
    ' ': 'SPACE',
    'e': 'WIND', 'E': 'WIND',
    'r': 'RETRY', 'R': 'RETRY',
    'p': 'PAUSE', 'P': 'PAUSE',
    'Escape': 'PAUSE',
    'Enter': 'SPACE',
};

function normalize(e) {
    return KEY_ALIASES[e.key] || e.key.toUpperCase();
}

export function initInput() {
    window.addEventListener('keydown', (e) => {
        const k = normalize(e);
        if (!held[k]) pressed[k] = true;
        held[k] = true;
        if (k === 'SPACE' || k === 'UP' || k === 'WIND' || k === 'PAUSE'
            || e.key.startsWith('Arrow')) {
            e.preventDefault();
        }
    });
    window.addEventListener('keyup', (e) => {
        const k = normalize(e);
        held[k] = false;
    });
    window.addEventListener('blur', () => {
        for (const k in held) held[k] = false;
    });
}

export function isHeld(name) { return !!held[name]; }
export function justPressed(name) { return !!pressed[name]; }

export function clearPressed() {
    for (const k in pressed) pressed[k] = false;
}
