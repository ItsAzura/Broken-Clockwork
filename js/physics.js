/*
 * physics.js
 * AABB tile collision and platform/object interaction utilities.
 */

import { TILE, GRAVITY, PLAYER_W, PLAYER_H, OBJ, FAN_FORCE } from './constants.js';

const SOLID_TILES = new Set(['W', 'F', 'D']);

export function tileAt(tiles, tx, ty) {
    // Ensure ty is within bounds (Requirement: fall to death)
    if (ty < 0 || ty >= tiles.length) return '.';
    
    const row = tiles[ty];
    // If row is missing for some reason, treat as air
    if (!row) return '.';
    
    // Horizontal bounds: keep as wall to prevent walking off sides if not intended
    if (tx < 0 || tx >= row.length) return 'W';
    
    return row[tx];
}

export function isSolid(tiles, tx, ty) {
    return SOLID_TILES.has(tileAt(tiles, tx, ty));
}

function aabbOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
}

function activePlatforms(objects) {
    const out = [];
    for (const o of objects) {
        if (!o.isSolidPlatform()) continue;
        out.push(o);
    }
    return out;
}

export function updatePlayerPhysics(player, dt, tiles, objects) {
    const platforms = activePlatforms(objects);

    let fanForce = 0;
    for (const o of objects) {
        if (o.type === OBJ.FAN_UP && o.isWound) {
            const inX = player.x + PLAYER_W > o.x && player.x < o.x + o.w;
            const inRange = player.y + PLAYER_H > o.y - 80 && player.y + PLAYER_H <= o.y + o.h;
            if (inX && inRange) fanForce = FAN_FORCE;
        }
    }

    if (fanForce) {
        player.vy = Math.min(player.vy, fanForce);
    } else {
        player.vy += GRAVITY * dt;
    }
    if (player.vy > 400) player.vy = 400;

    player.x += player.vx * dt;
    resolveAxis(player, tiles, platforms, 'x');

    player.y += player.vy * dt;
    player.onGround = false;
    resolveAxis(player, tiles, platforms, 'y');

    if (player.onGround && player.vy > 0) player.vy = 0;
}

function resolveAxis(player, tiles, platforms, axis) {
    const minTx = Math.floor(player.x / TILE);
    const maxTx = Math.floor((player.x + PLAYER_W - 1) / TILE);
    const minTy = Math.floor(player.y / TILE);
    const maxTy = Math.floor((player.y + PLAYER_H - 1) / TILE);

    for (let ty = minTy; ty <= maxTy; ty++) {
        for (let tx = minTx; tx <= maxTx; tx++) {
            if (!isSolid(tiles, tx, ty)) continue;
            const tile = { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE };
            const p = { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H };
            if (!aabbOverlap(p, tile)) continue;
            resolveCollision(player, tile, axis);
        }
    }

    for (const plat of platforms) {
        const p = { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H };
        const r = plat.rect();
        if (!aabbOverlap(p, r)) continue;
        if (axis === 'y' && player.vy > 0 && player.y + PLAYER_H - player.vy * 0.02 <= r.y + 2) {
            player.y = r.y - PLAYER_H;
            player.vy = 0;
            player.onGround = true;
            player.ridingPlatform = plat;
        } else if (axis === 'x') {
            if (player.vx > 0) player.x = r.x - PLAYER_W;
            else if (player.vx < 0) player.x = r.x + r.w;
            player.vx = 0;
        } else if (axis === 'y' && player.vy < 0) {
            player.y = r.y + r.h;
            player.vy = 0;
        }
    }
}

function resolveCollision(player, tile, axis) {
    if (axis === 'x') {
        if (player.vx > 0) player.x = tile.x - PLAYER_W;
        else if (player.vx < 0) player.x = tile.x + tile.w;
        player.vx = 0;
    } else {
        if (player.vy > 0) {
            player.y = tile.y - PLAYER_H;
            player.onGround = true;
        } else if (player.vy < 0) {
            player.y = tile.y + tile.h;
        }
        player.vy = 0;
    }
}

export function checkEnemyCollision(player, objects) {
    const p = { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H };
    for (const o of objects) {
        if (o.type !== OBJ.ENEMY_PATROL) continue;
        if (!o.isWound) continue;
        if (aabbOverlap(p, o.rect())) return true;
    }
    return false;
}

export function checkGoal(player, goalTrigger) {
    if (!goalTrigger) return false;
    const p = { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H };
    return aabbOverlap(p, goalTrigger);
}

export function findNearestWindable(player, objects, range) {
    let best = null;
    let bestD = range * range;
    const px = player.x + PLAYER_W / 2;
    const py = player.y + PLAYER_H / 2;
    for (const o of objects) {
        if (!o.isWindable()) continue;
        const dx = (o.centerX()) - px;
        const dy = (o.centerY()) - py;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = o; }
    }
    return best;
}

export function rideMovingPlatform(player, prevPlatformX) {
    if (player.ridingPlatform && player.onGround) {
        const dx = player.ridingPlatform.x - prevPlatformX;
        if (Math.abs(dx) < 8) player.x += dx;
    }
}

export class SpatialHashGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    clear() {
        this.cells.clear();
    }

    insert(obj, bounds) {
        if (!bounds) bounds = obj.rect ? obj.rect() : (obj.getBounds ? obj.getBounds() : obj);
        if (!bounds) return;
        
        const minX = Math.floor(bounds.x / this.cellSize);
        const maxX = Math.floor((bounds.x + bounds.w) / this.cellSize);
        const minY = Math.floor(bounds.y / this.cellSize);
        const maxY = Math.floor((bounds.y + bounds.h) / this.cellSize);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const key = x + ',' + y;
                if (!this.cells.has(key)) {
                    this.cells.set(key, new Set());
                }
                this.cells.get(key).add(obj);
            }
        }
    }

    query(bounds, padding = 0) {
        const result = new Set();
        if (!bounds) return Array.from(result);
        
        const minX = Math.floor((bounds.x - padding) / this.cellSize);
        const maxX = Math.floor((bounds.x + bounds.w + padding) / this.cellSize);
        const minY = Math.floor((bounds.y - padding) / this.cellSize);
        const maxY = Math.floor((bounds.y + bounds.h + padding) / this.cellSize);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const key = x + ',' + y;
                const cell = this.cells.get(key);
                if (cell) {
                    for (const obj of cell) {
                        result.add(obj);
                    }
                }
            }
        }
        return Array.from(result);
    }
}
