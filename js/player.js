/*
 * player.js
 * Player creation, animation update, sprite selection, rendering,
 * and helpers for the tighter 6x8 death hitbox + near-miss detection.
 */

import {
    PLAYER_W, PLAYER_H, MOVE_SPEED, JUMP_FORCE, COLORS, GAUGE_MAX,
    GAUGE_DRAIN_PER_WIND, WIND_HOLD_TIME,
    PLAYER_HITBOX_W, PLAYER_HITBOX_H,
    PLAYER_HITBOX_OFFSET_X, PLAYER_HITBOX_OFFSET_Y,
    NEAR_MISS_DISTANCE,
} from './constants.js';
import { MIRA, MIRA_PALETTE } from './sprites.js';
import { drawPixelSprite, drawPixelSpriteFlipped, drawPixelRect } from './draw.js';
import { isHeld, justPressed } from './input.js';
import { distanceToBounds, rectOverlapsBounds } from './AutonomousObstacle.js';

export function createPlayer(spawnX, spawnY) {
    return {
        x: spawnX, y: spawnY,
        vx: 0, vy: 0,
        facing: 1,
        animFrame: 0,
        animTimer: 0,
        anim: 'idle',
        gauge: GAUGE_MAX,
        gaugeMax: GAUGE_MAX,
        isWindingUp: false,
        windTarget: null,
        windProgress: 0,
        keyAngle: 0,
        squish: 1.0,
        wasOnGround: true,
        onGround: false,
        ridingPlatform: null,
    };
}

export function getPlayerHitbox(player) {
    return {
        x: player.x + PLAYER_HITBOX_OFFSET_X,
        y: player.y + PLAYER_HITBOX_OFFSET_Y,
        w: PLAYER_HITBOX_W,
        h: PLAYER_HITBOX_H,
    };
}

export function nearMissCheck(player, obstacles) {
    const hit = getPlayerHitbox(player);
    const hits = [];
    for (const a of obstacles) {
        const b = a.getBounds();
        if (!b) continue;
        if (rectOverlapsBounds(hit, b)) {
            a._wasNear = false;
            continue;
        }
        const d = distanceToBounds(hit, b);
        const near = d > 0 && d <= NEAR_MISS_DISTANCE;
        if (near && !a._wasNear) hits.push(a);
        a._wasNear = near;
    }
    return hits;
}

export function updatePlayer(player, dt, allowJump) {
    let dir = 0;
    if (!player.isWindingUp) {
        if (isHeld('LEFT')) dir -= 1;
        if (isHeld('RIGHT')) dir += 1;
    }

    const gaugeFactor = 0.45 + 0.55 * (player.gauge / player.gaugeMax);
    player.vx = dir * MOVE_SPEED * gaugeFactor;
    if (dir !== 0) player.facing = dir;

    if (allowJump && !player.isWindingUp && (justPressed('SPACE') || justPressed('UP')) && player.onGround) {
        player.vy = JUMP_FORCE;
        player.onGround = false;
    }

    if (dir === 0) {
        if (player.anim !== 'idle') { player.anim = 'idle'; player.animFrame = 0; player.animTimer = 0; }
    } else {
        if (player.anim !== 'walk') { player.anim = 'walk'; player.animFrame = 0; player.animTimer = 0; }
    }
    if (player.isWindingUp) player.anim = 'windup';

    player.animTimer += dt;
    const frameDur = player.anim === 'walk' ? 0.13 : 0.5;
    if (player.animTimer >= frameDur) {
        player.animTimer -= frameDur;
        player.animFrame++;
    }

    player.keyAngle += player.gauge * 3 * dt * 60;
    if (!player.wasOnGround && player.onGround) player.squish = 0.7;
    if (player.squish < 1.0) player.squish = Math.min(1.0, player.squish + dt * 4);
    player.wasOnGround = player.onGround;
}

export function drawPlayer(ctx, player, camX, camY) {
    const sx = (player.x - camX) | 0;
    const sy = (player.y - camY) | 0;
    let frame;
    if (player.anim === 'idle') {
        frame = (player.animFrame % 2 === 0) ? MIRA.idle_0 : MIRA.idle_1;
    } else if (player.anim === 'walk') {
        const frames = [MIRA.walk_0, MIRA.walk_1, MIRA.walk_2, MIRA.walk_3];
        frame = frames[player.animFrame % 4];
    } else {
        const frames = [MIRA.windup_0, MIRA.windup_1, MIRA.windup_2];
        frame = frames[Math.min(player.animFrame, 2)];
    }
    if (player.squish < 1.0) {
        drawSquishedPlayer(ctx, frame, sx, sy, player.facing, player.squish);
    } else if (player.facing < 0) {
        drawPixelSpriteFlipped(ctx, frame, sx, sy, MIRA_PALETTE, 1);
    } else {
        drawPixelSprite(ctx, frame, sx, sy, MIRA_PALETTE, 1);
    }
    drawSpinningKey(ctx, sx, sy, player);
}

function drawSquishedPlayer(ctx, frame, sx, sy, facing, squish) {
    const drawH = Math.max(6, Math.round(PLAYER_H * squish));
    const drawW = Math.round(PLAYER_W * (1 + (1 - squish) * 0.4));
    const offsetY = PLAYER_H - drawH;
    const offsetX = -Math.floor((drawW - PLAYER_W) / 2);
    for (let r = 0; r < frame.length; r++) {
        const targetRow = Math.floor(r * (drawH / frame.length));
        for (let c = 0; c < frame[r].length; c++) {
            const idx = frame[r][c];
            if (!idx) continue;
            const targetCol = Math.floor(c * (drawW / frame[r].length));
            ctx.fillStyle = MIRA_PALETTE[idx];
            const drawCol = facing < 0 ? (drawW - 1 - targetCol) : targetCol;
            ctx.fillRect(sx + offsetX + drawCol, sy + offsetY + targetRow, 1, 1);
        }
    }
}

function drawSpinningKey(ctx, sx, sy, player) {
    const cx = sx + (player.facing > 0 ? 1 : 6);
    const cy = sy + 6;
    ctx.save();
    ctx.translate(cx, cy);
    const ang = (player.keyAngle % 360) * Math.PI / 180;
    ctx.rotate(ang);
    ctx.fillStyle = COLORS.MIRA_KEY;
    ctx.fillRect(-1, -2, 1, 4);
    ctx.fillRect(-1, -2, 3, 1);
    ctx.fillRect(0, -3, 1, 1);
    ctx.restore();
}

export function startWindUp(player, target) {
    player.isWindingUp = true;
    player.windTarget = target;
    player.windProgress = 0;
    player.vx = 0;
}

export function cancelWindUp(player) {
    player.isWindingUp = false;
    player.windTarget = null;
    player.windProgress = 0;
}

export function tickWindUp(player, dt) {
    if (!player.isWindingUp) return false;
    player.windProgress += dt;
    if (player.windProgress >= WIND_HOLD_TIME) return true;
    return false;
}

export function applyWindCost(player) {
    player.gauge = Math.max(0, player.gauge - GAUGE_DRAIN_PER_WIND);
}
