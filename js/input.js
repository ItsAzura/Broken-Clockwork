/*
 * input.js
 * Keyboard event handling. Tracks held keys + edge-triggered "just pressed".
 * Supports control remapping via accessibility system (Requirement 13.5, 13.6, 13.7)
 */

const held = Object.create(null);
const pressed = Object.create(null);

// Default key aliases (can be overridden by accessibility system)
const DEFAULT_KEY_ALIASES = {
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
    't': 'SPEEDRUN_TOGGLE', 'T': 'SPEEDRUN_TOGGLE', // Use T key for speedrun toggle
    'm': 'M', 'M': 'M', // Level editor access
    'o': 'SETTINGS', 'O': 'SETTINGS', // Settings menu access (O for Options)
    'F12': 'ANALYTICS_DASHBOARD', // Analytics dashboard toggle
    'F3': 'PERFORMANCE_OVERLAY', // Performance overlay toggle
    'Escape': 'PAUSE',
    'Enter': 'SPACE',
    'Tab': 'DIFFICULTY', // Use Tab key for difficulty cycling
};

// Active key aliases (includes remapped controls)
let KEY_ALIASES = { ...DEFAULT_KEY_ALIASES };

// Reverse mapping for control remapping UI (action -> keys)
let ACTION_TO_KEYS = {};

function rebuildActionToKeys() {
    ACTION_TO_KEYS = {};
    for (const [key, action] of Object.entries(KEY_ALIASES)) {
        if (!ACTION_TO_KEYS[action]) {
            ACTION_TO_KEYS[action] = [];
        }
        ACTION_TO_KEYS[action].push(key);
    }
}

rebuildActionToKeys();

function normalize(e) {
    return KEY_ALIASES[e.key] || e.key.toUpperCase();
}

export function initInput() {
    function onKeyDown(e) {
        const k = normalize(e);
        if (!held[k]) pressed[k] = true;
        held[k] = true;
        if (k === 'SPACE' || k === 'UP' || k === 'WIND' || k === 'PAUSE' || k === 'DIFFICULTY'
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
    // Listen on window for broad coverage; document is redundant in most modern browsers
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
}

export function isHeld(name) { return !!held[name]; }
export function justPressed(name) { return !!pressed[name]; }

export function clearPressed() {
    for (const k in pressed) pressed[k] = false;
}

/**
 * Apply remapped controls from accessibility system (Requirement 13.5, 13.7)
 * @param {Object} remappedControls - Map of action -> key
 */
export function applyRemappedControls(remappedControls) {
    // Start with default aliases
    KEY_ALIASES = { ...DEFAULT_KEY_ALIASES };
    
    // Apply remapped controls
    for (const [action, key] of Object.entries(remappedControls)) {
        // Remove old mappings for this action
        for (const [k, a] of Object.entries(KEY_ALIASES)) {
            if (a === action && !DEFAULT_KEY_ALIASES[k]) {
                delete KEY_ALIASES[k];
            }
        }
        
        // Add new mapping
        KEY_ALIASES[key] = action;
        KEY_ALIASES[key.toUpperCase()] = action;
        KEY_ALIASES[key.toLowerCase()] = action;
    }
    
    rebuildActionToKeys();
    
    console.log('[Input] Applied remapped controls:', remappedControls);
}

/**
 * Get all keys mapped to an action
 * @param {string} action - Action name
 * @returns {Array<string>} Array of keys mapped to this action
 */
export function getKeysForAction(action) {
    return ACTION_TO_KEYS[action] || [];
}

/**
 * Get default key for an action (first key in default mapping)
 * @param {string} action - Action name
 * @returns {string|null} Default key or null
 */
export function getDefaultKeyForAction(action) {
    for (const [key, act] of Object.entries(DEFAULT_KEY_ALIASES)) {
        if (act === action) {
            return key;
        }
    }
    return null;
}

/**
 * Reset controls to defaults
 */
export function resetControlsToDefaults() {
    KEY_ALIASES = { ...DEFAULT_KEY_ALIASES };
    rebuildActionToKeys();
    console.log('[Input] Reset controls to defaults');
}
