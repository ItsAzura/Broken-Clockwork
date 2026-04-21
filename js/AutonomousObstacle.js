/*
 * AutonomousObstacle.js
 * Always-moving obstacles that kill on contact.
 * Types: GEAR_SPINNER, PENDULUM, PISTON, BOUNCING_BALL, ORBIT_SPHERE
 */

import { AUTO, COLORS } from './constants.js';
import { drawPixelRect } from './draw.js';
import { playPistonClunk } from './audio.js';

export class AutonomousObstacle {
    constructor(data) {
        Object.assign(this, data);
        this.time = Math.random() * 100;
        this.speedMult = 1;
        this._wasNear = false;
        this._cachedBounds = null;

        if (this.type === AUTO.BOUNCING_BALL) {
            this.vx = this.vx || 60;
            this.vy = this.vy || 60;
        }
        if (this.type === AUTO.ORBIT_SPHERE) {
            this.angle = this.startAngle || 0;
        }

        this.isActive = this.initiallyActive !== false;
    }

    activate() {
        this.isActive = true;
    }

    update(dt) {
        if (!this.isActive) return;

        const effectiveDt = dt * this.speedMult;
        if (effectiveDt === 0) return;
        this.time += effectiveDt;
        this._cachedBounds = null; // Invalidate cache

        switch (this.type) {
            case AUTO.PISTON: {
                // Store previous t value for direction change detection
                const prevT = this._prevPistonT;
                const t = (Math.sin(this.time * this.speed) + 1) / 2;
                
                // Detect direction change by checking if we crossed the peak (t=1) or valley (t=0)
                if (prevT !== undefined) {
                    // Direction change occurs when t crosses 0.5 in opposite direction
                    const wasBelowHalf = prevT < 0.5;
                    const isBelowHalf = t < 0.5;
                    
                    // If we crossed the midpoint, direction changed
                    if (wasBelowHalf !== isBelowHalf) {
                        playPistonClunk();
                    }
                }
                
                this._prevPistonT = t;
                this.x = this.ax + (this.bx - this.ax) * t;
                this.y = this.ay + (this.by - this.ay) * t;
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
                this.angle += this.orbitSpeed * effectiveDt;
                break;
            }
        }
    }

    getBounds() {
        if (!this.isActive) return null;
        if (this._cachedBounds) return this._cachedBounds;

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
                    teeth.push({ x: tx - 2, y: ty - 2, w: 4, h: 4 });
                }
                bounds = { type: 'multi', rects: teeth };
                break;
            }
            case AUTO.PENDULUM: {
                const angle = Math.sin(this.time * this.frequency) * this.amplitude;
                const tipX = this.x + Math.sin(angle) * this.length;
                const tipY = this.y + Math.cos(angle) * this.length;
                const r = this.tipRadius || 5;
                bounds = { x: tipX - r, y: tipY - r, w: r * 2, h: r * 2 };
                break;
            }
            case AUTO.PISTON: {
                bounds = { x: this.x, y: this.y, w: this.w, h: this.h };
                break;
            }
            case AUTO.BOUNCING_BALL: {
                bounds = { x: this.x, y: this.y, w: this.r * 2, h: this.r * 2 };
                break;
            }
            case AUTO.ORBIT_SPHERE: {
                const ox = this.cx + Math.cos(this.angle) * this.orbitRadius;
                const oy = this.cy + Math.sin(this.angle) * this.orbitRadius;
                const r = this.sphereR || 3;
                bounds = { x: ox - r, y: oy - r, w: r * 2, h: r * 2 };
                break;
            }
        }
        this._cachedBounds = bounds;
        return bounds;
    }

    draw(ctx, camX, camY, tick) {
        if (!this.isActive) return;

        const sx = (this.x - camX) | 0;
        const sy = (this.y - camY) | 0;

        switch (this.type) {
            case AUTO.GEAR_SPINNER: {
                const angle = this.time * this.rotationSpeed;
                const toothCount = this.teeth || 6;
                ctx.fillStyle = COLORS.METAL_MID;
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
                break;
            }
            case AUTO.PENDULUM: {
                const angle = Math.sin(this.time * this.frequency) * this.amplitude;
                const tipX = sx + Math.sin(angle) * this.length;
                const tipY = sy + Math.cos(angle) * this.length;
                ctx.strokeStyle = COLORS.METAL_MID;
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
                break;
            }
            case AUTO.PISTON: {
                drawPixelRect(ctx, sx, sy, this.w, this.h, COLORS.GAUGE_LOW);
                drawPixelRect(ctx, sx + 1, sy + 1, this.w - 2, this.h - 2, COLORS.METAL_MID);
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
                break;
            }
            case AUTO.BOUNCING_BALL: {
                ctx.fillStyle = COLORS.GAUGE_LOW;
                ctx.beginPath();
                ctx.arc(sx + this.r, sy + this.r, this.r, 0, Math.PI * 2);
                ctx.fill();
                for (let i = 1; i <= 3; i++) {
                    const prevX = this.x - this.vx * 0.016 * i;
                    const prevY = this.y - this.vy * 0.016 * i;
                    const alpha = 0.3 - i * 0.08;
                    ctx.fillStyle = `rgba(200,64,32,${alpha})`;
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
                ctx.strokeStyle = COLORS.DANGER_ZONE;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc((this.cx - camX) | 0, (this.cy - camY) | 0, this.orbitRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = COLORS.GAUGE_LOW;
                ctx.beginPath();
                ctx.arc(osx, osy, this.sphereR || 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = COLORS.SPARK_1;
                ctx.fillRect(osx - 1, osy - 1, 2, 2);
                break;
            }
        }
    }
}

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
