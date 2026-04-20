/*
 * constants.js
 * Single source of truth for tunable game values:
 * screen dims, tile size, physics, the strict color palette,
 * death/taunt config, and obstacle type enums.
 */

export const SCREEN_W = 320;
export const SCREEN_H = 180;
export const TILE = 16;

export const TARGET_FPS = 60;
export const DT_CAP = 0.05;

export const GRAVITY = 400;
export const MOVE_SPEED = 80;
export const JUMP_FORCE = -200;
export const FAN_FORCE = -260;

export const PLAYER_W = 8;
export const PLAYER_H = 12;

export const PLAYER_HITBOX_W = 6;
export const PLAYER_HITBOX_H = 8;
export const PLAYER_HITBOX_OFFSET_X = 1;
export const PLAYER_HITBOX_OFFSET_Y = 2;

export const GAUGE_MAX = 1.0;
export const GAUGE_DRAIN_PER_WIND = 0.20;
export const GAUGE_LOW_THRESHOLD = 0.25;

export const WIND_RANGE = 32;
export const WIND_HOLD_TIME = 0.45;

export const NEAR_MISS_DISTANCE = 3;
export const DEATH_FREEZE_FRAMES = 4;
export const RESPAWN_DELAY = 0.5;
export const TAUNT_DURATION = 1.2;
export const LEVEL_CLEAR_HOLD = 2.5;
export const LEVEL_CLEAR_PARTICLES = 50;

export const COLORS = {
    BACKGROUND:  '#1C1209',
    TILE_DARK:   '#2E1C0E',
    TILE_MID:    '#4A2E14',
    TILE_LIGHT:  '#6B4423',
    METAL_DARK:  '#3D3328',
    METAL_MID:   '#7A6040',
    METAL_LIGHT: '#C9A84C',
    IVORY:       '#F5E8C0',

    GLOW_WARM:   '#FFD080',
    SPARK_1:     '#FFE840',
    SPARK_2:     '#FF9020',

    UI_BG:       '#0D0905',
    UI_BORDER_L: '#9A7840',
    UI_BORDER_D: '#3A2810',
    UI_TEXT:     '#F5E8C0',
    UI_MUTED:    '#8A7060',
    GAUGE_FULL:  '#C9A84C',
    GAUGE_LOW:   '#C84020',
    GAUGE_BG:    '#2A1C0A',

    MIRA_SKIN:   '#F5E0C0',
    MIRA_DRESS:  '#5A3820',
    MIRA_KEY:    '#C9A84C',
    MIRA_EYE:    '#2A1810',

    DANGER_ZONE: 'rgba(200,64,32,0.25)',
    DEATH_FLASH: 'rgba(200,64,32,0.5)',
    TOKEN_GOLD:  '#FFE080',
    LOCKED_DOOR: '#3D3328',
};

export const STATES = Object.freeze({
    TITLE: 'TITLE',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    LEVEL_CLEAR: 'LEVEL_CLEAR',
    GAME_OVER: 'GAME_OVER',
});

export const OBJ = Object.freeze({
    PLATFORM_SLIDE:  'PLATFORM_SLIDE',
    PLATFORM_ROTATE: 'PLATFORM_ROTATE',
    FAN_UP:          'FAN_UP',
    ELEVATOR:        'ELEVATOR',
    ENEMY_PATROL:    'ENEMY_PATROL',
    BRIDGE:          'BRIDGE',
    LEVER:           'LEVER',
    CLOCK_STATION:   'CLOCK_STATION',
    LEVER_SEQUENCE:  'LEVER_SEQUENCE',
    GEAR_DECO:       'GEAR_DECO',
});

export const AUTO = Object.freeze({
    GEAR_SPINNER:  'GEAR_SPINNER',
    PENDULUM:      'PENDULUM',
    PISTON:        'PISTON',
    BOUNCING_BALL: 'BOUNCING_BALL',
    ORBIT_SPHERE:  'ORBIT_SPHERE',
});

export const TAUNT_MESSAGES = [
    "A CLOCKWORK DOLL... BROKEN.",
    "TRY AGAIN. OR DON'T.",
    "THE GEARS DON'T CARE.",
    "YOU SAW IT COMING.",
    "TICK. TOCK. DEAD.",
    "ALMOST. (NOT REALLY.)",
    "THE MACHINE WINS AGAIN.",
    "MIRA FELT NOTHING. YOU FELT EVERYTHING.",
    "SKILL ISSUE.",
    "WIND SMARTER, NOT HARDER.",
    "THIS IS FINE.",
    "MAYBE SLOW DOWN?",
    "THE GEARS REMEMBER EVERY MISTAKE.",
    "AT LEAST YOU'RE CONSISTENT.",
];
