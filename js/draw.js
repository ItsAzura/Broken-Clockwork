/*
 * draw.js
 * Pixel-art rendering primitives. Everything here uses integer coordinates
 * and fillRect-style drawing only — never ctx.font, never anti-aliasing.
 */

import { COLORS } from './constants.js';
import { FONT, FONT_W, FONT_H, getGlyph } from './font.js';

export function drawPixelRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

export function drawPixelBorder(ctx, x, y, w, h, colorLight, colorDark, fill = null, thickness = 1) {
    x = x | 0; y = y | 0; w = w | 0; h = h | 0;
    if (fill) drawPixelRect(ctx, x + thickness, y + thickness, w - thickness * 2, h - thickness * 2, fill);
    ctx.fillStyle = colorLight;
    ctx.fillRect(x, y, w, thickness);
    ctx.fillRect(x, y, thickness, h);
    ctx.fillStyle = colorDark;
    ctx.fillRect(x, y + h - thickness, w, thickness);
    ctx.fillRect(x + w - thickness, y, thickness, h);
}

const fontCache = new Map();
const spriteCache = new Map();

function getCachedSprite(spriteData, palette) {
    // Generate a unique key for this sprite + palette combination
    const key = JSON.stringify(spriteData) + JSON.stringify(palette);
    if (spriteCache.has(key)) return spriteCache.get(key);
    
    const h = spriteData.length;
    const w = spriteData[0].length;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    
    for (let row = 0; row < h; row++) {
        const line = spriteData[row];
        for (let col = 0; col < w; col++) {
            const idx = line[col];
            if (idx === 0) continue;
            const color = palette[idx];
            if (!color) continue;
            ctx.fillStyle = color;
            ctx.fillRect(col, row, 1, 1);
        }
    }
    
    spriteCache.set(key, canvas);
    return canvas;
}

function getCachedFont(color) {
    if (fontCache.has(color)) return fontCache.get(color);
    
    // Create an offscreen canvas for this color's font
    const canvas = document.createElement('canvas');
    const charCount = Object.keys(FONT).length + 1; // +1 for fallback
    canvas.width = (FONT_W + 1) * charCount;
    canvas.height = FONT_H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    
    const chars = Object.keys(FONT);
    const map = new Map();
    
    let x = 0;
    // Draw all font characters
    for (const char of chars) {
        const glyph = FONT[char];
        for (let row = 0; row < FONT_H; row++) {
            const line = glyph[row];
            for (let col = 0; col < FONT_W; col++) {
                if (line[col] === '#') {
                    ctx.fillRect(x + col, row, 1, 1);
                }
            }
        }
        map.set(char, x);
        x += FONT_W + 1;
    }
    
    // Fallback glyph
    const fallbackGlyph = getGlyph('\x00');
    for (let row = 0; row < FONT_H; row++) {
        const line = fallbackGlyph[row];
        for (let col = 0; col < FONT_W; col++) {
            if (line[col] === '#') ctx.fillRect(x + col, row, 1, 1);
        }
    }
    map.set('FALLBACK', x);
    
    const result = { canvas, map };
    fontCache.set(color, result);
    return result;
}

export function drawPixelText(ctx, text, x, y, color, scale = 1) {
    if (text == null) return;
    text = String(text).toUpperCase();
    const cache = getCachedFont(color);
    
    let cx = x | 0;
    const cy = y | 0;
    const s = scale;
    
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        let srcX = cache.map.get(ch);
        if (srcX === undefined) srcX = cache.map.get('FALLBACK');
        
        ctx.drawImage(cache.canvas, srcX, 0, FONT_W, FONT_H, cx, cy, FONT_W * s, FONT_H * s);
        cx += (FONT_W + 1) * s;
    }
}

export function measurePixelText(text, scale = 1) {
    if (text == null) return 0;
    return text.length * (FONT_W + 1) * scale - scale;
}

export function drawPixelSprite(ctx, spriteData, x, y, palette, scale = 1) {
    if (!spriteData) return;
    const canvas = getCachedSprite(spriteData, palette);
    const w = canvas.width, h = canvas.height;
    ctx.drawImage(canvas, 0, 0, w, h, x | 0, y | 0, w * scale, h * scale);
}

export function drawPixelSpriteFlipped(ctx, spriteData, x, y, palette, scale = 1) {
    if (!spriteData) return;
    const canvas = getCachedSprite(spriteData, palette);
    const w = canvas.width, h = canvas.height;
    
    ctx.save();
    ctx.translate((x | 0) + w * scale, y | 0);
    ctx.scale(-1, 1);
    ctx.drawImage(canvas, 0, 0, w, h, 0, 0, w * scale, h * scale);
    ctx.restore();
}

export function drawCircleTimer(ctx, cx, cy, radius, progress, color) {
    cx = cx | 0; cy = cy | 0;
    const segments = 24;
    const filled = Math.floor(segments * Math.max(0, Math.min(1, progress)));
    ctx.fillStyle = color;
    for (let i = 0; i < filled; i++) {
        const angle = -Math.PI / 2 + (i / segments) * Math.PI * 2;
        const px = Math.round(cx + Math.cos(angle) * radius);
        const py = Math.round(cy + Math.sin(angle) * radius);
        ctx.fillRect(px, py, 1, 1);
        const angleIn = -Math.PI / 2 + (i / segments) * Math.PI * 2;
        const px2 = Math.round(cx + Math.cos(angleIn) * (radius - 1));
        const py2 = Math.round(cy + Math.sin(angleIn) * (radius - 1));
        ctx.fillRect(px2, py2, 1, 1);
    }
}

export function drawTile(ctx, type, x, y) {
    x = x | 0; y = y | 0;
    if (type === 'W') {
        drawPixelRect(ctx, x, y, 16, 16, COLORS.TILE_DARK);
        drawPixelRect(ctx, x, y, 16, 1, COLORS.TILE_MID);
        drawPixelRect(ctx, x, y + 15, 16, 1, '#15090400');
        for (let i = 2; i < 16; i += 4) {
            drawPixelRect(ctx, x + i, y + 4, 1, 1, COLORS.TILE_MID);
            drawPixelRect(ctx, x + i + 2, y + 10, 1, 1, COLORS.TILE_MID);
        }
    } else if (type === 'F') {
        drawPixelRect(ctx, x, y, 16, 16, COLORS.TILE_MID);
        drawPixelRect(ctx, x, y, 16, 2, COLORS.TILE_LIGHT);
        drawPixelRect(ctx, x, y + 2, 16, 1, COLORS.TILE_MID);
    } else if (type === 'D') {
        drawPixelRect(ctx, x, y, 16, 16, COLORS.METAL_DARK);
        drawPixelBorder(ctx, x + 2, y, 12, 16, COLORS.METAL_LIGHT, COLORS.METAL_DARK, COLORS.METAL_MID);
    } else if (type === 'G') {
        drawPixelRect(ctx, x, y, 16, 16, COLORS.METAL_LIGHT);
        drawPixelText(ctx, '*', x + 5, y + 4, COLORS.IVORY, 1);
    }
}

export function drawSpeechBubble(ctx, text, cx, cy) {
    const tw = measurePixelText(text, 1);
    const w = tw + 6;
    const h = 11;
    const bx = (cx - w / 2) | 0;
    const by = (cy - h) | 0;
    drawPixelBorder(ctx, bx, by, w, h, COLORS.UI_BORDER_L, COLORS.UI_BORDER_D, COLORS.UI_BG, 1);
    drawPixelText(ctx, text, bx + 3, by + 2, COLORS.UI_TEXT, 1);
    drawPixelRect(ctx, cx - 1, by + h, 2, 1, COLORS.UI_BORDER_L);
    drawPixelRect(ctx, cx, by + h + 1, 1, 1, COLORS.UI_BORDER_L);
}

export function spawnSparks(particles, x, y, count = 5, palette = null) {
    const colors = palette || [COLORS.SPARK_1, COLORS.SPARK_2, COLORS.GLOW_WARM];
    for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 20 + Math.random() * 60;
        particles.push({
            x, y,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp - 20,
            life: 0.4 + Math.random() * 0.4,
            maxLife: 0.8,
            color: colors[(Math.random() * colors.length) | 0],
            size: Math.random() < 0.4 ? 2 : 1,
        });
    }
}

export function updateAndDrawParticles(ctx, particles, dt, camX, camY) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 80 * dt;
        const sx = (p.x - camX) | 0;
        const sy = (p.y - camY) | 0;
        drawPixelRect(ctx, sx, sy, p.size, p.size, p.color);
    }
}
