/*
 * WindableObject.js
 * Generic class for every interactive object in the game.
 * Encapsulates wind/freeze lifecycle and per-type behavior.
 */

import { OBJ, COLORS } from './constants.js';
import { SPRITES, OBJECT_PALETTE } from './sprites.js';
import {
    drawPixelSprite, drawPixelRect, drawPixelBorder, drawCircleTimer, drawPixelText,
} from './draw.js';

let _id = 0;

export class WindableObject {
    constructor(data) {
        this.id = _id++;
        Object.assign(this, data);
        this.w = this.w || 16;
        this.h = this.h || 16;
        this.timer = 0;
        this.isWound = false;
        this.justFroze = false;
        this.activated = false;
        this.dir = 1;
        this.speed = 60;
        this.startX = this.x;
        this.startY = this.y;
        this.angle = 0;
        if (this.type === OBJ.ENEMY_PATROL) this.speed = 50;
        if (this.type === OBJ.ELEVATOR) this.atTop = false;
        if (this.type === OBJ.LEVER_SEQUENCE) this.activated = false;
    }

    isWindable() {
        if (this.type === OBJ.GEAR_DECO) return false;
        if (this.type === OBJ.LEVER && this.activated) return false;
        if (this.type === OBJ.LEVER_SEQUENCE && this.activated) return false;
        if (this.type === OBJ.ELEVATOR && this.atTop) return false;
        return true;
    }

    centerX() { return this.x + this.w / 2; }
    centerY() { return this.y + this.h / 2; }

    wind(game) {
        if (this.type === OBJ.CLOCK_STATION) return 'refill';
        if (this.type === OBJ.LEVER) {
            if (this.activated) return null;
            this.activated = true;
            if (this.opens) {
                for (const t of this.opens) {
                    if (game.tiles[t.ty]) {
                        const row = game.tiles[t.ty].split('');
                        row[t.tx] = '.';
                        game.tiles[t.ty] = row.join('');
                    }
                }
            }
            return 'lever';
        }
        if (this.type === OBJ.LEVER_SEQUENCE) {
            if (this.activated) return null;
            this.activated = true;
            return 'sequence';
        }
        if (this.isWound) return null;
        this.isWound = true;
        this.timer = this.duration || 5;
        return 'wound';
    }

    freeze() {
        this.isWound = false;
        this.justFroze = true;
    }

    update(dt, player) {
        if (!this.isWound) return;
        this.timer -= dt;

        switch (this.type) {
            case OBJ.PLATFORM_SLIDE: {
                this.x += this.dir * this.speed * dt;
                if (this.x >= this.bx) { this.x = this.bx; this.dir = -1; }
                else if (this.x <= this.ax) { this.x = this.ax; this.dir = 1; }
                break;
            }
            case OBJ.ENEMY_PATROL: {
                this.x += this.dir * this.speed * dt;
                if (this.x >= this.bx) { this.x = this.bx; this.dir = -1; }
                else if (this.x <= this.ax) { this.x = this.ax; this.dir = 1; }
                break;
            }
            case OBJ.ELEVATOR: {
                if (!this.atTop) {
                    this.y -= 40 * dt;
                    if (this.y <= this.y2) { this.y = this.y2; this.atTop = true; }
                }
                break;
            }
            case OBJ.PLATFORM_ROTATE: {
                this.angle += dt * 1.5;
                const r = this.radius || 24;
                const px = this.pivotX != null ? this.pivotX : this.startX;
                const py = this.pivotY != null ? this.pivotY : this.startY;
                this.x = px + Math.cos(this.angle) * r - this.w / 2;
                this.y = py + Math.sin(this.angle) * r - this.h / 2;
                break;
            }
        }

        if (this.timer <= 0) this.freeze();
    }

    isSolidPlatform() {
        return this.type === OBJ.PLATFORM_SLIDE
            || this.type === OBJ.PLATFORM_ROTATE
            || this.type === OBJ.ELEVATOR
            || this.type === OBJ.BRIDGE;
    }

    rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

    draw(ctx, camX, camY, tick) {
        const sx = (this.x - camX) | 0;
        const sy = (this.y - camY) | 0;
        switch (this.type) {
            case OBJ.PLATFORM_SLIDE:
            case OBJ.PLATFORM_ROTATE:
            case OBJ.ELEVATOR:
            case OBJ.BRIDGE: {
                const c = this.isWound ? COLORS.METAL_LIGHT : COLORS.METAL_MID;
                drawPixelBorder(ctx, sx, sy, this.w, this.h,
                    this.isWound ? COLORS.GLOW_WARM : COLORS.METAL_LIGHT,
                    COLORS.METAL_DARK, c, 1);
                if (this.isWound) {
                    drawPixelRect(ctx, sx + 2, sy + 2, this.w - 4, 1, COLORS.GLOW_WARM);
                }
                break;
            }
            case OBJ.FAN_UP: {
                drawPixelSprite(ctx, this.isWound ? SPRITES.fan_active : SPRITES.fan_frozen,
                    sx, sy, OBJECT_PALETTE, 1);
                if (this.isWound) {
                    for (let i = 0; i < 4; i++) {
                        const yy = sy - i * 6 - ((tick * 2) % 6);
                        drawPixelRect(ctx, sx + 6, yy, 1, 2, COLORS.GLOW_WARM);
                        drawPixelRect(ctx, sx + 9, yy + 3, 1, 2, COLORS.SPARK_1);
                    }
                }
                break;
            }
            case OBJ.ENEMY_PATROL: {
                drawPixelSprite(ctx, this.isWound ? SPRITES.enemy_active : SPRITES.enemy_frozen,
                    sx, sy, OBJECT_PALETTE, 1);
                break;
            }
            case OBJ.CLOCK_STATION: {
                drawPixelSprite(ctx, SPRITES.clock_station, sx, sy, OBJECT_PALETTE, 1);
                const pendulumX = sx + 8 + Math.round(Math.sin(tick * 0.05) * 2);
                drawPixelRect(ctx, pendulumX, sy + 12, 1, 2, COLORS.METAL_LIGHT);
                break;
            }
            case OBJ.LEVER:
            case OBJ.LEVER_SEQUENCE: {
                drawPixelSprite(ctx, this.activated ? SPRITES.lever_on : SPRITES.lever_off,
                    sx, sy, OBJECT_PALETTE, 1);
                if (this.type === OBJ.LEVER_SEQUENCE) {
                    drawPixelText(ctx, String(this.seqNum), sx + 6, sy + 13,
                        this.activated ? COLORS.GLOW_WARM : COLORS.UI_MUTED, 1);
                }
                break;
            }
            case OBJ.GEAR_DECO: {
                ctx.save();
                ctx.translate(sx + 6, sy + 6);
                ctx.rotate(tick * 0.01);
                ctx.translate(-6, -6);
                drawPixelSprite(ctx, SPRITES.gear_deco, 0, 0, OBJECT_PALETTE, 1);
                ctx.restore();
                break;
            }
        }

        if (this.isWound && this.duration) {
            const prog = this.timer / this.duration;
            drawCircleTimer(ctx, sx + this.w / 2, sy - 4, 4, prog, COLORS.GLOW_WARM);
        }
    }
}
