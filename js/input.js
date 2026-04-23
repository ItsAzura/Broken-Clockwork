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
    'l': 'SKIP', 'L': 'SKIP',
    'Escape': 'PAUSE',
    'Enter': 'SPACE',
};

function normalize(e) {
    return KEY_ALIASES[e.key] || e.key.toUpperCase();
}

export function initInput() {
    function onKeyDown(e) {
        const k = normalize(e);
        if (!held[k]) pressed[k] = true;
        held[k] = true;
        if (k === 'SPACE' || k === 'UP' || k === 'WIND' || k === 'PAUSE'
            || e.key.startsWith('Arrow')) {
            e.preventDefault();
        }
    }
    function onKeyUp(e) {
        const k = normalize(e);
        held[k] = false;
    }
    function onBlur() {
        for (const k in held) held[k] = false;
    }
    // Listen on both window and document for iframe compatibility (Wavedash)
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
}

export function isHeld(name) { return !!held[name]; }
export function justPressed(name) { return !!pressed[name]; }

export function clearPressed() {
    for (const k in pressed) pressed[k] = false;
}
