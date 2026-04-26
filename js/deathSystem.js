/*
 * deathSystem.js
 * Centralized death state: counts, tiered taunts, freeze-frame, respawn timing.
 *
 * Masocore additions:
 *   - Tiered taunt system with cause streak tracking
 *   - Coyote death (1–2 frame overlap forgiveness)
 *   - Per-obstacle death count for mercy hints
 *   - Level clear judge messages
 */

import {
    TAUNT_MESSAGES, TIERED_TAUNTS, DEATH_FREEZE_FRAMES, RESPAWN_DELAY, TAUNT_DURATION,
    COLORS, SCREEN_W, SCREEN_H, COYOTE_DEATH_FRAMES, MERCY_HINT_THRESHOLD,
    LEVEL_CLEAR_JUDGE,
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
    // ─── Tiered taunt tracking ───
    causeStreak: { cause: null, count: 0 },
    // ─── Per-obstacle death counts ───
    obstacleDeathCount: {},
    // ─── Last kill source for obstacle tracking ───
    lastKillObstacleId: null,
};

// ─── Coyote death: overlap frame counters per obstacle ───
const coyoteOverlapFrames = {};

export function resetAllDeaths() {
    deathState.totalCount = 0;
    deathState.levelCount = 0;
    deathState.causeStreak = { cause: null, count: 0 };
    deathState.obstacleDeathCount = {};
    deathState.lastKillObstacleId = null;
    clearCoyoteFrames();
}

export function resetLevelDeaths() {
    deathState.levelCount = 0;
    deathState.obstacleDeathCount = {};
    deathState.lastKillObstacleId = null;
    clearCoyoteFrames();
}

export function clearCoyoteFrames() {
    for (const key of Object.keys(coyoteOverlapFrames)) {
        delete coyoteOverlapFrames[key];
    }
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

/**
 * Check if coyote death forgiveness should prevent death.
 * Returns true if overlap is within forgiveness frames (should NOT die).
 * Returns false if overlap exceeds threshold (should die).
 */
export function checkCoyoteOverlap(obstacleId, gameState = null) {
    if (!obstacleId) return false; // No ID = no forgiveness
    const key = String(obstacleId);
    if (!(key in coyoteOverlapFrames)) {
        coyoteOverlapFrames[key] = 0;
    }
    coyoteOverlapFrames[key]++;
    
    // Use difficulty-modified coyote frames if available, otherwise use default
    const coyoteFrames = (gameState && gameState.difficultyCoyoteFrames) || COYOTE_DEATH_FRAMES;
    return coyoteOverlapFrames[key] <= coyoteFrames;
}

/**
 * Reset coyote overlap counter for an obstacle (called when no longer overlapping)
 */
export function resetCoyoteOverlap(obstacleId) {
    const key = String(obstacleId);
    if (key in coyoteOverlapFrames) {
        coyoteOverlapFrames[key] = 0;
    }
}

/**
 * Record a death against a specific obstacle for mercy tracking
 */
export function recordObstacleDeath(obstacleId) {
    if (!obstacleId) return 0;
    const key = String(obstacleId);
    deathState.obstacleDeathCount[key] = (deathState.obstacleDeathCount[key] || 0) + 1;
    deathState.lastKillObstacleId = key;
    return deathState.obstacleDeathCount[key];
}

/**
 * Get death count for a specific obstacle
 */
export function getObstacleDeathCount(obstacleId) {
    return deathState.obstacleDeathCount[String(obstacleId)] || 0;
}

/**
 * Check if an obstacle should show mercy hints
 */
export function shouldShowMercy(obstacleId) {
    return getObstacleDeathCount(obstacleId) >= MERCY_HINT_THRESHOLD;
}

export function triggerDeath(player, particles, context, gameTime, killSource = null) {
    deathState.totalCount++;
    deathState.levelCount++;
    deathState.isDying = true;
    deathState.freezeFrames = DEATH_FREEZE_FRAMES;
    deathState.respawnTimer = RESPAWN_DELAY;

    // Update cause streak for tiered taunts
    const cause = killSource || context.reason || 'generic';
    if (deathState.causeStreak.cause === cause) {
        deathState.causeStreak.count++;
    } else {
        deathState.causeStreak.cause = cause;
        deathState.causeStreak.count = 1;
    }

    // Record obstacle death for mercy system
    if (context.killObstacleId) {
        recordObstacleDeath(context.killObstacleId);
    }

    const taunt = pickTaunt(context, gameTime, killSource);
    deathState.tauntMsg = taunt;
    deathState.tauntTimer = TAUNT_DURATION;

    spawnDeathFragments(player, particles);
}

function pickTaunt(context, gameTime, killSource = null) {
    const cause = killSource || context.reason || 'generic';
    const streakCount = deathState.causeStreak.count;

    // Determine tier (1-4)
    let tier;
    if (streakCount <= 3) tier = 1;
    else if (streakCount <= 7) tier = 2;
    else if (streakCount <= 12) tier = 3;
    else tier = 4;

    // Quick death override
    const timeSinceRespawn = gameTime - deathState.lastRespawnTime;
    if (timeSinceRespawn < 0.5) {
        const quickTaunts = TIERED_TAUNTS.quick_death;
        if (quickTaunts && quickTaunts[tier]) {
            const options = quickTaunts[tier];
            return options[Math.floor(Math.random() * options.length)];
        }
        return "THAT WAS FAST.";
    }

    // Context-specific taunts
    if (context.reason === 'gauge') {
        const gaugeTaunts = TIERED_TAUNTS.gauge;
        if (gaugeTaunts && gaugeTaunts[tier]) {
            const options = gaugeTaunts[tier];
            return options[Math.floor(Math.random() * options.length)];
        }
    }

    if (context.reason === 'sequence') {
        const seqTaunts = TIERED_TAUNTS.sequence;
        if (seqTaunts && seqTaunts[tier]) {
            const options = seqTaunts[tier];
            return options[Math.floor(Math.random() * options.length)];
        }
    }

    // Had all tokens context
    if (context.hadAllTokens) return "YOU HAD THEM ALL.";
    if (context.lastToken) return "ONE MORE.";

    // Milestone deaths
    if (deathState.totalCount % 10 === 0 && deathState.totalCount > 0) {
        return "DEATHS: " + deathState.totalCount + ". THE MACHINE IS PROUD.";
    }

    // Tiered cause-specific taunts
    const causeTaunts = TIERED_TAUNTS[cause];
    if (causeTaunts && causeTaunts[tier]) {
        const options = causeTaunts[tier];
        return options[Math.floor(Math.random() * options.length)];
    }

    // Fallback: generic tiered
    const genericTaunts = TIERED_TAUNTS.generic;
    if (genericTaunts && genericTaunts[tier]) {
        const options = genericTaunts[tier];
        return options[Math.floor(Math.random() * options.length)];
    }

    // Legacy fallback
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
        clearCoyoteFrames();
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

/**
 * Get level clear judge message based on death count
 */
export function getLevelClearJudge(deathCount) {
    for (const entry of LEVEL_CLEAR_JUDGE) {
        if (deathCount <= entry.max) return entry.msg;
    }
    return LEVEL_CLEAR_JUDGE[LEVEL_CLEAR_JUDGE.length - 1].msg;
}
