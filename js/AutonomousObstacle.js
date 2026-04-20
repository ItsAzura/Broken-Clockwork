/*
 * AutonomousObstacle.js
 * Self-propelled lethal obstacles. They do NOT need wind-up to move —
 * they run from the first frame of the level. Each instance exposes
 * a precise lethal hitbox via getBounds() for the death system.
 *
 * Types: GEAR_SPINNER, PENDULUM, PISTON, BOUNCING_BALL, ORBIT_SPHERE.
 */

import { AUTO, COLORS } from './constants.js';
import { drawPixelRect } from './draw.js';

let _aid = 0;

export class AutonomousObstacle {
    constructor(data) {
        this.aid = _aid++;
        Object.assign(this, data);
        this.time = 0;
        this._wasNear = false;
        this.speedMult = 1;

        switch (this.type) {
            case AUTO.GEAR_SPINNER:
                this.radius        = this.radius        || 12;
                this.teeth         = this.teeth         || 6;
                this.rotationSpeed = this.rotationSpeed || Math.PI;
                this.angle         = this.angle         || 0;
                break;

            case AUTO.PENDULUM:
                this.length    = this.length    || 48;
                this.amplitude = this.amplitude || (Math.PI / 3);
                this.frequency = this.frequency || 2.0;
                this.tipRadius = this.tipRadius || 4;
                this.angle     = 0;
                this.tipX      = this.x;
                this.tipY      = this.y + this.length;
                break;

            case AUTO.PISTON:
                this.w     = this.w     || 10;
                this.h     = this.h     || 10;
                this.ax    = this.ax    != null ? this.ax : this.x;
                this.ay    = this.ay    != null ? this.ay : this.y;
                this.bx    = this.bx    != null ? this.bx : this.x;
                this.by    = this.by    != null ? this.by : this.y;
                this.speed = this.speed || 2;
                this.curX  = this.ax;
                this.curY  = this.ay;
                break;

            case AUTO.BOUNCING_BALL:
                this.r       = this.r       || 4;
                this.vx      = this.vx      != null ? this.vx : 60;
                this.vy      = this.vy      != null ? this.vy : 55;
                this.boundX  = this.boundX  != null ? this.boundX : 0;
                this.boundY  = this.boundY  != null ? this.boundY : 0;
                this.boundW  = this.boundW  || 160;
                this.boundH  = this.boundH  || 120;
                this.trail   = [];
                break;

            case AUTO.ORBIT_SPHERE:
                this.cx          = this.cx != null ? this.cx : this.x;
                this.cy          = this.cy != null ? this.cy : this.y;
                this.orbitRadius = this.orbitRadius || 28;
                this.orbitSpeed  = this.orbitSpeed  || 1.5;
                this.sphereR     = this.sphereR     || 3;
                this.angle       = this.startAngle  || 0;
                this.posX        = this.cx + Math.cos(this.angle) * this.orbitRadius;
                this.posY        = this.cy + Math.sin(this.angle) * this.orbitRadius;
                break;
        }
    }

    update(dt) {
        const d = dt * this.speedMult;
        this.time += d;
        switch (this.type) {
            case AUTO.GEAR_SPINNER:
                this.angle += this.rotationSpeed * d;
                break;

            case AUTO.PENDULUM:
                this.angle = Math.sin(this.time * this.frequency) * this.amplitude;
                this.tipX  = this.x + Math.sin(this.angle) * this.length;
                this.tipY  = this.y + Math.cos(this.angle) * this.length;
                break;

            case AUTO.PISTON: {
                const t = (Math.sin(this.time * this.speed) + 1) / 2;
                this.curX = this.ax + (this.bx - this.ax) * t;
                this.curY = this.ay + (this.by - this.ay) * t;
                break;
            }

            case AUTO.BOUNCING_BALL: {
                this.trail.push({ x: this.x, y: this.y });
                if (this.trail.length > 3) this.trail.shift();
                this.x += this.vx * d;
                this.y += this.vy * d;
                if (this.x - this.r < this.boundX) {
                    this.x = this.boundX + this.r;
                    this.vx = Math.abs(this.vx);
                }
                if (this.x + this.r > this.boundX + this.boundW) {
                    this.x = this.boundX + this.boundW - this.r;
                    this.vx = -Math.abs(this.vx);
                }
                if (this.y - this.r < this.boundY) {
                    this.y = this.boundY + this.r;
                    this.vy = Math.abs(this.vy);
                }
                if (this.y + this.r > this.boundY + this.boundH) {
                    this.y = this.boundY + this.boundH - this.r;
                    this.vy = -Math.abs(this.vy);
                }
                break;
            }

            case AUTO.ORBIT_SPHERE:
                this.angle += this.orbitSpeed * d;
                this.posX = this.cx + Math.cos(this.angle) * this.orbitRadius;
                this.posY = this.cy + Math.sin(this.angle) * this.orbitRadius;
                break;
        }
    }

    getBounds() {
        switch (this.type) {
            case AUTO.GEAR_SPINNER:
                return {
                    type: 'annulus',
                    cx: this.x, cy: this.y,
                    inner: this.radius * 0.4,
                    outer: this.radius + 2,
                };
            case AUTO.PENDULUM:
                return {
                    type: 'circle',
                    cx: this.tipX, cy: this.tipY,
                    r: this.tipRadius,
                };
            case AUTO.PISTON:
                return {
                    type: 'rect',
                    x: this.curX, y: this.curY,
                    w: this.w, h: this.h,
                };
            case AUTO.BOUNCING_BALL:
                return {
                    type: 'circle',
                    cx: this.x, cy: this.y, r: this.r,
                };
            case AUTO.ORBIT_SPHERE:
                return {
                    type: 'circle',
                    cx: this.posX, cy: this.posY, r: this.sphereR,
                };
        }
        return null;
    }

    draw(ctx, camX, camY, tick) {
        switch (this.type) {
            case AUTO.GEAR_SPINNER:  this._drawGearSpinner(ctx, camX, camY); break;
            case AUTO.PENDULUM:      this._drawPendulum(ctx, camX, camY);    break;
            case AUTO.PISTON:        this._drawPiston(ctx, camX, camY);      break;
            case AUTO.BOUNCING_BALL: this._drawBouncingBall(ctx, camX, camY);break;
            case AUTO.ORBIT_SPHERE:  this._drawOrbit(ctx, camX, camY);       break;
        }
    }

    _drawGearSpinner(ctx, camX, camY) {
        const cx = (this.x - camX) | 0;
        const cy = (this.y - camY) | 0;
        const hr = Math.max(1, Math.round(this.radius * 0.4));

        ctx.fillStyle = COLORS.METAL_MID;
        for (let yy = -hr; yy <= hr; yy++) {
            for (let xx = -hr; xx <= hr; xx++) {
                if (xx * xx + yy * yy <= hr * hr) ctx.fillRect(cx + xx, cy + yy, 1, 1);
            }
        }
        ctx.fillStyle = COLORS.METAL_DARK;
        ctx.fillRect(cx - 1, cy - 1, 2, 2);

        ctx.save();
        ctx.translate(cx + 0.5, cy + 0.5);
        for (let i = 0; i < this.teeth; i++) {
            const a = this.angle + (i / this.teeth) * Math.PI * 2;
            ctx.save();
            ctx.rotate(a);
            ctx.fillStyle = COLORS.METAL_LIGHT;
            ctx.fillRect(this.radius - 3, -2, 5, 4);
            ctx.fillStyle = COLORS.GAUGE_LOW;
            ctx.fillRect(this.radius, -1, 2, 2);
            ctx.restore();
        }
        ctx.restore();

        ctx.fillStyle = COLORS.METAL_DARK;
        for (let a = 0; a < 28; a++) {
            const aa = (a / 28) * Math.PI * 2;
            const r = this.radius - 4;
            if (r < 1) break;
            const px = Math.round(cx + Math.cos(aa) * r);
            const py = Math.round(cy + Math.sin(aa) * r);
            ctx.fillRect(px, py, 1, 1);
        }
    }

    _drawPendulum(ctx, camX, camY) {
        const pivX = (this.x - camX) | 0;
        const pivY = (this.y - camY) | 0;

        ctx.fillStyle = COLORS.DANGER_ZONE;
        const steps = 22;
        for (let i = 0; i <= steps; i++) {
            const a = -this.amplitude + (i / steps) * (this.amplitude * 2);
            const tx = this.x + Math.sin(a) * this.length - camX;
            const ty = this.y + Math.cos(a) * this.length - camY;
            ctx.fillRect(tx | 0, ty | 0, 2, 2);
        }

        const tipX = (this.tipX - camX) | 0;
        const tipY = (this.tipY - camY) | 0;
        const armSteps = 18;
        ctx.fillStyle = COLORS.METAL_MID;
        for (let i = 1; i <= armSteps; i++) {
            const t = i / armSteps;
            const lx = pivX + (tipX - pivX) * t;
            const ly = pivY + (tipY - pivY) * t;
            ctx.fillRect(lx | 0, ly | 0, 2, 2);
        }
        ctx.fillStyle = COLORS.METAL_LIGHT;
        ctx.fillRect(pivX - 2, pivY - 2, 5, 5);
        ctx.fillStyle = COLORS.METAL_DARK;
        ctx.fillRect(pivX - 1, pivY - 1, 3, 3);

        const r = this.tipRadius;
        ctx.fillStyle = COLORS.GAUGE_LOW;
        for (let yy = -r; yy <= r; yy++) {
            for (let xx = -r; xx <= r; xx++) {
                if (xx * xx + yy * yy <= r * r) ctx.fillRect(tipX + xx, tipY + yy, 1, 1);
            }
        }
        ctx.fillStyle = COLORS.SPARK_2;
        ctx.fillRect(tipX - 1, tipY - 1, 2, 2);
    }

    _drawPiston(ctx, camX, camY) {
        const dx = this.bx - this.ax;
        const dy = this.by - this.ay;
        const d  = Math.max(Math.abs(dx), Math.abs(dy));

        ctx.fillStyle = COLORS.DANGER_ZONE;
        for (let i = 0; i <= d; i += 1) {
            const t = i / Math.max(1, d);
            const x = this.ax + dx * t - camX;
            const y = this.ay + dy * t - camY;
            drawPixelRect(ctx, x, y, this.w, this.h, COLORS.DANGER_ZONE);
        }

        const sx = (this.curX - camX) | 0;
        const sy = (this.curY - camY) | 0;
        drawPixelRect(ctx, sx, sy, this.w, this.h, COLORS.METAL_DARK);
        drawPixelRect(ctx, sx, sy, this.w, 2, COLORS.METAL_LIGHT);
        drawPixelRect(ctx, sx + 1, sy + 2, this.w - 2, 1, COLORS.METAL_MID);
        drawPixelRect(ctx, sx, sy + this.h - 2, this.w, 2, COLORS.GAUGE_LOW);
        drawPixelRect(ctx, sx + 2, sy + this.h - 1, 2, 1, COLORS.SPARK_1);
    }

    _drawBouncingBall(ctx, camX, camY) {
        for (let i = 0; i < this.trail.length; i++) {
            const p = this.trail[i];
            const alpha = ((i + 1) / (this.trail.length + 1)) * 0.45;
            ctx.fillStyle = `rgba(255,224,64,${alpha.toFixed(3)})`;
            const tx = (p.x - camX) | 0;
            const ty = (p.y - camY) | 0;
            const r  = this.r;
            for (let yy = -r; yy <= r; yy++) {
                for (let xx = -r; xx <= r; xx++) {
                    if (xx * xx + yy * yy <= r * r) ctx.fillRect(tx + xx, ty + yy, 1, 1);
                }
            }
        }

        const cx = (this.x - camX) | 0;
        const cy = (this.y - camY) | 0;
        const r  = this.r;
        ctx.fillStyle = COLORS.SPARK_1;
        for (let yy = -r; yy <= r; yy++) {
            for (let xx = -r; xx <= r; xx++) {
                if (xx * xx + yy * yy <= r * r) ctx.fillRect(cx + xx, cy + yy, 1, 1);
            }
        }
        ctx.fillStyle = COLORS.SPARK_2;
        ctx.fillRect(cx - 1, cy - 1, 2, 2);
        ctx.fillStyle = COLORS.IVORY;
        ctx.fillRect(cx - 1, cy - 2, 1, 1);
    }

    _drawOrbit(ctx, camX, camY) {
        const ccx = (this.cx - camX) | 0;
        const ccy = (this.cy - camY) | 0;
        ctx.fillStyle = COLORS.DANGER_ZONE;
        for (let a = 0; a < 60; a++) {
            const aa = (a / 60) * Math.PI * 2;
            const px = Math.round(ccx + Math.cos(aa) * this.orbitRadius);
            const py = Math.round(ccy + Math.sin(aa) * this.orbitRadius);
            ctx.fillRect(px, py, 1, 1);
        }
        ctx.fillStyle = COLORS.METAL_DARK;
        ctx.fillRect(ccx - 1, ccy - 1, 3, 3);
        ctx.fillStyle = COLORS.METAL_MID;
        ctx.fillRect(ccx, ccy, 1, 1);

        const sx = (this.posX - camX) | 0;
        const sy = (this.posY - camY) | 0;
        const r  = this.sphereR;
        ctx.fillStyle = COLORS.GAUGE_LOW;
        for (let yy = -r; yy <= r; yy++) {
            for (let xx = -r; xx <= r; xx++) {
                if (xx * xx + yy * yy <= r * r) ctx.fillRect(sx + xx, sy + yy, 1, 1);
            }
        }
        ctx.fillStyle = COLORS.SPARK_2;
        ctx.fillRect(sx - 1, sy - 1, 1, 1);
    }
}

export function rectOverlapsBounds(rect, bounds) {
    if (!bounds) return false;
    if (bounds.type === 'rect') {
        return rect.x < bounds.x + bounds.w && rect.x + rect.w > bounds.x &&
               rect.y < bounds.y + bounds.h && rect.y + rect.h > bounds.y;
    }
    if (bounds.type === 'circle') {
        const nx = Math.max(rect.x, Math.min(bounds.cx, rect.x + rect.w));
        const ny = Math.max(rect.y, Math.min(bounds.cy, rect.y + rect.h));
        const dx = bounds.cx - nx, dy = bounds.cy - ny;
        return dx * dx + dy * dy <= bounds.r * bounds.r;
    }
    if (bounds.type === 'annulus') {
        const nx = Math.max(rect.x, Math.min(bounds.cx, rect.x + rect.w));
        const ny = Math.max(rect.y, Math.min(bounds.cy, rect.y + rect.h));
        const dxN = bounds.cx - nx, dyN = bounds.cy - ny;
        const nearest2 = dxN * dxN + dyN * dyN;
        if (nearest2 > bounds.outer * bounds.outer) return false;
        const corners = [
            [rect.x,              rect.y],
            [rect.x + rect.w - 1, rect.y],
            [rect.x,              rect.y + rect.h - 1],
            [rect.x + rect.w - 1, rect.y + rect.h - 1],
        ];
        let allInHub = true;
        for (const c of corners) {
            const ddx = bounds.cx - c[0], ddy = bounds.cy - c[1];
            if (ddx * ddx + ddy * ddy > bounds.inner * bounds.inner) {
                allInHub = false;
                break;
            }
        }
        return !allInHub;
    }
    return false;
}

export function distanceToBounds(rect, bounds) {
    if (!bounds) return Infinity;
    const rx = rect.x + rect.w / 2;
    const ry = rect.y + rect.h / 2;
    if (bounds.type === 'rect') {
        const nx = Math.max(bounds.x, Math.min(rx, bounds.x + bounds.w));
        const ny = Math.max(bounds.y, Math.min(ry, bounds.y + bounds.h));
        const dx = rx - nx, dy = ry - ny;
        return Math.sqrt(dx * dx + dy * dy);
    }
    if (bounds.type === 'circle') {
        const dx = bounds.cx - rx, dy = bounds.cy - ry;
        return Math.max(0, Math.sqrt(dx * dx + dy * dy) - bounds.r);
    }
    if (bounds.type === 'annulus') {
        const dx = bounds.cx - rx, dy = bounds.cy - ry;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d > bounds.outer) return d - bounds.outer;
        if (d < bounds.inner) return bounds.inner - d;
        return 0;
    }
    return Infinity;
}
