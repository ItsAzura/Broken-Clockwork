/*
 * main.js
 * Boot, main loop, state machine, level lifecycle, camera,
 * and all the rage-mode glue: autonomous obstacles, gear tokens,
 * locked exit door, instant-death pipeline, freeze-frame + respawn.
 */

import {
    SCREEN_W, SCREEN_H, TILE, DT_CAP, COLORS, STATES, OBJ,
    WIND_RANGE, GAUGE_DRAIN_PER_WIND,
    PLAYER_W, PLAYER_H, NEAR_MISS_DISTANCE,
    LEVEL_CLEAR_HOLD, LEVEL_CLEAR_PARTICLES,
} from './constants.js';
import {
    drawPixelRect, drawPixelText, drawTile, spawnSparks, updateAndDrawParticles,
    measurePixelText,
} from './draw.js';
import {
    initAudio, resumeAudio, playWindUp, playFreeze, playGaugeLow,
    playRefill, playLevelClear, playGameOver, playJump, playTick,
    startMusic, stopMusic, unlockNote, resetNotes, unlockAllNotes,
} from './audio.js';
import { LEVELS, getLevel } from './levels.js';
import { WindableObject } from './WindableObject.js';
import { AutonomousObstacle, rectOverlapsBounds } from './AutonomousObstacle.js';
import {
    createPlayer, updatePlayer, drawPlayer, startWindUp, cancelWindUp,
    tickWindUp, applyWindCost, getPlayerHitbox, nearMissCheck,
} from './player.js';
import {
    updatePlayerPhysics, findNearestWindable,
} from './physics.js';
import { initInput, isHeld, justPressed, clearPressed } from './input.js';
import {
    drawHUD, drawTitle, drawLevelClear, drawGameOver, drawPaused,
    drawWindPrompt, drawTransition, drawFlashOverlay,
    drawGearToken, drawLockedDoor,
} from './ui.js';
import {
    deathState, resetAllDeaths, resetLevelDeaths, markRespawnNow,
    triggerDeath, updateDeathState, drawDeathFlash, drawTauntMessage,
    getDeathCount, getLevelDeathCount, isDying, isFreezing,
} from './deathSystem.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function fitCanvas() {
    const SCALE = Math.max(1, Math.min(
        Math.floor(window.innerWidth / SCREEN_W),
        Math.floor(window.innerHeight / SCREEN_H)
    ));
    canvas.width = SCREEN_W;
    canvas.height = SCREEN_H;
    canvas.style.width = SCREEN_W * SCALE + 'px';
    canvas.style.height = SCREEN_H * SCALE + 'px';
    canvas.style.imageRendering = 'pixelated';
    ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const game = {
    state: STATES.TITLE,
    level: 1,
    levelData: null,
    player: null,
    camera: { x: 0, y: 0 },
    tiles: [],
    objects: [],
    autonomousObstacles: [],
    gearTokens: [],
    gearsCollected: 0,
    particles: [],
    transition: { active: false, alpha: 0, dir: 1, callback: null },
    tick: 0,
    gameTime: 0,
    flash: 0,
    shake: 0,
    message: '',
    messageTimer: 0,
    sequenceProgress: [],
    sequenceComplete: false,
    lastGaugeLow: false,
    levelClearTimer: 0,
    obstaclePauseTimer: 0,
    obstacleSpeedMult: 1,
    lastSpawn: { x: 0, y: 0 },
    deathCount: 0,
};

function loadLevel(idx) {
    const data = getLevel(idx - 1);
    game.levelData = data;
    game.tiles = data.tilemap.slice();

    game.objects = (data.objects || []).map(o => new WindableObject(o));
    game.autonomousObstacles = (data.autonomousObstacles || []).map(a => new AutonomousObstacle(a));
    game.gearTokens = (data.gearTokens || []).map(t => ({
        x: t.x, y: t.y, collected: false, angle: 0,
    }));
    game.gearsCollected = 0;

    game.particles.length = 0;
    game.sequenceProgress = [];
    game.sequenceComplete = false;
    game.levelClearTimer = 0;
    game.obstaclePauseTimer = 0;
    game.obstacleSpeedMult = 1;
    resetNotes();

    let spawn = data.playerSpawn;
    if (!spawn) {
        for (let ty = 0; ty < game.tiles.length; ty++) {
            const row = game.tiles[ty];
            const px = row.indexOf('P');
            if (px >= 0) {
                spawn = { x: px * TILE, y: ty * TILE };
                game.tiles[ty] = row.replace('P', '.');
                break;
            }
        }
    }
    if (!spawn) spawn = { x: 32, y: 32 };
    game.lastSpawn = { x: spawn.x, y: spawn.y };
    game.player = createPlayer(spawn.x, spawn.y);
    game.camera.x = 0; game.camera.y = 0;
    updateCamera(true);
}

function softRespawn() {
    for (let ty = 0; ty < game.levelData.tilemap.length; ty++) {
        game.tiles[ty] = game.levelData.tilemap[ty].replace('P', '.');
    }
    game.objects = (game.levelData.objects || []).map(o => new WindableObject(o));
    game.autonomousObstacles = (game.levelData.autonomousObstacles || [])
        .map(a => new AutonomousObstacle(a));
    game.gearTokens = (game.levelData.gearTokens || []).map(t => ({
        x: t.x, y: t.y, collected: false, angle: 0,
    }));
    game.gearsCollected = 0;
    game.sequenceProgress = [];
    game.sequenceComplete = false;
    game.obstaclePauseTimer = 0;
    game.obstacleSpeedMult = 1;
    game.player = createPlayer(game.lastSpawn.x, game.lastSpawn.y);
    game.particles.length = 0;
    markRespawnNow(game.gameTime);
    updateCamera(true);
}

function startTransition(dir, cb) {
    game.transition.active = true;
    game.transition.dir = dir;
    game.transition.alpha = dir > 0 ? 0 : 1;
    game.transition.callback = cb;
}

function updateTransition(dt) {
    if (!game.transition.active) return;
    const speed = 2;
    game.transition.alpha += game.transition.dir * speed * dt;
    if (game.transition.dir > 0 && game.transition.alpha >= 1) {
        game.transition.alpha = 1;
        if (game.transition.callback) game.transition.callback();
        game.transition.dir = -1;
    } else if (game.transition.dir < 0 && game.transition.alpha <= 0) {
        game.transition.alpha = 0;
        game.transition.active = false;
    }
}

function updateCamera(snap = false) {
    const tilemapW = game.tiles[0].length * TILE;
    const tilemapH = game.tiles.length * TILE;
    const targetX = Math.max(0, Math.min(tilemapW - SCREEN_W, game.player.x - SCREEN_W / 2 + 4));
    const targetY = Math.max(0, Math.min(tilemapH - SCREEN_H, game.player.y - SCREEN_H / 2 + 6));
    if (snap) { game.camera.x = targetX | 0; game.camera.y = targetY | 0; return; }
    game.camera.x += (targetX - game.camera.x) * 0.15;
    game.camera.y += (targetY - game.camera.y) * 0.15;
    game.camera.x = Math.round(game.camera.x);
    game.camera.y = Math.round(game.camera.y);
}

function tryWindInteraction(target) {
    if (!target) return;
    if (target.type === OBJ.CLOCK_STATION) {
        target.wind(game);
        game.player.gauge = game.player.gaugeMax;
        playRefill();
        spawnSparks(game.particles, target.centerX(), target.centerY(), 12);
        showMessage('GAUGE REFILLED', 1.0);
        return;
    }
    if (game.player.gauge < GAUGE_DRAIN_PER_WIND) {
        playGaugeLow();
        showMessage('NEED WIND', 0.6);
        return;
    }
    const result = target.wind(game);
    if (!result) return;
    applyWindCost(game.player);
    spawnSparks(game.particles, target.centerX(), target.centerY(), 8);
    if (result === 'sequence') handleSequenceLever(target);
    else if (result === 'lever') { playWindUp(0.7); game.shake = 6; }
    else { playWindUp(1.0); game.shake = 4; unlockNote(target.id % 8); }
}

function handleSequenceLever(target) {
    game.sequenceProgress.push(target.seqNum);
    playWindUp(0.5 + target.seqNum * 0.15);
    const correct = game.levelData.sequenceCorrect;
    const idx = game.sequenceProgress.length - 1;
    if (game.sequenceProgress[idx] !== correct[idx]) {
        showMessage('WRONG ORDER!', 1.5);
        for (const o of game.objects) {
            if (o.type === OBJ.LEVER_SEQUENCE) o.activated = false;
        }
        game.sequenceProgress = [];
        dieNow({ reason: 'sequence' });
        return;
    }
    if (game.sequenceProgress.length === correct.length) {
        for (let i = 0; i < correct.length; i++) unlockNote(i);
        unlockAllNotes();
        for (const o of game.objects) {
            spawnSparks(game.particles, o.centerX(), o.centerY(), 14);
        }
        game.sequenceComplete = true;
        game.flash = 0.6;
        game.shake = 12;
    }
}

function showMessage(text, time) {
    game.message = text;
    game.messageTimer = time;
}

function dieNow(context) {
    if (isDying()) return;
    const hadAll = (game.gearTokens.length > 0 && game.gearsCollected === game.gearTokens.length);
    const ctxInfo = Object.assign({ hadAllTokens: hadAll }, context || {});
    if (!ctxInfo.hadAllTokens && game.gearsCollected === game.gearTokens.length - 1 && game.gearTokens.length > 0) {
        ctxInfo.lastToken = true;
    }
    triggerDeath(game.player, game.particles, ctxInfo, game.gameTime);
    playGameOver();
    game.shake = 10;
    game.flash = 0;
}

function collectTokens() {
    const hit = getPlayerHitbox(game.player);
    for (const t of game.gearTokens) {
        if (t.collected) continue;
        const tb = { x: t.x + 1, y: t.y + 1, w: 6, h: 6 };
        if (hit.x < tb.x + tb.w && hit.x + hit.w > tb.x &&
            hit.y < tb.y + tb.h && hit.y + hit.h > tb.y) {
            t.collected = true;
            game.gearsCollected++;
            playTick();
            playWindUp(2.2);
            spawnSparks(game.particles, t.x + 4, t.y + 4, 8,
                [COLORS.SPARK_1, COLORS.GLOW_WARM, COLORS.METAL_LIGHT]);
            unlockNote(game.gearsCollected % 8);

            if (game.gearsCollected === game.gearTokens.length) {
                game.obstaclePauseTimer = 1.0;
                game.flash = 0.4;
                game.shake = 6;
                showMessage('ALL GEARS!', 1.2);
            }
        }
    }
}

function updateObstaclePause(dt) {
    if (game.obstaclePauseTimer > 0) {
        game.obstaclePauseTimer -= dt;
        game.obstacleSpeedMult = 0;
        if (game.obstaclePauseTimer <= 0) {
            game.obstacleSpeedMult = 1.3;
        }
    }
    for (const a of game.autonomousObstacles) a.speedMult = game.obstacleSpeedMult;
}

function checkLethalCollisions() {
    const hit = getPlayerHitbox(game.player);

    const zones = game.levelData.lethalZones || [];
    for (const lz of zones) {
        if (hit.x < lz.x + lz.w && hit.x + hit.w > lz.x &&
            hit.y < lz.y + lz.h && hit.y + hit.h > lz.y) {
            dieNow({});
            return true;
        }
    }

    for (const a of game.autonomousObstacles) {
        const b = a.getBounds();
        if (rectOverlapsBounds(hit, b)) {
            dieNow({});
            return true;
        }
    }

    for (const o of game.objects) {
        if (o.type === OBJ.ENEMY_PATROL && o.isWound) {
            const r = o.rect();
            if (hit.x < r.x + r.w && hit.x + hit.w > r.x &&
                hit.y < r.y + r.h && hit.y + hit.h > r.y) {
                dieNow({});
                return true;
            }
        }
    }

    return false;
}

function handleNearMisses() {
    const hits = nearMissCheck(game.player, game.autonomousObstacles);
    for (const a of hits) {
        playWindUp(0.35);
        spawnSparks(game.particles, game.player.x + 4, game.player.y + 6, 2,
            [COLORS.SPARK_1, COLORS.GLOW_WARM]);
    }
}

function update(dt) {
    game.tick++;
    game.gameTime += dt;
    game.messageTimer = Math.max(0, game.messageTimer - dt);
    game.flash = Math.max(0, game.flash - dt * 1.5);
    if (game.shake > 0) game.shake -= dt * 60;

    if (game.state === STATES.TITLE) {
        if (justPressed('SPACE') && !game.transition.active) {
            initAudio(); resumeAudio(); startMusic();
            startTransition(1, () => {
                resetAllDeaths();
                game.deathCount = 0;
                game.level = 1;
                loadLevel(1);
                resetLevelDeaths();
                markRespawnNow(game.gameTime);
                game.state = STATES.PLAYING;
            });
        }
        if (justPressed('RETRY')) {
            resetAllDeaths();
            game.deathCount = 0;
        }
        clearPressed();
        return;
    }

    if (game.state === STATES.PLAYING) {
        if (justPressed('PAUSE')) { game.state = STATES.PAUSED; return; }

        const ds = updateDeathState(dt);
        if (ds === 'freeze') { clearPressed(); return; }
        if (ds === 'respawn') {
            softRespawn();
            game.deathCount = getDeathCount();
            clearPressed();
            return;
        }
        if (ds === 'dying') { clearPressed(); return; }

        updateObstaclePause(dt);
        for (const a of game.autonomousObstacles) a.update(dt);

        for (const t of game.gearTokens) {
            if (!t.collected) t.angle += (6 * Math.PI / 180);
        }

        const allowJump = true;
        updatePlayer(game.player, dt, allowJump);
        if ((justPressed('SPACE') || justPressed('UP')) && allowJump && game.player.onGround) playJump();

        const target = findNearestWindable(game.player, game.objects, WIND_RANGE);
        if (isHeld('WIND') && target) {
            if (!game.player.isWindingUp) startWindUp(game.player, target);
            if (tickWindUp(game.player, dt)) {
                tryWindInteraction(game.player.windTarget);
                cancelWindUp(game.player);
            }
        } else {
            cancelWindUp(game.player);
        }

        const ridden = game.player.ridingPlatform;
        const prevPx = ridden ? ridden.x : 0;
        const prevPy = ridden ? ridden.y : 0;
        for (const o of game.objects) {
            o.justFroze = false;
            o.update(dt, game.player);
            if (o.justFroze) { playFreeze(); game.flash = 0.4; game.shake = 5; }
            if (o.isWound && Math.random() < 0.3) {
                spawnSparks(game.particles, o.centerX(), o.centerY(), 1);
            }
        }
        if (ridden && ridden.isSolidPlatform()) {
            const dx = ridden.x - prevPx;
            const dy = ridden.y - prevPy;
            if (Math.abs(dx) < 8) game.player.x += dx;
            if (Math.abs(dy) < 8) game.player.y += dy;
        }
        game.player.ridingPlatform = null;
        updatePlayerPhysics(game.player, dt, game.tiles, game.objects);

        if (checkLethalCollisions()) { clearPressed(); return; }

        if (game.player.gauge <= 0) {
            dieNow({ reason: 'gauge' });
            clearPressed();
            return;
        }
        if (game.player.y > game.tiles.length * TILE + 32) {
            dieNow({});
            clearPressed();
            return;
        }

        collectTokens();
        handleNearMisses();

        const gate = game.levelData.goalTrigger;
        const allGears = game.gearsCollected === game.gearTokens.length;
        if (gate) {
            const p = { x: game.player.x, y: game.player.y, w: PLAYER_W, h: PLAYER_H };
            const over = p.x < gate.x + gate.w && p.x + p.w > gate.x &&
                         p.y < gate.y + gate.h && p.y + p.h > gate.y;
            if (over) {
                if (allGears) levelClear();
                else if (game.messageTimer <= 0) {
                    playGaugeLow();
                    showMessage('COLLECT ALL GEARS', 1.0);
                }
            }
        } else if (game.levelData.winOnSequence) {
            if (game.sequenceComplete && allGears) levelClear();
        }

        const lowNow = game.player.gauge <= 0.25;
        if (lowNow && !game.lastGaugeLow) playGaugeLow();
        game.lastGaugeLow = lowNow;

        updateCamera();
        clearPressed();
        return;
    }

    if (game.state === STATES.PAUSED) {
        if (justPressed('PAUSE')) game.state = STATES.PLAYING;
        clearPressed();
        return;
    }

    if (game.state === STATES.LEVEL_CLEAR) {
        for (const a of game.autonomousObstacles) a.speedMult = Math.max(0, (a.speedMult || 1) - dt * 0.8);
        for (const a of game.autonomousObstacles) a.update(dt);

        game.levelClearTimer += dt;
        if (game.levelClearTimer < 1.5 && Math.random() < 0.35) {
            const ex = game.camera.x + Math.random() * SCREEN_W;
            const ey = game.camera.y + Math.random() * SCREEN_H;
            spawnSparks(game.particles, ex, ey, 4,
                [COLORS.SPARK_1, COLORS.GLOW_WARM, COLORS.METAL_LIGHT]);
        }

        const canAdvance = game.levelClearTimer >= LEVEL_CLEAR_HOLD;
        if ((canAdvance || justPressed('SPACE')) && !game.transition.active) {
            startTransition(1, () => {
                game.level++;
                if (game.level > LEVELS.length) {
                    game.level = 1;
                    game.state = STATES.TITLE;
                    stopMusic();
                } else {
                    loadLevel(game.level);
                    resetLevelDeaths();
                    markRespawnNow(game.gameTime);
                    game.state = STATES.PLAYING;
                }
            });
        }
        clearPressed();
        return;
    }

    if (game.state === STATES.GAME_OVER) {
        if ((justPressed('RETRY') || justPressed('SPACE')) && !game.transition.active) {
            startTransition(1, () => { loadLevel(game.level); game.state = STATES.PLAYING; });
        }
        clearPressed();
        return;
    }
}

function levelClear() {
    if (game.state !== STATES.PLAYING) return;
    game.state = STATES.LEVEL_CLEAR;
    game.levelClearTimer = 0;
    playLevelClear();
    for (let i = 0; i < LEVEL_CLEAR_PARTICLES; i++) {
        const ex = game.camera.x + Math.random() * SCREEN_W;
        const ey = game.camera.y + Math.random() * SCREEN_H;
        spawnSparks(game.particles, ex, ey, 1,
            [COLORS.SPARK_1, COLORS.GLOW_WARM, COLORS.METAL_LIGHT]);
    }
    game.flash = 0.8;
    game.shake = 14;
}

function drawWorld() {
    const camX = game.camera.x + (game.shake > 0 ? Math.round((Math.random() - 0.5) * 4) : 0);
    const camY = game.camera.y + (game.shake > 0 ? Math.round((Math.random() - 0.5) * 4) : 0);

    drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, COLORS.BACKGROUND);
    drawBackgroundDecor(ctx);

    const minTx = Math.max(0, Math.floor(camX / TILE));
    const maxTx = Math.min(game.tiles[0].length - 1, Math.floor((camX + SCREEN_W) / TILE));
    const minTy = Math.max(0, Math.floor(camY / TILE));
    const maxTy = Math.min(game.tiles.length - 1, Math.floor((camY + SCREEN_H) / TILE));
    for (let ty = minTy; ty <= maxTy; ty++) {
        const row = game.tiles[ty];
        for (let tx = minTx; tx <= maxTx; tx++) {
            const t = row[tx];
            if (t === '.' || t === 'P') continue;
            drawTile(ctx, t, tx * TILE - camX, ty * TILE - camY);
        }
    }

    const zones = game.levelData.lethalZones || [];
    for (const lz of zones) {
        ctx.fillStyle = COLORS.DANGER_ZONE;
        ctx.fillRect(lz.x - camX, lz.y - camY, lz.w, lz.h);
        ctx.fillStyle = COLORS.GAUGE_LOW;
        for (let ix = 0; ix < lz.w; ix += 6) {
            ctx.fillRect((lz.x + ix) - camX, lz.y - camY, 3, 1);
        }
    }

    if (game.levelData.goalTrigger) {
        drawLockedDoor(ctx, game.levelData.goalTrigger, camX, camY, game.tick,
            game.gearsCollected === game.gearTokens.length);
    }

    for (const a of game.autonomousObstacles) a.draw(ctx, camX, camY, game.tick);

    for (const o of game.objects) o.draw(ctx, camX, camY, game.tick);

    for (const t of game.gearTokens) drawGearToken(ctx, t, camX, camY, game.tick);

    if (!isDying() || isFreezing()) drawPlayer(ctx, game.player, camX, camY);

    updateAndDrawParticles(ctx, game.particles, 1 / 60, camX, camY);

    const target = findNearestWindable(game.player, game.objects, WIND_RANGE);
    if (target && !game.player.isWindingUp && game.state === STATES.PLAYING && !isDying()) {
        drawWindPrompt(ctx, target, camX, camY, game.tick);
    }

    if (game.player.isWindingUp) {
        const prog = game.player.windProgress / 0.45;
        const px = game.player.x - camX + 4;
        const py = game.player.y - camY - 6;
        drawPixelRect(ctx, px - 6, py, 12, 2, COLORS.UI_BG);
        drawPixelRect(ctx, px - 6, py, Math.round(12 * prog), 2, COLORS.GLOW_WARM);
    }
}

function drawBackgroundDecor(ctx) {
    for (let i = 0; i < 3; i++) {
        const cx = (40 + i * 110 - game.camera.x * 0.3) % (SCREEN_W + 60);
        const cy = 28 + (i * 7) % 18;
        const r = 14 + i * 3;
        ctx.fillStyle = COLORS.TILE_DARK;
        for (let a = 0; a < 24; a++) {
            const ang = (a / 24) * Math.PI * 2 + game.tick * 0.003 * (i + 1);
            const x = cx + Math.cos(ang) * r;
            const y = cy + Math.sin(ang) * r;
            ctx.fillRect(x | 0, y | 0, 2, 2);
        }
    }
}

function draw() {
    if (game.state === STATES.TITLE) {
        drawTitle(ctx, game.tick);
    } else {
        drawWorld();
        game.deathCount = getDeathCount();
        drawHUD(ctx, game);
        drawTauntMessage(ctx);
        if (game.state === STATES.LEVEL_CLEAR) drawLevelClear(ctx, getLevelDeathCount(), getDeathCount(), game.tick);
        if (game.state === STATES.GAME_OVER) drawGameOver(ctx, game.tick);
        if (game.state === STATES.PAUSED) drawPaused(ctx);
    }
    drawDeathFlash(ctx);
    drawFlashOverlay(ctx, game.flash);
    drawTransition(ctx, game.transition.alpha);
}

let lastTime = 0;
function loop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, DT_CAP);
    lastTime = timestamp;
    updateTransition(dt);
    update(dt);
    draw();
    requestAnimationFrame(loop);
}

initInput();
window.addEventListener('pointerdown', () => { initAudio(); resumeAudio(); }, { once: true });
requestAnimationFrame((t) => { lastTime = t; loop(t); });
