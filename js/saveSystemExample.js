/*
 * saveSystemExample.js
 * Example integration of SaveSystem with the main game loop
 * 
 * This file shows how to integrate the SaveSystem with the existing game architecture.
 * Add these integration points to main.js to enable the save system.
 */

import { saveSystemIntegration } from './saveSystemIntegration.js';

/**
 * Example integration points for main.js
 * 
 * These code snippets show where to add save system integration
 * in the existing game architecture.
 */

// ═══════ 1. INITIALIZATION (add to main.js after game object creation) ═══════
/*
// Initialize save system integration
const saveData = saveSystemIntegration.initialize(game);

// Apply loaded settings to game state
if (saveData.settings) {
    // Apply difficulty settings (when difficulty system is implemented)
    // game.difficulty = saveData.settings.difficulty;
    
    // Apply audio settings (when audio system supports it)
    // setMusicVolume(saveData.settings.audioVolume.music);
    // setSFXVolume(saveData.settings.audioVolume.sfx);
}

// Apply progression data
if (saveData.player) {
    // Set current level if returning player
    if (saveData.player.currentLevel > 1 && saveData.player.levelsCompleted.length > 0) {
        game.level = saveData.player.currentLevel;
    }
    
    // Apply tutorial completion status
    if (saveData.player.tutorialCompleted) {
        // Skip tutorial for returning players
        game.tutorialCompleted = true;
    }
}
*/

// ═══════ 2. LEVEL COMPLETION (add to levelClear() function) ═══════
/*
function levelClear() {
    if (game.state !== STATES.PLAYING) return;
    
    // Existing level clear logic...
    game.state = STATES.LEVEL_CLEAR;
    game.levelClearTimer = 0;
    playLevelClear();
    
    // ADD: Save system integration
    saveSystemIntegration.onLevelComplete(game);
    
    // Check for skin unlocks based on completion
    const totalDeaths = getDeathCount();
    if (game.level === 5 && totalDeaths < 30) {
        const unlock = saveSystemIntegration.unlockSkin('speedrun');
        if (unlock) {
            // Show unlock notification
            showMessage(`SKIN UNLOCKED: ${unlock.name}`, 2.0);
        }
    }
    
    // Existing particle effects...
    for (let i = 0; i < LEVEL_CLEAR_PARTICLES; i++) {
        const ex = game.camera.x + Math.random() * SCREEN_W;
        const ey = game.camera.y + Math.random() * SCREEN_H;
        spawnSparks(game.particles, ex, ey, 1,
            [COLORS.SPARK_1, COLORS.GLOW_WARM, COLORS.METAL_LIGHT]);
    }
    game.flash = 0.8;
    game.shake = 14;
}
*/

// ═══════ 3. PLAYER DEATH (add to dieNow() function) ═══════
/*
function dieNow(context) {
    if (isDying()) return;
    
    // Existing death logic...
    const hadAll = (game.gearTokens.length > 0 && game.gearsCollected === game.gearTokens.length);
    const ctxInfo = Object.assign({ hadAllTokens: hadAll }, context || {});
    
    // ADD: Save system integration
    saveSystemIntegration.onPlayerDeath(game, ctxInfo);
    
    // Check for achievement unlocks
    const unlock = saveSystemIntegration.checkDeathBasedAchievements();
    if (unlock) {
        // Queue unlock notification for after respawn
        game.pendingUnlockNotification = unlock;
    }
    
    // Existing death system...
    triggerDeath(game.player, game.particles, ctxInfo);
}
*/

// ═══════ 4. CLOSE CALL DETECTION (add to handleCloseCall() function) ═══════
/*
function handleCloseCall() {
    // Existing close call detection...
    const hit = getPlayerHitbox(game.player);
    
    for (const obstacle of game.autonomousObstacles) {
        const bounds = obstacle.getBounds();
        if (!bounds) continue;
        
        if (rectOverlapsBounds(hit, bounds)) {
            continue;
        }
        
        const distance = distanceToBounds(hit, bounds);
        
        if (distance > 0 && distance <= EXTREME_CLOSE_CALL_DISTANCE) {
            if (!obstacle._wasCloseCall) {
                game.closeCallType = 'extreme';
                game.closeCallTimer = EXTREME_CLOSE_CALL_DISPLAY_FRAMES;
                playExtremeCloseCall();
                game.flash = 0.15;
                obstacle._wasCloseCall = true;
                
                // ADD: Save system integration
                saveSystemIntegration.onCloseCall(game, 'extreme');
            }
        }
        else if (distance > EXTREME_CLOSE_CALL_DISTANCE && distance <= CLOSE_CALL_DISTANCE) {
            if (!obstacle._wasCloseCall) {
                game.closeCallType = 'close';
                game.closeCallTimer = CLOSE_CALL_DISPLAY_FRAMES;
                playCloseCall();
                obstacle._wasCloseCall = true;
                
                // ADD: Save system integration
                saveSystemIntegration.onCloseCall(game, 'close');
            }
        }
        else if (distance > CLOSE_CALL_DISTANCE) {
            obstacle._wasCloseCall = false;
        }
    }
}
*/

// ═══════ 5. MAIN UPDATE LOOP (add to update() function) ═══════
/*
function update(dt) {
    // Existing update logic...
    game.tick++;
    game.gameTime += dt;
    
    // ADD: Save system update (for auto-save)
    saveSystemIntegration.update(game, dt);
    
    // Show pending unlock notifications
    if (game.pendingUnlockNotification && game.messageTimer <= 0) {
        const unlock = game.pendingUnlockNotification;
        showMessage(`${unlock.type.toUpperCase()} UNLOCKED: ${unlock.name}`, 2.0);
        game.pendingUnlockNotification = null;
    }
    
    // Existing state handling...
    if (game.state === STATES.TITLE) {
        // ... existing title logic
    }
    
    // ... rest of update function
}
*/

// ═══════ 6. PAUSE MENU INTEGRATION (add to pause menu handling) ═══════
/*
// Add these options to the pause menu when implemented:

function handlePauseMenuInput() {
    // Existing pause menu logic...
    
    if (justPressed('SAVE')) {
        const result = saveSystemIntegration.manualSave(game);
        showMessage(result.message, 1.5);
    }
    
    if (justPressed('EXPORT')) {
        try {
            const exportData = saveSystemIntegration.exportSaveData();
            // Copy to clipboard or show export dialog
            navigator.clipboard.writeText(exportData);
            showMessage('SAVE DATA COPIED TO CLIPBOARD', 2.0);
        } catch (error) {
            showMessage('EXPORT FAILED', 1.5);
        }
    }
    
    if (justPressed('STATUS')) {
        const status = saveSystemIntegration.getStatus();
        console.log('Save System Status:', status);
        showMessage(`DEATHS: ${status.gameData?.totalDeaths || 0} | SKINS: ${status.gameData?.unlockedSkins || 0}`, 2.0);
    }
}
*/

// ═══════ 7. SETTINGS INTEGRATION (when settings system is implemented) ═══════
/*
function applySettings(newSettings) {
    // Apply settings to game
    // ... existing settings logic
    
    // ADD: Save settings changes
    saveSystemIntegration.gameData.settings = Object.assign(
        saveSystemIntegration.gameData.settings,
        newSettings
    );
    
    // Trigger auto-save for settings
    saveSystem.onSettingsChange(newSettings);
}
*/

// ═══════ 8. PROGRESS TRACKING INTEGRATION ═══════
/*
// Add to ghost replay system updates
function updateGhostReplay() {
    // Existing ghost replay logic...
    recordGhostFrame();
    
    const currentDistance = calculatePlayerDistance(game.player, game.lastSpawn);
    if (currentDistance > game.ghostReplay.bestDistance) {
        game.ghostReplay.bestDistance = currentDistance;
        game.ghostReplay.bestFrames = game.ghostReplay.frames.slice();
        
        // ADD: Update progress tracking in save system
        saveSystemIntegration.gameData.progressTracking.personalBests[game.level] = currentDistance;
        saveSystemIntegration.gameData.progressTracking.ghostReplays[game.level] = {
            frames: game.ghostReplay.bestFrames.slice(0, 1000), // Limit size
            distance: currentDistance
        };
    }
}
*/

/**
 * Example usage and testing functions
 */

// Test save system functionality
export function testSaveSystem() {
    console.log('=== Save System Test ===');
    
    // Initialize
    const mockGame = {
        level: 1,
        gameTime: 120,
        player: { x: 100, y: 200 },
        ghostReplay: { bestDistance: 500, bestFrames: [] }
    };
    
    const saveData = saveSystemIntegration.initialize(mockGame);
    console.log('Initial save data:', saveData);
    
    // Simulate level completion
    saveSystemIntegration.onLevelComplete(mockGame);
    console.log('Level completed');
    
    // Simulate death
    saveSystemIntegration.onPlayerDeath(mockGame, { killSource: 'fake_safe_zone' });
    console.log('Player died');
    
    // Check status
    const status = saveSystemIntegration.getStatus();
    console.log('Final status:', status);
    
    console.log('=== Test Complete ===');
}

// Export for testing
if (typeof window !== 'undefined') {
    window.testSaveSystem = testSaveSystem;
}