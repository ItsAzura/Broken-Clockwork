/*
 * constants.js
 * Single source of truth for tunable game values:
 * screen dims, tile size, physics, the strict color palette,
 * death/taunt config, obstacle type enums, and troll system constants.
 */

export const SCREEN_W = 320;
export const SCREEN_H = 180;
export const TILE = 16;

export const TARGET_FPS = 60;
export const DT_CAP = 0.05;

export const GRAVITY = 400;
export const MOVE_SPEED = 86.4; // Masocore balance pass: 96 → 86.4 (10% slower)
export const ACCEL = 600;
export const FRICTION = 500;
export const JUMP_FORCE = -190; // Slightly adjusted for better control
export const FAN_FORCE = -260;
export const COYOTE_TIME = 0.12;
export const JUMP_BUFFER = 0.12;

export const PLAYER_W = 8;
export const PLAYER_H = 12;

export const PLAYER_HITBOX_W = 6;
export const PLAYER_HITBOX_H = 8;
export const PLAYER_HITBOX_OFFSET_X = 1;
export const PLAYER_HITBOX_OFFSET_Y = 2;

export const GAUGE_MAX = 1.0;
export const GAUGE_DRAIN_PER_WIND = 0.20;
export const GAUGE_DRAIN_RATE = 0.0245; // Masocore balance pass: 0.028 → 0.0245 (12.5% slower drain)
export const GAUGE_LOW_THRESHOLD = 0.25;

export const WIND_RANGE = 22; // Reduced from 32 → 22 for tighter interactions
export const WIND_HOLD_TIME = 0.45;

export const NEAR_MISS_DISTANCE = 3;
export const DEATH_FREEZE_FRAMES = 4;
export const RESPAWN_DELAY = 0.5;
export const TAUNT_DURATION = 1.2;
export const LEVEL_CLEAR_HOLD = 2.5;
export const LEVEL_CLEAR_PARTICLES = 50;

// ═══════ MASOCORE TROLL SYSTEM CONSTANTS ═══════

// Coyote death: 1–2 frames overlap = NO death. 3+ frames = death.
export const COYOTE_DEATH_FRAMES = 2;

// Mercy system: show hints after N deaths to same obstacle
export const MERCY_HINT_THRESHOLD = 5;

// Close-call detection
export const CLOSE_CALL_DISTANCE = 4;
export const EXTREME_CLOSE_CALL_DISTANCE = 2;

// Close-call display
export const CLOSE_CALL_DISPLAY_FRAMES = 20;
export const EXTREME_CLOSE_CALL_DISPLAY_FRAMES = 30;

// Second Wind trap (Troll 6)
export const SECOND_WIND_DURATION = 8; // seconds
export const SECOND_WIND_FADE_IN = 0.5; // seconds

// Pattern Betrayal (Troll 5)
export const PATTERN_BETRAYAL_TIME = 6.0; // seconds before speed change
export const PATTERN_BETRAYAL_DURATION = 2.4; // betrayal window length
export const PATTERN_BETRAYAL_MULT = 1.15; // 15% faster

// ═══════ OBSTACLE SPEED HIERARCHY TIERS ═══════

export const SPEED_TIERS = {
    // Tier 1 (Green): manageable speeds
    TIER_1: {
        label: 'manageable',
        color: '#5A8040',
        piston: { period: 2.0 },
        pendulum: { frequency: 0.8 },
        bouncingBall: { speed: 60 },
        orbitSphere: { speed: 1.0 }
    },
    // Tier 2 (Yellow): pay attention speeds
    TIER_2: {
        label: 'pay attention',
        color: '#C9A84C',
        piston: { period: 1.5 },
        pendulum: { frequency: 1.2 },
        bouncingBall: { speed: 90 },
        orbitSphere: { speed: 1.4 }
    },
    // Tier 3 (Orange): be precise speeds
    TIER_3: {
        label: 'be precise',
        color: '#FF9020',
        piston: { period: 1.0 },
        pendulum: { frequency: 1.6 },
        bouncingBall: { speed: 120 },
        orbitSphere: { speed: 1.8 }
    }
};

// Offbeat music (Troll 4)
export const OFFBEAT_CYCLE = 0.65; // obstacle cycle for offbeat levels (seconds)
export const MUSIC_INTERVAL = 0.6; // music box interval (seconds / 100 BPM)
export const OFFBEAT_MERCY_THRESHOLD = 8; // sync after N deaths

// Obstacle hitbox fairness
export const HITBOX_SHRINK = 2; // px to shrink obstacle hitboxes each side

// Ghost replay system
export const GHOST_REPLAY_CAP = 3600; // max frames (~60 seconds at 60fps)

// Offbeat piston (Troll 2)
export const OFFBEAT_PISTON_CYCLE = 3.0; // full 4-beat cycle in seconds
export const OFFBEAT_PISTON_MERCY_DEATHS = 3; // deaths before mercy glow

// ═══════ COLOR PALETTE ═══════

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

    // Troll 3 — Color Betrayal: green-tinted wall that looks like exit
    COLOR_BETRAYAL: '#5A6B20',

    // Ghost replay tint
    GHOST_TINT:  'rgba(122,96,64,0.3)',
};

// ═══════ GAME STATES ═══════

export const STATES = Object.freeze({
    TITLE: 'TITLE',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    LEVEL_CLEAR: 'LEVEL_CLEAR',
    GAME_OVER: 'GAME_OVER',
});

// ═══════ OBJECT TYPES ═══════

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

export const TRAP = Object.freeze({
    TRIGGER_TILE:         'TRIGGER_TILE',
    FAKE_SAFE_ZONE:       'FAKE_SAFE_ZONE',
    TROLL_TOKEN:          'TROLL_TOKEN',
    HIDDEN_KILL_GEAR:     'HIDDEN_KILL_GEAR',
    BAIT_PATH:            'BAIT_PATH',
    ONE_FRAME_WINDOW:     'ONE_FRAME_WINDOW',
    PHASE_SHIFT_OBSTACLE: 'PHASE_SHIFT_OBSTACLE',
    ALMOST_MOMENT:        'ALMOST_MOMENT',
    MIRROR_CORRIDOR:      'MIRROR_CORRIDOR',
});

export const TROLL_TOKEN_SUBTYPE = Object.freeze({
    ONE_WAY_PRISON: 'ONE_WAY_PRISON',
    RUSH_BAIT:      'RUSH_BAIT',
    WIND_TRAP:      'WIND_TRAP',
});

// ═══════ TIERED TAUNT SYSTEM ═══════
// Replaces random taunts: tracks cause streak, escalates messages
// Tier 1 (1-3 deaths), Tier 2 (4-7 deaths), Tier 3 (8-12 deaths), Tier 4 (13+ deaths)

export const TIERED_TAUNTS = {
    // Generic tiers (used when no specific cause match)
    generic: {
        1: ["THE MACHINE IS PATIENT.", "AGAIN."],
        2: ["STILL? THE GEARS ARE EMBARRASSED FOR YOU."],
        3: ["THE SOLUTION HAS NOT CHANGED."],
        4: ["...YOU'RE STILL HERE.", "THE MACHINE RESPECTS YOUR PERSISTENCE. BARELY."],
    },
    // Troll 1 — Obvious Path
    bait_path: {
        1: ["THE EASY PATH IS NEVER EASY.", "YOU CHOSE POORLY."],
        2: ["WIDE ROADS, NARROW CHANCES.", "THE NARROW PATH WAITS."],
        3: ["THE SCARY PATH WAS SAFE. THE WHOLE TIME.", "LOOK CLOSER."],
        4: ["THE MACHINE BUILT THE WIDE PATH FOR YOU. SPECIFICALLY."],
    },
    // Troll 2 — Offbeat Piston
    offbeat_piston: {
        1: ["TIMING.", "THE CLUNK LIED."],
        2: ["COUNT THE BEATS. ALL OF THEM.", "NOT THAT BEAT."],
        3: ["LISTEN AGAIN. THE SAFE MOMENT IS NOT THE OBVIOUS ONE."],
        4: ["THE RHYTHM WAS NEVER ON YOUR SIDE."],
    },
    // Troll 3 — Color Betrayal
    color_betrayal: {
        1: ["THAT WASN'T AN EXIT.", "GREEN MEANS NOTHING HERE."],
        2: ["THE SHAPE WAS WRONG. YOU SAW WHAT YOU WANTED TO SEE."],
        3: ["TRUST NO COLOR.", "THE MACHINE PAINTS LIES."],
        4: ["YOU WILL NEVER TRUST GREEN AGAIN."],
    },
    // Troll 5 — Pattern Betrayal
    pattern_betrayal: {
        1: ["IT CHANGED.", "YOU WAITED. THE MACHINE NOTICED."],
        2: ["CAUTION IS PUNISHED HERE.", "THE PATTERN BETRAYED YOU."],
        3: ["THE CAREFUL DIE. THE RECKLESS LIVE.", "SPEED IS SAFETY."],
        4: ["YOU WATCHED. YOU LEARNED. YOU LEARNED WRONG."],
    },
    // Troll 6 — Second Wind
    second_wind: {
        1: ["NOT SO FAST.", "VICTORY WAS A TRAP."],
        2: ["THE EXIT HAS CONDITIONS.", "PATIENCE IS A WEAPON."],
        3: ["WAIT. JUST... WAIT.", "8 SECONDS. COUNT THEM."],
        4: ["THE MACHINE GIVES. THE MACHINE TAKES."],
    },
    // Existing trap types
    fake_safe_zone: {
        1: ["THAT WASN'T SAFE.", "NOWHERE IS SAFE."],
        2: ["YOU THOUGHT YOU WERE CLEVER.", "THE SAFE ZONE LIED."],
        3: ["SAFETY IS A CONCEPT THE MACHINE REJECTS."],
        4: ["EVERY COMFORTABLE SPOT IS A GRAVE."],
    },
    troll_token: {
        1: ["GREED KILLS.", "SHOULD'VE LEFT IT."],
        2: ["THE GEAR WANTED YOU DEAD.", "THAT WAS A TRAP. OBVIOUSLY."],
        3: ["EVERY SHINY THING IS BAIT."],
        4: ["THE MACHINE ADMIRES YOUR GREED. BRIEFLY."],
    },
    hidden_gear: {
        1: ["THAT ONE WAS REAL.", "NOT ALL GEARS ARE DECORATIVE."],
        2: ["YOU HEARD THE HUM.", "TRUST NOTHING."],
        3: ["THE HUM TOLD YOU EVERYTHING."],
        4: ["DECORATION IS DECEPTION."],
    },
    almost_moment: {
        1: ["SO CLOSE.", "VICTORY WAS RIGHT THERE."],
        2: ["THE MACHINE LAUGHS.", "ALMOST DOESN'T COUNT."],
        3: ["THE EXIT WAS A SUGGESTION."],
        4: ["'ALMOST' IS THE MACHINE'S FAVORITE WORD."],
    },
    trigger_tile: {
        1: ["YOU TRIGGERED IT.", "WATCH YOUR STEP."],
        2: ["THE FLOOR BETRAYED YOU.", "INVISIBLE DOESN'T MEAN SAFE."],
        3: ["EVERY TILE IS SUSPECT."],
        4: ["THE GROUND IS NOT YOUR FRIEND."],
    },
    one_frame_window: {
        1: ["TOO SLOW.", "TIMING IS EVERYTHING."],
        2: ["YOU MISSED THE WINDOW.", "PRECISION REQUIRED."],
        3: ["THE GAP WAS ONE FRAME. YOU NEED ZERO MISTAKES."],
        4: ["THE MACHINE MEASURES IN FRAMES. SO SHOULD YOU."],
    },
    phase_shift: {
        1: ["IT'S FASTER NOW.", "DID YOU NOTICE THE CHANGE?"],
        2: ["DEATH MAKES IT STRONGER.", "THE MACHINE ADAPTS."],
        3: ["EACH DEATH FEEDS THE MACHINE."],
        4: ["YOU MADE IT FASTER. EVERY TIME."],
    },
    mirror_corridor: {
        1: ["NOT AS SYMMETRICAL AS IT LOOKED.", "PATTERNS LIE."],
        2: ["THE MIRROR IS BROKEN.", "TIMING, NOT SYMMETRY."],
        3: ["SYMMETRY IS THE MACHINE'S GREATEST TRICK."],
        4: ["NOTHING HERE IS TRULY MIRRORED."],
    },
    // Context-specific
    gauge: {
        1: ["YOU FORGOT TO WIND UP. CLASSIC."],
        2: ["WIND. UP. THE. KEY.", "THE KEY STOPS. YOU STOP."],
        3: ["THE KEY IS LIFE. REMEMBER THAT."],
        4: ["THE KEY IS RIGHT THERE. ON YOUR BACK."],
    },
    sequence: {
        1: ["WRONG ORDER!", "YOU DID THIS TO YOURSELF."],
        2: ["THE ORDER MATTERS.", "READ THE WALL."],
        3: ["THE GEARS ON THE WALL. COUNT THE TEETH."],
        4: ["3-1-4-1-5. THE MACHINE SPEAKS IN MATHEMATICS."],
    },
    quick_death: {
        1: ["THAT WAS FAST."],
        2: ["FASTER THAN LAST TIME."],
        3: ["SPEEDRUNNING DEATH."],
        4: ["THE MACHINE BLINKED AND MISSED IT."],
    },
};

// Legacy taunt array (kept for backward compat, but tiered system is primary)
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

// ═══════ LEVEL CLEAR JUDGE ═══════
export const LEVEL_CLEAR_JUDGE = [
    { max: 5,   msg: "THAT WAS ALMOST GRACEFUL. ALMOST." },
    { max: 15,  msg: "THE MACHINE ACKNOWLEDGES YOUR EXISTENCE." },
    { max: 30,  msg: "PERSISTENCE NOTED. GRACE: OPTIONAL." },
    { max: 50,  msg: "YOU EARNED THIS. UNFORTUNATELY." },
    { max: 99,  msg: "THE MACHINE HAS LOST COUNT. YOU HAVEN'T." },
    { max: Infinity, msg: "WE DO NOT SPEAK OF THIS." },
];

// Legacy trap taunts (kept for backward compatibility with tests)
export const TRAP_TAUNTS = {
    fake_safe_zone: [
        "THAT WASN'T SAFE.",
        "NOWHERE IS SAFE.",
        "YOU THOUGHT YOU WERE CLEVER.",
        "THE SAFE ZONE LIED."
    ],
    troll_token: [
        "GREED KILLS.",
        "SHOULD'VE LEFT IT.",
        "THE GEAR WANTED YOU DEAD.",
        "THAT WAS A TRAP. OBVIOUSLY."
    ],
    hidden_gear: [
        "THAT ONE WAS REAL.",
        "NOT ALL GEARS ARE DECORATIVE.",
        "YOU HEARD THE HUM.",
        "TRUST NOTHING."
    ],
    bait_path: [
        "THE EASY PATH IS NEVER EASY.",
        "WIDE ROADS, NARROW CHANCES.",
        "YOU CHOSE POORLY.",
        "SHORTCUTS ARE TRAPS."
    ],
    almost_moment: [
        "SO CLOSE.",
        "VICTORY WAS RIGHT THERE.",
        "THE MACHINE LAUGHS.",
        "ALMOST DOESN'T COUNT."
    ],
    trigger_tile: [
        "YOU TRIGGERED IT.",
        "WATCH YOUR STEP.",
        "THE FLOOR BETRAYED YOU.",
        "INVISIBLE DOESN'T MEAN SAFE."
    ]
};
