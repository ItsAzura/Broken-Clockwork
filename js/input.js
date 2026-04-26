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

// ─── Touch Control Regions (320x180 canvas space) ───
export const TOUCH_BUTTONS = {
    LEFT:  { x: 5,   y: 135, w: 40, h: 40, action: 'LEFT' },
    RIGHT: { x: 50,  y: 135, w: 40, h: 40, action: 'RIGHT' },
    UP:    { x: 275, y: 135, w: 40, h: 40, action: 'UP' },
    WIND:  { x: 230, y: 135, w: 40, h: 40, action: 'WIND' },
    PAUSE: { x: 285, y: 5,   w: 30, h: 30, action: 'PAUSE' },
    RETRY: { x: 250, y: 5,   w: 30, h: 30, action: 'RETRY' },
};

let touchActive = false;
export function isTouchActive() { return touchActive; }

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

    function getCanvasCoords(touch, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY
        };
    }

    function handleTouches(e) {
        touchActive = true;
        
        // Only process if the touch is on the game canvas
        const canvas = document.getElementById('game');
        if (!canvas) return;
        
        // Check if touch target is the canvas
        const target = e.target;
        if (target !== canvas) return; // Let other elements handle their own touches

        // Get current game state - use the actual state value, not window.gameState
        // window.gameState is set in update() and may not be reliable during initialization
        const currentState = window.gameState;
        
        // Only process virtual buttons when in PLAYING or LEVEL_EDITOR_PLAYTEST states
        // For all other states (TITLE, PAUSED, SETTINGS, etc.), let main.js handlers work
        const isPlayable = currentState === 'PLAYING' || currentState === 'LEVEL_EDITOR_PLAYTEST';
        
        // If not in playable state, don't process virtual buttons at all
        // This allows menu touch handlers to work properly
        if (!isPlayable) {
            return; // Let the canvas touch handlers in main.js handle menu interactions
        }
        
        // Track which buttons are pressed in this frame across all touches
        const activeActions = new Set();
        let hit = false;

        // Use e.touches for touchstart/touchmove, e.changedTouches for touchend
        const touchList = e.type === 'touchend' ? e.changedTouches : e.touches;
        
        for (let i = 0; i < touchList.length; i++) {
            const coords = getCanvasCoords(touchList[i], canvas);
            for (const btn of Object.values(TOUCH_BUTTONS)) {
                if (coords.x >= btn.x && coords.x <= btn.x + btn.w &&
                    coords.y >= btn.y && coords.y <= btn.y + btn.h) {
                    activeActions.add(btn.action);
                    hit = true;
                }
            }
        }
        
        // Update held/pressed states based on active actions
        // For touchend, we need to check remaining touches, not changedTouches
        if (e.type === 'touchend') {
            // On touchend, only keep actions that still have active touches
            const remainingActions = new Set();
            for (let i = 0; i < e.touches.length; i++) {
                const coords = getCanvasCoords(e.touches[i], canvas);
                for (const btn of Object.values(TOUCH_BUTTONS)) {
                    if (coords.x >= btn.x && coords.x <= btn.x + btn.w &&
                        coords.y >= btn.y && coords.y <= btn.y + btn.h) {
                        remainingActions.add(btn.action);
                    }
                }
            }
            
            for (const action of Object.keys(TOUCH_BUTTONS)) {
                held[action] = remainingActions.has(action);
            }
        } else {
            // For touchstart/touchmove, update normally
            for (const action of Object.keys(TOUCH_BUTTONS)) {
                const isActive = activeActions.has(action);
                if (isActive && !held[action]) {
                    pressed[action] = true;
                }
                held[action] = isActive;
            }
        }
        
        // Prevent default only if we hit a virtual button during gameplay
        if (hit && e.cancelable) {
            e.preventDefault();
        }
    }

    // Listen on window for broad coverage; document is redundant in most modern browsers
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // Touch listeners on canvas only (not window) to avoid conflicts with menu handlers
    // The canvas-specific touch handlers in main.js will handle menu interactions
    const canvas = document.getElementById('game');
    if (canvas) {
        canvas.addEventListener('touchstart', handleTouches, { passive: false, capture: false });
        canvas.addEventListener('touchmove', handleTouches, { passive: false, capture: false });
        canvas.addEventListener('touchend', handleTouches, { passive: false, capture: false });
    }
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
