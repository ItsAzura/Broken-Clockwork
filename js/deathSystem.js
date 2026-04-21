/*
 * deathSystem.js
 * Centralized death state: counts, taunts, freeze-frame, respawn timing.
 */

import {
    TAUNT_MESSAGES, DEATH_FREEZE_FRAMES, RESPAWN_DELAY, TAUNT_DURATION,
    COLORS, SCREEN_W, SCREEN_H,
} from './constants.js';
import { drawPixelRect, drawPixelBorder, drawPixelText, measurePixelText } from './draw.js';

export const deathState = {
    totalCount: 0,
    levelCount: 0,
    tauntMsg: '',
    tauntTimer: 0,
    freezeFrames: 0,
    respawnTimer: 0,
    isDying: false,
    lastRespawnTime: 0,
};

export function resetAllDeaths() {
    deathState.totalCount = 0;
    deathState.levelCount = 0;
}

export function resetLevelDeaths() {
    deathState.levelCount = 0;
}

export function markRespawnNow(gameTime) {
    deathState.lastRespawnTime = gameTime;
}

export function getDeathCount() {
    return deathState.totalCount;
}

export function getLevelDeathCount() {
    return deathState.levelCount;
}

export function isDying() {
    return deathState.isDying;
}

export function isFreezing() {
    return deathState.freezeFrames > 0;
}

export function triggerDeath(player, particles, context, gameTime, killSource = null) {
    deathState.totalCount++;
    deathState.levelCount++;
    deathState.isDying = true;
    deathState.freezeFrames = DEATH_FREEZE_FRAMES;
    deathState.respawnTimer = RESPAWN_DELAY;

    const taunt = pickTaunt(context, gameTime, killSource);
    deathState.tauntMsg = taunt;
    deathState.tauntTimer = TAUNT_DURATION;

    spawnDeathFragments(player, particles);
}

const TRAP_TAUNTS = {
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
        "YOU TRIGGERED THAT.",
        "WATCH YOUR STEP.",
        "THE FLOOR BETRAYED YOU.",
        "INVISIBLE DOESN'T MEAN SAFE."
    ],
    one_frame_window: [
        "TOO SLOW.",
        "TIMING IS EVERYTHING.",
        "YOU MISSED THE WINDOW.",
        "PRECISION REQUIRED."
    ],
    phase_shift: [
        "IT'S FASTER NOW.",
        "DID YOU NOTICE THE CHANGE?",
        "DEATH MAKES IT STRONGER.",
        "THE MACHINE ADAPTS."
    ],
    mirror_corridor: [
        "NOT AS SYMMETRICAL AS IT LOOKED.",
        "PATTERNS LIE.",
        "THE MIRROR IS BROKEN.",
        "TIMING, NOT SYMMETRY."
    ]
};

function pickTaunt(context, gameTime, killSource = null) {
    // Check for trap-specific taunts first
    if (killSource && TRAP_TAUNTS[killSource]) {
        const taunts = TRAP_TAUNTS[killSource];
        return taunts[Math.floor(Math.random() * taunts.length)];
    }

    // Existing taunt logic
    const timeSinceRespawn = gameTime - deathState.lastRespawnTime;
    if (timeSinceRespawn < 0.5) return "THAT WAS FAST.";
    if (context.reason === 'gauge') return "YOU FORGOT TO WIND UP. CLASSIC.";
    if (context.reason === 'sequence') return "YOU DID THIS TO YOURSELF.";
    if (context.hadAllTokens) return "YOU HAD THEM ALL.";
    if (context.lastToken) return "ONE MORE.";
    if (deathState.totalCount % 10 === 0 && deathState.totalCount > 0) {
        return "DEATHS: " + deathState.totalCount + ". THE MACHINE IS PROUD.";
    }
    return TAUNT_MESSAGES[Math.floor(Math.random() * TAUNT_MESSAGES.length)];
}

function spawnDeathFragments(player, particles) {
    const colors = [COLORS.MIRA_DRESS, COLORS.MIRA_KEY, COLORS.MIRA_SKIN];
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const speed = 60 + Math.random() * 40;
        particles.push({
            x: player.x + 4,
            y: player.y + 6,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 40,
            life: 0.5,
            maxLife: 0.5,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 3,
        });
    }
}

export function updateDeathState(dt) {
    // Always update the taunt timer so it can fade out even after respawn
    if (deathState.tauntTimer > 0) {
        deathState.tauntTimer = Math.max(0, deathState.tauntTimer - dt);
    }

    if (!deathState.isDying) return null;

    if (deathState.freezeFrames > 0) {
        deathState.freezeFrames--;
        return 'freeze';
    }

    deathState.respawnTimer -= dt;
    if (deathState.respawnTimer <= 0) {
        deathState.isDying = false;
        deathState.respawnTimer = 0;
        return 'respawn';
    }

    return 'dying';
}

export function drawDeathFlash(ctx) {
    if (deathState.freezeFrames === DEATH_FREEZE_FRAMES - 1 || deathState.freezeFrames === DEATH_FREEZE_FRAMES - 2) {
        ctx.fillStyle = COLORS.DEATH_FLASH;
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
}

export function drawTauntMessage(ctx) {
    if (deathState.tauntTimer <= 0 || !deathState.tauntMsg) return;
    const alpha = Math.min(1, deathState.tauntTimer / 0.3);
    const tw = measurePixelText(deathState.tauntMsg, 1);
    const pw = tw + 12;
    const ph = 16;
    const px = ((SCREEN_W - pw) / 2) | 0;
    const py = ((SCREEN_H - ph) / 2) | 0;
    ctx.save();
    ctx.globalAlpha = alpha;
    drawPixelBorder(ctx, px, py, pw, ph, COLORS.UI_BORDER_L, COLORS.UI_BORDER_D, COLORS.UI_BG, 1);
    drawPixelText(ctx, deathState.tauntMsg, px + 6, py + 5, COLORS.UI_MUTED, 1);
    ctx.restore();
}
