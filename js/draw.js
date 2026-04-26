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
    // Apply accessibility high contrast border thickness (Requirement 13.8)
    if (_accessibilitySystem && _accessibilitySystem.isHighContrastEnabled()) {
        thickness = _accessibilitySystem.getBorderThickness();
    }
    
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
    
    // Apply accessibility text scale (Requirement 13.4)
    if (_accessibilitySystem) {
        scale = scale * _accessibilitySystem.getTextScale();
    }
    
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

// ═══════ PARTICLE POOLING SYSTEM (Requirement 12.8) ═══════
const PARTICLE_POOL_SIZE = 200;
const MAX_ACTIVE_PARTICLES = 100;
const particlePool = [];

// Initialize particle pool
for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    particlePool.push({
        x: 0, y: 0,
        vx: 0, vy: 0,
        life: 0,
        maxLife: 0,
        color: COLORS.SPARK_1,
        size: 1,
        active: false,
    });
}

function getParticleFromPool() {
    // Find inactive particle
    for (let i = 0; i < particlePool.length; i++) {
        if (!particlePool[i].active) {
            particlePool[i].active = true;
            return particlePool[i];
        }
    }
    // Pool exhausted - reuse oldest active particle (Requirement 16.4)
    // Find the particle with the lowest remaining life (oldest)
    let oldestIdx = 0;
    let lowestLife = particlePool[0].life;
    for (let i = 1; i < particlePool.length; i++) {
        if (particlePool[i].life < lowestLife) {
            lowestLife = particlePool[i].life;
            oldestIdx = i;
        }
    }
    const oldest = particlePool[oldestIdx];
    oldest.active = true;
    return oldest;
}

// Global reference to accessibility system (set by main.js)
let _accessibilitySystem = null;

export function setAccessibilitySystem(system) {
    _accessibilitySystem = system;
}

export function spawnSparks(particles, x, y, count = 5, palette = null) {
    // Requirement 13.3: Skip particle spawning if reduce motion is enabled
    if (_accessibilitySystem && _accessibilitySystem.isReduceMotionEnabled()) {
        return;
    }
    
    const colors = palette || [COLORS.SPARK_1, COLORS.SPARK_2, COLORS.GLOW_WARM];
    
    // Limit active particles to maintain 60 FPS (Requirement 12.8)
    const activeCount = particles.filter(p => p.active !== false).length;
    const availableSlots = MAX_ACTIVE_PARTICLES - activeCount;
    const spawnCount = Math.min(count, availableSlots);
    
    for (let i = 0; i < spawnCount; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 20 + Math.random() * 60;
        
        // Use pooled particle if available
        const particle = getParticleFromPool();
        particle.x = x;
        particle.y = y;
        particle.vx = Math.cos(ang) * sp;
        particle.vy = Math.sin(ang) * sp - 20;
        particle.life = 0.4 + Math.random() * 0.4;
        particle.maxLife = 0.8;
        particle.color = colors[(Math.random() * colors.length) | 0];
        particle.size = Math.random() < 0.4 ? 2 : 1;
        particle.active = true;
        
        particles.push(particle);
    }
}

export function updateAndDrawParticles(ctx, particles, dt, camX, camY) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { 
            p.active = false; // Return to pool
            particles.splice(i, 1); 
            continue; 
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 80 * dt;
        const sx = (p.x - camX) | 0;
        const sy = (p.y - camY) | 0;
        drawPixelRect(ctx, sx, sy, p.size, p.size, p.color);
    }
}


// ═══════ PLAYER TRAIL EFFECT (Requirement 12.4) ═══════
const trailBuffer = [];
const MAX_TRAIL_LENGTH = 8;

export function updatePlayerTrail(player) {
    // Only add trail when moving fast (speed > 100)
    const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
    if (speed > 100) {
        trailBuffer.push({
            x: player.x,
            y: player.y,
            alpha: 1.0,
            timestamp: Date.now(),
        });
        
        // Limit trail length
        if (trailBuffer.length > MAX_TRAIL_LENGTH) {
            trailBuffer.shift();
        }
    }
    
    // Fade out trail positions
    for (let i = trailBuffer.length - 1; i >= 0; i--) {
        trailBuffer[i].alpha -= 0.05;
        if (trailBuffer[i].alpha <= 0) {
            trailBuffer.splice(i, 1);
        }
    }
}

export function drawPlayerTrail(ctx, camX, camY) {
    for (let i = 0; i < trailBuffer.length; i++) {
        const trail = trailBuffer[i];
        const alpha = trail.alpha * 0.3; // Max 30% opacity
        ctx.fillStyle = `rgba(201, 168, 76, ${alpha})`; // COLORS.METAL_LIGHT with alpha
        const sx = (trail.x - camX) | 0;
        const sy = (trail.y - camY) | 0;
        ctx.fillRect(sx, sy, 8, 12); // Player size
    }
}

// ═══════ DUST PARTICLES ON LANDING (Requirement 12.6) ═══════
export function spawnDustParticles(particles, x, y) {
    const dustColors = [COLORS.TILE_MID, COLORS.TILE_DARK, COLORS.METAL_DARK];
    for (let i = 0; i < 6; i++) {
        const ang = Math.PI + (Math.random() - 0.5) * Math.PI; // Upward spread
        const sp = 10 + Math.random() * 30;
        
        const particle = getParticleFromPool();
        particle.x = x + Math.random() * 8;
        particle.y = y + 12; // Bottom of player
        particle.vx = Math.cos(ang) * sp;
        particle.vy = Math.sin(ang) * sp;
        particle.life = 0.3 + Math.random() * 0.2;
        particle.maxLife = 0.5;
        particle.color = dustColors[(Math.random() * dustColors.length) | 0];
        particle.size = 1;
        particle.active = true;
        
        particles.push(particle);
    }
}

// ═══════ SPARK PARTICLES ON OBSTACLE COLLISION (Requirement 12.7) ═══════
export function spawnCollisionSparks(particles, x, y) {
    const sparkColors = [COLORS.SPARK_1, COLORS.SPARK_2, COLORS.GLOW_WARM];
    for (let i = 0; i < 4; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 30 + Math.random() * 50;
        
        const particle = getParticleFromPool();
        particle.x = x;
        particle.y = y;
        particle.vx = Math.cos(ang) * sp;
        particle.vy = Math.sin(ang) * sp;
        particle.life = 0.2 + Math.random() * 0.2;
        particle.maxLife = 0.4;
        particle.color = sparkColors[(Math.random() * sparkColors.length) | 0];
        particle.size = 1;
        particle.active = true;
        
        particles.push(particle);
    }
}

// ═══════ PULSING GLOW EFFECT FOR UNLOCKED EXIT DOOR (Requirement 12.5) ═══════
export function drawExitDoorGlow(ctx, goalTrigger, camX, camY, tick, isUnlocked) {
    if (!isUnlocked) return;
    
    // Pulsing animation
    const pulsePhase = (tick * 0.05) % (Math.PI * 2);
    const pulseIntensity = 0.5 + 0.5 * Math.sin(pulsePhase);
    
    // Draw glow around door
    const glowX = (goalTrigger.x - camX - 4) | 0;
    const glowY = (goalTrigger.y - camY - 4) | 0;
    const glowW = goalTrigger.w + 8;
    const glowH = goalTrigger.h + 8;
    
    // Multiple layers for glow effect
    const alpha = pulseIntensity * 0.3;
    ctx.fillStyle = `rgba(255, 208, 128, ${alpha})`; // COLORS.GLOW_WARM with alpha
    ctx.fillRect(glowX, glowY, glowW, glowH);
    
    // Inner brighter glow
    const innerAlpha = pulseIntensity * 0.5;
    ctx.fillStyle = `rgba(255, 208, 128, ${innerAlpha})`;
    ctx.fillRect(glowX + 2, glowY + 2, glowW - 4, glowH - 4);
}

/**
 * Draw a lethal hazard zone (pit/danger zone) with premium mechanical aesthetics.
 * Refactored to include animated grinding gears, hazard stripes, and heat glow.
 * Requirement 8.5
 */
export function drawLethalZone(ctx, lz, camX, camY, tick) {
    const x = (lz.x - camX) | 0;
    const y = (lz.y - camY) | 0;
    const w = lz.w | 0;
    const h = lz.h | 0;

    // 1. Mechanical Abyss (Deep and Dark Background)
    ctx.fillStyle = '#1c1209'; 
    ctx.fillRect(x, y, w, h);

    // PARAMETERS: Moved down slightly (y + 16)
    const gearR = 12; 
    const spacing = 26; 
    
    ctx.save();
    for (let gx = 0; gx < w + gearR; gx += spacing) {
        const gearX = x + gx;
        const gearY = y + 16; // Moved down from 8
        const direction = (gx / spacing) % 2 === 0 ? 1 : -1;
        const rot = tick * 0.1 * direction;

        // Warm Bronze/Sepia palette to match Broken Clockwork UI
        const mainCol = '#3d2d1d'; // Dark Bronze
        const lightCol = '#a67c52'; // Bronze Gold highlight
        const darkCol = '#1a120a'; // Deep Shadow

        ctx.save();
        ctx.translate(gearX, gearY);
        ctx.rotate(rot);

        // A. BLACK OUTLINE
        ctx.fillStyle = '#000000';
        for (let i = 0; i < 6; i++) {
            ctx.rotate(Math.PI / 3);
            ctx.fillRect(-gearR - 1, -gearR - 1, (gearR + 1) * 2, (gearR + 1) * 2);
            ctx.fillRect(gearR - 2, -4, 6, 8);
        }

        // B. GEAR BODY
        ctx.fillStyle = mainCol;
        for (let i = 0; i < 3; i++) {
            ctx.rotate(Math.PI / 3);
            ctx.fillRect(-gearR, -gearR, gearR * 2, gearR * 2);
        }

        // C. 6 BLOCKY TEETH
        for (let i = 0; i < 6; i++) {
            ctx.rotate(Math.PI / 3);
            ctx.fillStyle = mainCol;
            ctx.fillRect(gearR - 2, -3, 5, 6);
            ctx.fillStyle = lightCol;
            ctx.fillRect(gearR - 2, -3, 5, 1);
        }

        // D. HOLLOW CENTER
        ctx.fillStyle = '#000000';
        ctx.fillRect(-5, -5, 10, 10);
        ctx.fillStyle = '#1c1209';
        ctx.fillRect(-4, -4, 8, 8);
        ctx.fillStyle = darkCol;
        ctx.fillRect(-4, -4, 8, 1);

        ctx.restore();
    }
    ctx.restore();

    // 2. Minimalist Environmental Effects (No red glow)
    // Rare metal dust particles
    if (tick % 60 < 2) {
        const px = x + (Math.random() * w);
        const py = y + (Math.random() * h);
        ctx.fillStyle = COLORS.METAL_LIGHT;
        ctx.globalAlpha = 0.15;
        ctx.fillRect(px | 0, py | 0, 1, 1);
        ctx.globalAlpha = 1.0;
    }
}

