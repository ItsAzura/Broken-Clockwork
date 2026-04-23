/*
 * main.js
 * Boot, main loop, state machine, level lifecycle, camera,
 * and all the rage-mode glue: autonomous obstacles, gear tokens,
 * locked exit door, instant-death pipeline, freeze-frame + respawn.
 *
 * Masocore additions:
 *   - Ghost replay buffer (best attempt shown behind live Mira)
 *   - Room time tracking for Pattern Betrayal
 *   - Coyote death (overlap frame forgiveness)
 *   - Close-call celebration system
 *   - Second Wind trap integration
 *   - Checkpoint system for levels 4–5
 *   - Offbeat music drift
 */

import {
    SCREEN_W, SCREEN_H, TILE, DT_CAP, COLORS, STATES, OBJ,
    WIND_RANGE, GAUGE_DRAIN_PER_WIND,
    PLAYER_W, PLAYER_H, NEAR_MISS_DISTANCE,
    LEVEL_CLEAR_HOLD, LEVEL_CLEAR_PARTICLES,
    GHOST_REPLAY_CAP, MERCY_HINT_THRESHOLD,
    CLOSE_CALL_DISPLAY_FRAMES, EXTREME_CLOSE_CALL_DISPLAY_FRAMES,
    CLOSE_CALL_DISTANCE, EXTREME_CLOSE_CALL_DISTANCE,
    OFFBEAT_MERCY_THRESHOLD, SECOND_WIND_DURATION,
} from './constants.js';
import {
    drawPixelRect, drawPixelText, drawTile, spawnSparks, updateAndDrawParticles,
    measurePixelText,
} from './draw.js';
import {
    initAudio, resumeAudio, playWindUp, playFreeze, playGaugeLow,
    playRefill, playLevelClear, playGameOver, playJump, playTick,
    startMusic, stopMusic, unlockNote, resetNotes, unlockAllNotes,
    setHumVolume, playCloseCall, playExtremeCloseCall,
    playSecondWindWarning, playCheckpointActivate,
    setOffbeatMode, syncMusicToObstacles, resetMusicInterval,
} from './audio.js';
import { LEVELS, getLevel, validateLevelTraps } from './levels.js';
import { WindableObject } from './WindableObject.js';
import { AutonomousObstacle, rectOverlapsBounds, distanceToBounds } from './AutonomousObstacle.js';
import {
    createPlayer, updatePlayer, drawPlayer, startWindUp, cancelWindUp,
    tickWindUp, applyWindCost, getPlayerHitbox, nearMissCheck, closeCallCheck,
} from './player.js';
import {
    updatePlayerPhysics, findNearestWindable,
} from './physics.js';
import { initInput, isHeld, justPressed, clearPressed } from './input.js';
import {
    drawHUD, drawTitle, drawLevelClear, drawGameOver, drawPaused,
    drawWindPrompt, drawTransition, drawFlashOverlay,
    drawGearToken, drawLockedDoor,
    drawGhostMira, drawCloseCallIndicator, drawCheckpoint,
    drawColorBetrayalTile, drawMercyHints,
} from './ui.js';
import {
    deathState, resetAllDeaths, resetLevelDeaths, markRespawnNow,
    triggerDeath, updateDeathState, drawDeathFlash, drawTauntMessage,
    getDeathCount, getLevelDeathCount, isDying, isFreezing,
    checkCoyoteOverlap, resetCoyoteOverlap, recordObstacleDeath, shouldShowMercy,
    getObstacleDeathCount,
} from './deathSystem.js';
import { TriggerTile, FakeSafeZone, TrollToken, HiddenKillGear, BaitPath, OneFrameWindow, PhaseShiftObstacle, AlmostMomentTrap, MirrorCorridor, ProximityTrigger } from './trapSystem.js';
import { LiarCounter } from './liarCounter.js';

// Initialize Wavedash SDK to signal load completion
// WavedashJS is injected by the platform — guard for local dev
try {
    if (typeof window.WavedashJS !== 'undefined') {
        window.WavedashJS.init({ debug: false });
    }
} catch (e) {
    console.warn('WavedashJS init failed:', e);
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Ensure focus for iframe environments (Wavedash)
canvas.focus();
document.addEventListener('click', () => { canvas.focus(); window.focus(); });
document.addEventListener('pointerdown', () => { canvas.focus(); window.focus(); });

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
    triggerTiles: [],
    fakeSafeZones: [],
    trollTokens: [],
    hiddenKillGears: [],
    almostMomentTrap: null,
    proximityTriggers: [],
    liarCounter: new LiarCounter(),
    colorBetrayalZones: [],
    // ─── Masocore additions ───
    roomTime: 0,
    ghostReplay: {
        frames: [],
        maxFrames: GHOST_REPLAY_CAP,
        bestFrames: [],
        bestDistance: 0,
        currentIndex: 0,
    },
    closeCallType: null,
    closeCallTimer: 0,
    secondWindActive: false,
    secondWindTimer: 0,
    secondWindObstacles: [],
    checkpoints: [],
    activeCheckpoint: null,
    checkpointTokensCollected: [],
};

function loadLevel(idx) {
    // ─── Defensive module import checks ───
    console.log('[LOAD_LEVEL] Starting level load, index:', idx);
    console.log('[LOAD_LEVEL] Environment check - WavedashJS:', typeof window.WavedashJS !== 'undefined' ? 'present' : 'not present');
    
    // Check critical imports from levels.js
    if (typeof LEVELS === 'undefined') {
        console.error('[LOAD_LEVEL] CRITICAL: LEVELS array is undefined - levels.js may have failed to load');
    }
    if (typeof getLevel === 'undefined') {
        console.error('[LOAD_LEVEL] CRITICAL: getLevel function is undefined - levels.js may have failed to load');
        throw new Error('getLevel function is undefined - cannot load level');
    }
    
    // Check critical constants from constants.js
    if (typeof STATES === 'undefined') {
        console.error('[LOAD_LEVEL] CRITICAL: STATES is undefined - constants.js may have failed to load');
    }
    if (typeof TILE === 'undefined') {
        console.error('[LOAD_LEVEL] CRITICAL: TILE is undefined - constants.js may have failed to load');
    }
    if (typeof OBJ === 'undefined') {
        console.error('[LOAD_LEVEL] CRITICAL: OBJ is undefined - constants.js may have failed to load');
    }
    
    console.log('[LOAD_LEVEL] Module checks passed, calling getLevel...');
    const data = getLevel(idx - 1);
    console.log('[LOAD_LEVEL] Level data retrieved:', data ? 'success' : 'null');
    game.levelData = data;
    
    // Validate level trap configuration
    const validation = validateLevelTraps(data);
    if (!validation.valid) {
        console.warn(`Level ${data.id} trap validation warnings:`);
        validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
    
    game.tiles = data.tilemap.slice();

    try {
        game.objects = (data.objects || []).map(o => new WindableObject(o));
    } catch (e) {
        console.error('Error loading objects:', e);
        game.objects = [];
    }
    
    // Create obstacles, using PhaseShiftObstacle for obstacles in phaseShiftObstacles array
    try {
        const phaseShiftIds = data.phaseShiftObstacles || [];
        game.autonomousObstacles = (data.autonomousObstacles || []).map(a => {
            if (!a.id) {
                console.warn('Obstacle missing id, skipping phase shift check');
            }
            if (phaseShiftIds.includes(a.id)) {
                return new PhaseShiftObstacle(a);
            }
            return new AutonomousObstacle(a);
        });
    } catch (e) {
        console.error('Error loading obstacles:', e);
        game.autonomousObstacles = [];
    }
    
    game.gearTokens = (data.gearTokens || []).map(t => ({
        x: t.x, y: t.y, collected: false, angle: 0,
    }));
    game.gearsCollected = 0;
    if (game.liarCounter) game.liarCounter.reset();
    
    // Initialize trap systems with error handling
    try {
        game.triggerTiles = (data.triggerTiles || []).map(t => {
            if (!t.targetObstacleId) {
                console.warn('TriggerTile missing targetObstacleId:', t);
            }
            return new TriggerTile(t);
        });
    } catch (e) {
        console.error('Error loading trigger tiles:', e);
        game.triggerTiles = [];
    }
    
    try {
        game.fakeSafeZones = (data.fakeSafeZones || []).map(z => {
            if (!z.obstacleIds || z.obstacleIds.length === 0) {
                console.warn('FakeSafeZone missing obstacleIds:', z);
            }
            return new FakeSafeZone(z);
        });
    } catch (e) {
        console.error('Error loading fake safe zones:', e);
        game.fakeSafeZones = [];
    }
    
    try {
        game.trollTokens = (data.trollTokens || []).map(t => {
            if (!t.subtype) {
                console.warn('TrollToken missing subtype:', t);
            }
            return new TrollToken(t);
        });
    } catch (e) {
        console.error('Error loading troll tokens:', e);
        game.trollTokens = [];
    }
    
    try {
        game.hiddenKillGears = (data.hiddenKillGears || []).map(g => new HiddenKillGear(g));
    } catch (e) {
        console.error('Error loading hidden kill gears:', e);
        game.hiddenKillGears = [];
    }
    
    try {
        game.baitPaths = (data.baitPaths || []).map(b => new BaitPath(b));
    } catch (e) {
        console.error('Error loading bait paths:', e);
        game.baitPaths = [];
    }
    
    try {
        game.oneFrameWindows = (data.oneFrameWindows || []).map(w => new OneFrameWindow(w));
    } catch (e) {
        console.error('Error loading one frame windows:', e);
        game.oneFrameWindows = [];
    }
    
    try {
        game.proximityTriggers = (data.proximityTriggers || []).map(p => new ProximityTrigger(p));
    } catch (e) {
        console.error('Error loading proximity triggers:', e);
        game.proximityTriggers = [];
    }
    
    try {
        game.almostMomentTrap = data.almostMomentTrap ? new AlmostMomentTrap(data.almostMomentTrap) : null;
        if (game.almostMomentTrap && (!game.almostMomentTrap.obstacleIds || game.almostMomentTrap.obstacleIds.length === 0)) {
            console.warn('AlmostMomentTrap missing obstacleIds');
        }
    } catch (e) {
        console.error('Error loading almost moment trap:', e);
        game.almostMomentTrap = null;
    }
    
    // Create mirror corridors and apply symmetry + phase offset to obstacles
    try {
        game.mirrorCorridors = (data.mirrorCorridors || []).map(config => {
            const corridor = new MirrorCorridor(config);
            const { obstacleA, obstacleB } = corridor.createObstacles();
            
            // Find and update obstacles in the autonomousObstacles array
            if (obstacleA.id) {
                const obsA = game.autonomousObstacles.find(o => o.id === obstacleA.id);
                if (obsA && obstacleA.initialTime !== undefined) {
                    obsA.time = obstacleA.initialTime;
                } else if (obstacleA.id && !obsA) {
                    console.warn('MirrorCorridor references non-existent obstacle:', obstacleA.id);
                }
            }
            
            if (obstacleB.id) {
                const obsB = game.autonomousObstacles.find(o => o.id === obstacleB.id);
                if (obsB) {
                    // Apply symmetry and phase offset
                    Object.assign(obsB, obstacleB);
                    if (obstacleB.initialTime !== undefined) {
                        obsB.time = obstacleB.initialTime;
                    }
                } else {
                    console.warn('MirrorCorridor references non-existent obstacle:', obstacleB.id);
                }
            }
            
            return corridor;
        });
    } catch (e) {
        console.error('Error loading mirror corridors:', e);
        game.mirrorCorridors = [];
    }

    // Load color betrayal zones
    try {
        game.colorBetrayalZones = (data.colorBetrayalZones || []).map(zone => ({
            x: zone.x,
            y: zone.y,
            w: zone.w,
            h: zone.h,
            color: zone.color,
            triggerObstacleId: zone.triggerObstacleId,
            oneShot: zone.oneShot,
            activated: false,
        }));
    } catch (e) {
        console.error('Error loading color betrayal zones:', e);
        game.colorBetrayalZones = [];
    }

    // Synchronize obstacles for one frame windows
    try {
        for (const window of game.oneFrameWindows) {
            const success = window.synchronizeObstacles(game.autonomousObstacles);
            if (!success) {
                console.warn('Failed to synchronize OneFrameWindow obstacles');
            }
        }
    } catch (e) {
        console.error('Error synchronizing one frame windows:', e);
    }

    game.particles.length = 0;
    game.sequenceProgress = [];
    game.sequenceComplete = false;
    game.levelClearTimer = 0;
    game.obstaclePauseTimer = 0;
    game.obstacleSpeedMult = 1;
    resetNotes();

    let spawn = data.playerSpawn;
    if (!spawn) {
        // Use inline fallback for TILE constant (Wavedash service worker can corrupt module imports)
        const tileSize = (typeof TILE !== 'undefined') ? TILE : 16;
        for (let ty = 0; ty < game.tiles.length; ty++) {
            const row = game.tiles[ty];
            const px = row.indexOf('P');
            if (px >= 0) {
                spawn = { x: px * tileSize, y: ty * tileSize };
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

    // ─── Masocore state init ───
    game.roomTime = 0;
    // Ghost replay system
    game.ghostReplay = {
        frames: [],
        maxFrames: GHOST_REPLAY_CAP,
        bestFrames: [],
        bestDistance: 0,
        currentIndex: 0,
    };
    game.closeCallType = null;
    game.closeCallTimer = 0;
    game.secondWindActive = false;
    game.secondWindTimer = 0;

    // Checkpoints from level data
    game.checkpoints = (data.checkpoints || []).map(cp => ({
        x: cp.x, y: cp.y, activated: false,
    }));
    game.activeCheckpoint = null;
    game.checkpointTokensCollected = [];

    // Second Wind trap obstacles
    game.secondWindObstacles = [];
    if (data.secondWindTrap) {
        for (const swConfig of (Array.isArray(data.secondWindTrap) ? data.secondWindTrap : [data.secondWindTrap])) {
            // Use obstacleConfig sub-object if present, otherwise spread directly
            const obsData = swConfig.obstacleConfig || swConfig;
            const swObs = new AutonomousObstacle({
                ...obsData,
                isSecondWind: true,
                initiallyActive: false,
            });
            game.secondWindObstacles.push(swObs);
            game.autonomousObstacles.push(swObs);
        }
    }

    // Offbeat music
    resetMusicInterval();
    if (data.listeningRhythm) {
        setOffbeatMode(true);
    }
}

function softRespawn() {
    for (let ty = 0; ty < game.levelData.tilemap.length; ty++) {
        game.tiles[ty] = game.levelData.tilemap[ty].replace('P', '.');
    }
    
    try {
        game.objects = (game.levelData.objects || []).map(o => new WindableObject(o));
    } catch (e) {
        console.error('Error respawning objects:', e);
        game.objects = [];
    }
    
    // Create obstacles, using PhaseShiftObstacle for obstacles in phaseShiftObstacles array
    try {
        const phaseShiftIds = game.levelData.phaseShiftObstacles || [];
        game.autonomousObstacles = (game.levelData.autonomousObstacles || [])
            .map(a => {
                if (phaseShiftIds.includes(a.id)) {
                    return new PhaseShiftObstacle(a);
                }
                return new AutonomousObstacle(a);
            });
    } catch (e) {
        console.error('Error respawning obstacles:', e);
        game.autonomousObstacles = [];
    }
    
    game.gearTokens = (game.levelData.gearTokens || []).map(t => ({
        x: t.x, y: t.y, collected: false, angle: 0,
    }));
    game.gearsCollected = 0;
    if (game.liarCounter) game.liarCounter.reset();
    
    try {
        game.triggerTiles = (game.levelData.triggerTiles || []).map(t => new TriggerTile(t));
    } catch (e) {
        console.error('Error respawning trigger tiles:', e);
        game.triggerTiles = [];
    }
    
    try {
        game.fakeSafeZones = (game.levelData.fakeSafeZones || []).map(z => new FakeSafeZone(z));
    } catch (e) {
        console.error('Error respawning fake safe zones:', e);
        game.fakeSafeZones = [];
    }
    
    try {
        game.trollTokens = (game.levelData.trollTokens || []).map(t => new TrollToken(t));
    } catch (e) {
        console.error('Error respawning troll tokens:', e);
        game.trollTokens = [];
    }
    
    try {
        game.hiddenKillGears = (game.levelData.hiddenKillGears || []).map(g => new HiddenKillGear(g));
    } catch (e) {
        console.error('Error respawning hidden kill gears:', e);
        game.hiddenKillGears = [];
    }
    
    try {
        game.baitPaths = (game.levelData.baitPaths || []).map(b => new BaitPath(b));
    } catch (e) {
        console.error('Error respawning bait paths:', e);
        game.baitPaths = [];
    }
    
    try {
        game.oneFrameWindows = (game.levelData.oneFrameWindows || []).map(w => new OneFrameWindow(w));
    } catch (e) {
        console.error('Error respawning one frame windows:', e);
        game.oneFrameWindows = [];
    }
    
    try {
        game.proximityTriggers = (game.levelData.proximityTriggers || []).map(p => new ProximityTrigger(p));
    } catch (e) {
        console.error('Error respawning proximity triggers:', e);
        game.proximityTriggers = [];
    }
    
    try {
        game.almostMomentTrap = game.levelData.almostMomentTrap ? new AlmostMomentTrap(game.levelData.almostMomentTrap) : null;
    } catch (e) {
        console.error('Error respawning almost moment trap:', e);
        game.almostMomentTrap = null;
    }
    
    // Create mirror corridors and apply symmetry + phase offset to obstacles
    try {
        game.mirrorCorridors = (game.levelData.mirrorCorridors || []).map(config => {
            const corridor = new MirrorCorridor(config);
            const { obstacleA, obstacleB } = corridor.createObstacles();
            
            // Find and update obstacles in the autonomousObstacles array
            if (obstacleA.id) {
                const obsA = game.autonomousObstacles.find(o => o.id === obstacleA.id);
                if (obsA && obstacleA.initialTime !== undefined) {
                    obsA.time = obstacleA.initialTime;
                }
            }
            
            if (obstacleB.id) {
                const obsB = game.autonomousObstacles.find(o => o.id === obstacleB.id);
                if (obsB) {
                    // Apply symmetry and phase offset
                    Object.assign(obsB, obstacleB);
                    if (obstacleB.initialTime !== undefined) {
                        obsB.time = obstacleB.initialTime;
                    }
                }
            }
            
            return corridor;
        });
    } catch (e) {
        console.error('Error respawning mirror corridors:', e);
        game.mirrorCorridors = [];
    }
    
    // Load color betrayal zones
    try {
        game.colorBetrayalZones = (game.levelData.colorBetrayalZones || []).map(zone => ({
            x: zone.x,
            y: zone.y,
            w: zone.w,
            h: zone.h,
            color: zone.color,
            triggerObstacleId: zone.triggerObstacleId,
            oneShot: zone.oneShot,
            activated: false,
        }));
    } catch (e) {
        console.error('Error respawning color betrayal zones:', e);
        game.colorBetrayalZones = [];
    }
    
    // Synchronize obstacles for one frame windows
    try {
        for (const window of game.oneFrameWindows) {
            window.synchronizeObstacles(game.autonomousObstacles);
        }
    } catch (e) {
        console.error('Error synchronizing one frame windows on respawn:', e);
    }
    
    game.sequenceProgress = [];
    game.sequenceComplete = false;
    game.obstaclePauseTimer = 0;
    game.obstacleSpeedMult = 1;

    // ─── Checkpoint-aware respawn ───
    if (game.activeCheckpoint) {
        game.player = createPlayer(game.activeCheckpoint.x, game.activeCheckpoint.y);
        // Restore tokens collected before checkpoint
        for (let i = 0; i < game.gearTokens.length; i++) {
            if (game.checkpointTokensCollected.includes(i)) {
                game.gearTokens[i].collected = true;
            }
        }
        game.gearsCollected = game.checkpointTokensCollected.length;
    } else {
        game.player = createPlayer(game.lastSpawn.x, game.lastSpawn.y);
    }

    game.particles.length = 0;
    markRespawnNow(game.gameTime);
    updateCamera(true);
    
    // Reset phase shift obstacles to base speed
    resetPhaseShiftObstacles();

    // ─── Masocore respawn state ───
    // Save replay buffer as best if further than previous best
    const currentDistance = calculatePlayerDistance(game.player, game.lastSpawn);
    if (game.ghostReplay.frames.length > 0 && currentDistance > game.ghostReplay.bestDistance) {
        game.ghostReplay.bestFrames = game.ghostReplay.frames.slice();
        game.ghostReplay.bestDistance = currentDistance;
    }
    game.ghostReplay.frames = [];
    game.ghostReplay.currentIndex = 0;
    game.roomTime = 0;
    game.closeCallType = null;
    game.closeCallTimer = 0;
    game.secondWindActive = false;
    game.secondWindTimer = 0;

    // Re-add second wind obstacles (they get recreated with obstacle array)
    if (game.levelData.secondWindTrap) {
        game.secondWindObstacles = [];
        for (const swConfig of (Array.isArray(game.levelData.secondWindTrap) ? game.levelData.secondWindTrap : [game.levelData.secondWindTrap])) {
            // Use obstacleConfig sub-object if present, otherwise spread directly
            const obsData = swConfig.obstacleConfig || swConfig;
            const swObs = new AutonomousObstacle({
                ...obsData,
                isSecondWind: true,
                initiallyActive: false,
            });
            game.secondWindObstacles.push(swObs);
            game.autonomousObstacles.push(swObs);
        }
    }

    // Propagate mercy hints to obstacles based on death counts
    for (const obs of game.autonomousObstacles) {
        if (obs.id && shouldShowMercy(obs.id)) {
            obs.showMercyHint = true;
            if (obs.type === 'BOUNCING_BALL') obs.ghostTrailFrames = 6;
        }
    }

    // Offbeat mercy sync
    if (game.levelData.listeningRhythm && getLevelDeathCount() > OFFBEAT_MERCY_THRESHOLD) {
        syncMusicToObstacles();
    }
}

function resetPhaseShiftObstacles() {
    for (const obstacle of game.autonomousObstacles) {
        if (obstacle instanceof PhaseShiftObstacle) {
            obstacle.reset();
        }
    }
}

function calculatePlayerDistance(player, spawn) {
    // Calculate Manhattan distance from spawn point
    return Math.abs(player.x - spawn.x) + Math.abs(player.y - spawn.y);
}

function recordGhostFrame() {
    // Record current player state for ghost replay
    const frame = {
        x: game.player.x,
        y: game.player.y,
        animFrame: game.player.animFrame || 0,
        facing: game.player.facing || 1,
        anim: game.player.anim || 'idle',
    };
    
    // Add frame to buffer (circular buffer behavior)
    if (game.ghostReplay.frames.length < game.ghostReplay.maxFrames) {
        game.ghostReplay.frames.push(frame);
    } else {
        // Buffer full - shift and add (circular buffer)
        game.ghostReplay.frames.shift();
        game.ghostReplay.frames.push(frame);
    }
}

function updateGhostReplay() {
    // Record current frame
    recordGhostFrame();
    
    // Check if this is a new best attempt
    const currentDistance = calculatePlayerDistance(game.player, game.lastSpawn);
    if (currentDistance > game.ghostReplay.bestDistance) {
        game.ghostReplay.bestDistance = currentDistance;
        // Save current recording as best replay
        game.ghostReplay.bestFrames = game.ghostReplay.frames.slice();
    }
}

function updatePhaseShiftObstacles(deathCount) {
    for (const obstacle of game.autonomousObstacles) {
        if (obstacle instanceof PhaseShiftObstacle) {
            obstacle.updatePhaseShift(deathCount);
        }
    }
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
        try {
            if (game.transition.callback) game.transition.callback();
        } catch (e) {
            console.error('Transition callback error:', e);
        }
        game.transition.dir = -1;
    } else if (game.transition.dir < 0 && game.transition.alpha <= 0) {
        game.transition.alpha = 0;
        game.transition.active = false;
    }
}

function updateCamera(snap = false) {
    // Use inline fallbacks for constants (Wavedash service worker can corrupt module imports)
    const tileSize = (typeof TILE !== 'undefined') ? TILE : 16;
    const screenW = (typeof SCREEN_W !== 'undefined') ? SCREEN_W : 320;
    const screenH = (typeof SCREEN_H !== 'undefined') ? SCREEN_H : 240;
    
    const tilemapW = game.tiles[0].length * tileSize;
    const tilemapH = game.tiles.length * tileSize;
    const targetX = Math.max(0, Math.min(tilemapW - screenW, game.player.x - screenW / 2 + 4));
    const targetY = Math.max(0, Math.min(tilemapH - screenH, game.player.y - screenH / 2 + 6));
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
    // Extract killSource from context if present
    const killSource = ctxInfo.killSource || null;
    triggerDeath(game.player, game.particles, ctxInfo, game.gameTime, killSource);
    playGameOver();
    game.shake = 10;
    game.flash = 0;
}

function collectTokens() {
    const hit = getPlayerHitbox(game.player);
    
    // Collect regular gear tokens
    for (const t of game.gearTokens) {
        if (t.collected) continue;
        const tb = { x: t.x + 1, y: t.y + 1, w: 6, h: 6 };
        if (hit.x < tb.x + tb.w && hit.x + hit.w > tb.x &&
            hit.y < tb.y + tb.h && hit.y + hit.h > tb.y) {
            t.collected = true;
            game.gearsCollected++;
            // Update liar counter with actual count (no lie for regular tokens)
            game.liarCounter.setActualCount(game.gearsCollected);
            playTick();
            playWindUp(2.2);
            spawnSparks(game.particles, t.x + 4, t.y + 4, 8,
                [COLORS.SPARK_1, COLORS.GLOW_WARM, COLORS.METAL_LIGHT]);
            unlockNote(game.gearsCollected % 8);

            if (game.gearsCollected === game.gearTokens.length + game.trollTokens.length) {
                game.obstaclePauseTimer = 1.0;
                game.flash = 0.4;
                game.shake = 6;
                showMessage('ALL GEARS!', 1.2);
                
                // ─── Activate Second Wind Trap (Victory Troll) ───
                activateSecondWindTrap();
            }
        }
    }
    
    // Collect troll tokens
    for (const trollToken of game.trollTokens) {
        if (trollToken.collected) continue;
        
        if (trollToken.checkCollision(hit)) {
            const trapResult = trollToken.onCollect(game);
            game.gearsCollected++;
            // Trigger liar counter for troll tokens
            game.liarCounter.onTrollTokenCollect(game.gearsCollected);
            playTick();
            playWindUp(2.2);
            spawnSparks(game.particles, trollToken.x + 4, trollToken.y + 4, 8,
                [COLORS.SPARK_1, COLORS.GLOW_WARM, COLORS.METAL_LIGHT]);
            unlockNote(game.gearsCollected % 8);
            
            // Handle trap activation based on subtype
            if (trapResult) {
                handleTrollTokenTrap(trapResult);
            }

            if (game.gearsCollected === game.gearTokens.length + game.trollTokens.length) {
                game.obstaclePauseTimer = 1.0;
                game.flash = 0.4;
                game.shake = 6;
                showMessage('ALL GEARS!', 1.2);
                
                // ─── Activate Second Wind Trap (Victory Troll) ───
                activateSecondWindTrap();
            }
        }
    }
    
    // Check almost moment trap after token collection
    if (game.almostMomentTrap && !game.almostMomentTrap.activated) {
        const totalGears = game.gearTokens.length + game.trollTokens.length;
        if (game.almostMomentTrap.checkTrigger(game.gearsCollected, totalGears)) {
            game.almostMomentTrap.activate(game);
        }
    }
}

function checkCheckpointActivation() {
    const hit = getPlayerHitbox(game.player);
    
    for (const checkpoint of game.checkpoints) {
        if (checkpoint.activated) continue;
        
        // Checkpoint hitbox (12x12 brass clock)
        const cpHitbox = { x: checkpoint.x, y: checkpoint.y, w: 12, h: 12 };
        
        // Check if player overlaps checkpoint
        if (hit.x < cpHitbox.x + cpHitbox.w && hit.x + hit.w > cpHitbox.x &&
            hit.y < cpHitbox.y + cpHitbox.h && hit.y + hit.h > cpHitbox.y) {
            
            // Activate checkpoint
            checkpoint.activated = true;
            game.activeCheckpoint = checkpoint;
            
            // Save current token collection state
            game.checkpointTokensCollected = [];
            for (let i = 0; i < game.gearTokens.length; i++) {
                if (game.gearTokens[i].collected) {
                    game.checkpointTokensCollected.push(i);
                }
            }
            
            // Play activation sound and visual effect
            playCheckpointActivate();
            spawnSparks(game.particles, checkpoint.x + 6, checkpoint.y + 6, 12,
                [COLORS.SPARK_1, COLORS.GLOW_WARM, COLORS.METAL_LIGHT]);
            
            game.flash = 0.3;
            game.shake = 4;
            showMessage('CHECKPOINT ACTIVATED', 1.0);
        }
    }
}

/**
 * Activate Second Wind Trap (Victory Troll)
 * Triggers when all tokens are collected.
 * Spawns trap obstacles that fade in and disappear after 8 seconds.
 * Only activates once per level.
 */
function activateSecondWindTrap() {
    // Check if we have second wind obstacles configured
    if (!game.secondWindObstacles || game.secondWindObstacles.length === 0) {
        return;
    }
    
    // Check if already activated
    if (game.secondWindActive) {
        return;
    }
    
    // Mark as activated (prevents double activation)
    game.secondWindActive = true;
    
    // Play warning sound (220Hz triangle note, 0.5s decay)
    playSecondWindWarning();
    
    // Activate all second wind obstacles
    for (const swObstacle of game.secondWindObstacles) {
        // Set activation source for killSource tracking
        swObstacle.activationSource = 'second_wind';
        
        // Activate the obstacle (starts fade-in and timer)
        swObstacle.activateSecondWind();
    }
}

function handleTrollTokenTrap(trapResult) {
    try {
        switch (trapResult.type) {
            case 'ONE_WAY_PRISON':
                // Activate obstacles that block the return path
                for (const obstacleId of trapResult.obstacleIds) {
                    const obstacle = game.autonomousObstacles.find(a => a.id === obstacleId);
                    if (obstacle) {
                        // Set activation source for killSource tracking
                        obstacle.activationSource = 'troll_token';
                        if (obstacle.activate) {
                            obstacle.activate();
                        }
                    } else {
                        console.warn('TrollToken references non-existent obstacle:', obstacleId);
                    }
                }
                game.flash = 0.3;
                game.shake = 8;
                break;
            
            case 'RUSH_BAIT':
                // Increase obstacle speed in the area
                for (const obstacleId of trapResult.affectedObstacleIds) {
                    const obstacle = game.autonomousObstacles.find(a => a.id === obstacleId);
                    if (obstacle) {
                        // Set activation source for killSource tracking
                        obstacle.activationSource = 'troll_token';
                        obstacle.speedMult = (obstacle.speedMult || 1) * trapResult.speedMultiplier;
                    } else {
                        console.warn('TrollToken RUSH_BAIT references non-existent obstacle:', obstacleId);
                    }
                }
                game.flash = 0.3;
                game.shake = 8;
                break;
            
            case 'WIND_TRAP':
                // Spawn obstacles near the player
                for (const spawnConfig of trapResult.spawnConfigs) {
                    const spawnX = game.player.x + spawnConfig.offsetX;
                    const spawnY = game.player.y + spawnConfig.offsetY;
                    
                    // Create new obstacle based on spawn config
                    const newObstacle = new AutonomousObstacle({
                        type: spawnConfig.type,
                        x: spawnX,
                        y: spawnY,
                        ...spawnConfig,
                    });
                    
                    // Set activation source for killSource tracking
                    newObstacle.activationSource = 'troll_token';
                    
                    game.autonomousObstacles.push(newObstacle);
                }
                game.flash = 0.3;
                game.shake = 8;
                break;
        }
    } catch (e) {
        console.error('Error handling troll token trap:', e);
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

    // Track which obstacles are currently overlapping for coyote death system
    const currentlyOverlapping = new Set();

    for (const a of game.autonomousObstacles) {
        const b = a.getBounds();
        if (rectOverlapsBounds(hit, b)) {
            // Generate unique ID for this obstacle (use id if available, otherwise use object reference)
            const obstacleId = a.id || a;
            currentlyOverlapping.add(obstacleId);

            // Check coyote death forgiveness
            const withinForgiveness = checkCoyoteOverlap(obstacleId);
            
            if (!withinForgiveness) {
                // Exceeded coyote frames threshold - trigger death
                const killSource = a.activationSource || null;
                dieNow({ killSource });
                return true;
            }
        } else {
            // Not overlapping - reset coyote counter for this obstacle
            const obstacleId = a.id || a;
            resetCoyoteOverlap(obstacleId);
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

    // Check hidden kill gear collisions
    for (const gear of game.hiddenKillGears) {
        if (gear.isLethal && gear.checkCollision(hit)) {
            dieNow({ killSource: 'hidden_gear' });
            return true;
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

function handleCloseCall() {
    const hit = getPlayerHitbox(game.player);
    // Use inline values as fallback — Wavedash service worker can corrupt module imports
    const extremeDist = (typeof EXTREME_CLOSE_CALL_DISTANCE !== 'undefined') ? EXTREME_CLOSE_CALL_DISTANCE : 2;
    const closeDist = (typeof CLOSE_CALL_DISTANCE !== 'undefined') ? CLOSE_CALL_DISTANCE : 4;
    const extremeFrames = (typeof EXTREME_CLOSE_CALL_DISPLAY_FRAMES !== 'undefined') ? EXTREME_CLOSE_CALL_DISPLAY_FRAMES : 30;
    const closeFrames = (typeof CLOSE_CALL_DISPLAY_FRAMES !== 'undefined') ? CLOSE_CALL_DISPLAY_FRAMES : 20;
    
    for (const obstacle of game.autonomousObstacles) {
        const bounds = obstacle.getBounds();
        if (!bounds) continue;
        
        // Skip overlapping obstacles (those are deaths, not close calls)
        if (rectOverlapsBounds(hit, bounds)) {
            continue;
        }
        
        // Calculate edge-to-edge distance
        const distance = distanceToBounds(hit, bounds);
        
        // Detect extreme close call (distance <= 2px)
        if (distance > 0 && distance <= extremeDist) {
            // Only trigger once per obstacle per close call
            if (!obstacle._wasCloseCall) {
                game.closeCallType = 'extreme';
                game.closeCallTimer = extremeFrames;
                playExtremeCloseCall();
                // White flash effect
                game.flash = 0.15;
                obstacle._wasCloseCall = true;
            }
        }
        // Detect close call (2px < distance <= 4px)
        else if (distance > extremeDist && distance <= closeDist) {
            // Only trigger once per obstacle per close call
            if (!obstacle._wasCloseCall) {
                game.closeCallType = 'close';
                game.closeCallTimer = closeFrames;
                playCloseCall();
                obstacle._wasCloseCall = true;
            }
        }
        // Reset flag when distance is greater
        else if (distance > closeDist) {
            obstacle._wasCloseCall = false;
        }
    }
}

function handleHiddenGearProximity() {
    const playerPos = { x: game.player.x, y: game.player.y };
    let maxVolume = 0;
    
    // Find the loudest hum from all hidden kill gears
    for (const gear of game.hiddenKillGears) {
        const volume = gear.getHumVolume(playerPos);
        if (volume > maxVolume) {
            maxVolume = volume;
        }
    }
    
    // Set hum volume smoothly
    setHumVolume(maxVolume);
}

function update(dt) {
    game.tick++;
    game.gameTime += dt;
    game.messageTimer = Math.max(0, game.messageTimer - dt);
    game.flash = Math.max(0, game.flash - dt * 1.5);
    if (game.shake > 0) game.shake -= dt * 60;

    if (game.state === STATES.TITLE) {
        if (justPressed('SPACE') && !game.transition.active) {
            console.log('[GAME] Space pressed on title, starting transition...');
            initAudio(); resumeAudio(); startMusic();
            startTransition(1, () => {
                try {
                    console.log('[GAME] Transition callback executing...');
                    console.log('[GAME] State before transition:', game.state);
                    console.log('[GAME] Level before transition:', game.level);
                    
                    resetAllDeaths();
                    game.deathCount = 0;
                    game.level = 1;
                    
                    console.log('[GAME] Calling loadLevel(1)...');
                    loadLevel(1);
                    console.log('[GAME] loadLevel(1) completed successfully');
                    
                    resetLevelDeaths();
                    markRespawnNow(game.gameTime);
                    game.state = STATES.PLAYING;
                    
                    console.log('[GAME] State after transition:', game.state);
                    console.log('[GAME] Now in PLAYING state, level loaded.');
                } catch (e) {
                    console.error('[GAME] CRITICAL ERROR during state transition:', e);
                    console.error('[GAME] Error stack:', e.stack);
                    console.error('[GAME] State:', game.state);
                    console.error('[GAME] Level:', game.level);
                    console.error('[GAME] Level data:', game.levelData);
                    
                    // Display error on canvas for Wavedash debugging
                    game.state = STATES.TITLE; // Revert to title screen
                    game.message = 'LOAD ERROR - CHECK CONSOLE';
                    game.messageTimer = 10.0;
                    
                    // Try to render error message on canvas
                    try {
                        ctx.fillStyle = '#C84020';
                        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
                        ctx.fillStyle = '#F5E8C0';
                        ctx.font = '10px monospace';
                        ctx.fillText('LEVEL LOAD ERROR', 10, 20);
                        ctx.fillText('Check console for details', 10, 35);
                        ctx.fillText(String(e.message).substring(0, 40), 10, 50);
                    } catch (renderError) {
                        console.error('[GAME] Failed to render error message:', renderError);
                    }
                }
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
        if (justPressed('SKIP')) { levelClear(); return; }

        const ds = updateDeathState(dt);
        if (ds === 'freeze') { clearPressed(); return; }
        if (ds === 'respawn') {
            softRespawn();
            const newDeathCount = getDeathCount();
            game.deathCount = newDeathCount;
            updatePhaseShiftObstacles(newDeathCount);
            clearPressed();
            return;
        }
        if (ds === 'dying') { clearPressed(); return; }

        updateObstaclePause(dt);
        for (const a of game.autonomousObstacles) a.update(dt, game.roomTime);

        // ─── Update room time for pattern betrayal ───
        game.roomTime += dt;

        // ─── Update ghost replay ───
        updateGhostReplay();

        // ─── Update close-call timer ───
        if (game.closeCallTimer > 0) {
            game.closeCallTimer--;
            if (game.closeCallTimer <= 0) {
                game.closeCallType = null;
            }
        }

        // Update liar counter
        try {
            game.liarCounter.update(dt);
        } catch (e) {
            console.error('Error updating liar counter:', e);
        }

        // Update fake safe zones
        try {
            const playerPos = { x: game.player.x, y: game.player.y };
            for (const zone of game.fakeSafeZones) {
                const shouldActivate = zone.update(dt, playerPos);
                if (shouldActivate) {
                    // Activate obstacles associated with this zone
                    for (const obstacleId of zone.obstacleIds) {
                        const obstacle = game.autonomousObstacles.find(a => a.id === obstacleId);
                        if (obstacle) {
                            // Set activation source for killSource tracking
                            obstacle.activationSource = 'fake_safe_zone';
                            if (obstacle.activate) {
                                obstacle.activate();
                            }
                        } else {
                            console.warn('FakeSafeZone references non-existent obstacle:', obstacleId);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error updating fake safe zones:', e);
        }

        // Update proximity triggers
        try {
            const playerPos = { x: game.player.x, y: game.player.y };
            for (const trigger of game.proximityTriggers) {
                const justActivated = trigger.update(dt, playerPos);
                if (justActivated) {
                    // Find and activate the target trap
                    // This could be a hidden kill gear, fake safe zone, or other trap
                    // For now, we'll handle it generically by looking for the targetTrapId
                    // in various trap arrays
                    
                    // Check if it's a hidden kill gear
                    const hiddenGear = game.hiddenKillGears.find(g => g.id === trigger.targetTrapId);
                    if (hiddenGear) {
                        // Proximity trigger for hidden gear could increase hum volume or other effects
                        // For now, the proximity is handled by handleHiddenGearProximity
                    }
                    
                    // Check if it's an obstacle
                    const obstacle = game.autonomousObstacles.find(a => a.id === trigger.targetTrapId);
                    if (obstacle) {
                        obstacle.activationSource = 'proximity_trigger';
                        if (obstacle.activate) {
                            obstacle.activate();
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error updating proximity triggers:', e);
        }

        // Check color betrayal zones
        try {
            const playerHitbox = getPlayerHitbox(game.player);
            for (const zone of game.colorBetrayalZones) {
                // Skip if already activated and oneShot is true
                if (zone.activated && zone.oneShot) {
                    continue;
                }
                
                // Check if player enters the zone
                const inZone = playerHitbox.x < zone.x + zone.w && 
                               playerHitbox.x + playerHitbox.w > zone.x &&
                               playerHitbox.y < zone.y + zone.h && 
                               playerHitbox.y + playerHitbox.h > zone.y;
                
                if (inZone && !zone.activated) {
                    // Activate the linked obstacle
                    const obstacle = game.autonomousObstacles.find(a => a.id === zone.triggerObstacleId);
                    if (obstacle) {
                        // Set activation source for killSource tracking
                        obstacle.activationSource = 'color_betrayal';
                        if (obstacle.activate) {
                            obstacle.activate();
                        }
                        // Mark zone as activated
                        zone.activated = true;
                        // Visual/audio feedback
                        game.flash = 0.2;
                        game.shake = 4;
                    } else {
                        console.warn('ColorBetrayalZone references non-existent obstacle:', zone.triggerObstacleId);
                    }
                }
            }
        } catch (e) {
            console.error('Error checking color betrayal zones:', e);
        }

        for (const t of game.gearTokens) {
            if (!t.collected) t.angle += (6 * Math.PI / 180);
        }
        
        for (const trollToken of game.trollTokens) {
            if (!trollToken.collected) trollToken.angle += (6 * Math.PI / 180);
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

        // Check trigger tile collisions
        try {
            const playerHitbox = getPlayerHitbox(game.player);
            for (const trigger of game.triggerTiles) {
                if (trigger.checkCollision(playerHitbox)) {
                    if (!trigger.activated || !trigger.oneShot) {
                        trigger.activate(game);
                        // Find and activate the target obstacle by targetObstacleId
                        const obstacle = game.autonomousObstacles.find(a => a.id === trigger.targetObstacleId);
                        if (obstacle) {
                            // Set activation source for killSource tracking
                            obstacle.activationSource = 'trigger_tile';
                            if (obstacle.activate) {
                                obstacle.activate();
                            }
                        } else {
                            console.warn('TriggerTile references non-existent obstacle:', trigger.targetObstacleId);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error checking trigger tile collisions:', e);
        }

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
        checkCheckpointActivation();
        handleNearMisses();
        handleCloseCall(); // Check for close calls
        
        try {
            handleHiddenGearProximity();
        } catch (e) {
            console.error('Error handling hidden gear proximity:', e);
        }

        const gate = game.levelData.goalTrigger;
        const allGears = game.gearsCollected === game.gearTokens.length + game.trollTokens.length;
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
        for (const a of game.autonomousObstacles) a.update(dt, game.roomTime);

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

    // Draw color betrayal zones (visual troll - looks like safe exit)
    for (const zone of game.colorBetrayalZones || []) {
        if (!zone.activated) {
            drawColorBetrayalTile(ctx, zone, camX, camY);
        }
    }

    if (game.levelData.goalTrigger) {
        drawLockedDoor(ctx, game.levelData.goalTrigger, camX, camY, game.tick,
            game.gearsCollected === game.gearTokens.length);
    }

    for (const a of game.autonomousObstacles) a.draw(ctx, camX, camY, game.tick);

    // ─── Draw mercy hints for obstacles that have killed player 5+ times ───
    drawMercyHints(ctx, game.autonomousObstacles, { getObstacleDeathCount }, camX, camY, game.tick);

    for (const o of game.objects) o.draw(ctx, camX, camY, game.tick);

    for (const t of game.gearTokens) drawGearToken(ctx, t, camX, camY, game.tick);
    
    // Draw troll tokens (they look identical to regular tokens)
    for (const trollToken of game.trollTokens) {
        if (!trollToken.collected) {
            const tokenData = { x: trollToken.x, y: trollToken.y, angle: trollToken.angle, collected: false };
            drawGearToken(ctx, tokenData, camX, camY, game.tick);
        }
    }

    // Draw checkpoints
    for (const checkpoint of game.checkpoints) {
        drawCheckpoint(ctx, checkpoint, camX, camY, game.tick);
    }

    // ─── Draw ghost Mira (behind live Mira) ───
    if (getLevelDeathCount() >= 3 && game.ghostReplay.bestFrames.length > 0) {
        const ghostFrame = game.ghostReplay.bestFrames[game.ghostReplay.currentIndex];
        if (ghostFrame) {
            drawGhostMira(ctx, ghostFrame, camX, camY);
            // Advance ghost replay index (circular playback)
            game.ghostReplay.currentIndex = (game.ghostReplay.currentIndex + 1) % game.ghostReplay.bestFrames.length;
        }
    }

    if (!isDying() || isFreezing()) drawPlayer(ctx, game.player, camX, camY);

    // ─── Draw close-call indicator ───
    if (game.closeCallTimer > 0 && game.closeCallType) {
        drawCloseCallIndicator(ctx, game.player, camX, camY, game.closeCallType, game.closeCallTimer);
    }

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

let _lastDrawError = null;

function draw() {
    try {
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
        _lastDrawError = null;
    } catch (e) {
        // Show error visually on canvas so it's diagnosable on Wavedash
        if (_lastDrawError !== e.message) {
            console.error('[DRAW ERROR]', e);
            _lastDrawError = e.message;
        }
        ctx.fillStyle = '#1C1209';
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
        ctx.fillStyle = '#C84020';
        ctx.font = '10px monospace';
        ctx.fillText('RENDER ERROR:', 10, 20);
        ctx.fillStyle = '#F5E8C0';
        ctx.font = '8px monospace';
        const msg = String(e.message || e).substring(0, 50);
        ctx.fillText(msg, 10, 35);
        ctx.fillText('State: ' + game.state, 10, 50);
        ctx.fillText('Level: ' + game.level, 10, 65);
        ctx.fillText('Tiles: ' + (game.tiles ? game.tiles.length : 'null'), 10, 80);
    }
}

let lastTime = 0;
function loop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, DT_CAP);
    lastTime = timestamp;
    updateTransition(dt);
    try {
        update(dt);
    } catch (e) {
        console.error('[UPDATE ERROR]', e);
    }
    draw();
    requestAnimationFrame(loop);
}

initInput();
window.addEventListener('pointerdown', () => { initAudio(); resumeAudio(); }, { once: true });
requestAnimationFrame((t) => { lastTime = t; loop(t); });
