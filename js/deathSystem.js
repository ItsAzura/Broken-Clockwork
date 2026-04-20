/*
 * deathSystem.js
 * Centralizes death bookkeeping: taunts, freeze-frames on death,
 * respawn timer, and the shatter particle burst. The world is expected
 * to poll updateDeathState() every tick and honor its return value.
 */

import {
    COLORS, TAUNT_MESSAGES, DEATH_FREEZE_FRAMES, RESPAWN_DELAY,
    TAUNT_DURATION, SCREEN_W, SCREEN_H,
} from './constants.js';
import {
    drawPixelBorder, drawPixelRect, drawPixelText, measurePixelText,
} from './draw.js';

export const deathState = {
    count:          0,
    levelCount:     0,
    tauntMsg:       '',
    tauntTimer:     0,
    freezeFrames:   0,
    respawnTimer:   0,
    isDying:        false,
    flashTimer:     0,
    lastRespawnAt:  -999,
};

export function resetAllDeaths() {
    deathState.count         = 0;
    deathState.levelCount    = 0;
    deathState.tauntMsg      = '';
    deathState.tauntTimer    = 0;
    deathState.freezeFrames  = 0;
    deathState.respawnTimer  = 0;
    deathState.isDying       = false;
    deathState.flashTimer    = 0;
    deathState.lastRespawnAt = -999;
}

export function resetLevelDeaths() {
    deathState.levelCount = 0;
}

export function markRespawnNow(nowSec) {
    deathState.lastRespawnAt = nowSec;
}

function pickTaunt(context) {
    if (context) {
        if (context.reason === 'gauge')      return "YOU FORGOT TO WIND UP. CLASSIC.";
        if (context.reason === 'crush')      return "YOU DID THIS TO YOURSELF.";
        if (context.lastToken)               return "ONE MORE.";
        if (context.hadAllTokens)            return "YOU HAD THEM ALL.";
        if (context.fastDeath)               return "THAT WAS FAST.";
    }
    if (deathState.count > 0 && deathState.count % 10 === 0) {
        return "DEATHS: " + deathState.count + ". THE MACHINE IS PROUD.";
    }
    if (Math.random() < 0.12) {
        return "DEATH #" + deathState.count + ". IMPRESSIVE.";
    }
    return TAUNT_MESSAGES[(Math.random() * TAUNT_MESSAGES.length) | 0];
}

export function triggerDeath(player, particles, context, nowSec) {
    if (deathState.isDying) return false;

    deathState.count++;
    deathState.levelCount++;

    const fastDeath = (nowSec - deathState.lastRespawnAt) < 0.5;
    const ctx = Object.assign({ fastDeath }, context || {});

    deathState.tauntMsg     = pickTaunt(ctx);
    deathState.tauntTimer   = TAUNT_DURATION;
    deathState.freezeFrames = DEATH_FREEZE_FRAMES;
    deathState.respawnTimer = RESPAWN_DELAY;
    deathState.isDying      = true;
    deathState.flashTimer   = 2 / 60;

    const cols = [COLORS.MIRA_DRESS, COLORS.MIRA_KEY, COLORS.MIRA_SKIN];
    const cx = player.x + 4;
    const cy = player.y + 6;
    for (let i = 0; i < 8; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp  = 40 + Math.random() * 90;
        particles.push({
            x: cx, y: cy,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp - 30,
            life: 0.5,
            maxLife: 0.5,
            color: cols[(Math.random() * cols.length) | 0],
            size: 3,
        });
    }
    return true;
}

export function updateDeathState(dt) {
    if (deathState.freezeFrames > 0) {
        deathState.freezeFrames--;
        return 'freeze';
    }
    deathState.tauntTimer = Math.max(0, deathState.tauntTimer - dt);
    deathState.flashTimer = Math.max(0, deathState.flashTimer - dt);

    if (deathState.isDying) {
        deathState.respawnTimer -= dt;
        if (deathState.respawnTimer <= 0) {
            deathState.isDying = false;
            return 'respawn';
        }
        return 'dying';
    }
    return 'alive';
}

export function drawDeathFlash(ctx) {
    if (deathState.flashTimer > 0) {
        ctx.fillStyle = COLORS.DEATH_FLASH;
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
}

export function drawTauntMessage(ctx) {
    if (deathState.tauntTimer <= 0 || !deathState.tauntMsg) return;
    const msg = deathState.tauntMsg;
    const tw  = measurePixelText(msg, 1);
    const pw  = tw + 12;
    const ph  = 14;
    const px  = ((SCREEN_W - pw) / 2) | 0;
    const py  = ((SCREEN_H / 2) - (ph / 2) - 24) | 0;

    const fade = Math.min(1, deathState.tauntTimer / 0.35);
    ctx.globalAlpha = fade;
    drawPixelBorder(ctx, px, py, pw, ph, COLORS.UI_BORDER_L, COLORS.UI_BORDER_D, COLORS.UI_BG, 1);
    drawPixelText(ctx, msg, px + 6, py + 4, COLORS.UI_MUTED, 1);
    ctx.globalAlpha = 1;
}

export function getDeathCount()      { return deathState.count; }
export function getLevelDeathCount() { return deathState.levelCount; }
export function isDying()            { return deathState.isDying; }
export function isFreezing()         { return deathState.freezeFrames > 0; }
