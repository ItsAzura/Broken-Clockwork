/*
 * AutonomousObstacle.js
 * Always-moving obstacles that kill on contact.
 * Types: GEAR_SPINNER, PENDULUM, PISTON, BOUNCING_BALL, ORBIT_SPHERE
 *
 * Masocore additions:
 *   - Hitbox shrink (visual unchanged, collision 2px smaller each side)
 *   - Pattern Betrayal (orbit speed changes at betrayal time)
 *   - Second Wind trap (invisible until triggered, 8s timer)
 *   - Offbeat Piston (4-beat cycle with deceptive timing)
 *   - Mercy hints (visual tells after repeated deaths)
 *   - Speed tier coloring
 */

import {
    AUTO, COLORS, HITBOX_SHRINK,
    PATTERN_BETRAYAL_MULT,
    SECOND_WIND_DURATION, SECOND_WIND_FADE_IN,
    OFFBEAT_PISTON_CYCLE,
} from './constants.js';
import { drawPixelRect } from './draw.js';
import { playPistonClunk, playOffbeatPistonBeat } from './audio.js';

export class AutonomousObstacle {
    constructor(data) {
        Object.assign(this, data);
        this.time = data.initialTime !== undefined ? data.initialTime : (Math.random() * 100);
        this.speedMult = 1;
        this._wasNear = false;
        this._cachedBounds = null;

        // Death tracking for mercy system
        this.deathCount = 0;
        this.showMercyHint = false;

        // Speed tier color override (set by level data)
        this.tierColor = data.tierColor || null;

        if (this.type === AUTO.BOUNCING_BALL) {
            this.vx = this.vx || 60;
            this.vy = this.vy || 60;
            // Ghost trail length (increases with mercy)
            this.ghostTrailFrames = data.ghostTrailFrames || 3;
        }
        if (this.type === AUTO.ORBIT_SPHERE) {
            this.angle = this.startAngle || 0;
        }

        this.isActive = this.initiallyActive !== false;

        // ─── Pattern Betrayal (Troll 5) ───
        this.patternBetrayal = data.patternBetrayal || false;
        this.betrayalTime = data.betrayalTime || 6.0;
        this.betrayalDuration = data.betrayalDuration || 2.4;
        this.speedMultiplier = data.speedMultiplier || 1.15;
        this._baseOrbitSpeed = this.orbitSpeed || 0;
        this.currentSpeed = this._baseOrbitSpeed;

        // ─── Second Wind Trap (Troll 6) ───
        this.isSecondWind = data.isSecondWind || false;
        this.secondWindTimer = 0;
        this.secondWindAlpha = 0;
        this.secondWindActive = false;
        this.secondWindExpired = false;
        if (this.isSecondWind) {
            this.isActive = false;
            this.secondWindAlpha = 0;
        }

        // ─── Offbeat Piston (Troll 2) ───
        this.isOffbeat = data.isOffbeat || false;
        this.offbeatCycle = data.offbeatCycle || OFFBEAT_PISTON_CYCLE;
        this.offbeatMercyGlow = false;
        this._offbeatPhase = 0;
        this._prevOffbeatBeat = -1;
    }

    activate() {
        this.isActive = true;
    }

    // ─── Second Wind activation ───
    activateSecondWind() {
        if (this.secondWindExpired) return;
        this.secondWindActive = true;
        this.secondWindTimer = SECOND_WIND_DURATION;
        this.secondWindAlpha = 0;
        this.isActive = true;
    }

    // ─── Increment death count for mercy system ───
    recordDeath(threshold) {
        this.deathCount++;
        if (this.deathCount >= threshold) {
            this.showMercyHint = true;
            // Bouncing ball: increase ghost trail
            if (this.type === AUTO.BOUNCING_BALL) {
                this.ghostTrailFrames = 6;
            }
        }
    }

    update(dt, roomTime) {
        // Second Wind timer
        if (this.isSecondWind && this.secondWindActive) {
            // Fade in
            if (this.secondWindAlpha < 1) {
                this.secondWindAlpha = Math.min(1, this.secondWindAlpha + dt / SECOND_WIND_FADE_IN);
            }
            this.secondWindTimer -= dt;
            if (this.secondWindTimer <= 0) {
                // Expire permanently
                this.secondWindActive = false;
                this.secondWindExpired = true;
                this.isActive = false;
                this.secondWindAlpha = 0;
                return;
            }
        }

        if (!this.isActive) return;

        const effectiveDt = dt * this.speedMult;
        if (effectiveDt === 0) return;
        this.time += effectiveDt;
        this._cachedBounds = null; // Invalidate cache

        // Pattern Betrayal: adjust orbit speed based on room time
        if (this.patternBetrayal && this.type === AUTO.ORBIT_SPHERE && roomTime !== undefined) {
            const inBetray = roomTime >= this.betrayalTime &&
                             roomTime < this.betrayalTime + this.betrayalDuration;
            this.currentSpeed = inBetray
                ? this._baseOrbitSpeed * this.speedMultiplier
                : this._baseOrbitSpeed;
        }

        switch (this.type) {
            case AUTO.PISTON: {
                if (this.isOffbeat) {
                    // ─── Offbeat Piston (Troll 2): 4-beat cycle ───
                    this._offbeatPhase = (this.time % this.offbeatCycle) / this.offbeatCycle;
                    const beat = Math.floor(this._offbeatPhase * 4);

                    // Play beat-specific sound on beat change
                    if (beat !== this._prevOffbeatBeat) {
                        playOffbeatPistonBeat(beat);
                        this._prevOffbeatBeat = beat;
                    }

                    // 4-beat positions:
                    //   beat 0: GAP OPEN (looks safe, but wrong window)
                    //   beat 1: left extends (partial close)
                    //   beat 2: fully CLOSED
                    //   beat 3: left retracts (partial open) → true safe window at end
                    let t;
                    switch (beat) {
                        case 0: t = 0.0; break;   // open (TRAP)
                        case 1: t = 0.5; break;   // partial
                        case 2: t = 1.0; break;   // closed
                        case 3: t = 0.3; break;   // partial open → safe window at beat 3→0
                        default: t = 0;
                    }
                    // Smooth interpolation within beat
                    const beatProgress = (this._offbeatPhase * 4) - beat;
                    const nextBeat = (beat + 1) % 4;
                    let nextT;
                    switch (nextBeat) {
                        case 0: nextT = 0.0; break;
                        case 1: nextT = 0.5; break;
                        case 2: nextT = 1.0; break;
                        case 3: nextT = 0.3; break;
                        default: nextT = 0;
                    }
                    const smoothT = t + (nextT - t) * beatProgress;

                    this.x = this.ax + (this.bx - this.ax) * smoothT;
                    this.y = this.ay + (this.by - this.ay) * smoothT;
                } else {
                    // Standard piston
                    const prevT = this._prevPistonT;
                    const t = (Math.sin(this.time * this.speed) + 1) / 2;

                    if (prevT !== undefined) {
                        const wasBelowHalf = prevT < 0.5;
                        const isBelowHalf = t < 0.5;
                        if (wasBelowHalf !== isBelowHalf) {
                            playPistonClunk();
                        }
                    }

                    this._prevPistonT = t;
                    this.x = this.ax + (this.bx - this.ax) * t;
                    this.y = this.ay + (this.by - this.ay) * t;
                }
                break;
            }
            case AUTO.BOUNCING_BALL: {
                this.x += this.vx * effectiveDt;
                this.y += this.vy * effectiveDt;
                const minX = this.boundX;
                const maxX = this.boundX + this.boundW - this.r * 2;
                const minY = this.boundY;
                const maxY = this.boundY + this.boundH - this.r * 2;
                if (this.x <= minX) { this.x = minX; this.vx = Math.abs(this.vx); }
                if (this.x >= maxX) { this.x = maxX; this.vx = -Math.abs(this.vx); }
                if (this.y <= minY) { this.y = minY; this.vy = Math.abs(this.vy); }
                if (this.y >= maxY) { this.y = maxY; this.vy = -Math.abs(this.vy); }
                break;
            }
            case AUTO.ORBIT_SPHERE: {
                const speed = this.patternBetrayal ? this.currentSpeed : this.orbitSpeed;
                this.angle += speed * effectiveDt;
                break;
            }
        }
    }

    getBounds() {
        if (!this.isActive) return null;
        if (this._cachedBounds) return this._cachedBounds;

        const shrink = HITBOX_SHRINK; // 2px each side — visual unchanged, hitbox forgiving
        let bounds = null;

        switch (this.type) {
            case AUTO.GEAR_SPINNER: {
                const teeth = [];
                const toothCount = this.teeth || 6;
                const angle = this.time * this.rotationSpeed;
                for (let i = 0; i < toothCount; i++) {
                    const a = angle + (i / toothCount) * Math.PI * 2;
                    const tx = this.x + Math.cos(a) * this.radius;
                    const ty = this.y + Math.sin(a) * this.radius;
                    // Shrunk hitbox (4→4 minus 2 each side = effectively smaller)
                    teeth.push({
                        x: tx - 2 + shrink,
                        y: ty - 2 + shrink,
                        w: 4 - shrink * 2,
                        h: 4 - shrink * 2,
                    });
                }
                bounds = { type: 'multi', rects: teeth };
                break;
            }
            case AUTO.PENDULUM: {
                const angle = Math.sin(this.time * this.frequency) * this.amplitude;
                const tipX = this.x + Math.sin(angle) * this.length;
                const tipY = this.y + Math.cos(angle) * this.length;
                const r = this.tipRadius || 5;
                bounds = {
                    x: tipX - r + shrink,
                    y: tipY - r + shrink,
                    w: r * 2 - shrink * 2,
                    h: r * 2 - shrink * 2,
                };
                break;
            }
            case AUTO.PISTON: {
                bounds = {
                    x: this.x + shrink,
                    y: this.y + shrink,
                    w: this.w - shrink * 2,
                    h: this.h - shrink * 2,
                };
                break;
            }
            case AUTO.BOUNCING_BALL: {
                bounds = {
                    x: this.x + shrink,
                    y: this.y + shrink,
                    w: this.r * 2 - shrink * 2,
                    h: this.r * 2 - shrink * 2,
                };
                break;
            }
            case AUTO.ORBIT_SPHERE: {
                const ox = this.cx + Math.cos(this.angle) * this.orbitRadius;
                const oy = this.cy + Math.sin(this.angle) * this.orbitRadius;
                const r = this.sphereR || 3;
                bounds = {
                    x: ox - r + shrink,
                    y: oy - r + shrink,
                    w: r * 2 - shrink * 2,
                    h: r * 2 - shrink * 2,
                };
                break;
            }
        }
        this._cachedBounds = bounds;
        return bounds;
    }

    draw(ctx, camX, camY, tick) {
        if (!this.isActive) return;

        // Second Wind: draw with alpha
        if (this.isSecondWind && this.secondWindActive) {
            ctx.save();
            ctx.globalAlpha = this.secondWindAlpha;
        }

        const sx = (this.x - camX) | 0;
        const sy = (this.y - camY) | 0;

        // Determine draw color based on speed tier
        const tierCol = this.tierColor || null;

        switch (this.type) {
            case AUTO.GEAR_SPINNER: {
                const angle = this.time * this.rotationSpeed;
                const toothCount = this.teeth || 6;
                ctx.fillStyle = tierCol || COLORS.METAL_MID;
                for (let i = 0; i < toothCount; i++) {
                    const a = angle + (i / toothCount) * Math.PI * 2;
                    const tx = sx + Math.cos(a) * this.radius;
                    const ty = sy + Math.sin(a) * this.radius;
                    drawPixelRect(ctx, (tx - 2) | 0, (ty - 2) | 0, 4, 4, COLORS.GAUGE_LOW);
                }
                ctx.fillStyle = COLORS.METAL_DARK;
                ctx.fillRect(sx - 3, sy - 3, 6, 6);
                ctx.fillStyle = COLORS.DANGER_ZONE;
                ctx.beginPath();
                ctx.arc(sx, sy, this.radius + 2, 0, Math.PI * 2);
                ctx.fill();

                // ─── Mercy hint: 1px gap highlight between teeth ───
                if (this.showMercyHint) {
                    for (let i = 0; i < toothCount; i++) {
                        const a1 = angle + (i / toothCount) * Math.PI * 2;
                        const a2 = angle + ((i + 1) / toothCount) * Math.PI * 2;
                        const midA = (a1 + a2) / 2;
                        const gapX = sx + Math.cos(midA) * this.radius;
                        const gapY = sy + Math.sin(midA) * this.radius;
                        ctx.fillStyle = `rgba(255,208,128,0.4)`; // GLOW_WARM alpha 0.4
                        ctx.fillRect((gapX - 0.5) | 0, (gapY - 0.5) | 0, 1, 1);
                    }
                }
                break;
            }
            case AUTO.PENDULUM: {
                const angle = Math.sin(this.time * this.frequency) * this.amplitude;
                const tipX = sx + Math.sin(angle) * this.length;
                const tipY = sy + Math.cos(angle) * this.length;
                ctx.strokeStyle = tierCol || COLORS.METAL_MID;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(tipX, tipY);
                ctx.stroke();
                ctx.fillStyle = COLORS.GAUGE_LOW;
                ctx.beginPath();
                ctx.arc(tipX, tipY, this.tipRadius || 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = COLORS.METAL_DARK;
                ctx.fillRect(sx - 2, sy - 2, 4, 4);

                // ─── Mercy hint: 1px arc showing full swing range ───
                if (this.showMercyHint) {
                    ctx.strokeStyle = 'rgba(255,208,128,0.3)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    const leftAngle = -this.amplitude;
                    const rightAngle = this.amplitude;
                    const steps = 20;
                    for (let i = 0; i <= steps; i++) {
                        const a = leftAngle + (rightAngle - leftAngle) * (i / steps);
                        const px = sx + Math.sin(a) * this.length;
                        const py = sy + Math.cos(a) * this.length;
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.stroke();
                } else {
                    // Standard danger range lines
                    ctx.strokeStyle = COLORS.DANGER_ZONE;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    const leftAngle = -this.amplitude;
                    const rightAngle = this.amplitude;
                    const leftX = sx + Math.sin(leftAngle) * this.length;
                    const leftY = sy + Math.cos(leftAngle) * this.length;
                    const rightX = sx + Math.sin(rightAngle) * this.length;
                    const rightY = sy + Math.cos(rightAngle) * this.length;
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(leftX, leftY);
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(rightX, rightY);
                    ctx.stroke();
                }
                break;
            }
            case AUTO.PISTON: {
                drawPixelRect(ctx, sx, sy, this.w, this.h, COLORS.GAUGE_LOW);
                drawPixelRect(ctx, sx + 1, sy + 1, this.w - 2, this.h - 2, tierCol || COLORS.METAL_MID);
                const rangeY1 = (this.ay - camY) | 0;
                const rangeY2 = (this.by - camY) | 0;
                const rangeX1 = (this.ax - camX) | 0;
                const rangeX2 = (this.bx - camX) | 0;
                ctx.strokeStyle = COLORS.DANGER_ZONE;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(rangeX1 + this.w / 2, rangeY1 + this.h / 2);
                ctx.lineTo(rangeX2 + this.w / 2, rangeY2 + this.h / 2);
                ctx.stroke();

                // ─── Mercy hint: faint dust at safe position ───
                if (this.showMercyHint) {
                    // Safe position is at ax, ay (fully retracted)
                    const safeX = (this.ax - camX) | 0;
                    const safeY = (this.ay - camY) | 0;
                    ctx.fillStyle = 'rgba(255,208,128,0.3)';
                    for (let i = 0; i < 3; i++) {
                        const dx = (Math.sin(tick * 0.1 + i * 2) * 3) | 0;
                        const dy = (Math.cos(tick * 0.1 + i * 1.7) * 2) | 0;
                        ctx.fillRect(safeX + this.w / 2 + dx - 1, safeY + this.h / 2 + dy - 1, 2, 2);
                    }
                }

                // ─── Offbeat mercy glow ───
                if (this.isOffbeat && this.offbeatMercyGlow) {
                    // Glow at the true safe position (beat 3→0 transition)
                    const safeX = (this.ax - camX) | 0;
                    const safeY = (this.ay - camY) | 0;
                    const pulse = Math.abs(Math.sin(tick * 0.05));
                    ctx.fillStyle = `rgba(255,208,128,${0.15 + pulse * 0.15})`;
                    ctx.fillRect(safeX + this.w / 2 - 3, safeY + this.h / 2 - 3, 6, 6);
                }
                break;
            }
            case AUTO.BOUNCING_BALL: {
                ctx.fillStyle = COLORS.GAUGE_LOW;
                ctx.beginPath();
                ctx.arc(sx + this.r, sy + this.r, this.r, 0, Math.PI * 2);
                ctx.fill();
                // Ghost trail (mercy increases from 3 to 6 frames)
                const trailFrames = this.ghostTrailFrames || 3;
                for (let i = 1; i <= trailFrames; i++) {
                    const prevX = this.x - this.vx * 0.016 * i;
                    const prevY = this.y - this.vy * 0.016 * i;
                    const alpha = 0.3 - i * (0.3 / (trailFrames + 1));
                    ctx.fillStyle = `rgba(200,64,32,${Math.max(0, alpha)})`;
                    ctx.beginPath();
                    ctx.arc((prevX - camX + this.r) | 0, (prevY - camY + this.r) | 0, this.r, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }
            case AUTO.ORBIT_SPHERE: {
                const ox = this.cx + Math.cos(this.angle) * this.orbitRadius;
                const oy = this.cy + Math.sin(this.angle) * this.orbitRadius;
                const osx = (ox - camX) | 0;
                const osy = (oy - camY) | 0;

                // ─── Mercy hint: faint arc showing full orbit ───
                if (this.showMercyHint) {
                    ctx.strokeStyle = 'rgba(255,208,128,0.25)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc((this.cx - camX) | 0, (this.cy - camY) | 0, this.orbitRadius, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    ctx.strokeStyle = COLORS.DANGER_ZONE;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc((this.cx - camX) | 0, (this.cy - camY) | 0, this.orbitRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }

                ctx.fillStyle = COLORS.GAUGE_LOW;
                ctx.beginPath();
                ctx.arc(osx, osy, this.sphereR || 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = COLORS.SPARK_1;
                ctx.fillRect(osx - 1, osy - 1, 2, 2);
                break;
            }
        }

        // Restore alpha if second wind
        if (this.isSecondWind && this.secondWindActive) {
            ctx.restore();
        }
    }
}

// ═══════ COLLISION HELPERS ═══════

export function rectOverlapsBounds(rect, bounds) {
    if (!bounds) return false;
    if (bounds.type === 'multi') {
        for (const b of bounds.rects) {
            if (rect.x < b.x + b.w && rect.x + rect.w > b.x &&
                rect.y < b.y + b.h && rect.y + rect.h > b.y) {
                return true;
            }
        }
        return false;
    }
    return rect.x < bounds.x + bounds.w && rect.x + rect.w > bounds.x &&
           rect.y < bounds.y + bounds.h && rect.y + rect.h > bounds.y;
}

export function distanceToBounds(rect, bounds) {
    if (!bounds) return Infinity;
    if (bounds.type === 'multi') {
        let minDist = Infinity;
        for (const b of bounds.rects) {
            const d = distanceRectToRect(rect, b);
            if (d < minDist) minDist = d;
        }
        return minDist;
    }
    return distanceRectToRect(rect, bounds);
}

function distanceRectToRect(a, b) {
    const overlapX = a.x < b.x + b.w && a.x + a.w > b.x;
    const overlapY = a.y < b.y + b.h && a.y + a.h > b.y;
    if (overlapX && overlapY) return 0;

    const dx = Math.max(0, Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)));
    const dy = Math.max(0, Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h)));
    return Math.sqrt(dx * dx + dy * dy);
}
