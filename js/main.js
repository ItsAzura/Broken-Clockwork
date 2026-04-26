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
  SCREEN_W,
  SCREEN_H,
  TILE,
  DT_CAP,
  COLORS,
  STATES,
  OBJ,
  WIND_RANGE,
  GAUGE_DRAIN_PER_WIND,
  PLAYER_W,
  PLAYER_H,
  NEAR_MISS_DISTANCE,
  LEVEL_CLEAR_HOLD,
  LEVEL_CLEAR_PARTICLES,
  GHOST_REPLAY_CAP,
  MERCY_HINT_THRESHOLD,
  CLOSE_CALL_DISPLAY_FRAMES,
  EXTREME_CLOSE_CALL_DISPLAY_FRAMES,
  CLOSE_CALL_DISTANCE,
  EXTREME_CLOSE_CALL_DISTANCE,
  OFFBEAT_MERCY_THRESHOLD,
  SECOND_WIND_DURATION,
} from './constants.js';
import {
  drawPixelRect,
  drawPixelText,
  drawTile,
  spawnSparks,
  updateAndDrawParticles,
  measurePixelText,
  updatePlayerTrail,
  drawPlayerTrail,
  spawnDustParticles,
  spawnCollisionSparks,
  drawExitDoorGlow,
  drawLethalZone,
  setAccessibilitySystem,
  drawTouchControls,
} from './draw.js';
import {
  initAudio,
  resumeAudio,
  playWindUp,
  playFreeze,
  playGaugeLow,
  playRefill,
  playLevelClear,
  playGameOver,
  playJump,
  playTick,
  startMusic,
  stopMusic,
  unlockNote,
  resetNotes,
  unlockAllNotes,
  setHumVolume,
  playCloseCall,
  playExtremeCloseCall,
  playSecondWindWarning,
  playCheckpointActivate,
  setOffbeatMode,
  syncMusicToObstacles,
  resetMusicInterval,
  updateMusicIntensity,
  updateMusicTransition,
  playVictoryFanfare,
  playTrapDeath,
  startAmbientSounds,
  stopAmbientSounds,
  setMusicVolume,
  setSFXVolume,
  getMusicVolume,
  getSFXVolume,
} from './audio.js';
import { LEVELS, getLevel, validateLevelTraps } from './levels.js';
import { WindableObject } from './WindableObject.js';
import {
  AutonomousObstacle,
  rectOverlapsBounds,
  distanceToBounds,
} from './AutonomousObstacle.js';
import {
  createPlayer,
  updatePlayer,
  drawPlayer,
  startWindUp,
  cancelWindUp,
  tickWindUp,
  applyWindCost,
  getPlayerHitbox,
  nearMissCheck,
  closeCallCheck,
} from './player.js';
import { updatePlayerPhysics, findNearestWindable } from './physics.js';
import { initInput, isHeld, justPressed, clearPressed, isTouchActive, TOUCH_BUTTONS } from './input.js';
import {
  drawHUD,
  drawTitle,
  drawLevelClear,
  drawGameOver,
  drawPaused,
  drawWindPrompt,
  drawTransition,
  drawFlashOverlay,
  drawGearToken,
  drawLockedDoor,
  drawGhostMira,
  drawCloseCallIndicator,
  drawCheckpoint,
  drawColorBetrayalTile,
  drawMercyHints,
  drawProgressTracker,
  drawGhostAheadBehindIndicator,
  drawSpeedrunTimer,
  drawSpeedrunSplit,
  drawSpeedrunGhost,
  drawLeaderboard,
  drawHeatmapScreen,
  drawDailyChallengeMenu,
  drawDailyChallengeStart,
  drawDailyChallengeComplete,
  drawDailyChallengeFailed,
  drawDailyChallengeHUD,
  drawLevelEditor,
  drawLoading,
  drawOnboardingWelcome,
  drawOnboardingDifficulty,
  drawOnboardingComplete,
  getTitleMenuInteraction,
  getPauseMenuInteraction,
  getOnboardingDifficultyInteraction,
  getDailyChallengeInteraction,
} from './ui.js';
import { leaderboardSystem } from './leaderboardSystem.js';
import { deathHeatmap } from './deathHeatmap.js';
import { dailyChallengeSystem } from './dailyChallengeSystem.js';
import { settingsMenu } from './settingsMenu.js';
import {
  deathState,
  resetAllDeaths,
  resetLevelDeaths,
  markRespawnNow,
  triggerDeath,
  updateDeathState,
  drawDeathFlash,
  drawTauntMessage,
  getDeathCount,
  getLevelDeathCount,
  isDying,
  isFreezing,
  checkCoyoteOverlap,
  resetCoyoteOverlap,
  recordObstacleDeath,
  shouldShowMercy,
  getObstacleDeathCount,
} from './deathSystem.js';
import {
  TriggerTile,
  FakeSafeZone,
  TrollToken,
  HiddenKillGear,
  BaitPath,
  OneFrameWindow,
  PhaseShiftObstacle,
  AlmostMomentTrap,
  MirrorCorridor,
  ProximityTrigger,
} from './trapSystem.js';
import { LiarCounter } from './liarCounter.js';
import { progressTracker } from './progressTracker.js';
import { speedrunSystem } from './speedrunSystem.js';
import { saveSystem } from './saveSystem.js';
import { LevelEditor } from './levelEditor.js';
import { accessibilitySystem } from './accessibilitySystem.js';
import { applyRemappedControls } from './input.js';
import { analyticsSystem } from './analyticsSystem.js';
import { metricsSystem } from './metricsSystem.js';
import { onboardingSystem } from './onboardingSystem.js';
import { performanceMonitor } from './performanceSystem.js';
import { difficultySystem } from './difficultySystem.js';

// Wavedash SDK will be initialized after game systems are ready
// This prevents blocking the initial load

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ─── YouTube Playables SDK Initialization ───
let ytGame = null;
try {
  if (typeof window.ytgame !== 'undefined') {
    ytGame = window.ytgame;
    console.log('[YouTube SDK] SDK reference acquired');
  }
} catch (e) {
  console.warn('[YouTube SDK] SDK initialization failed or not available:', e);
}

// Ensure focus for iframe environments (Wavedash)
canvas.focus();
document.addEventListener('click', () => {
  canvas.focus();
  window.focus();
});
document.addEventListener('pointerdown', () => {
  canvas.focus();
  window.focus();
});

function fitCanvas() {
  const scaleX = window.innerWidth / SCREEN_W;
  const scaleY = window.innerHeight / SCREEN_H;
  const SCALE = Math.min(scaleX, scaleY);
  
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  
  // Use fractional scaling for CSS dimensions to fill viewport as much as possible
  // while maintaining aspect ratio (Requirement 4 in Analysis)
  canvas.style.width = (SCREEN_W * SCALE) + 'px';
  canvas.style.height = (SCREEN_H * SCALE) + 'px';
  
  // Ensure the canvas stays centered
  canvas.style.position = 'absolute';
  canvas.style.left = '50%';
  canvas.style.top = '50%';
  canvas.style.transform = 'translate(-50%, -50%)';
  
  canvas.style.imageRendering = 'pixelated';
  canvas.style.touchAction = 'none'; // Critical for mobile to prevent browser handling of touches
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();
canvas.addEventListener('pointermove', handlePointerMove);
canvas.addEventListener('pointerleave', handlePointerLeave);
canvas.addEventListener('pointerdown', handlePointerClick); // Use pointerdown for instant response on mobile

// Add direct touch event listeners for better mobile compatibility
// Use capture phase to ensure these run before input.js handlers
// This allows menu interactions to work properly before virtual button processing
canvas.addEventListener('touchstart', handleTouchClick, { passive: false, capture: true });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });

const game = {
  state: STATES.LOADING,
  loadingTick: 0,
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
    aheadBehindStatus: 'even', // 'ahead', 'behind', or 'even'
  },
  closeCallType: null,
  closeCallTimer: 0,
  slowMotionTimer: 0,
  slowMotionFactor: 1.0,
  secondWindActive: false,
  secondWindTimer: 0,
  secondWindObstacles: [],
  checkpoints: [],
  activeCheckpoint: null,
  checkpointTokensCollected: [],
  progressTracker: progressTracker,
  // ─── Leaderboard UI state ───
  leaderboardFilter: 'deaths', // 'deaths', 'time', or 'completion'
  // ─── Heatmap UI state ───
  heatmapTimer: 0,
  // ─── Daily Challenge state (Requirement 9) ───
  dailyChallenge: {
    active: false, // true when playing a daily challenge
    completionDeaths: 0, // deaths recorded at challenge completion
    isNewBest: false, // whether this run was a new best score
    reverseControls: false, // true when reverse_controls modifier is active
  },
  titleMenuSelection: 0,
  titlePointerRegion: null,
  // ─── Level Editor state (Requirement 10) ───
  levelEditor: null,
  levelEditorPlaytestData: null, // Store level data when playtesting
  // ─── Pause menu state ───
  pauseKeyReleased: false, // Guard flag: prevents instant unpause when opening menu
  pauseMenuSelection: 0, // Currently selected pause menu option (0 = RESUME)
  stateCooldown: 0, // Cooldown timer to prevent rapid state transitions
  lastStateChangeFrame: 0, // Frame counter for transition guard
  returnStateFromSettings: null, // State to return to after closing settings
};

// Initialize window.gameState immediately for touch input system
window.gameState = game.state;

// ─── Load speedrun data from save system (Requirement 6.7) ───
try {
  const speedrunData = saveSystem.getSpeedrunData();
  if (speedrunData) {
    speedrunSystem.fromJSON(speedrunData);
    console.log('[SpeedrunSystem] Loaded speedrun data from save');
  }
} catch (error) {
  console.error('[SpeedrunSystem] Failed to load speedrun data:', error);
}

// ─── Perform periodic cleanup on game load (Requirement 16) ───
// Removes analytics data older than 30 days and monitors storage usage
try {
  saveSystem.performPeriodicCleanup();
} catch (error) {
  console.error('[SaveSystem] Periodic cleanup failed:', error);
}

// ─── Initialize leaderboard system (Requirement 7.5) ───
try {
  leaderboardSystem.init();
  console.log('[LeaderboardSystem] Initialized from save data');
} catch (error) {
  console.error('[LeaderboardSystem] Failed to initialize:', error);
}

// ─── Initialize accessibility system (Requirement 13) ───
try {
  accessibilitySystem.init();
  console.log('[AccessibilitySystem] Initialized from save data');

  // Set accessibility system reference in draw.js for reduce motion checks
  setAccessibilitySystem(accessibilitySystem);

  // Apply remapped controls to input system (Requirement 13.5, 13.7)
  const remappedControls = accessibilitySystem.getAllRemappedControls();
  if (Object.keys(remappedControls).length > 0) {
    applyRemappedControls(remappedControls);
  }
} catch (error) {
  console.error('[AccessibilitySystem] Failed to initialize:', error);
}

// ─── Initialize onboarding system and check first-time player (Requirement 19.1) ───
try {
  const isFirstTime = onboardingSystem.checkFirstTimePlayer();
  console.log('[OnboardingSystem] First-time player check:', isFirstTime);
} catch (error) {
  console.error('[OnboardingSystem] Failed to check first-time player:', error);
}

function loadLevel(idx) {
  // ─── Defensive module import checks ───
  console.log('[LOAD_LEVEL] Starting level load, index:', idx);
  console.log(
    '[LOAD_LEVEL] Environment check - WavedashJS:',
    typeof window.WavedashJS !== 'undefined' ? 'present' : 'not present',
  );

  // ─── Track level attempt (Requirement 14.2) ───
  analyticsSystem.trackLevelAttempt(idx);

  // Check critical imports from levels.js
  if (typeof LEVELS === 'undefined') {
    console.error(
      '[LOAD_LEVEL] CRITICAL: LEVELS array is undefined - levels.js may have failed to load',
    );
  }
  if (typeof getLevel === 'undefined') {
    console.error(
      '[LOAD_LEVEL] CRITICAL: getLevel function is undefined - levels.js may have failed to load',
    );
    throw new Error('getLevel function is undefined - cannot load level');
  }

  // Check critical constants from constants.js
  if (typeof STATES === 'undefined') {
    console.error(
      '[LOAD_LEVEL] CRITICAL: STATES is undefined - constants.js may have failed to load',
    );
  }
  if (typeof TILE === 'undefined') {
    console.error(
      '[LOAD_LEVEL] CRITICAL: TILE is undefined - constants.js may have failed to load',
    );
  }
  if (typeof OBJ === 'undefined') {
    console.error(
      '[LOAD_LEVEL] CRITICAL: OBJ is undefined - constants.js may have failed to load',
    );
  }

  console.log('[LOAD_LEVEL] Module checks passed, calling getLevel...');
  const data = getLevel(idx);
  console.log('[LOAD_LEVEL] Level data retrieved:', data ? 'success' : 'null');
  game.levelData = data;

  // Validate level trap configuration
  const validation = validateLevelTraps(data);
  if (!validation.valid) {
    console.warn(`Level ${data.id} trap validation warnings:`);
    validation.warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }

  game.tiles = data.tilemap.slice();

  try {
    game.objects = (data.objects || []).map((o) => new WindableObject(o));
  } catch (e) {
    console.error('Error loading objects:', e);
    game.objects = [];
  }

  // Create obstacles, using PhaseShiftObstacle for obstacles in phaseShiftObstacles array
  try {
    const phaseShiftIds = data.phaseShiftObstacles || [];
    game.autonomousObstacles = (data.autonomousObstacles || []).map((a) => {
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

  game.gearTokens = (data.gearTokens || []).map((t) => ({
    x: t.x,
    y: t.y,
    collected: false,
    angle: 0,
  }));
  game.gearsCollected = 0;
  if (game.liarCounter) game.liarCounter.reset();

  // Initialize trap systems with error handling
  try {
    game.triggerTiles = (data.triggerTiles || []).map((t) => {
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
    game.fakeSafeZones = (data.fakeSafeZones || []).map((z) => {
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
    game.trollTokens = (data.trollTokens || []).map((t) => {
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
    game.hiddenKillGears = (data.hiddenKillGears || []).map(
      (g) => new HiddenKillGear(g),
    );
  } catch (e) {
    console.error('Error loading hidden kill gears:', e);
    game.hiddenKillGears = [];
  }

  try {
    game.baitPaths = (data.baitPaths || []).map((b) => new BaitPath(b));
  } catch (e) {
    console.error('Error loading bait paths:', e);
    game.baitPaths = [];
  }

  try {
    game.oneFrameWindows = (data.oneFrameWindows || []).map(
      (w) => new OneFrameWindow(w),
    );
  } catch (e) {
    console.error('Error loading one frame windows:', e);
    game.oneFrameWindows = [];
  }

  try {
    game.proximityTriggers = (data.proximityTriggers || []).map(
      (p) => new ProximityTrigger(p),
    );
  } catch (e) {
    console.error('Error loading proximity triggers:', e);
    game.proximityTriggers = [];
  }

  try {
    game.almostMomentTrap = data.almostMomentTrap
      ? new AlmostMomentTrap(data.almostMomentTrap)
      : null;
    if (
      game.almostMomentTrap &&
      (!game.almostMomentTrap.obstacleIds ||
        game.almostMomentTrap.obstacleIds.length === 0)
    ) {
      console.warn('AlmostMomentTrap missing obstacleIds');
    }
  } catch (e) {
    console.error('Error loading almost moment trap:', e);
    game.almostMomentTrap = null;
  }

  // Create mirror corridors and apply symmetry + phase offset to obstacles
  try {
    game.mirrorCorridors = (data.mirrorCorridors || []).map((config) => {
      const corridor = new MirrorCorridor(config);
      const { obstacleA, obstacleB } = corridor.createObstacles();

      // Find and update obstacles in the autonomousObstacles array
      if (obstacleA.id) {
        const obsA = game.autonomousObstacles.find(
          (o) => o.id === obstacleA.id,
        );
        if (obsA && obstacleA.initialTime !== undefined) {
          obsA.time = obstacleA.initialTime;
        } else if (obstacleA.id && !obsA) {
          console.warn(
            'MirrorCorridor references non-existent obstacle:',
            obstacleA.id,
          );
        }
      }

      if (obstacleB.id) {
        const obsB = game.autonomousObstacles.find(
          (o) => o.id === obstacleB.id,
        );
        if (obsB) {
          // Apply symmetry and phase offset
          Object.assign(obsB, obstacleB);
          if (obstacleB.initialTime !== undefined) {
            obsB.time = obstacleB.initialTime;
          }
        } else {
          console.warn(
            'MirrorCorridor references non-existent obstacle:',
            obstacleB.id,
          );
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
    game.colorBetrayalZones = (data.colorBetrayalZones || []).map((zone) => ({
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
    const tileSize = typeof TILE !== 'undefined' ? TILE : 16;
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
  game.camera.x = 0;
  game.camera.y = 0;
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
    aheadBehindStatus: 'even', // 'ahead', 'behind', or 'even'
  };
  game.closeCallType = null;
  game.closeCallTimer = 0;
  game.secondWindActive = false;
  game.secondWindTimer = 0;

  // Checkpoints from level data
  game.checkpoints = (data.checkpoints || []).map((cp) => ({
    x: cp.x,
    y: cp.y,
    activated: false,
  }));
  game.activeCheckpoint = null;
  game.checkpointTokensCollected = [];

  // Second Wind trap obstacles
  game.secondWindObstacles = [];
  if (data.secondWindTrap) {
    for (const swConfig of Array.isArray(data.secondWindTrap)
      ? data.secondWindTrap
      : [data.secondWindTrap]) {
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

  // ─── Reset progress tracker for new level ───
  if (game.progressTracker) {
    game.progressTracker.reset();
  }

  // ─── Initialize death heatmap for new level (Requirement 8.1) ───
  deathHeatmap.startLevel(idx);
}

function softRespawn() {
  for (let ty = 0; ty < game.levelData.tilemap.length; ty++) {
    game.tiles[ty] = game.levelData.tilemap[ty].replace('P', '.');
  }

  try {
    game.objects = (game.levelData.objects || []).map(
      (o) => new WindableObject(o),
    );
  } catch (e) {
    console.error('Error respawning objects:', e);
    game.objects = [];
  }

  // Create obstacles, using PhaseShiftObstacle for obstacles in phaseShiftObstacles array
  try {
    const phaseShiftIds = game.levelData.phaseShiftObstacles || [];
    game.autonomousObstacles = (game.levelData.autonomousObstacles || []).map(
      (a) => {
        if (phaseShiftIds.includes(a.id)) {
          return new PhaseShiftObstacle(a);
        }
        return new AutonomousObstacle(a);
      },
    );
  } catch (e) {
    console.error('Error respawning obstacles:', e);
    game.autonomousObstacles = [];
  }

  game.gearTokens = (game.levelData.gearTokens || []).map((t) => ({
    x: t.x,
    y: t.y,
    collected: false,
    angle: 0,
  }));
  game.gearsCollected = 0;
  if (game.liarCounter) game.liarCounter.reset();

  try {
    game.triggerTiles = (game.levelData.triggerTiles || []).map(
      (t) => new TriggerTile(t),
    );
  } catch (e) {
    console.error('Error respawning trigger tiles:', e);
    game.triggerTiles = [];
  }

  try {
    game.fakeSafeZones = (game.levelData.fakeSafeZones || []).map(
      (z) => new FakeSafeZone(z),
    );
  } catch (e) {
    console.error('Error respawning fake safe zones:', e);
    game.fakeSafeZones = [];
  }

  try {
    game.trollTokens = (game.levelData.trollTokens || []).map(
      (t) => new TrollToken(t),
    );
  } catch (e) {
    console.error('Error respawning troll tokens:', e);
    game.trollTokens = [];
  }

  try {
    game.hiddenKillGears = (game.levelData.hiddenKillGears || []).map(
      (g) => new HiddenKillGear(g),
    );
  } catch (e) {
    console.error('Error respawning hidden kill gears:', e);
    game.hiddenKillGears = [];
  }

  try {
    game.baitPaths = (game.levelData.baitPaths || []).map(
      (b) => new BaitPath(b),
    );
  } catch (e) {
    console.error('Error respawning bait paths:', e);
    game.baitPaths = [];
  }

  try {
    game.oneFrameWindows = (game.levelData.oneFrameWindows || []).map(
      (w) => new OneFrameWindow(w),
    );
  } catch (e) {
    console.error('Error respawning one frame windows:', e);
    game.oneFrameWindows = [];
  }

  try {
    game.proximityTriggers = (game.levelData.proximityTriggers || []).map(
      (p) => new ProximityTrigger(p),
    );
  } catch (e) {
    console.error('Error respawning proximity triggers:', e);
    game.proximityTriggers = [];
  }

  try {
    game.almostMomentTrap = game.levelData.almostMomentTrap
      ? new AlmostMomentTrap(game.levelData.almostMomentTrap)
      : null;
  } catch (e) {
    console.error('Error respawning almost moment trap:', e);
    game.almostMomentTrap = null;
  }

  // Create mirror corridors and apply symmetry + phase offset to obstacles
  try {
    game.mirrorCorridors = (game.levelData.mirrorCorridors || []).map(
      (config) => {
        const corridor = new MirrorCorridor(config);
        const { obstacleA, obstacleB } = corridor.createObstacles();

        // Find and update obstacles in the autonomousObstacles array
        if (obstacleA.id) {
          const obsA = game.autonomousObstacles.find(
            (o) => o.id === obstacleA.id,
          );
          if (obsA && obstacleA.initialTime !== undefined) {
            obsA.time = obstacleA.initialTime;
          }
        }

        if (obstacleB.id) {
          const obsB = game.autonomousObstacles.find(
            (o) => o.id === obstacleB.id,
          );
          if (obsB) {
            // Apply symmetry and phase offset
            Object.assign(obsB, obstacleB);
            if (obstacleB.initialTime !== undefined) {
              obsB.time = obstacleB.initialTime;
            }
          }
        }

        return corridor;
      },
    );
  } catch (e) {
    console.error('Error respawning mirror corridors:', e);
    game.mirrorCorridors = [];
  }

  // Load color betrayal zones
  try {
    game.colorBetrayalZones = (game.levelData.colorBetrayalZones || []).map(
      (zone) => ({
        x: zone.x,
        y: zone.y,
        w: zone.w,
        h: zone.h,
        color: zone.color,
        triggerObstacleId: zone.triggerObstacleId,
        oneShot: zone.oneShot,
        activated: false,
      }),
    );
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
    game.player = createPlayer(
      game.activeCheckpoint.x,
      game.activeCheckpoint.y,
    );
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
  if (
    game.ghostReplay.frames.length > 0 &&
    currentDistance > game.ghostReplay.bestDistance
  ) {
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
    for (const swConfig of Array.isArray(game.levelData.secondWindTrap)
      ? game.levelData.secondWindTrap
      : [game.levelData.secondWindTrap]) {
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
  if (
    game.levelData.listeningRhythm &&
    getLevelDeathCount() > OFFBEAT_MERCY_THRESHOLD
  ) {
    syncMusicToObstacles();
  }

  // ─── Reset progress tracker on respawn ───
  if (game.progressTracker) {
    // Don't reset personal bests, just reset current state
    game.progressTracker.currentDistance = 0;
    game.progressTracker.isNewBest = false;
    game.progressTracker.newBestTimer = 0;
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
  return; // DISABLED as per user request
  const ghostReplayEnabled = game.difficultyFeatures
    ? game.difficultyFeatures.ghostReplayEnabled
    : true;
  if (!ghostReplayEnabled) return;

  // Record current frame
  recordGhostFrame();

  // Check if this is a new best attempt
  const currentDistance = calculatePlayerDistance(game.player, game.lastSpawn);
  if (currentDistance > game.ghostReplay.bestDistance) {
    game.ghostReplay.bestDistance = currentDistance;
    // Save current recording as best replay
    game.ghostReplay.bestFrames = game.ghostReplay.frames.slice();
  }

  // Calculate ahead/behind status (Requirement 5.2, 5.5)
  if (
    game.ghostReplay.bestFrames.length > 0 &&
    game.ghostReplay.currentIndex < game.ghostReplay.bestFrames.length
  ) {
    const ghostFrame =
      game.ghostReplay.bestFrames[game.ghostReplay.currentIndex];
    if (ghostFrame) {
      const liveDistance = calculatePlayerDistance(game.player, game.lastSpawn);
      const ghostDistance = calculatePlayerDistance(ghostFrame, game.lastSpawn);

      // Update ahead/behind status every 10 frames (Requirement 5.6)
      if (game.tick % 10 === 0) {
        if (liveDistance > ghostDistance) {
          game.ghostReplay.aheadBehindStatus = 'ahead';
        } else if (liveDistance < ghostDistance) {
          game.ghostReplay.aheadBehindStatus = 'behind';
        } else {
          game.ghostReplay.aheadBehindStatus = 'even';
        }
      }
    }
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
  // 0.3s animation timing for all transitions (Requirement 17.8)
  const speed = 3.33; // 1/0.3s ≈ 3.33 to complete in ~0.3 seconds
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

const TITLE_MENU_OPTIONS = Object.freeze({
  START: 0,
  SETTINGS: 1,
  COUNT: 2,
});

function getTitleUIState() {
  return {
    selectedOption: game.titleMenuSelection || 0,
    isFirstTimePlayer:
      onboardingSystem.isFirstTimePlayer && !onboardingSystem.isCompleted(),
    speedrunEnabled: speedrunSystem.isEnabled(),
    hoverRegion: game.titlePointerRegion,
  };
}

function getCanvasPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    x: ((event.clientX - rect.left) / rect.width) * SCREEN_W,
    y: ((event.clientY - rect.top) / rect.height) * SCREEN_H,
  };
}

function setCanvasCursor(cursor) {
  if (canvas.style.cursor !== cursor) {
    canvas.style.cursor = cursor;
  }
}

function syncCanvasCursor() {
  if (game.state === STATES.TITLE) {
    setCanvasCursor(game.titlePointerRegion ? 'pointer' : 'default');
    return;
  }
  if (
    game.state === STATES.PLAYING ||
    game.state === STATES.LEVEL_EDITOR_PLAYTEST
  ) {
    setCanvasCursor('crosshair');
    return;
  }
  setCanvasCursor('default');
}

function openTitleSettings() {
  game.titleMenuSelection = TITLE_MENU_OPTIONS.SETTINGS;
  game.titlePointerRegion = null;
  settingsMenu.open();
  game.returnStateFromSettings = STATES.TITLE;
  game.state = STATES.SETTINGS;
}

function openTitleDailyChallenge() {
  game.titleMenuSelection = TITLE_MENU_OPTIONS.DAILY_CHALLENGE;
  game.titlePointerRegion = null;
  game.state = STATES.DAILY_CHALLENGE_MENU;
}

function openTitleLevelEditor() {
  game.titleMenuSelection = TITLE_MENU_OPTIONS.LEVEL_EDITOR;
  game.titlePointerRegion = null;
  if (!game.levelEditor) {
    game.levelEditor = new LevelEditor();
  }
  game.state = STATES.LEVEL_EDITOR;
}

function startTitleGame(skipOnboarding = false) {
  game.titleMenuSelection = TITLE_MENU_OPTIONS.START;
  game.titlePointerRegion = null;
  initAudio();
  resumeAudio();
  startMusic();
  startAmbientSounds(); // Requirement 11.6

  startTransition(1, () => {
    try {
      const shouldShowOnboarding =
        onboardingSystem.isFirstTimePlayer &&
        !onboardingSystem.isCompleted() &&
        !skipOnboarding;

      if (shouldShowOnboarding) {
        console.log(
          '[OnboardingSystem] First-time player detected, starting onboarding',
        );
        onboardingSystem.startOnboarding();
        game.state = STATES.ONBOARDING_WELCOME;
        return;
      }

      if (
        skipOnboarding &&
        onboardingSystem.isFirstTimePlayer &&
        !onboardingSystem.isCompleted()
      ) {
        onboardingSystem.skipOnboarding();
      }

      resetAllDeaths();
      game.deathCount = 0;
      game.level = 1;
      loadLevel(1);
      resetLevelDeaths();
      markRespawnNow(game.gameTime);
      game.state = STATES.PLAYING;

      if (speedrunSystem.isEnabled()) {
        speedrunSystem.start(1);
        console.log('[SpeedrunSystem] Started speedrun timer');
      }
    } catch (e) {
      console.error('[GAME] CRITICAL ERROR during state transition:', e);
      console.error('[GAME] Error stack:', e.stack);
      console.error('[GAME] State:', game.state);
      console.error('[GAME] Level:', game.level);
      console.error('[GAME] Level data:', game.levelData);

      game.state = STATES.TITLE;
      game.message = 'LOAD ERROR - CHECK CONSOLE';
      game.messageTimer = 10.0;

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

function toggleTitleSpeedrunMode() {
  speedrunSystem.setEnabled(!speedrunSystem.isEnabled());
  console.log(
    '[SpeedrunSystem] Toggled speedrun mode:',
    speedrunSystem.isEnabled(),
  );

  try {
    saveSystem.updateSpeedrunData(speedrunSystem.toJSON());
    console.log('[SpeedrunSystem] Saved speedrun toggle state');
  } catch (error) {
    console.error('[SpeedrunSystem] Failed to save speedrun toggle:', error);
  }
}

function activateTitleMenuSelection(selection = game.titleMenuSelection) {
  switch (selection) {
    case TITLE_MENU_OPTIONS.START:
      startTitleGame(false);
      return;
    case TITLE_MENU_OPTIONS.SETTINGS:
      openTitleSettings();
      return;
    default:
      game.titleMenuSelection = TITLE_MENU_OPTIONS.START;
  }
}

function updateTitlePointerRegion(event) {
  if (game.state !== STATES.TITLE) {
    game.titlePointerRegion = null;
    return null;
  }

  const rect = canvas.getBoundingClientRect();
  const clientX = event.clientX ?? (event.touches?.[0]?.clientX);
  const clientY = event.clientY ?? (event.touches?.[0]?.clientY);
  
  if (clientX === undefined || clientY === undefined) {
    game.titlePointerRegion = null;
    return null;
  }

  const pointer = {
    x: ((clientX - rect.left) / rect.width) * SCREEN_W,
    y: ((clientY - rect.top) / rect.height) * SCREEN_H,
  };

  const region = getTitleMenuInteraction(
    getTitleUIState(),
    pointer.x,
    pointer.y,
  );
  game.titlePointerRegion = region;

  if (region && region.type === 'menu' && !game.transition.active) {
    game.titleMenuSelection = region.selection;
  }

  return region;
}

function handleTouchMove(event) {
  // Handle touch move for menu hover states
  if (game.state === STATES.TITLE) {
    updateTitlePointerRegion(event);
  }
}

function handleTouchClick(event) {
  // Direct touch handler for menu interactions
  // This ensures touch works even if pointer events fail
  if (game.transition.active) return;
  
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches[0] || event.changedTouches[0];
  if (!touch) return;
  
  const pointer = {
    x: ((touch.clientX - rect.left) / rect.width) * SCREEN_W,
    y: ((touch.clientY - rect.top) / rect.height) * SCREEN_H,
  };

  // Visual feedback for taps
  if (typeof spawnSparks === 'function' && game.particles) {
    spawnSparks(game.particles, pointer.x, pointer.y, 3, [COLORS.SPARK_1, COLORS.GLOW_WARM]);
  }

  // Handle menu interactions
  if (game.state === STATES.TITLE) {
    const region = getTitleMenuInteraction(getTitleUIState(), pointer.x, pointer.y);
    if (region) {
      event.preventDefault(); // Prevent default only if we handle it
      event.stopPropagation(); // Stop propagation to prevent input.js from processing
      if (region.type === 'menu') {
        activateTitleMenuSelection(region.selection);
      } else if (region.type === 'difficulty') {
        difficultySystem.cycleDifficulty();
      } else if (region.type === 'speedrun') {
        toggleTitleSpeedrunMode();
      }
    }
  } else if (game.state === STATES.PAUSED) {
    const region = getPauseMenuInteraction(pointer.x, pointer.y);
    if (region) {
      event.preventDefault();
      event.stopPropagation();
      if (region.type === 'menu') {
        game.pauseMenuSelection = region.selection;
        game.pauseMenuForceEnter = true;
      } else if (region.type === 'difficulty') {
        difficultySystem.cycleDifficulty();
      }
    }
  } else if (game.state === STATES.SETTINGS) {
    settingsMenu.handleClick(pointer.x, pointer.y);
    event.preventDefault();
    event.stopPropagation();
  } else if (game.state === STATES.ONBOARDING_WELCOME) {
    game.state = STATES.ONBOARDING_DIFFICULTY;
    event.preventDefault();
    event.stopPropagation();
  } else if (game.state === STATES.ONBOARDING_DIFFICULTY) {
    const region = getOnboardingDifficultyInteraction(pointer.x, pointer.y);
    if (region && region.type === 'difficulty') {
      event.preventDefault();
      event.stopPropagation();
      game.onboardingSelectedDifficulty = region.selection;
      difficultySystem.setDifficulty(region.selection);
      startTitleGame(false);
    }
  } else if (game.state === STATES.ONBOARDING_COMPLETE) {
    event.preventDefault();
    event.stopPropagation();
    _advanceAfterLevelClear();
  } else if (game.state === STATES.DAILY_CHALLENGE_MENU || game.state === STATES.DAILY_CHALLENGE_START) {
    const region = getDailyChallengeInteraction(pointer.x, pointer.y);
    if (region && region.type === 'start') {
      event.preventDefault();
      event.stopPropagation();
      if (game.state === STATES.DAILY_CHALLENGE_MENU) {
        game.state = STATES.DAILY_CHALLENGE_START;
      } else {
        game.dailyChallengeForceStart = true;
      }
    }
  } else if (game.state === STATES.DAILY_CHALLENGE_COMPLETE || game.state === STATES.DAILY_CHALLENGE_FAILED) {
    event.preventDefault();
    event.stopPropagation();
    dailyChallengeSystem.removeModifiers(game);
    game.dailyChallenge.active = false;
    game.dailyChallenge.reverseControls = false;
    game.state = STATES.TITLE;
    stopMusic();
    stopAmbientSounds();
  } else if (game.state === STATES.GAME_OVER) {
    event.preventDefault();
    event.stopPropagation();
    startTransition(1, () => {
      loadLevel(game.level);
      game.state = STATES.PLAYING;
    });
  } else if (game.state === STATES.LEVEL_CLEAR || game.state === STATES.HEATMAP) {
    if (game.levelClearTimer >= LEVEL_CLEAR_HOLD || game.state === STATES.HEATMAP) {
      event.preventDefault();
      event.stopPropagation();
      startTransition(1, () => {
        _advanceAfterLevelClear();
      });
    }
  }
  // If we reach here and it's not a playable state, don't prevent default
  // This allows the touch to potentially trigger other handlers
}

function handlePointerMove(event) {
  if (game.state === STATES.TITLE) {
    updateTitlePointerRegion(event);
  }
}

function handlePointerLeave() {
  game.titlePointerRegion = null;
}

function handlePointerClick(event) {
  if (game.transition.active) return;
  
  // Robust coordinate extraction for both mouse and touch-based pointer events
  const rect = canvas.getBoundingClientRect();
  
  // For pointer events, use event coordinates directly
  // For touch events that bubble up, extract from touches array
  let clientX, clientY;
  
  if (event.clientX !== undefined && event.clientY !== undefined) {
    // Standard pointer/mouse event
    clientX = event.clientX;
    clientY = event.clientY;
  } else if (event.touches && event.touches.length > 0) {
    // Touch event
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else if (event.changedTouches && event.changedTouches.length > 0) {
    // Touch end event
    clientX = event.changedTouches[0].clientX;
    clientY = event.changedTouches[0].clientY;
  } else {
    return; // No valid coordinates
  }
  
  const pointer = {
    x: ((clientX - rect.left) / rect.width) * SCREEN_W,
    y: ((clientY - rect.top) / rect.height) * SCREEN_H,
  };

  // Provide visual feedback for taps (Requirement 17.2, 17.3)
  if (typeof spawnSparks === 'function' && game.particles) {
    spawnSparks(game.particles, pointer.x, pointer.y, 3, [COLORS.SPARK_1, COLORS.GLOW_WARM]);
  }

  if (game.state === STATES.TITLE) {
    const region = getTitleMenuInteraction(getTitleUIState(), pointer.x, pointer.y);
    if (!region) return;

    if (region.type === 'menu') {
      activateTitleMenuSelection(region.selection);
    } else if (region.type === 'difficulty') {
      difficultySystem.cycleDifficulty();
    } else if (region.type === 'speedrun') {
      toggleTitleSpeedrunMode();
    }
  } else if (game.state === STATES.PAUSED) {
    const region = getPauseMenuInteraction(pointer.x, pointer.y);
    if (!region) return;

    if (region.type === 'menu') {
      game.pauseMenuSelection = region.selection;
      // Trigger the enter key logic for this selection
      game.pauseMenuForceEnter = true; 
    } else if (region.type === 'difficulty') {
      difficultySystem.cycleDifficulty();
    }
  } else if (game.state === STATES.SETTINGS) {
    settingsMenu.handleClick(pointer.x, pointer.y);
  } else if (game.state === STATES.ONBOARDING_WELCOME) {
    game.state = STATES.ONBOARDING_DIFFICULTY;
  } else if (game.state === STATES.ONBOARDING_DIFFICULTY) {
    const region = getOnboardingDifficultyInteraction(pointer.x, pointer.y);
    if (region && region.type === 'difficulty') {
      game.onboardingSelectedDifficulty = region.selection;
      difficultySystem.setDifficulty(region.selection);
      // Advance to tutorial
      startTitleGame(false); 
    }
  } else if (game.state === STATES.ONBOARDING_COMPLETE) {
    // Start Level 1
    _advanceAfterLevelClear();
  } else if (game.state === STATES.DAILY_CHALLENGE_MENU || game.state === STATES.DAILY_CHALLENGE_START) {
    const region = getDailyChallengeInteraction(pointer.x, pointer.y);
    if (region && region.type === 'start') {
      if (game.state === STATES.DAILY_CHALLENGE_MENU) {
        game.state = STATES.DAILY_CHALLENGE_START;
      } else {
        // Start the challenge (trigger logic from update)
        game.dailyChallengeForceStart = true;
      }
    }
  } else if (game.state === STATES.DAILY_CHALLENGE_COMPLETE || game.state === STATES.DAILY_CHALLENGE_FAILED) {
    dailyChallengeSystem.removeModifiers(game);
    game.dailyChallenge.active = false;
    game.dailyChallenge.reverseControls = false;
    game.state = STATES.TITLE;
    stopMusic();
    stopAmbientSounds();
  } else if (game.state === STATES.GAME_OVER) {
    // Click anywhere to retry if on mobile/touch
    startTransition(1, () => {
      loadLevel(game.level);
      game.state = STATES.PLAYING;
    });
  } else if (game.state === STATES.LEVEL_CLEAR || game.state === STATES.HEATMAP) {
    // Click anywhere to skip
    if (game.levelClearTimer >= LEVEL_CLEAR_HOLD || game.state === STATES.HEATMAP) {
      startTransition(1, () => {
        _advanceAfterLevelClear();
      });
    }
  }
}

function updateCamera(snap = false) {
  // Use inline fallbacks for constants (Wavedash service worker can corrupt module imports)
  const tileSize = typeof TILE !== 'undefined' ? TILE : 16;
  const screenW = typeof SCREEN_W !== 'undefined' ? SCREEN_W : 320;
  const screenH = typeof SCREEN_H !== 'undefined' ? SCREEN_H : 240;

  const tilemapW = game.tiles[0].length * tileSize;
  const tilemapH = game.tiles.length * tileSize;
  const targetX = Math.max(
    0,
    Math.min(tilemapW - screenW, game.player.x - screenW / 2 + 4),
  );
  const targetY = Math.max(
    0,
    Math.min(tilemapH - screenH, game.player.y - screenH / 2 + 6),
  );
  if (snap) {
    game.camera.x = targetX | 0;
    game.camera.y = targetY | 0;
    return;
  }
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
  else if (result === 'lever') {
    playWindUp(0.7);
    game.shake = 6;
  } else {
    playWindUp(1.0);
    game.shake = 4;
    unlockNote(target.id % 8);
  }
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
  const hadAll =
    game.gearTokens.length > 0 &&
    game.gearsCollected === game.gearTokens.length;
  const ctxInfo = Object.assign({ hadAllTokens: hadAll }, context || {});
  if (
    !ctxInfo.hadAllTokens &&
    game.gearsCollected === game.gearTokens.length - 1 &&
    game.gearTokens.length > 0
  ) {
    ctxInfo.lastToken = true;
  }
  // Extract killSource from context if present
  const killSource = ctxInfo.killSource || null;
  triggerDeath(game.player, game.particles, ctxInfo, game.gameTime, killSource);

  // ─── Record death position for heatmap (Requirement 8.1) ───
  if (game.player) {
    deathHeatmap.recordDeath(game.player.x, game.player.y);
  }

  // ─── Track death in analytics (Requirements 14.3, 14.5, 14.6) ───
  if (game.player) {
    analyticsSystem.trackDeath(
      game.level,
      game.player.x,
      game.player.y,
      killSource,
    );
  }

  // ─── Daily Challenge: record death (Requirement 9.7) ───
  if (game.dailyChallenge.active) {
    dailyChallengeSystem.recordDeath();
  }

  // ═══════ TRAP-SPECIFIC DEATH SOUNDS (Requirement 11.4) ═══════
  if (killSource) {
    playTrapDeath(killSource);
  } else {
    playGameOver();
  }

  // Requirement 12.2: Screen shake on death with magnitude 8
  // Requirement 13.3: Disable screen shake if reduce motion is enabled
  if (!accessibilitySystem.isReduceMotionEnabled()) {
    game.shake = 8;
  }
  game.flash = 0;
}

function collectTokens() {
  const hit = getPlayerHitbox(game.player);

  // Collect regular gear tokens
  for (const t of game.gearTokens) {
    if (t.collected) continue;
    const tb = { x: t.x + 1, y: t.y + 1, w: 6, h: 6 };
    if (
      hit.x < tb.x + tb.w &&
      hit.x + hit.w > tb.x &&
      hit.y < tb.y + tb.h &&
      hit.y + hit.h > tb.y
    ) {
      t.collected = true;
      game.gearsCollected++;
      // Update liar counter with actual count (no lie for regular tokens)
      game.liarCounter.setActualCount(game.gearsCollected);
      playTick();
      playWindUp(2.2);
      // Requirement 12.1: Spawn 12 particles when collecting gear token
      spawnSparks(game.particles, t.x + 4, t.y + 4, 12, [
        COLORS.TOKEN_GOLD,
        COLORS.GLOW_WARM,
        COLORS.SPARK_1,
      ]);
      unlockNote(game.gearsCollected % 8);

      if (
        game.gearsCollected ===
        game.gearTokens.length + game.trollTokens.length
      ) {
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
      // Requirement 12.1: Spawn 12 particles when collecting gear token
      spawnSparks(game.particles, trollToken.x + 4, trollToken.y + 4, 12, [
        COLORS.TOKEN_GOLD,
        COLORS.GLOW_WARM,
        COLORS.SPARK_1,
      ]);
      unlockNote(game.gearsCollected % 8);

      // Handle trap activation based on subtype
      if (trapResult) {
        handleTrollTokenTrap(trapResult);
      }

      if (
        game.gearsCollected ===
        game.gearTokens.length + game.trollTokens.length
      ) {
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
    if (
      hit.x < cpHitbox.x + cpHitbox.w &&
      hit.x + hit.w > cpHitbox.x &&
      hit.y < cpHitbox.y + cpHitbox.h &&
      hit.y + hit.h > cpHitbox.y
    ) {
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
      spawnSparks(game.particles, checkpoint.x + 6, checkpoint.y + 6, 12, [
        COLORS.SPARK_1,
        COLORS.GLOW_WARM,
        COLORS.METAL_LIGHT,
      ]);

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
          const obstacle = game.autonomousObstacles.find(
            (a) => a.id === obstacleId,
          );
          if (obstacle) {
            // Set activation source for killSource tracking
            obstacle.activationSource = 'troll_token';
            if (obstacle.activate) {
              obstacle.activate();
            }
          } else {
            console.warn(
              'TrollToken references non-existent obstacle:',
              obstacleId,
            );
          }
        }
        game.flash = 0.3;
        game.shake = 8;
        break;

      case 'RUSH_BAIT':
        // Increase obstacle speed in the area
        for (const obstacleId of trapResult.affectedObstacleIds) {
          const obstacle = game.autonomousObstacles.find(
            (a) => a.id === obstacleId,
          );
          if (obstacle) {
            // Set activation source for killSource tracking
            obstacle.activationSource = 'troll_token';
            obstacle.speedMult =
              (obstacle.speedMult || 1) * trapResult.speedMultiplier;
          } else {
            console.warn(
              'TrollToken RUSH_BAIT references non-existent obstacle:',
              obstacleId,
            );
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
  for (const a of game.autonomousObstacles)
    a.speedMult = game.obstacleSpeedMult;
}

function checkLethalCollisions() {
  const hit = getPlayerHitbox(game.player);

  const zones = game.levelData.lethalZones || [];
  for (const lz of zones) {
    if (
      hit.x < lz.x + lz.w &&
      hit.x + hit.w > lz.x &&
      hit.y < lz.y + lz.h &&
      hit.y + hit.h > lz.y
    ) {
      dieNow({ killSource: 'lethal_zone' });
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
      if (
        hit.x < r.x + r.w &&
        hit.x + hit.w > r.x &&
        hit.y < r.y + r.h &&
        hit.y + hit.h > r.y
      ) {
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
    spawnSparks(game.particles, game.player.x + 4, game.player.y + 6, 2, [
      COLORS.SPARK_1,
      COLORS.GLOW_WARM,
    ]);
  }
}

function handleCloseCall() {
  const hit = getPlayerHitbox(game.player);
  // Use inline values as fallback — Wavedash service worker can corrupt module imports
  const extremeDist =
    typeof EXTREME_CLOSE_CALL_DISTANCE !== 'undefined'
      ? EXTREME_CLOSE_CALL_DISTANCE
      : 2;
  const closeDist =
    typeof CLOSE_CALL_DISTANCE !== 'undefined' ? CLOSE_CALL_DISTANCE : 4;
  const extremeFrames =
    typeof EXTREME_CLOSE_CALL_DISPLAY_FRAMES !== 'undefined'
      ? EXTREME_CLOSE_CALL_DISPLAY_FRAMES
      : 30;
  const closeFrames =
    typeof CLOSE_CALL_DISPLAY_FRAMES !== 'undefined'
      ? CLOSE_CALL_DISPLAY_FRAMES
      : 20;

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

        // Requirement 12.3: Slow-motion effect on extreme close call
        game.slowMotionTimer = 0.5; // 0.5 seconds
        game.slowMotionFactor = 0.3; // 0.3x speed
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
  window.gameState = game.state; // Sync for input system
  game.tick++;
  game.gameTime += dt;
  game.messageTimer = Math.max(0, game.messageTimer - dt);
  game.flash = Math.max(0, game.flash - dt * 1.5);
  if (game.shake > 0) game.shake -= dt * 60;

  // ─── Input cooldown for state transitions ───
  if (game.stateCooldown === undefined || game.stateCooldown === null) game.stateCooldown = 0;
  game.stateCooldown = Math.max(0, game.stateCooldown - dt);

  if (game.state !== STATES.TITLE && game.titlePointerRegion) {
    game.titlePointerRegion = null;
  }
  syncCanvasCursor();

  // ─── Metrics dashboard toggle (F12) (Requirements 20.5) ───
  if (justPressed('ANALYTICS_DASHBOARD')) {
    metricsSystem.toggleDashboard();
    clearPressed();
    return;
  }

  // ─── Performance overlay toggle (F3) (Requirement 16.8) ───
  if (justPressed('PERFORMANCE_OVERLAY')) {
    performanceMonitor.showOverlay = !performanceMonitor.showOverlay;
    clearPressed();
  }

  // ─── Metrics dashboard input handling ───
  if (metricsSystem.dashboardVisible) {
    // Handle E key for export
    if (justPressed('WIND')) {
      metricsSystem.handleDashboardInput('e');
      clearPressed();
    }
    clearPressed();
    return; // Don't process other input when dashboard is visible
  }

  // ─── Slow-motion effect on extreme close calls (Requirement 12.3) ───
  if (game.slowMotionTimer > 0) {
    game.slowMotionTimer -= dt;
    dt *= game.slowMotionFactor; // Apply 0.3x speed
    if (game.slowMotionTimer <= 0) {
      game.slowMotionFactor = 1.0; // Reset to normal speed
    }
  }

  if (game.state === STATES.LOADING) {
    // Loading indicator: show for a brief period while systems initialize (Requirement 17.4)
    game.loadingTick = (game.loadingTick || 0) + 1;
    
    // Log loading progress for debugging
    if (game.loadingTick === 1) {
      console.log('[LOADING] Game initialization started');
      
      // Signal first frame is ready for YouTube Playables (Requirement 2 in Analysis)
      if (ytGame) {
        try {
          ytGame.game.firstFrameReady();
          console.log('[YouTube SDK] firstFrameReady() called');
        } catch (e) {
          console.error('[YouTube SDK] firstFrameReady() failed:', e);
        }
      }
      
      console.log('[LOADING] STATES defined:', typeof STATES !== 'undefined');
      console.log('[LOADING] LEVELS defined:', typeof LEVELS !== 'undefined');
      console.log('[LOADING] getLevel defined:', typeof getLevel !== 'undefined');
    }
    
    // Check if critical modules are loaded
    const modulesReady = 
      typeof STATES !== 'undefined' &&
      typeof LEVELS !== 'undefined' &&
      typeof getLevel !== 'undefined' &&
      typeof createPlayer !== 'undefined' &&
      typeof initAudio !== 'undefined';
    
    // Transition to title after minimum 10 frames AND modules are ready
    // Or force transition after 120 frames (2 seconds) even if modules aren't ready
    const minFrames = 10;
    const maxFrames = 120;
    
    if ((game.loadingTick >= minFrames && modulesReady) || game.loadingTick >= maxFrames) {
      if (!modulesReady) {
        console.error('[LOADING] WARNING: Transitioning to TITLE but some modules are not ready!');
      } else {
        console.log('[LOADING] All modules ready, transitioning to TITLE');
      }
      
      game.state = STATES.TITLE;
      
      // Signal game is fully ready and interactable for YouTube (Requirement 2 in Analysis)
      if (ytGame) {
        try {
          ytGame.game.gameReady();
          console.log('[YouTube SDK] gameReady() called');
        } catch (e) {
          console.error('[YouTube SDK] gameReady() failed:', e);
        }
      }
      
      // Initialize Wavedash SDK after game is ready
      try {
        if (typeof window.WavedashJS !== 'undefined') {
          window.WavedashJS.init({ debug: false });
          console.log('[WavedashJS] Initialized successfully');
        } else {
          console.log('[WavedashJS] Not present (local dev mode)');
        }
      } catch (e) {
        console.warn('[WavedashJS] Init failed:', e);
      }
    }
    clearPressed();
    return;
  }

  if (game.state === STATES.TITLE) {
    if (game.titleMenuSelection == null) {
      game.titleMenuSelection = TITLE_MENU_OPTIONS.START;
    }

    if (
      (justPressed('DIFFICULTY') ||
        justPressed('LEFT') ||
        justPressed('RIGHT')) &&
      !game.transition.active
    ) {
      const nextDifficulty = difficultySystem.cycleDifficulty();
      console.log(
        '[DifficultySystem] Title menu cycled difficulty:',
        nextDifficulty,
      );
    }

    if (justPressed('SPEEDRUN_TOGGLE')) {
      toggleTitleSpeedrunMode();
    }

    if (justPressed('UP') && !game.transition.active) {
      game.titleMenuSelection =
        (game.titleMenuSelection - 1 + TITLE_MENU_OPTIONS.COUNT) %
        TITLE_MENU_OPTIONS.COUNT;
    }

    if (justPressed('DOWN') && !game.transition.active) {
      game.titleMenuSelection =
        (game.titleMenuSelection + 1) % TITLE_MENU_OPTIONS.COUNT;
    }

    // ─── Settings menu access from title (Requirement 18.1) ───
    if (justPressed('SETTINGS') && !game.transition.active) {
      openTitleSettings();
      clearPressed();
      return;
    }

    // ─── Daily Challenge access from title (Requirement 9.9) ───
    /* if (justPressed('WIND') && !game.transition.active) { openTitleDailyChallenge(); clearPressed(); return; } */

    if (justPressed('SKIP') && !game.transition.active) {
      console.log(
        '[GAME] Skip requested on title, starting Level 1 directly...',
      );
      startTitleGame(true);
      clearPressed();
      return;
    }

    if (justPressed('SPACE') && !game.transition.active) {
      console.log('[GAME] Title selection confirmed:', game.titleMenuSelection);
      activateTitleMenuSelection();
    }
    if (justPressed('RETRY')) {
      resetAllDeaths();
      game.deathCount = 0;
    }
    // ─── Level Editor access from title (Requirement 10) ───
    // Press M to open level editor
    /* if (justPressed('M') && !game.transition.active) { openTitleLevelEditor(); clearPressed(); return; } */
    clearPressed();
    return;
  }

  // ─── Onboarding Welcome Screen (Requirement 19.2) ───
  if (game.state === STATES.ONBOARDING_WELCOME) {
    // Skip onboarding with Escape (Requirement 19.8)
    if (justPressed('PAUSE')) {
      onboardingSystem.skipOnboarding();
      startTransition(1, () => {
        resetAllDeaths();
        game.deathCount = 0;
        game.level = 1;
        loadLevel(1);
        resetLevelDeaths();
        markRespawnNow(game.gameTime);
        game.state = STATES.PLAYING;
      });
      clearPressed();
      return;
    }

    // Advance to difficulty selection with Space (Requirement 19.2)
    if (justPressed('SPACE') && !game.transition.active) {
      onboardingSystem.advanceStep();
      game.state = STATES.ONBOARDING_DIFFICULTY;
      clearPressed();
      return;
    }
    clearPressed();
    return;
  }

  // ─── Onboarding Difficulty Selection (Requirement 19.3) ───
  if (game.state === STATES.ONBOARDING_DIFFICULTY) {
    // Skip onboarding with Escape (Requirement 19.8)
    if (justPressed('PAUSE')) {
      onboardingSystem.skipOnboarding();
      startTransition(1, () => {
        resetAllDeaths();
        game.deathCount = 0;
        game.level = 1;
        loadLevel(1);
        resetLevelDeaths();
        markRespawnNow(game.gameTime);
        game.state = STATES.PLAYING;
      });
      clearPressed();
      return;
    }

    // Cycle difficulty with arrow keys or number keys
    if (justPressed('UP') || justPressed('1')) {
      onboardingSystem.setDifficulty('Casual');
    }
    if (justPressed('DOWN') || justPressed('2')) {
      onboardingSystem.setDifficulty('Normal');
    }
    if (justPressed('3')) {
      onboardingSystem.setDifficulty('Hardcore');
    }

    // Confirm difficulty and start tutorial with Space (Requirement 19.3, 19.4)
    if (justPressed('SPACE') && !game.transition.active) {
      // Apply selected difficulty
      onboardingSystem.applyDifficulty();
      onboardingSystem.advanceStep();

      // Load tutorial level (Level 0)
      startTransition(1, () => {
        resetAllDeaths();
        game.deathCount = 0;
        game.level = 0;
        loadLevel(0);
        resetLevelDeaths();
        markRespawnNow(game.gameTime);
        game.state = STATES.PLAYING;
        console.log('[OnboardingSystem] Tutorial started');
      });
      clearPressed();
      return;
    }
    clearPressed();
    return;
  }

  // ─── Onboarding Complete Screen (Requirement 19.5) ───
  if (game.state === STATES.ONBOARDING_COMPLETE) {
    // Advance to Level 1 with Space (Requirement 19.6)
    if (justPressed('SPACE') && !game.transition.active) {
      startTransition(1, () => {
        resetAllDeaths();
        game.deathCount = 0;
        game.level = 1;
        loadLevel(1);
        resetLevelDeaths();
        markRespawnNow(game.gameTime);
        game.state = STATES.PLAYING;
        console.log(
          '[OnboardingSystem] Starting Level 1 after tutorial completion',
        );
      });
      clearPressed();
      return;
    }
    clearPressed();
    return;
  }

  // ─── Level Editor state handling (Requirements 10.1-10.9) ───
  if (game.state === STATES.LEVEL_EDITOR) {
    if (!game.levelEditor) {
      game.levelEditor = new LevelEditor();
    }

    const editor = game.levelEditor;

    // Handle tool selection
    if (justPressed('W')) editor.selectTileType('W');
    if (justPressed('F')) editor.selectTileType('F');
    if (justPressed('D')) editor.selectTileType('D');
    if (justPressed('.')) editor.selectTileType('.');
    if (justPressed('1')) editor.selectTool('OBSTACLE');
    if (justPressed('2')) editor.selectTool('GEAR_TOKEN');
    if (justPressed('3')) editor.selectTool('GOAL_TRIGGER');
    if (justPressed('4')) editor.selectTool('PLAYER_SPAWN');
    if (justPressed('X')) editor.selectTool('ERASER');

    // Handle export (Requirement 10.7)
    if (justPressed('E')) {
      const json = editor.exportLevel();
      if (json) {
        editor.exportText = json;
        editor.exportVisible = true;
        console.log('[LevelEditor] Exported level JSON:');
        console.log(json);
      } else {
        editor.exportVisible = true;
        editor.exportText = '';
      }
    }

    // Handle import (Requirement 10.8)
    if (justPressed('I')) {
      editor.importVisible = true;
      // Expose import function to window for console access
      window.editorImport = (jsonString) => {
        const success = editor.importLevel(jsonString);
        if (success) {
          console.log('[LevelEditor] Level imported successfully');
          editor.importVisible = false;
        } else {
          console.error(
            '[LevelEditor] Import failed:',
            editor.validationErrors,
          );
        }
      };
      console.log(
        '[LevelEditor] Import mode active. Use: window.editorImport(jsonString)',
      );
    }

    // Handle playtest (Requirements 10.5, 10.6)
    if (justPressed('P')) {
      const errors = editor.validateLevel();
      if (errors.length === 0) {
        // Create level data from editor
        const levelData = {
          id: 999,
          name: 'PLAYTEST',
          tilemap: editor.tilemap,
          objects: [],
          autonomousObstacles: editor.obstacles,
          gearTokens: editor.gearTokens,
          goalTrigger: editor.goalTrigger,
          playerSpawn: editor.playerSpawn,
        };

        // Store current editor state
        game.levelEditorPlaytestData = levelData;

        // Load the level for playtesting
        game.levelData = levelData;
        game.tiles = levelData.tilemap.slice();
        game.objects = [];
        game.autonomousObstacles = levelData.autonomousObstacles.map(
          (a) => new AutonomousObstacle(a),
        );
        game.gearTokens = levelData.gearTokens.map((t) => ({
          x: t.x,
          y: t.y,
          collected: false,
          angle: 0,
        }));
        game.gearsCollected = 0;

        // Create player at spawn
        const spawn = levelData.playerSpawn || { x: 32, y: 32 };
        game.player = createPlayer(spawn.x, spawn.y);
        game.lastSpawn = { x: spawn.x, y: spawn.y };

        // Reset death state
        resetLevelDeaths();
        markRespawnNow(game.gameTime);

        // Switch to playtest state
        game.state = STATES.LEVEL_EDITOR_PLAYTEST;
        console.log('[LevelEditor] Starting playtest');
      } else {
        editor.validationErrors = errors;
        console.error('[LevelEditor] Validation failed:', errors);
      }
    }

    // Handle clear
    if (justPressed('C')) {
      editor.clearLevel();
      console.log('[LevelEditor] Level cleared');
    }

    // Handle exit
    if (justPressed('PAUSE')) {
      game.state = STATES.TITLE;
      clearPressed();
      return;
    }

    // Close dialogs
    if (
      editor.exportVisible ||
      editor.importVisible ||
      editor.validationErrors.length > 0
    ) {
      if (justPressed('PAUSE')) {
        editor.exportVisible = false;
        editor.importVisible = false;
        editor.validationErrors = [];
      }
    }

    clearPressed();
    return;
  }

  // ─── Level Editor Playtest state handling (Requirement 10.6) ───
  if (game.state === STATES.LEVEL_EDITOR_PLAYTEST) {
    // Return to editor on pause
    if (justPressed('PAUSE')) {
      game.state = STATES.LEVEL_EDITOR;
      console.log('[LevelEditor] Returned to edit mode');
      clearPressed();
      return;
    }

    // Handle death and respawn
    const ds = updateDeathState(dt);
    if (ds === 'freeze') {
      clearPressed();
      return;
    }
    if (ds === 'respawn') {
      softRespawn();
      clearPressed();
      return;
    }
    if (ds === 'dying') {
      clearPressed();
      return;
    }

    // Update obstacles
    for (const a of game.autonomousObstacles) a.update(dt, game.roomTime);

    // Update player
    updatePlayerPhysics(game.player, game.tiles, game.objects, dt);
    updatePlayer(game.player, dt);

    // Check gear collection
    for (const token of game.gearTokens) {
      if (token.collected) continue;
      const dx = game.player.x - token.x;
      const dy = game.player.y - token.y;
      if (Math.sqrt(dx * dx + dy * dy) < 12) {
        token.collected = true;
        game.gearsCollected++;
        game.flash = 0.3;
      }
    }

    // Check goal trigger
    const allGears = game.gearTokens.every((t) => t.collected);
    if (allGears && game.levelData.goalTrigger) {
      const gt = game.levelData.goalTrigger;
      const ph = getPlayerHitbox(game.player);
      if (
        ph.x < gt.x + gt.w &&
        ph.x + ph.w > gt.x &&
        ph.y < gt.y + gt.h &&
        ph.y + ph.h > gt.y
      ) {
        // Level complete - return to editor
        game.state = STATES.LEVEL_EDITOR;
        console.log('[LevelEditor] Playtest complete - level cleared!');
        clearPressed();
        return;
      }
    }

    // Check obstacle collisions
    for (const obs of game.autonomousObstacles) {
      const ph = getPlayerHitbox(game.player);
      if (rectOverlapsBounds(ph, obs.getBounds())) {
        triggerDeath('obstacle', obs.id);
        break;
      }
    }

    updateCamera();
    clearPressed();
    return;
  }

  if (game.state === STATES.PLAYING) {
    if (
      (justPressed('PAUSE') || justPressed('DIFFICULTY')) &&
      game.stateCooldown <= 0
    ) {
      game.stateCooldown = 0.5; // Cooldown timer
      game.lastStateChangeFrame = game.tick; // Guard frame
      game.pauseKeyReleased = false; 
      game.pauseMenuSelection = 0;
      game.state = STATES.PAUSED;
      // Pause speedrun timer (Requirement 6.6)
      if (speedrunSystem.isEnabled() && speedrunSystem.active) {
        speedrunSystem.pause();
      }
      clearPressed();
      return;
    }
    if (justPressed('SKIP')) {
      levelClear();
      clearPressed();
      return;
    }

    const ds = updateDeathState(dt);
    if (ds === 'freeze') {
      clearPressed();
      return;
    }
    if (ds === 'respawn') {
      // ─── Daily Challenge one_life: fail on first death (Requirement 9.4) ───
      if (game.dailyChallenge.active && dailyChallengeSystem.isOneLive()) {
        dailyChallengeSystem.failChallenge();
        game.dailyChallenge.active = false;
        dailyChallengeSystem.removeModifiers(game);
        game.state = STATES.DAILY_CHALLENGE_FAILED;
        clearPressed();
        return;
      }
      softRespawn();
      const newDeathCount = getDeathCount();
      game.deathCount = newDeathCount;
      updatePhaseShiftObstacles(newDeathCount);
      clearPressed();
      return;
    }
    if (ds === 'dying') {
      clearPressed();
      return;
    }

    updateObstaclePause(dt);
    for (const a of game.autonomousObstacles) a.update(dt, game.roomTime);

    // ─── Spawn spark particles on obstacle wall collisions (Requirement 12.7) ───
    for (const obs of game.autonomousObstacles) {
      if (obs._lastCollision && obs._lastCollision.time === obs.time) {
        spawnCollisionSparks(
          game.particles,
          obs._lastCollision.x,
          obs._lastCollision.y,
        );
        delete obs._lastCollision; // Clear to avoid duplicate spawns
      }
    }

    // ─── Update room time for pattern betrayal ───
    game.roomTime += dt;

    // ─── Update speedrun timer ───
    if (speedrunSystem.isEnabled() && speedrunSystem.active) {
      speedrunSystem.update(dt);

      // Record ghost frame for speedrun replay (Requirement 6.5)
      if (game.player) {
        speedrunSystem.recordGhostFrame({
          x: game.player.x,
          y: game.player.y,
          animFrame: game.player.animFrame || 0,
          facing: game.player.facing || 1,
          anim: game.player.anim || 'idle',
        });
      }
    }

    // ─── Update ghost replay ───
    // Ghost Replay logic removed as per user request
    // updateGhostReplay();

    // Progress tracker update removed
    /*
    if (game.progressTracker && game.player && game.lastSpawn) {
      game.progressTracker.update(game.player, game.lastSpawn, game.level);
    }
    */

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
            const obstacle = game.autonomousObstacles.find(
              (a) => a.id === obstacleId,
            );
            if (obstacle) {
              // Set activation source for killSource tracking
              obstacle.activationSource = 'fake_safe_zone';
              if (obstacle.activate) {
                obstacle.activate();
              }
            } else {
              console.warn(
                'FakeSafeZone references non-existent obstacle:',
                obstacleId,
              );
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
          const hiddenGear = game.hiddenKillGears.find(
            (g) => g.id === trigger.targetTrapId,
          );
          if (hiddenGear) {
            // Proximity trigger for hidden gear could increase hum volume or other effects
            // For now, the proximity is handled by handleHiddenGearProximity
          }

          // Check if it's an obstacle
          const obstacle = game.autonomousObstacles.find(
            (a) => a.id === trigger.targetTrapId,
          );
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
        const inZone =
          playerHitbox.x < zone.x + zone.w &&
          playerHitbox.x + playerHitbox.w > zone.x &&
          playerHitbox.y < zone.y + zone.h &&
          playerHitbox.y + playerHitbox.h > zone.y;

        if (inZone && !zone.activated) {
          // Activate the linked obstacle
          const obstacle = game.autonomousObstacles.find(
            (a) => a.id === zone.triggerObstacleId,
          );
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
            console.warn(
              'ColorBetrayalZone references non-existent obstacle:',
              zone.triggerObstacleId,
            );
          }
        }
      }
    } catch (e) {
      console.error('Error checking color betrayal zones:', e);
    }

    for (const t of game.gearTokens) {
      if (!t.collected) t.angle += (6 * Math.PI) / 180;
    }

    for (const trollToken of game.trollTokens) {
      if (!trollToken.collected) trollToken.angle += (6 * Math.PI) / 180;
    }

    const allowJump = true;
    updatePlayer(game.player, dt, allowJump, game);
    if (
      (justPressed('SPACE') || justPressed('UP')) &&
      allowJump &&
      game.player.onGround
    )
      playJump();

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
      if (o.justFroze) {
        playFreeze();
        game.flash = 0.4;
        game.shake = 5;
      }
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

    // ─── Update player trail effect (Requirement 12.4) ───
    updatePlayerTrail(game.player);

    // ─── Spawn dust particles on landing (Requirement 12.6) ───
    if (!game.player.wasOnGround && game.player.onGround) {
      spawnDustParticles(game.particles, game.player.x, game.player.y);
    }

    // Check trigger tile collisions
    try {
      const playerHitbox = getPlayerHitbox(game.player);
      for (const trigger of game.triggerTiles) {
        if (trigger.checkCollision(playerHitbox)) {
          if (!trigger.activated || !trigger.oneShot) {
            trigger.activate(game);
            // Find and activate the target obstacle by targetObstacleId
            const obstacle = game.autonomousObstacles.find(
              (a) => a.id === trigger.targetObstacleId,
            );
            if (obstacle) {
              // Set activation source for killSource tracking
              obstacle.activationSource = 'trigger_tile';
              if (obstacle.activate) {
                obstacle.activate();
              }
            } else {
              console.warn(
                'TriggerTile references non-existent obstacle:',
                trigger.targetObstacleId,
              );
            }
          }
        }
      }
    } catch (e) {
      console.error('Error checking trigger tile collisions:', e);
    }

    if (checkLethalCollisions()) {
      clearPressed();
      return;
    }

    if (game.player.gauge <= 0) {
      dieNow({ reason: 'gauge' });
      clearPressed();
      return;
    }
    if (game.player.y > game.tiles.length * TILE + 16 || (game.levelData.isTutorial && game.player.y > 112)) {
      dieNow({ reason: 'pit' });
      clearPressed();
      return;
    }

    collectTokens();
    checkCheckpointActivation();
    handleNearMisses();
    handleCloseCall(); // Check for close calls

    // ═══════ DYNAMIC MUSIC INTENSITY (Requirements 11.1, 11.2, 11.3) ═══════
    // Calculate danger level based on proximity to obstacles (within 32px)
    let minDistance = Infinity;
    const playerCenter = {
      x: game.player.x + PLAYER_W / 2,
      y: game.player.y + PLAYER_H / 2,
    };

    for (const obstacle of game.autonomousObstacles) {
      const dist = distanceToBounds(playerCenter, obstacle.getBounds());
      if (dist < minDistance) {
        minDistance = dist;
      }
    }

    // Convert distance to danger level (0 = safe, 1 = danger)
    // Within 32px = danger, beyond 64px = safe, interpolate between
    const DANGER_THRESHOLD = 32;
    const SAFE_THRESHOLD = 64;
    let dangerLevel = 0;

    if (minDistance <= DANGER_THRESHOLD) {
      dangerLevel = 1.0;
    } else if (minDistance < SAFE_THRESHOLD) {
      // Linear interpolation between danger and safe
      dangerLevel =
        1.0 -
        (minDistance - DANGER_THRESHOLD) / (SAFE_THRESHOLD - DANGER_THRESHOLD);
    }

    updateMusicIntensity(dangerLevel);
    updateMusicTransition(dt);

    try {
      handleHiddenGearProximity();
    } catch (e) {
      console.error('Error handling hidden gear proximity:', e);
    }

    const gate = game.levelData.goalTrigger;
    const allGears =
      game.gearsCollected === game.gearTokens.length + game.trollTokens.length;
    if (gate) {
      const p = {
        x: game.player.x,
        y: game.player.y,
        w: PLAYER_W,
        h: PLAYER_H,
      };
      const over =
        p.x < gate.x + gate.w &&
        p.x + p.w > gate.x &&
        p.y < gate.y + gate.h &&
        p.y + p.h > gate.y;
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
    // ─── Arrow key navigation for pause menu (Requirement 17.6) ───
    const PAUSE_MENU_OPTIONS = 4; // RESUME, SETTINGS, LEADERBOARD, MAIN MENU
    if (!game.pauseMenuSelection) game.pauseMenuSelection = 0;

    // Guard: track when PAUSE key is released so we require a fresh press to unpause
    // Increased cooldown requirement to 0.2s passed (0.3 remaining) to be safer.
    if (game.stateCooldown < 0.3 && !isHeld('PAUSE')) {
      game.pauseKeyReleased = true;
    }

    if (justPressed('UP')) {
      game.pauseMenuSelection =
        (game.pauseMenuSelection - 1 + PAUSE_MENU_OPTIONS) % PAUSE_MENU_OPTIONS;
    }
    if (justPressed('DOWN')) {
      game.pauseMenuSelection =
        (game.pauseMenuSelection + 1) % PAUSE_MENU_OPTIONS;
    }

    // Enter key activates selected option
    const enterPressed = justPressed('SPACE') || justPressed('WIND') || game.pauseMenuForceEnter;
    game.pauseMenuForceEnter = false;
    // Open settings menu from pause menu (Requirement 18.1)
    if (
      justPressed('SETTINGS') ||
      (enterPressed && game.pauseMenuSelection === 1)
    ) {
      settingsMenu.open();
      game.returnStateFromSettings = STATES.PAUSED;
      game.state = STATES.SETTINGS;
      game.pauseMenuSelection = 0;
      clearPressed();
      return;
    }
    // Open leaderboard from pause menu (Requirement 7.6)
    if (
      justPressed('SKIP') ||
      (enterPressed && game.pauseMenuSelection === 2)
    ) {
      game.leaderboardFilter = 'deaths';
      game.state = STATES.LEADERBOARD;
      game.pauseMenuSelection = 0;
      clearPressed();
      return;
    }
    // Return to main menu from pause menu
    if (enterPressed && game.pauseMenuSelection === 3) {
      // Stop music and ambient sounds
      stopMusic();
      stopAmbientSounds();
      
      // Stop speedrun timer if active
      if (speedrunSystem.isEnabled() && speedrunSystem.active) {
        speedrunSystem.stop();
      }
      
      // Transition to title screen
      startTransition(1, () => {
        game.state = STATES.TITLE;
        game.pauseMenuSelection = 0;
        game.titleMenuSelection = 0;
      });
      
      clearPressed();
      return;
    }

    // ─── Unpause logic moved to end of block to prevent same-frame double-triggers ───
    const pauseToggle = justPressed('PAUSE') && game.pauseKeyReleased;
    const confirmResume = enterPressed && game.pauseMenuSelection === 0;

    if (
      (pauseToggle || confirmResume) &&
      game.stateCooldown <= 0 &&
      game.tick > game.lastStateChangeFrame + 10 // Increased to 10 frames
    ) {
      game.state = STATES.PLAYING;
      game.stateCooldown = 0.5;
      game.lastStateChangeFrame = game.tick;
      game.pauseMenuSelection = 0;
      if (speedrunSystem.isEnabled() && speedrunSystem.active) {
        speedrunSystem.resume();
      }
      clearPressed();
      return;
    }

    clearPressed();
    return;
  }

  // ─── Settings menu state handler (Requirements 18.1-18.8) ───
  if (game.state === STATES.SETTINGS) {
    // Handle settings menu input
    const keys = {
      Tab: isHeld('TAB') || isHeld('DIFFICULTY'),
      ArrowUp: isHeld('UP'),
      ArrowDown: isHeld('DOWN'),
      ArrowLeft: isHeld('LEFT'),
      ArrowRight: isHeld('RIGHT'),
      Enter: isHeld('SPACE') || isHeld('WIND'),
      Escape: isHeld('PAUSE'),
      KeyR: isHeld('RETRY'),
      // Track previous state for edge detection
      prevTab: !!game.prevTab,
      prevArrowUp: !!game.prevArrowUp,
      prevArrowDown: !!game.prevArrowDown,
      prevArrowLeft: !!game.prevArrowLeft,
      prevArrowRight: !!game.prevArrowRight,
      prevEnter: !!game.prevEnter,
      prevEscape: !!game.prevEscape,
      prevKeyR: !!game.prevKeyR,
    };

    settingsMenu.handleInput(keys);

    // Store previous state for next frame
    game.prevTab = keys.Tab;
    game.prevArrowUp = keys.ArrowUp;
    game.prevArrowDown = keys.ArrowDown;
    game.prevArrowLeft = keys.ArrowLeft;
    game.prevArrowRight = keys.ArrowRight;
    game.prevEnter = keys.Enter;
    game.prevEscape = keys.Escape;
    game.prevKeyR = keys.KeyR;

    // Check if settings menu was closed
    if (!settingsMenu.isActive()) {
      game.state = game.returnStateFromSettings || STATES.PAUSED;
      game.stateCooldown = 0.2;
      game.returnStateFromSettings = null;
    }

    clearPressed();
    return;
  }

  // ─── Leaderboard state handler (Requirements 7.3, 7.6, 7.7, 7.8) ───
  if (game.state === STATES.LEADERBOARD) {
    // Close leaderboard with Escape/Pause or L key
    if (justPressed('PAUSE') || justPressed('SKIP')) {
      game.state = STATES.PAUSED;
      game.stateCooldown = 0.2;
    }
    // Cycle filter with TAB (Requirement 7.7)
    if (justPressed('TAB') || justPressed('DIFFICULTY')) {
      const filters = ['deaths', 'time', 'completion'];
      const idx = filters.indexOf(game.leaderboardFilter);
      game.leaderboardFilter = filters[(idx + 1) % filters.length];
    }
    clearPressed();
    return;
  }

  if (game.state === STATES.LEVEL_CLEAR) {
    for (const a of game.autonomousObstacles)
      a.speedMult = Math.max(0, (a.speedMult || 1) - dt * 0.8);
    for (const a of game.autonomousObstacles) a.update(dt, game.roomTime);

    game.levelClearTimer += dt;
    if (game.levelClearTimer < 1.5 && Math.random() < 0.35) {
      const ex = game.camera.x + Math.random() * SCREEN_W;
      const ey = game.camera.y + Math.random() * SCREEN_H;
      spawnSparks(game.particles, ex, ey, 4, [
        COLORS.SPARK_1,
        COLORS.GLOW_WARM,
        COLORS.METAL_LIGHT,
      ]);
    }

    const canAdvance = game.levelClearTimer >= LEVEL_CLEAR_HOLD;
    if ((canAdvance || justPressed('SPACE')) && !game.transition.active) {
      startTransition(1, () => {
        // ─── Show heatmap if there were deaths this level (Requirement 8.2) ───
        const levelDeaths = deathHeatmap.getCurrentDeathCount();
        if (levelDeaths > 0) {
          game.state = STATES.HEATMAP;
          game.heatmapTimer = 0;
          return;
        }
        // No deaths — skip heatmap and advance directly
        _advanceAfterLevelClear();
      });
    }
    clearPressed();
    return;
  }

  if (game.state === STATES.GAME_OVER) {
    if (
      (justPressed('RETRY') || justPressed('SPACE')) &&
      !game.transition.active
    ) {
      startTransition(1, () => {
        loadLevel(game.level);
        game.state = STATES.PLAYING;
      });
    }
    clearPressed();
    return;
  }

  // ─── Heatmap state handler (Requirements 8.2, 8.7) ───
  if (game.state === STATES.HEATMAP) {
    game.heatmapTimer = (game.heatmapTimer || 0) + 1;
    // Skip heatmap with Space (Requirement 8.7)
    if (justPressed('SPACE') && !game.transition.active) {
      startTransition(1, () => {
        _advanceAfterLevelClear();
      });
    }
    clearPressed();
    return;
  }

  // ─── Daily Challenge Menu state (Requirement 9.9) ───
  if (game.state === STATES.DAILY_CHALLENGE_MENU) {
    if (justPressed('PAUSE') || justPressed('RETRY')) {
      // Back to title
      game.state = STATES.TITLE;
    }
    if (justPressed('SPACE') && !game.transition.active) {
      // Start the challenge
      game.state = STATES.DAILY_CHALLENGE_START;
    }
    clearPressed();
    return;
  }

  // ─── Daily Challenge Start Screen (Requirement 9.9) ───
  if (game.state === STATES.DAILY_CHALLENGE_START) {
    if (justPressed('PAUSE') || justPressed('RETRY')) {
      game.state = STATES.DAILY_CHALLENGE_MENU;
    }
    if ((justPressed('SPACE') || game.dailyChallengeForceStart) && !game.transition.active) {
      // Begin the actual challenge
      game.dailyChallengeForceStart = false;
      initAudio();
      resumeAudio();
      startMusic();
      startTransition(1, () => {
        try {
          resetAllDeaths();
          game.deathCount = 0;
          game.level = 1;
          loadLevel(1);
          resetLevelDeaths();
          markRespawnNow(game.gameTime);

          // Start daily challenge
          dailyChallengeSystem.startChallenge();
          const modifier = dailyChallengeSystem.getActiveModifier();
          game.dailyChallenge.active = true;
          game.dailyChallenge.reverseControls = modifier === 'reverse_controls';

          // Apply modifiers to game state
          dailyChallengeSystem.applyModifiers(game);

          game.state = STATES.PLAYING;
          console.log(
            '[DailyChallengeSystem] Challenge gameplay started, modifier:',
            modifier,
          );
        } catch (e) {
          console.error('[DailyChallengeSystem] Error starting challenge:', e);
          game.state = STATES.TITLE;
        }
      });
    }
    clearPressed();
    return;
  }

  // ─── Daily Challenge Complete state (Requirement 9.7, 9.9) ───
  if (game.state === STATES.DAILY_CHALLENGE_COMPLETE) {
    if (justPressed('SPACE') || justPressed('RETRY')) {
      dailyChallengeSystem.removeModifiers(game);
      game.dailyChallenge.active = false;
      game.dailyChallenge.reverseControls = false;
      game.state = STATES.TITLE;
      stopMusic();
      stopAmbientSounds(); // Requirement 11.6
    }
    clearPressed();
    return;
  }

  // ─── Daily Challenge Failed state (Requirement 9.4) ───
  if (game.state === STATES.DAILY_CHALLENGE_FAILED) {
    if (justPressed('SPACE') || justPressed('RETRY')) {
      dailyChallengeSystem.removeModifiers(game);
      game.dailyChallenge.active = false;
      game.dailyChallenge.reverseControls = false;
      game.state = STATES.TITLE;
      stopMusic();
      stopAmbientSounds(); // Requirement 11.6
    }
    clearPressed();
    return;
  }
}

/**
 * Advance to the next level or title screen after level clear + heatmap.
 * Extracted to avoid duplication between LEVEL_CLEAR and HEATMAP transitions.
 */
function _advanceAfterLevelClear() {
  game.level++;
  if (game.level > LEVELS.length) {
    // Complete speedrun if active (Requirement 6.7)
    if (speedrunSystem.isEnabled() && speedrunSystem.active) {
      const isNewBest = speedrunSystem.complete(LEVELS.length);
      if (isNewBest) {
        console.log('[SpeedrunSystem] NEW PERSONAL BEST!');
        try {
          saveSystem.updateSpeedrunData(speedrunSystem.toJSON());
          console.log('[SpeedrunSystem] Saved new personal best');
        } catch (error) {
          console.error(
            '[SpeedrunSystem] Failed to save speedrun data:',
            error,
          );
        }
      }
    }
    game.level = 1;
    game.state = STATES.TITLE;
    stopMusic();
    stopAmbientSounds(); // Requirement 11.6
  } else {
    loadLevel(game.level);
    resetLevelDeaths();
    markRespawnNow(game.gameTime);
    game.state = STATES.PLAYING;
  }
}

function levelClear() {
  if (game.state !== STATES.PLAYING) return;

  // ─── Tutorial completion: show congratulations and complete onboarding (Requirement 19.5, 19.6, 19.7) ───
  if (game.level === 0 && onboardingSystem.isActive()) {
    onboardingSystem.onTutorialComplete();
    onboardingSystem.completeOnboarding();
    playLevelClear();
    playVictoryFanfare();
    game.flash = 0.8;
    game.shake = 14;
    for (let i = 0; i < LEVEL_CLEAR_PARTICLES; i++) {
      const ex = game.camera.x + Math.random() * SCREEN_W;
      const ey = game.camera.y + Math.random() * SCREEN_H;
      spawnSparks(game.particles, ex, ey, 1, [
        COLORS.SPARK_1,
        COLORS.GLOW_WARM,
        COLORS.METAL_LIGHT,
      ]);
    }
    game.state = STATES.ONBOARDING_COMPLETE;
    console.log(
      '[OnboardingSystem] Tutorial completed, showing congratulations',
    );
    return;
  }

  // ─── Daily Challenge: record completion and show challenge complete screen ───
  if (game.dailyChallenge.active) {
    const finalDeaths = getLevelDeathCount();
    const prevStatus = dailyChallengeSystem.getTodayStatus();
    const prevBest = prevStatus.bestScore;
    dailyChallengeSystem.completeChallenge(finalDeaths);
    game.dailyChallenge.completionDeaths = finalDeaths;
    game.dailyChallenge.isNewBest = prevBest === null || finalDeaths < prevBest;
    game.dailyChallenge.active = false;
    dailyChallengeSystem.removeModifiers(game);
    game.dailyChallenge.reverseControls = false;
    playLevelClear();
    playVictoryFanfare(); // Requirement 11.5
    game.flash = 0.8;
    game.shake = 14;
    for (let i = 0; i < LEVEL_CLEAR_PARTICLES; i++) {
      const ex = game.camera.x + Math.random() * SCREEN_W;
      const ey = game.camera.y + Math.random() * SCREEN_H;
      spawnSparks(game.particles, ex, ey, 1, [
        COLORS.SPARK_1,
        COLORS.GLOW_WARM,
        COLORS.METAL_LIGHT,
      ]);
    }
    game.state = STATES.DAILY_CHALLENGE_COMPLETE;
    console.log(
      '[DailyChallengeSystem] Level cleared in challenge mode, deaths:',
      finalDeaths,
    );
    return;
  }

  game.state = STATES.LEVEL_CLEAR;
  game.levelClearTimer = 0;
  playLevelClear();
  playVictoryFanfare(); // Requirement 11.5

  // ─── Track level completion in analytics (Requirement 14.2) ───
  analyticsSystem.trackLevelCompletion(game.level);
  analyticsSystem.persist();

  // Record speedrun split (Requirement 6.2)
  if (speedrunSystem.isEnabled() && speedrunSystem.active) {
    speedrunSystem.recordSplit(game.level);
    console.log('[SpeedrunSystem] Recorded split for level', game.level);
  }

  // ─── Persist heatmap data on level completion (Requirement 8.8) ───
  try {
    deathHeatmap.persist();
    console.log('[DeathHeatmap] Persisted heatmap data for level', game.level);
  } catch (error) {
    console.error('[DeathHeatmap] Failed to persist heatmap data:', error);
  }

  for (let i = 0; i < LEVEL_CLEAR_PARTICLES; i++) {
    const ex = game.camera.x + Math.random() * SCREEN_W;
    const ey = game.camera.y + Math.random() * SCREEN_H;
    spawnSparks(game.particles, ex, ey, 1, [
      COLORS.SPARK_1,
      COLORS.GLOW_WARM,
      COLORS.METAL_LIGHT,
    ]);
  }
  game.flash = 0.8;
  game.shake = 14;
}

function drawWorld() {
  const camX =
    game.camera.x +
    (game.shake > 0 ? Math.round((Math.random() - 0.5) * 4) : 0);
  const camY =
    game.camera.y +
    (game.shake > 0 ? Math.round((Math.random() - 0.5) * 4) : 0);

  drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, COLORS.BACKGROUND);
  drawBackgroundDecor(ctx);

  if (!game.tiles || game.tiles.length === 0 || !game.levelData) {
    return;
  }
  const minTx = Math.max(0, Math.floor(camX / TILE));
  const maxTx = Math.min(
    game.tiles[0].length - 1,
    Math.floor((camX + SCREEN_W) / TILE),
  );
  const minTy = Math.max(0, Math.floor(camY / TILE));
  const maxTy = Math.min(
    game.tiles.length - 1,
    Math.floor((camY + SCREEN_H) / TILE),
  );
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
    drawLethalZone(ctx, lz, camX, camY, game.tick);
  }

  // Draw color betrayal zones (visual troll - looks like safe exit)
  for (const zone of game.colorBetrayalZones || []) {
    if (!zone.activated) {
      drawColorBetrayalTile(ctx, zone, camX, camY);
    }
  }

  if (game.levelData.goalTrigger) {
    const isUnlocked = game.gearsCollected === game.gearTokens.length;
    // Requirement 12.5: Draw pulsing glow effect around unlocked exit door
    drawExitDoorGlow(
      ctx,
      game.levelData.goalTrigger,
      camX,
      camY,
      game.tick,
      isUnlocked,
    );
    drawLockedDoor(
      ctx,
      game.levelData.goalTrigger,
      camX,
      camY,
      game.tick,
      isUnlocked,
    );
  }

  for (const a of game.autonomousObstacles) a.draw(ctx, camX, camY, game.tick);

  // ─── Draw mercy hints for obstacles that have killed player 5+ times ───
  drawMercyHints(
    ctx,
    game.autonomousObstacles,
    { getObstacleDeathCount },
    camX,
    camY,
    game.tick,
  );

  for (const o of game.objects) o.draw(ctx, camX, camY, game.tick);

  for (const t of game.gearTokens) drawGearToken(ctx, t, camX, camY, game.tick);

  // Draw troll tokens (they look identical to regular tokens)
  for (const trollToken of game.trollTokens) {
    if (!trollToken.collected) {
      const tokenData = {
        x: trollToken.x,
        y: trollToken.y,
        angle: trollToken.angle,
        collected: false,
      };
      drawGearToken(ctx, tokenData, camX, camY, game.tick);
    }
  }

  // Draw checkpoints
  for (const checkpoint of game.checkpoints) {
    drawCheckpoint(ctx, checkpoint, camX, camY, game.tick);
  }

  // ─── Draw ghost Mira (behind live Mira) ───
  // Show ghost from death 1 if ghost replay is enabled (Requirement 5.1)
  // Ghost Replay rendering removed as per user request
  /*
  const ghostReplayEnabled = game.difficultyFeatures
    ? game.difficultyFeatures.ghostReplayEnabled
    : true;
  if (
    ghostReplayEnabled &&
    getLevelDeathCount() >= 1 &&
    game.ghostReplay.bestFrames.length > 0
  ) {
    const ghostFrame =
      game.ghostReplay.bestFrames[game.ghostReplay.currentIndex];
    if (ghostFrame) {
      drawGhostMira(ctx, ghostFrame, camX, camY);
      // Advance ghost replay index (circular playback)
      game.ghostReplay.currentIndex =
        (game.ghostReplay.currentIndex + 1) %
        game.ghostReplay.bestFrames.length;
    }

    // Draw ahead/behind indicator (Requirements 5.2, 5.3, 5.4)
    if (
      game.ghostReplay.aheadBehindStatus &&
      game.ghostReplay.aheadBehindStatus !== 'even'
    ) {
      drawGhostAheadBehindIndicator(
        ctx,
        game.player,
        camX,
        camY,
        game.ghostReplay.aheadBehindStatus,
      );
    }
  }
  */

  // ─── Draw speedrun ghost (Requirement 6.5) ───
  if (
    speedrunSystem.isEnabled() &&
    speedrunSystem.active &&
    speedrunSystem.speedrunGhostFrames.length > 0
  ) {
    const speedrunGhostFrame = speedrunSystem.getGhostFrame(
      speedrunSystem.currentTime,
    );
    if (speedrunGhostFrame) {
      drawSpeedrunGhost(ctx, speedrunGhostFrame, camX, camY);
    }
  }

  // ─── Draw player trail effect (Requirement 12.4) ───
  drawPlayerTrail(ctx, camX, camY);

  if (!isDying() || isFreezing()) drawPlayer(ctx, game.player, camX, camY);

  // ─── Draw close-call indicator ───
  if (game.closeCallTimer > 0 && game.closeCallType) {
    drawCloseCallIndicator(
      ctx,
      game.player,
      camX,
      camY,
      game.closeCallType,
      game.closeCallTimer,
    );
  }

  updateAndDrawParticles(ctx, game.particles, 1 / 60, camX, camY);

  const target = findNearestWindable(game.player, game.objects, WIND_RANGE);
  if (
    target &&
    !game.player.isWindingUp &&
    game.state === STATES.PLAYING &&
    !isDying()
  ) {
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
    const cy = 28 + ((i * 7) % 18);
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
    if (game.state === STATES.LOADING) {
      // Draw loading indicator while systems initialize (Requirement 17.4)
      drawLoading(ctx, game.loadingTick || 0);
    } else if (game.state === STATES.TITLE) {
      drawTitle(ctx, game.tick, getTitleUIState());
    } else if (game.state === STATES.ONBOARDING_WELCOME) {
      // Draw onboarding welcome screen (Requirement 19.2)
      drawOnboardingWelcome(ctx, game.tick);
    } else if (game.state === STATES.ONBOARDING_DIFFICULTY) {
      // Draw onboarding difficulty selection (Requirement 19.3)
      drawOnboardingDifficulty(
        ctx,
        game.tick,
        onboardingSystem.getSelectedDifficulty(),
      );
    } else if (game.state === STATES.ONBOARDING_COMPLETE) {
      // Draw onboarding congratulations (Requirement 19.5)
      drawOnboardingComplete(ctx, game.tick);
    } else if (game.state === STATES.LEVEL_EDITOR) {
      // Draw level editor (Requirements 10.1-10.9)
      if (game.levelEditor) {
        drawLevelEditor(ctx, game.levelEditor, game.tick);
      }
    } else if (game.state === STATES.LEVEL_EDITOR_PLAYTEST) {
      // Draw playtest view (Requirement 10.6)
      drawWorld();
      if (game.tiles && game.tiles.length > 0 && game.levelData)
        drawHUD(ctx, game);

      // Draw playtest indicator
      const playtestText = 'PLAYTEST MODE - PRESS P TO RETURN TO EDITOR';
      const playtestWidth = measurePixelText(playtestText, 1);
      drawPixelText(
        ctx,
        playtestText,
        (SCREEN_W - playtestWidth) / 2,
        4,
        COLORS.GLOW_WARM,
        1,
      );
    } else {
      drawWorld();
      game.deathCount = getDeathCount();
      if (game.tiles && game.tiles.length > 0 && game.levelData)
        drawHUD(ctx, game);

      // ─── Draw speedrun timer ───
      if (speedrunSystem.isEnabled() && speedrunSystem.active) {
        drawSpeedrunTimer(ctx, speedrunSystem, game.tick);
      }

      // ─── Draw progress tracker ───
      // Progress tracker removed as per user request
      // if (game.state === STATES.PLAYING && game.progressTracker) {
      //   drawProgressTracker(ctx, game);
      // }

      drawTauntMessage(ctx);
      if (game.state === STATES.LEVEL_CLEAR) {
        drawLevelClear(ctx, getLevelDeathCount(), getDeathCount(), game.tick);
        // Draw speedrun split info (Requirements 6.2, 6.3, 6.4)
        if (speedrunSystem.isEnabled()) {
          drawSpeedrunSplit(ctx, speedrunSystem, game.level);
        }
      }
      if (game.state === STATES.GAME_OVER) drawGameOver(ctx, game.tick);
      if (game.state === STATES.PAUSED)
        drawPaused(ctx, game.tick, game.pauseMenuSelection || 0);
      if (game.state === STATES.SETTINGS) {
        // Draw settings menu (Requirements 18.1-18.8)
        settingsMenu.draw(ctx, game.tick);
      }
      if (game.state === STATES.LEADERBOARD) {
        // Draw leaderboard panel (Requirements 7.3, 7.6, 7.7, 7.8)
        const levelName = game.levelData ? game.levelData.name : '';
        const currentDeaths = game.deathCount || 0;
        const currentTime = speedrunSystem.isEnabled()
          ? speedrunSystem.currentTime
          : null;
        drawLeaderboard(
          ctx,
          leaderboardSystem,
          game.level,
          levelName,
          game.leaderboardFilter,
          game.tick,
          currentDeaths,
          currentTime,
        );
      }
      // ─── Draw heatmap analysis screen (Requirements 8.2–8.7) ───
      if (game.state === STATES.HEATMAP) {
        drawHeatmapScreen(
          ctx,
          deathHeatmap,
          game.tiles,
          game.level,
          game.levelData,
          game.tick,
          game.heatmapTimer,
        );
      }
      // ─── Draw daily challenge screens (Requirements 9.7, 9.9) ───
      if (game.state === STATES.DAILY_CHALLENGE_COMPLETE) {
        drawDailyChallengeComplete(ctx, game, dailyChallengeSystem, game.tick);
      }
      if (game.state === STATES.DAILY_CHALLENGE_FAILED) {
        drawDailyChallengeFailed(ctx, game, dailyChallengeSystem, game.tick);
      }
      // ─── Draw daily challenge HUD during gameplay ───
      if (
        game.state === STATES.PLAYING &&
        game.dailyChallenge &&
        game.dailyChallenge.active
      ) {
        drawDailyChallengeHUD(ctx, game, dailyChallengeSystem, game.tick);
      }
    }

    // ─── Draw touch controls if active (Requirement 3 in Analysis) ───
    if (
      isTouchActive() &&
      game.state !== STATES.TITLE &&
      game.state !== STATES.LOADING &&
      game.state !== STATES.ONBOARDING_WELCOME &&
      game.state !== STATES.ONBOARDING_DIFFICULTY
    ) {
      drawTouchControls(ctx, TOUCH_BUTTONS, isHeld);
    }

    if (game.state === STATES.TITLE) {
      // Draw daily challenge menu on top of title if in that state
    }
    if (game.state === STATES.DAILY_CHALLENGE_MENU) {
      drawDailyChallengeMenu(ctx, dailyChallengeSystem, game.tick);
    }
    if (game.state === STATES.DAILY_CHALLENGE_START) {
      drawDailyChallengeStart(ctx, dailyChallengeSystem, game.tick);
    }
    drawDeathFlash(ctx);
    drawFlashOverlay(ctx, game.flash);
    drawTransition(ctx, game.transition.alpha);

    // ─── Draw metrics dashboard (F12 toggle) (Requirements 20.5) ───
    if (metricsSystem.dashboardVisible) {
      metricsSystem.renderDashboard(ctx);
    }

    // ─── Draw performance overlay (F3 toggle) (Requirement 16.8) ───
    performanceMonitor.renderOverlay(
      ctx,
      game.particles ? game.particles.length : 0,
    );

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
let _loopCount = 0;
function loop(timestamp) {
  _loopCount++;
  if (_loopCount === 1) {
    console.log('[LOOP] First loop iteration, timestamp:', timestamp);
  }
  if (_loopCount === 60) {
    console.log('[LOOP] 60 frames completed (should transition to TITLE)');
  }
  
  const frameStart = performance.now();
  const dt = Math.min((timestamp - lastTime) / 1000, DT_CAP);
  lastTime = timestamp;
  updateTransition(dt);
  try {
    update(dt);
  } catch (e) {
    console.error('[UPDATE ERROR]', e);
  }
  draw();

  // ─── Performance monitoring (Requirements 16.7, 16.8) ───
  const frameTime = performance.now() - frameStart;
  performanceMonitor.recordFrame(frameTime);

  requestAnimationFrame(loop);
}

initInput();
window.addEventListener(
  'pointerdown',
  () => {
    initAudio();
    resumeAudio();
  },
  { once: true },
);

// ─── Start analytics session (Requirement 14.1) ───
analyticsSystem.startSession();

console.log('[GAME] Starting game loop...');
console.log('[GAME] Initial state:', game.state);
console.log('[GAME] Canvas element:', canvas ? 'found' : 'not found');

requestAnimationFrame((t) => {
  console.log('[GAME] First frame requested, timestamp:', t);
  lastTime = t;
  loop(t);
});
