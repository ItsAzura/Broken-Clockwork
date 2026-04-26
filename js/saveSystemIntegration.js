/*
 * saveSystemIntegration.js
 * Integration layer between SaveSystem and existing game architecture
 * 
 * This module provides the bridge between the SaveSystem and the main game loop,
 * handling automatic save triggers and data synchronization.
 */

import { saveSystem } from './saveSystem.js';
import { getDeathCount, getLevelDeathCount } from './deathSystem.js';
import { setMusicVolume, setSFXVolume } from './audio.js';

/**
 * SaveSystemIntegration class manages the connection between game state and save system
 */
export class SaveSystemIntegration {
    constructor() {
        this.initialized = false;
        this.gameData = null;
        this.lastAutoSave = 0;
        this.autoSaveInterval = 30000; // Auto-save every 30 seconds
        
        console.log('[SaveSystemIntegration] Initialized');
    }
    
    /**
     * Initialize the save system integration with game state
     */
    initialize(gameState) {
        try {
            // Load existing save data
            this.gameData = saveSystem.load();
            
            // Apply loaded data to game state if available
            this.applyLoadedDataToGame(gameState);
            
            this.initialized = true;
            console.log('[SaveSystemIntegration] Integration initialized successfully');
            
            return this.gameData;
        } catch (error) {
            console.error('[SaveSystemIntegration] Initialization failed:', error);
            return saveSystem.createDefaultSaveData();
        }
    }
    
    /**
     * Apply loaded save data to the game state
     */
    applyLoadedDataToGame(gameState) {
        if (!this.gameData) return;
        
        // Apply player progression
        if (this.gameData.player) {
            // Note: In a full implementation, you would sync this with the actual game state
            // For now, we just store it for future use
            console.log('[SaveSystemIntegration] Player data loaded:', {
                totalDeaths: this.gameData.player.totalDeaths,
                currentLevel: this.gameData.player.currentLevel,
                tutorialCompleted: this.gameData.player.tutorialCompleted
            });
        }
        
        // Apply settings (Requirement 11.8)
        if (this.gameData.settings) {
            // Apply audio volume settings
            if (this.gameData.settings.audioVolume) {
                setMusicVolume(this.gameData.settings.audioVolume.music || 0.7);
                setSFXVolume(this.gameData.settings.audioVolume.sfx || 0.7);
                console.log('[SaveSystemIntegration] Audio volume loaded:', {
                    music: this.gameData.settings.audioVolume.music,
                    sfx: this.gameData.settings.audioVolume.sfx
                });
            }
            
            console.log('[SaveSystemIntegration] Settings loaded:', {
                difficulty: this.gameData.settings.difficulty,
                selectedSkin: this.gameData.settings.selectedSkin
            });
        }
    }
    
    /**
     * Update save data with current game state
     */
    updateGameData(gameState) {
        if (!this.initialized || !this.gameData) return;
        
        try {
            // Update player statistics
            this.gameData.player.totalDeaths = getDeathCount();
            this.gameData.player.currentLevel = gameState.level;
            
            // Update level-specific death counts
            for (let level = 1; level <= 5; level++) {
                const levelDeaths = getLevelDeathCount(level);
                if (levelDeaths > 0) {
                    this.gameData.player.levelDeaths[level] = levelDeaths;
                }
            }
            
            // Update session statistics
            this.gameData.statistics.totalPlayTime = gameState.gameTime * 1000; // Convert to milliseconds
            
            // Update progress tracking
            if (gameState.ghostReplay && gameState.ghostReplay.bestDistance > 0) {
                const levelId = gameState.level;
                this.gameData.progressTracking.personalBests[levelId] = gameState.ghostReplay.bestDistance;
                
                if (gameState.ghostReplay.bestFrames && gameState.ghostReplay.bestFrames.length > 0) {
                    this.gameData.progressTracking.ghostReplays[levelId] = {
                        frames: gameState.ghostReplay.bestFrames.slice(0, 1000), // Limit size
                        distance: gameState.ghostReplay.bestDistance
                    };
                }
            }
            
        } catch (error) {
            console.error('[SaveSystemIntegration] Failed to update game data:', error);
        }
    }
    
    /**
     * Handle level completion event
     */
    onLevelComplete(gameState) {
        if (!this.initialized) return;
        
        try {
            const levelId = gameState.level;
            const deathCount = getLevelDeathCount();
            const completionTime = gameState.gameTime * 1000; // Convert to milliseconds
            
            // Update game data
            this.updateGameData(gameState);
            
            // Mark level as completed
            if (!this.gameData.player.levelsCompleted.includes(levelId)) {
                this.gameData.player.levelsCompleted.push(levelId);
            }
            
            // Trigger auto-save
            saveSystem.onLevelComplete(levelId, deathCount, completionTime);
            
            console.log(`[SaveSystemIntegration] Level ${levelId} completed, auto-saved`);
            
        } catch (error) {
            console.error('[SaveSystemIntegration] Level completion save failed:', error);
        }
    }
    
    /**
     * Handle player death event
     */
    onPlayerDeath(gameState, deathContext) {
        if (!this.initialized) return;
        
        try {
            // Update death statistics
            this.updateGameData(gameState);
            
            // Record death location for analytics
            const levelId = gameState.level;
            if (!this.gameData.analytics.deathLocations[levelId]) {
                this.gameData.analytics.deathLocations[levelId] = [];
            }
            
            const deathLocation = {
                x: Math.round(gameState.player.x),
                y: Math.round(gameState.player.y),
                count: 1,
                killSource: deathContext.killSource || 'unknown'
            };
            
            // Check if death occurred at same location
            const existingLocation = this.gameData.analytics.deathLocations[levelId]
                .find(loc => Math.abs(loc.x - deathLocation.x) < 16 && Math.abs(loc.y - deathLocation.y) < 16);
            
            if (existingLocation) {
                existingLocation.count++;
            } else {
                this.gameData.analytics.deathLocations[levelId].push(deathLocation);
            }
            
            // Update trap death statistics
            if (deathContext.killSource) {
                if (!this.gameData.analytics.trapDeaths[deathContext.killSource]) {
                    this.gameData.analytics.trapDeaths[deathContext.killSource] = 0;
                }
                this.gameData.analytics.trapDeaths[deathContext.killSource]++;
            }
            
            // Check for achievement unlocks based on death count
            this.checkDeathBasedAchievements();
            
        } catch (error) {
            console.error('[SaveSystemIntegration] Death event handling failed:', error);
        }
    }
    
    /**
     * Handle close call event
     */
    onCloseCall(gameState, closeCallType) {
        if (!this.initialized) return;
        
        try {
            this.gameData.statistics.closeCallCount++;
            
            // Check for close call achievement
            if (this.gameData.statistics.closeCallCount >= 50) {
                this.unlockAchievement('close_call_master');
            }
            
        } catch (error) {
            console.error('[SaveSystemIntegration] Close call event handling failed:', error);
        }
    }
    
    /**
     * Check and unlock death-based achievements
     */
    checkDeathBasedAchievements() {
        const totalDeaths = this.gameData.player.totalDeaths;
        
        // First Blood achievement
        if (totalDeaths >= 1 && !this.gameData.progression.unlockedAchievements.includes('first_blood')) {
            this.unlockAchievement('first_blood');
        }
        
        // Persistent achievement
        if (totalDeaths >= 100 && !this.gameData.progression.unlockedAchievements.includes('persistent')) {
            this.unlockAchievement('persistent');
        }
        
        // Check skin unlocks
        this.checkSkinUnlocks();
    }
    
    /**
     * Check and unlock skins based on death count
     */
    checkSkinUnlocks() {
        const totalDeaths = this.gameData.player.totalDeaths;
        
        // Golden skin at 50 deaths
        if (totalDeaths >= 50 && !this.gameData.progression.unlockedSkins.includes('golden')) {
            this.unlockSkin('golden');
        }
        
        // Ghost skin at 100 deaths
        if (totalDeaths >= 100 && !this.gameData.progression.unlockedSkins.includes('ghost')) {
            this.unlockSkin('ghost');
        }
    }
    
    /**
     * Unlock a skin and trigger save
     */
    unlockSkin(skinId) {
        try {
            if (!this.gameData.progression.unlockedSkins.includes(skinId)) {
                this.gameData.progression.unlockedSkins.push(skinId);
                saveSystem.onUnlock('skin', skinId);
                
                console.log(`[SaveSystemIntegration] Skin unlocked: ${skinId}`);
                
                // Return unlock notification data for UI
                return {
                    type: 'skin',
                    id: skinId,
                    name: this.getSkinDisplayName(skinId),
                    description: this.getSkinDescription(skinId)
                };
            }
        } catch (error) {
            console.error('[SaveSystemIntegration] Skin unlock failed:', error);
        }
        
        return null;
    }
    
    /**
     * Unlock an achievement and trigger save
     */
    unlockAchievement(achievementId) {
        try {
            if (!this.gameData.progression.unlockedAchievements.includes(achievementId)) {
                this.gameData.progression.unlockedAchievements.push(achievementId);
                saveSystem.onUnlock('achievement', achievementId);
                
                console.log(`[SaveSystemIntegration] Achievement unlocked: ${achievementId}`);
                
                // Return unlock notification data for UI
                return {
                    type: 'achievement',
                    id: achievementId,
                    name: this.getAchievementDisplayName(achievementId),
                    description: this.getAchievementDescription(achievementId)
                };
            }
        } catch (error) {
            console.error('[SaveSystemIntegration] Achievement unlock failed:', error);
        }
        
        return null;
    }
    
    /**
     * Periodic auto-save check
     */
    update(gameState, deltaTime) {
        if (!this.initialized) return;
        
        const now = Date.now();
        if (now - this.lastAutoSave > this.autoSaveInterval) {
            this.performAutoSave(gameState);
            this.lastAutoSave = now;
        }
    }
    
    /**
     * Perform automatic save
     */
    performAutoSave(gameState) {
        try {
            this.updateGameData(gameState);
            saveSystem.save(this.gameData);
            console.log('[SaveSystemIntegration] Auto-save completed');
        } catch (error) {
            console.error('[SaveSystemIntegration] Auto-save failed:', error);
        }
    }
    
    /**
     * Manual save trigger
     */
    manualSave(gameState) {
        try {
            this.updateGameData(gameState);
            const success = saveSystem.save(this.gameData);
            
            if (success) {
                console.log('[SaveSystemIntegration] Manual save completed');
                return { success: true, message: 'Game saved successfully' };
            } else {
                return { success: false, message: 'Save failed - check console for details' };
            }
        } catch (error) {
            console.error('[SaveSystemIntegration] Manual save failed:', error);
            return { success: false, message: 'Save failed: ' + error.message };
        }
    }
    
    /**
     * Update audio volume settings (Requirement 11.8)
     */
    updateAudioVolume(musicVolume, sfxVolume) {
        try {
            if (!this.gameData.settings.audioVolume) {
                this.gameData.settings.audioVolume = { music: 0.7, sfx: 0.7 };
            }
            
            this.gameData.settings.audioVolume.music = musicVolume;
            this.gameData.settings.audioVolume.sfx = sfxVolume;
            
            // Apply settings immediately
            setMusicVolume(musicVolume);
            setSFXVolume(sfxVolume);
            
            // Save to persistence
            saveSystem.onSettingsChange(this.gameData.settings);
            
            console.log('[SaveSystemIntegration] Audio volume updated:', { music: musicVolume, sfx: sfxVolume });
            
            return { success: true };
        } catch (error) {
            console.error('[SaveSystemIntegration] Audio volume update failed:', error);
            return { success: false, message: error.message };
        }
    }
    
    /**
     * Export save data for backup
     */
    exportSaveData() {
        try {
            return saveSystem.exportData();
        } catch (error) {
            console.error('[SaveSystemIntegration] Export failed:', error);
            throw error;
        }
    }
    
    /**
     * Import save data from backup
     */
    importSaveData(jsonString) {
        try {
            this.gameData = saveSystem.importData(jsonString);
            console.log('[SaveSystemIntegration] Save data imported successfully');
            return { success: true, message: 'Save data imported successfully' };
        } catch (error) {
            console.error('[SaveSystemIntegration] Import failed:', error);
            return { success: false, message: 'Import failed: ' + error.message };
        }
    }
    
    /**
     * Get current save system status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            saveSystem: saveSystem.getStatus(),
            gameData: this.gameData ? {
                totalDeaths: this.gameData.player.totalDeaths,
                currentLevel: this.gameData.player.currentLevel,
                unlockedSkins: this.gameData.progression.unlockedSkins.length,
                unlockedAchievements: this.gameData.progression.unlockedAchievements.length
            } : null
        };
    }
    
    // Helper methods for UI display
    getSkinDisplayName(skinId) {
        const names = {
            'default': 'Default Mira',
            'golden': 'Golden Mira',
            'ghost': 'Ghost Mira',
            'speedrun': 'Speedrun Mira'
        };
        return names[skinId] || skinId;
    }
    
    getSkinDescription(skinId) {
        const descriptions = {
            'default': 'The original clockwork doll',
            'golden': 'Forged in the fires of persistence',
            'ghost': 'Echoes of a hundred deaths',
            'speedrun': 'Built for velocity'
        };
        return descriptions[skinId] || 'Unknown skin';
    }
    
    getAchievementDisplayName(achievementId) {
        const names = {
            'first_blood': 'First Blood',
            'persistent': 'Persistent',
            'flawless': 'Flawless',
            'close_call_master': 'Close Call Master'
        };
        return names[achievementId] || achievementId;
    }
    
    getAchievementDescription(achievementId) {
        const descriptions = {
            'first_blood': 'Die for the first time',
            'persistent': 'Die 100 times',
            'flawless': 'Complete any level with 0 deaths',
            'close_call_master': 'Survive 50 close calls'
        };
        return descriptions[achievementId] || 'Unknown achievement';
    }
}

// Export singleton instance
export const saveSystemIntegration = new SaveSystemIntegration();