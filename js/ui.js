/*
 * ui.js
 * HUD, title, level-clear, game-over overlays, in-world wind prompt,
 * deaths counter, gear counter, taunt panel.
 *
 * Masocore additions:
 *   - Ghost Mira replay (alpha 0.3, drawn behind live Mira)
 *   - Close-call indicators ("!" and "!!" above Mira)
 *   - Checkpoint rendering (brass clock on wall)
 *   - Level clear judge messages
 *   - Second Wind countdown display
 */

import { COLORS, SCREEN_W, SCREEN_H, GAUGE_LOW_THRESHOLD } from './constants.js';
import {
    drawPixelRect, drawPixelBorder, drawPixelText, drawPixelSprite,
    drawSpeechBubble, measurePixelText, drawPixelSpriteFlipped,
} from './draw.js';
import { SMALL_GEAR, OBJECT_PALETTE, MIRA, MIRA_PALETTE } from './sprites.js';
import { getLevelClearJudge } from './deathSystem.js';

export function drawHUD(ctx, game) {
    const tick = game.tick;
    const p = game.player;

    drawPixelText(ctx, 'LVL ' + String(game.level).padStart(2, '0'), 4, 4, COLORS.UI_TEXT, 1);
    drawPixelText(ctx, game.levelData.name, 4, 14, COLORS.UI_MUTED, 1);

    drawDeathCounter(ctx, game.deathCount || 0, tick);

    ctx.save();
    ctx.translate(SCREEN_W - 10, 10);
    ctx.rotate((tick * 0.05) % (Math.PI * 2));
    ctx.translate(-4, -4);
    drawPixelSprite(ctx, SMALL_GEAR, 0, 0, OBJECT_PALETTE, 1);
    ctx.restore();

    const bx = 4, by = SCREEN_H - 18, bw = 60, bh = 14;
    drawPixelBorder(ctx, bx, by, bw, bh, COLORS.UI_BORDER_L, COLORS.UI_BORDER_D, COLORS.UI_BG, 1);
    drawPixelText(ctx, 'WIND', bx + 3, by + 3, COLORS.UI_MUTED, 1);

    const gx = bx + 22, gy = by + 4, gw = 32, gh = 5;
    drawPixelRect(ctx, gx, gy, gw, gh, COLORS.GAUGE_BG);
    const fillW = Math.round(gw * (p.gauge / p.gaugeMax));
    const low = p.gauge <= GAUGE_LOW_THRESHOLD;
    const flash = low && (Math.floor(tick / 15) % 2 === 0);
    let color = COLORS.GAUGE_FULL;
    if (low) color = flash ? COLORS.GAUGE_LOW : COLORS.GAUGE_BG;
    drawPixelRect(ctx, gx, gy, fillW, gh, color);

    if (game.gearTokens && game.gearTokens.length > 0) {
        // Use liar counter display instead of actual count
        const displayCount = game.liarCounter ? game.liarCounter.getDisplayCount() : (game.gearsCollected || 0);
        const totalGears = game.gearTokens.length + (game.trollTokens ? game.trollTokens.length : 0);
        drawGearCounter(ctx, displayCount, totalGears);
    }

    if (game.message && game.messageTimer > 0) {
        const tw = measurePixelText(game.message, 1);
        drawPixelText(ctx, game.message, (SCREEN_W - tw) / 2 | 0, SCREEN_H - 32, COLORS.GLOW_WARM, 1);
    }

    // ─── Second Wind countdown ───
    if (game.secondWindActive && game.secondWindTimer > 0) {
        const countText = Math.ceil(game.secondWindTimer).toString();
        const tw = measurePixelText(countText, 2);
        const pulse = Math.abs(Math.sin(tick * 0.15));
        const alpha = 0.5 + pulse * 0.5;
        ctx.save();
        ctx.globalAlpha = alpha;
        drawPixelText(ctx, countText, (SCREEN_W - tw) / 2 | 0, 30, COLORS.GAUGE_LOW, 2);
        ctx.restore();
    }
}

export function drawDeathCounter(ctx, count, tick) {
    const label = 'DEATHS: ' + String(count).padStart(3, '0');
    const scale = 2;
    const tw = measurePixelText(label, scale);
    const x = ((SCREEN_W - tw) / 2) | 0;
    const y = 4;

    let color = COLORS.UI_TEXT;
    if (count >= 100)      color = COLORS.METAL_LIGHT;
    else if (count >= 50)  color = COLORS.SPARK_1;
    else if (count >= 25)  color = (Math.floor(tick / 10) % 2 === 0) ? COLORS.GAUGE_LOW : COLORS.UI_BG;
    else if (count >= 10)  color = COLORS.GAUGE_LOW;

    drawPixelText(ctx, label, x, y, color, scale);
}

export function drawGearCounter(ctx, collected, total) {
    const label = 'GEARS: ' + collected + '/' + total;
    const tw = measurePixelText(label, 1);
    const x = SCREEN_W - tw - 4;
    const y = SCREEN_H - 8;
    drawPixelText(ctx, label, x, y, collected === total ? COLORS.GLOW_WARM : COLORS.UI_TEXT, 1);
}

export function drawTitle(ctx, tick) {
    drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, COLORS.BACKGROUND);

    drawBgGears(ctx, tick);

    const t1 = 'BROKEN';
    const t2 = 'CLOCKWORK';
    const t1w = measurePixelText(t1, 3);
    const t2w = measurePixelText(t2, 2);
    drawPixelText(ctx, t1, (SCREEN_W - t1w) / 2 | 0, 30, COLORS.METAL_LIGHT, 3);
    drawPixelText(ctx, t2, (SCREEN_W - t2w) / 2 | 0, 60, COLORS.GLOW_WARM, 2);

    const sub = 'EVERYTHING WILL KILL YOU.';
    const subW = measurePixelText(sub, 1);
    drawPixelText(ctx, sub, (SCREEN_W - subW) / 2 | 0, 84, COLORS.GAUGE_LOW, 1);

    if (Math.floor(tick / 30) % 2 === 0) {
        const s = 'PRESS SPACE TO START';
        const sw = measurePixelText(s, 1);
        drawPixelText(ctx, s, (SCREEN_W - sw) / 2 | 0, 110, COLORS.UI_TEXT, 1);
    }
    const c = 'ARROWS MOVE - E WIND - R RESET';
    const cw = measurePixelText(c, 1);
    drawPixelText(ctx, c, (SCREEN_W - cw) / 2 | 0, 136, COLORS.UI_MUTED, 1);

    const cred = 'ALL GEARS. NO MERCY.';
    const credW = measurePixelText(cred, 1);
    drawPixelText(ctx, cred, (SCREEN_W - credW) / 2 | 0, 158, COLORS.UI_MUTED, 1);
}

function drawBgGears(ctx, tick) {
    const gears = [
        { cx: 40, cy: 40, r: 28, dir: 1, teeth: 8 },
        { cx: 280, cy: 30, r: 22, dir: -1, teeth: 6 },
        { cx: 60, cy: 150, r: 18, dir: -1, teeth: 6 },
        { cx: 270, cy: 140, r: 32, dir: 1, teeth: 10 },
    ];
    for (const g of gears) {
        const ang = tick * 0.005 * g.dir;
        ctx.fillStyle = COLORS.TILE_DARK;
        for (let i = 0; i < g.teeth; i++) {
            const a = ang + (i / g.teeth) * Math.PI * 2;
            const x = g.cx + Math.cos(a) * g.r;
            const y = g.cy + Math.sin(a) * g.r;
            ctx.fillRect((x - 2) | 0, (y - 2) | 0, 4, 4);
        }
        for (let r = 0; r < g.r - 4; r += 1) {
            for (let a = 0; a < 32; a++) {
                const aa = (a / 32) * Math.PI * 2 + ang;
                const x = g.cx + Math.cos(aa) * r;
                const y = g.cy + Math.sin(aa) * r;
                if ((r % 6) === 0 || r === 1) {
                    ctx.fillStyle = COLORS.TILE_MID;
                    ctx.fillRect(x | 0, y | 0, 1, 1);
                }
            }
        }
        ctx.fillStyle = COLORS.TILE_DARK;
        ctx.fillRect((g.cx - 3) | 0, (g.cy - 3) | 0, 6, 6);
    }
}

export function drawLevelClear(ctx, levelDeaths, totalDeaths, tick) {
    drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, 'rgba(0,0,0,0.7)');

    const t = 'YOU DID IT.';
    const tw = measurePixelText(t, 3);
    drawPixelText(ctx, t, (SCREEN_W - tw) / 2 | 0, SCREEN_H / 2 - 30, COLORS.GLOW_WARM, 3);

    // ─── Level Clear Judge ───
    const judgeMsg = getLevelClearJudge(levelDeaths);
    const jw = measurePixelText(judgeMsg, 1);
    // Color based on death tier
    let judgeColor = COLORS.GLOW_WARM;
    if (levelDeaths > 50) judgeColor = COLORS.GAUGE_LOW;
    else if (levelDeaths > 30) judgeColor = COLORS.SPARK_2;
    else if (levelDeaths > 15) judgeColor = COLORS.METAL_LIGHT;
    drawPixelText(ctx, judgeMsg, (SCREEN_W - jw) / 2 | 0, SCREEN_H / 2 - 4, judgeColor, 1);

    const sub1 = 'DEATHS THIS LEVEL: ' + levelDeaths;
    const sw1 = measurePixelText(sub1, 1);
    drawPixelText(ctx, sub1, (SCREEN_W - sw1) / 2 | 0, SCREEN_H / 2 + 14, COLORS.UI_MUTED, 1);

    const sub2 = 'TOTAL: ' + totalDeaths;
    const sw2 = measurePixelText(sub2, 1);
    drawPixelText(ctx, sub2, (SCREEN_W - sw2) / 2 | 0, SCREEN_H / 2 + 26, COLORS.UI_MUTED, 1);

    if (Math.floor(tick / 30) % 2 === 0) {
        const s = 'PRESS SPACE';
        const sw = measurePixelText(s, 1);
        drawPixelText(ctx, s, (SCREEN_W - sw) / 2 | 0, SCREEN_H - 20, COLORS.UI_MUTED, 1);
    }
}

export function drawGameOver(ctx, tick) {
    drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, 'rgba(0,0,0,0.7)');
    const pw = 200, ph = 60;
    const px = (SCREEN_W - pw) / 2 | 0;
    const py = (SCREEN_H - ph) / 2 | 0;
    drawPixelBorder(ctx, px, py, pw, ph, COLORS.UI_BORDER_L, COLORS.UI_BORDER_D, COLORS.UI_BG, 1);
    const t = 'WOUND DOWN...';
    const tw = measurePixelText(t, 2);
    drawPixelText(ctx, t, (SCREEN_W - tw) / 2 | 0, py + 14, COLORS.GAUGE_LOW, 2);
    if (Math.floor(tick / 30) % 2 === 0) {
        const s = 'PRESS R TO RETRY';
        const sw = measurePixelText(s, 1);
        drawPixelText(ctx, s, (SCREEN_W - sw) / 2 | 0, py + 40, COLORS.UI_MUTED, 1);
    }
}

export function drawPaused(ctx) {
    drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, 'rgba(0,0,0,0.6)');
    const t = 'PAUSED';
    const tw = measurePixelText(t, 3);
    drawPixelText(ctx, t, (SCREEN_W - tw) / 2 | 0, SCREEN_H / 2 - 12, COLORS.UI_TEXT, 3);
    const s = 'PRESS P TO RESUME';
    const sw = measurePixelText(s, 1);
    drawPixelText(ctx, s, (SCREEN_W - sw) / 2 | 0, SCREEN_H / 2 + 18, COLORS.UI_MUTED, 1);
}

export function drawWindPrompt(ctx, target, camX, camY, tick) {
    if (!target) return;
    const cx = (target.centerX() - camX) | 0;
    const cy = (target.y - camY - 4 + Math.sin(tick * 0.08) * 2) | 0;
    drawSpeechBubble(ctx, '[E] WIND', cx, cy);
}

export function drawTransition(ctx, alpha) {
    if (alpha <= 0) return;
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
}

export function drawFlashOverlay(ctx, alpha) {
    if (alpha <= 0) return;
    ctx.fillStyle = `rgba(255,255,240,${alpha})`;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
}

export function drawGearToken(ctx, token, camX, camY, tick) {
    if (token.collected) return;
    const cx = (token.x - camX) | 0;
    const cy = (token.y - camY) | 0;
    const ang = token.angle || 0;
    const teeth = 6;
    const bob = Math.sin(tick * 0.08 + token.x * 0.1) * 1;
    ctx.save();
    ctx.translate(cx + 4, cy + 4 + bob);
    ctx.rotate(ang);
    ctx.fillStyle = COLORS.METAL_LIGHT;
    for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2;
        const tx = Math.cos(a) * 3;
        const ty = Math.sin(a) * 3;
        ctx.fillRect((tx - 1) | 0, (ty - 1) | 0, 2, 2);
    }
    ctx.fillStyle = COLORS.GLOW_WARM;
    ctx.fillRect(-2, -2, 4, 4);
    ctx.fillStyle = COLORS.METAL_DARK;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
    if ((tick + token.x) % 40 < 2) {
        ctx.fillStyle = COLORS.SPARK_1;
        ctx.fillRect(cx + 3, cy - 1 + (bob | 0), 1, 1);
    }
}

export function drawLockedDoor(ctx, goal, camX, camY, tick, unlocked) {
    if (!goal) return;
    const sx = goal.x - camX;
    const sy = goal.y - camY;
    drawPixelRect(ctx, sx, sy, goal.w, goal.h, COLORS.UI_BG);
    if (unlocked) {
        const pulse = Math.abs(Math.sin(tick * 0.08));
        const edge = pulse > 0.5 ? COLORS.GLOW_WARM : COLORS.METAL_LIGHT;
        drawPixelBorder(ctx, sx, sy, goal.w, goal.h, edge, COLORS.METAL_DARK, COLORS.TILE_MID, 1);
        drawPixelRect(ctx, sx + goal.w / 2 - 1, sy + 2, 2, goal.h - 4, edge);
        for (let i = 0; i < 4; i++) {
            const py = sy - i * 3 - (tick % 12);
            drawPixelRect(ctx, sx + goal.w / 2 - 1, py, 2, 2, COLORS.SPARK_1);
        }
    } else {
        drawPixelBorder(ctx, sx, sy, goal.w, goal.h,
            COLORS.METAL_DARK, COLORS.UI_BG, COLORS.LOCKED_DOOR, 1);
        drawPixelRect(ctx, sx + goal.w / 2 - 2, sy + goal.h / 2 - 2, 4, 4, COLORS.GAUGE_LOW);
        drawPixelRect(ctx, sx + goal.w / 2 - 1, sy + goal.h / 2 - 1, 2, 2, COLORS.UI_BG);
    }
}

// ═══════ MASOCORE UI ADDITIONS ═══════

/**
 * Draw ghost Mira (alpha 0.3, METAL_MID tint) replaying best attempt.
 * Drawn BEHIND live Mira. Ghost ahead = doing worse. Ghost behind = beating yourself.
 */
export function drawGhostMira(ctx, ghostFrame, camX, camY) {
    if (!ghostFrame) return;
    const sx = (ghostFrame.x - camX) | 0;
    const sy = (ghostFrame.y - camY) | 0;

    ctx.save();
    ctx.globalAlpha = 0.3;

    // Determine frame based on stored anim info
    let frame;
    const animFrame = ghostFrame.animFrame || 0;
    const anim = ghostFrame.anim || 'idle';

    if (anim === 'idle') {
        frame = (animFrame % 2 === 0) ? MIRA.idle_0 : MIRA.idle_1;
    } else if (anim === 'walk') {
        const frames = [MIRA.walk_0, MIRA.walk_1, MIRA.walk_2, MIRA.walk_3];
        frame = frames[animFrame % 4];
    } else {
        frame = MIRA.idle_0;
    }

    // Draw with a muted tint by using reduced-alpha palette
    const facing = ghostFrame.facing || 1;
    if (facing < 0) {
        drawPixelSpriteFlipped(ctx, frame, sx, sy, MIRA_PALETTE, 1);
    } else {
        drawPixelSprite(ctx, frame, sx, sy, MIRA_PALETTE, 1);
    }

    ctx.restore();
}

/**
 * Draw close-call indicator above Mira.
 * type 'close': "!" for 20 frames
 * type 'extreme': "!!" for 30 frames + white flash
 */
export function drawCloseCallIndicator(ctx, player, camX, camY, closeCallType, closeCallTimer) {
    if (closeCallTimer <= 0 || !closeCallType) return;
    const sx = (player.x - camX + 4) | 0;
    const sy = (player.y - camY - 8) | 0;

    const text = closeCallType === 'extreme' ? '!!' : '!';
    const tw = measurePixelText(text, 1);
    const alpha = Math.min(1, closeCallTimer / 5); // fade out at end

    ctx.save();
    ctx.globalAlpha = alpha;
    drawPixelText(ctx, text, sx - tw / 2, sy, COLORS.SPARK_1, 1);
    ctx.restore();

    // White flash for extreme close call
    if (closeCallType === 'extreme' && closeCallTimer > 25) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
}

/**
 * Draw checkpoint (brass clock on wall).
 * Active checkpoints show sparkle effect.
 */
export function drawCheckpoint(ctx, checkpoint, camX, camY, tick) {
    if (!checkpoint) return;
    const sx = (checkpoint.x - camX) | 0;
    const sy = (checkpoint.y - camY) | 0;

    // Brass clock body
    const activated = checkpoint.activated || false;
    const bodyColor = activated ? COLORS.GLOW_WARM : COLORS.METAL_MID;
    const faceColor = activated ? COLORS.IVORY : COLORS.METAL_LIGHT;

    // Clock body (12x12)
    drawPixelRect(ctx, sx, sy, 12, 12, COLORS.METAL_DARK);
    drawPixelRect(ctx, sx + 1, sy + 1, 10, 10, bodyColor);

    // Clock face (8x8 centered)
    drawPixelRect(ctx, sx + 2, sy + 2, 8, 8, faceColor);
    drawPixelRect(ctx, sx + 5, sy + 5, 2, 2, COLORS.METAL_DARK);

    // Clock hands
    if (activated) {
        const ang = tick * 0.03;
        const hx = sx + 6 + Math.cos(ang) * 2;
        const hy = sy + 6 + Math.sin(ang) * 2;
        ctx.fillStyle = COLORS.METAL_DARK;
        ctx.fillRect(hx | 0, hy | 0, 1, 1);
    } else {
        // Static hands
        ctx.fillStyle = COLORS.METAL_DARK;
        ctx.fillRect(sx + 6, sy + 3, 1, 3);
        ctx.fillRect(sx + 6, sy + 5, 2, 1);
    }

    // Sparkle effect when activated
    if (activated && tick % 20 < 3) {
        ctx.fillStyle = COLORS.SPARK_1;
        ctx.fillRect(sx + 1, sy - 2, 1, 1);
        ctx.fillRect(sx + 10, sy - 1, 1, 1);
        ctx.fillRect(sx + 6, sy - 3, 1, 1);
    }
}

/**
 * Draw Color Betrayal tile (Troll 3) — green-tinted wall
 */
export function drawColorBetrayalTile(ctx, zone, camX, camY) {
    const sx = (zone.x - camX) | 0;
    const sy = (zone.y - camY) | 0;
    const w = zone.w || 16;
    const h = zone.h || 16;
    
    // Draw the betrayal zone with green-tinted color
    drawPixelRect(ctx, sx, sy, w, h, zone.color || COLORS.COLOR_BETRAYAL);
    
    // Add subtle "exit-like" styling to look inviting
    if (w >= 12 && h >= 12) {
        drawPixelRect(ctx, sx + 2, sy + 2, w - 4, h - 4, '#6B7B30');
    }
    if (w >= 8 && h >= 8) {
        drawPixelRect(ctx, sx + 4, sy + 4, w - 8, h - 8, '#7B8B40');
    }
    // Subtle glow in center
    if (w >= 12 && h >= 12) {
        const glowW = Math.max(4, w - 12);
        const glowH = Math.max(4, h - 12);
        drawPixelRect(ctx, sx + 6, sy + 6, glowW, glowH, '#8B9B50');
    }
}

/**
 * Draw mercy hints for obstacles that have killed the player 5+ times.
 * Hints are subtle visual cues showing safe positions or patterns.
 */
export function drawMercyHints(ctx, obstacles, deathSystem, camX, camY, tick) {
    const { getObstacleDeathCount } = deathSystem;
    const MERCY_THRESHOLD = 5;

    for (const obstacle of obstacles) {
        if (!obstacle.id) continue;
        
        const deathCount = getObstacleDeathCount(obstacle.id);
        if (deathCount < MERCY_THRESHOLD) continue;

        // Obstacle has killed player 5+ times - show mercy hint
        const type = obstacle.type;

        switch (type) {
            case 'PISTON':
                drawPistonMercyHint(ctx, obstacle, camX, camY);
                break;
            
            case 'ORBIT_SPHERE':
                drawOrbitSphereMercyHint(ctx, obstacle, camX, camY);
                break;
            
            case 'GEAR_SPINNER':
                drawGearSpinnerMercyHint(ctx, obstacle, camX, camY, tick);
                break;
            
            case 'PENDULUM':
                drawPendulumMercyHint(ctx, obstacle, camX, camY);
                break;
            
            case 'BOUNCING_BALL':
                // For bouncing ball, extend ghost trail (handled in obstacle itself)
                if (!obstacle.ghostTrailFrames || obstacle.ghostTrailFrames < 6) {
                    obstacle.ghostTrailFrames = 6;
                }
                break;
        }
    }
}

/**
 * Draw faint dust particles at piston's safe position (when fully retracted)
 */
function drawPistonMercyHint(ctx, obstacle, camX, camY) {
    // Safe position is at (ax, ay) when piston is fully retracted
    const safeX = (obstacle.ax - camX) | 0;
    const safeY = (obstacle.ay - camY) | 0;
    
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = COLORS.METAL_MID;
    
    // Draw small dust particles in a cluster
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 2 + Math.random() * 2;
        const px = safeX + Math.cos(angle) * radius;
        const py = safeY + Math.sin(angle) * radius;
        ctx.fillRect(px | 0, py | 0, 1, 1);
    }
    
    ctx.restore();
}

/**
 * Draw faint arc showing the full orbit path of the sphere
 */
function drawOrbitSphereMercyHint(ctx, obstacle, camX, camY) {
    const cx = (obstacle.cx - camX) | 0;
    const cy = (obstacle.cy - camY) | 0;
    const radius = obstacle.orbitRadius || 20;
    
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = COLORS.METAL_MID;
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
}

/**
 * Highlight the 1px gap between gear teeth
 */
function drawGearSpinnerMercyHint(ctx, obstacle, camX, camY, tick) {
    const cx = (obstacle.x - camX) | 0;
    const cy = (obstacle.y - camY) | 0;
    const radius = obstacle.radius || 16;
    const teeth = obstacle.teeth || 8;
    
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = COLORS.GLOW_WARM;
    
    // Highlight gaps between teeth
    const angle = obstacle.angle || 0;
    for (let i = 0; i < teeth; i++) {
        const gapAngle = angle + (i / teeth) * Math.PI * 2 + (Math.PI / teeth);
        const gapX = cx + Math.cos(gapAngle) * radius;
        const gapY = cy + Math.sin(gapAngle) * radius;
        
        // Draw a small highlight at the gap
        ctx.fillRect((gapX - 1) | 0, (gapY - 1) | 0, 2, 2);
    }
    
    ctx.restore();
}

/**
 * Draw 1px arc showing the full swing range of the pendulum
 */
function drawPendulumMercyHint(ctx, obstacle, camX, camY) {
    const px = (obstacle.x - camX) | 0;
    const py = (obstacle.y - camY) | 0;
    const length = obstacle.length || 40;
    const amplitude = obstacle.amplitude || 1.0;
    
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = COLORS.METAL_MID;
    ctx.lineWidth = 1;
    
    // Draw arc showing swing range
    const maxAngle = amplitude;
    ctx.beginPath();
    ctx.arc(px, py, length, -Math.PI / 2 - maxAngle, -Math.PI / 2 + maxAngle);
    ctx.stroke();
    
    ctx.restore();
}
