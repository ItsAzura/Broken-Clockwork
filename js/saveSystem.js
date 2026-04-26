/*
 * saveSystem.js
 * LocalStorage-based persistence system for Game Retention & Engagement System
 * 
 * Features:
 * - Automatic save triggers (level completion, unlocks, settings changes)
 * - Data validation and corruption recovery
 * - Export/import functionality for backup/restore
 * - Graceful fallback when LocalStorage unavailable
 * - Version management for future data migrations
 */

import { COLORS } from './constants.js';

// Save data version for migration support
const SAVE_DATA_VERSION = "1.0";

// LocalStorage key for game data
const SAVE_KEY = "broken_clockwork_save_data";

// Maximum save data size (2MB, well under LocalStorage 5-10MB limit)
const MAX_SAVE_SIZE = 2 * 1024 * 1024;

// Warning threshold for LocalStorage usage (4MB - warn before 5MB limit)
const LOCALSTORAGE_WARN_THRESHOLD = 4 * 1024 * 1024;

// Analytics data retention period (30 days in milliseconds)
const ANALYTICS_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * SaveSystem class handles all data persistence for the game
 */
export class SaveSystem {
    constructor() {
        this.isLocalStorageAvailable = this.checkLocalStorageAvailability();
        this.fallbackStorage = new Map(); // In-memory fallback
        this.autoSaveEnabled = true;
        this.lastSaveTime = 0;
        this.saveQueue = [];
        
        // Initialize with default save data structure
        this.defaultSaveData = this.createDefaultSaveData();
        
        console.log('[SaveSystem] Initialized, LocalStorage available:', this.isLocalStorageAvailable);
    }
    
    /**
     * Check if LocalStorage is available and functional
     */
    checkLocalStorageAvailability() {
        try {
            const testKey = '__localStorage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            console.warn('[SaveSystem] LocalStorage unavailable:', e.message);
            return false;
        }
    }
    
    /**
     * Create default save data structure
     */
    createDefaultSaveData() {
        return {
            version: SAVE_DATA_VERSION,
            timestamp: Date.now(),
            
            // Player progression
            player: {
                totalDeaths: 0,
                levelDeaths: {},
                levelsCompleted: [],
                currentLevel: 1,
                tutorialCompleted: false,
                onboardingCompleted: false
            },
            
            // Unlockable content
            progression: {
                unlockedSkins: ["default"],
                unlockedAchievements: [],
                skinProgress: {
                    golden: { deaths: 0, unlocked: false },
                    ghost: { deaths: 0, unlocked: false },
                    speedrun: { level5Deaths: 0, unlocked: false }
                }
            },
            
            // Game settings
            settings: {
                difficulty: "Normal",
                selectedSkin: "default",
                audioVolume: {
                    music: 0.7,
                    sfx: 0.7
                },
                accessibility: {
                    colorblindMode: false,
                    reduceMotion: false,
                    textScale: 1,
                    highContrast: false,
                    remappedControls: {}
                }
            },
            
            // Performance tracking
            statistics: {
                sessionCount: 0,
                totalPlayTime: 0,
                averageSessionLength: 0,
                levelStats: {},
                achievements: {},
                closeCallCount: 0,
                // Per-difficulty statistics (Requirement 20.7)
                difficultyStats: {
                    Casual: {
                        sessionCount: 0,
                        totalPlayTime: 0,
                        levelCompletions: {},
                        levelAttempts: {},
                        totalDeaths: 0,
                    },
                    Normal: {
                        sessionCount: 0,
                        totalPlayTime: 0,
                        levelCompletions: {},
                        levelAttempts: {},
                        totalDeaths: 0,
                    },
                    Hardcore: {
                        sessionCount: 0,
                        totalPlayTime: 0,
                        levelCompletions: {},
                        levelAttempts: {},
                        totalDeaths: 0,
                    },
                },
            },
            
            // Progress tracking per level
            progressTracking: {
                personalBests: {}, // { levelId: bestDistance }
                ghostReplays: {}    // { levelId: replayData }
            },
            
            // Speedrun mode data (Requirement 6.7)
            speedrun: {
                enabled: false,
                bestTotalTime: null,
                bestSplits: [],
                speedrunGhostFrames: []
            },
            
            // Analytics data
            analytics: {
                deathLocations: {},
                trapDeaths: {},
                sessionLengths: [],
                returnDates: []
            }
        };
    }
    
    /**
     * Save game data to LocalStorage or fallback storage
     */
    save(data = null) {
        try {
            const saveData = data || this.getCurrentGameData();
            
            // Update timestamp
            saveData.timestamp = Date.now();
            
            // Validate data structure
            if (!this.validateData(saveData)) {
                console.error('[SaveSystem] Data validation failed, skipping save');
                return false;
            }
            
            const serializedData = JSON.stringify(saveData);
            
            // Check size limit
            if (serializedData.length > MAX_SAVE_SIZE) {
                console.warn('[SaveSystem] Save data exceeds size limit, pruning analytics');
                this.pruneAnalyticsData(saveData);
                const prunedData = JSON.stringify(saveData);
                if (prunedData.length > MAX_SAVE_SIZE) {
                    console.error('[SaveSystem] Save data still too large after pruning');
                    return false;
                }
            }
            
            if (this.isLocalStorageAvailable) {
                localStorage.setItem(SAVE_KEY, serializedData);
            } else {
                this.fallbackStorage.set(SAVE_KEY, saveData);
            }
            
            this.lastSaveTime = Date.now();
            console.log('[SaveSystem] Data saved successfully');
            return true;
            
        } catch (error) {
            console.error('[SaveSystem] Save failed:', error);
            this.handleSaveError(error);
            return false;
        }
    }
    
    /**
     * Load game data from LocalStorage or fallback storage
     */
    load() {
        try {
            let rawData = null;
            
            if (this.isLocalStorageAvailable) {
                rawData = localStorage.getItem(SAVE_KEY);
            } else {
                rawData = this.fallbackStorage.get(SAVE_KEY);
                if (rawData) {
                    // Fallback storage stores objects directly
                    return this.migrateSaveData(rawData);
                }
            }
            
            if (!rawData) {
                console.log('[SaveSystem] No save data found, using defaults');
                return this.createDefaultSaveData();
            }
            
            const parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            
            // Validate and migrate data
            const validatedData = this.validateData(parsedData) ? parsedData : this.createDefaultSaveData();
            const migratedData = this.migrateSaveData(validatedData);
            
            console.log('[SaveSystem] Data loaded successfully');
            return migratedData;
            
        } catch (error) {
            console.error('[SaveSystem] Load failed:', error);
            return this.handleLoadError(error);
        }
    }
    
    /**
     * Check if save data exists
     */
    exists() {
        try {
            if (this.isLocalStorageAvailable) {
                return localStorage.getItem(SAVE_KEY) !== null;
            } else {
                return this.fallbackStorage.has(SAVE_KEY);
            }
        } catch (error) {
            console.error('[SaveSystem] Error checking save existence:', error);
            return false;
        }
    }
    
    /**
     * Export save data as JSON string for backup
     */
    exportData() {
        try {
            const saveData = this.load();
            return JSON.stringify(saveData, null, 2);
        } catch (error) {
            console.error('[SaveSystem] Export failed:', error);
            throw new Error('Failed to export save data: ' + error.message);
        }
    }
    
    /**
     * Import save data from JSON string for restore
     */
    importData(jsonString) {
        try {
            const importedData = JSON.parse(jsonString);
            
            if (!this.validateData(importedData)) {
                throw new Error('Invalid save data structure');
            }
            
            const migratedData = this.migrateSaveData(importedData);
            const success = this.save(migratedData);
            
            if (!success) {
                throw new Error('Failed to save imported data');
            }
            
            console.log('[SaveSystem] Data imported successfully');
            return migratedData;
            
        } catch (error) {
            console.error('[SaveSystem] Import failed:', error);
            throw new Error('Failed to import save data: ' + error.message);
        }
    }
    
    /**
     * Validate save data structure
     */
    validateData(data) {
        if (!data || typeof data !== 'object') {
            console.warn('[SaveSystem] Invalid data: not an object');
            return false;
        }
        
        // Check required top-level properties
        const requiredProps = ['version', 'player', 'progression', 'settings', 'statistics'];
        for (const prop of requiredProps) {
            if (!data.hasOwnProperty(prop)) {
                console.warn(`[SaveSystem] Invalid data: missing ${prop}`);
                return false;
            }
        }
        
        // Validate player data
        if (!data.player || typeof data.player.totalDeaths !== 'number') {
            console.warn('[SaveSystem] Invalid player data');
            return false;
        }
        
        // Validate progression data
        if (!data.progression || !Array.isArray(data.progression.unlockedSkins)) {
            console.warn('[SaveSystem] Invalid progression data');
            return false;
        }
        
        // Validate settings data
        if (!data.settings || typeof data.settings.difficulty !== 'string') {
            console.warn('[SaveSystem] Invalid settings data');
            return false;
        }
        
        return true;
    }
    
    /**
     * Migrate save data between versions
     */
    migrateSaveData(data) {
        if (!data.version) {
            console.log('[SaveSystem] Migrating from legacy save data');
            return this.migrateFromLegacy(data);
        }
        
        switch (data.version) {
            case "1.0":
                // Current version, no migration needed
                return data;
            default:
                console.warn('[SaveSystem] Unknown save version:', data.version);
                return this.handleFutureVersion(data);
        }
    }
    
    /**
     * Migrate from pre-retention system save data
     */
    migrateFromLegacy(legacyData) {
        const newData = this.createDefaultSaveData();
        
        // Migrate any existing data we can recognize
        if (legacyData.totalDeaths) {
            newData.player.totalDeaths = legacyData.totalDeaths;
        }
        
        if (legacyData.currentLevel) {
            newData.player.currentLevel = legacyData.currentLevel;
        }
        
        console.log('[SaveSystem] Legacy data migrated');
        return newData;
    }
    
    /**
     * Handle future version save data (graceful degradation)
     */
    handleFutureVersion(futureData) {
        console.warn('[SaveSystem] Future save version detected, attempting graceful handling');
        
        // Try to extract what we can understand
        const currentData = this.createDefaultSaveData();
        
        // Copy compatible fields
        if (futureData.player) {
            Object.assign(currentData.player, futureData.player);
        }
        
        if (futureData.progression) {
            Object.assign(currentData.progression, futureData.progression);
        }
        
        if (futureData.settings) {
            Object.assign(currentData.settings, futureData.settings);
        }
        
        return currentData;
    }
    
    /**
     * Auto-save trigger for level completion
     */
    onLevelComplete(levelId, deathCount, completionTime) {
        if (!this.autoSaveEnabled) return;
        
        try {
            const saveData = this.load();
            
            // Update level completion
            if (!saveData.player.levelsCompleted.includes(levelId)) {
                saveData.player.levelsCompleted.push(levelId);
            }
            
            // Update level statistics
            if (!saveData.statistics.levelStats[levelId]) {
                saveData.statistics.levelStats[levelId] = {
                    attempts: 0,
                    completions: 0,
                    bestDeaths: Infinity,
                    bestTime: Infinity,
                    totalDeaths: 0
                };
            }
            
            const levelStats = saveData.statistics.levelStats[levelId];
            levelStats.completions++;
            levelStats.bestDeaths = Math.min(levelStats.bestDeaths, deathCount);
            levelStats.bestTime = Math.min(levelStats.bestTime, completionTime);
            
            this.save(saveData);
            console.log(`[SaveSystem] Auto-saved level ${levelId} completion`);
            
        } catch (error) {
            console.error('[SaveSystem] Auto-save on level complete failed:', error);
        }
    }
    
    /**
     * Auto-save trigger for unlocks (skins, achievements)
     */
    onUnlock(type, itemId) {
        if (!this.autoSaveEnabled) return;
        
        try {
            const saveData = this.load();
            
            if (type === 'skin') {
                if (!saveData.progression.unlockedSkins.includes(itemId)) {
                    saveData.progression.unlockedSkins.push(itemId);
                }
            } else if (type === 'achievement') {
                if (!saveData.progression.unlockedAchievements.includes(itemId)) {
                    saveData.progression.unlockedAchievements.push(itemId);
                    saveData.statistics.achievements[itemId] = {
                        unlockedAt: new Date().toISOString(),
                        progress: 100
                    };
                }
            }
            
            this.save(saveData);
            console.log(`[SaveSystem] Auto-saved ${type} unlock: ${itemId}`);
            
        } catch (error) {
            console.error('[SaveSystem] Auto-save on unlock failed:', error);
        }
    }
    
    /**
     * Auto-save trigger for settings changes
     */
    onSettingsChange(settingsData) {
        if (!this.autoSaveEnabled) return;
        
        try {
            const saveData = this.load();
            Object.assign(saveData.settings, settingsData);
            
            this.save(saveData);
            console.log('[SaveSystem] Auto-saved settings changes');
            
        } catch (error) {
            console.error('[SaveSystem] Auto-save on settings change failed:', error);
        }
    }
    
    /**
     * Update player statistics
     */
    updateStatistics(stats) {
        try {
            const saveData = this.load();
            Object.assign(saveData.statistics, stats);
            
            this.save(saveData);
            
        } catch (error) {
            console.error('[SaveSystem] Statistics update failed:', error);
        }
    }
    
    /**
     * Update progress tracking data
     */
    updateProgressTracking(levelId, distance, replayData = null) {
        try {
            const saveData = this.load();
            
            if (!saveData.progressTracking.personalBests[levelId] || 
                distance > saveData.progressTracking.personalBests[levelId]) {
                saveData.progressTracking.personalBests[levelId] = distance;
                
                if (replayData) {
                    saveData.progressTracking.ghostReplays[levelId] = replayData;
                }
            }
            
            this.save(saveData);
            
        } catch (error) {
            console.error('[SaveSystem] Progress tracking update failed:', error);
        }
    }
    
    /**
     * Update speedrun data (Requirement 6.7)
     */
    updateSpeedrunData(speedrunData) {
        try {
            const saveData = this.load();
            
            if (!saveData.speedrun) {
                saveData.speedrun = {
                    enabled: false,
                    bestTotalTime: null,
                    bestSplits: [],
                    speedrunGhostFrames: []
                };
            }
            
            Object.assign(saveData.speedrun, speedrunData);
            
            this.save(saveData);
            console.log('[SaveSystem] Speedrun data updated');
            
        } catch (error) {
            console.error('[SaveSystem] Speedrun data update failed:', error);
        }
    }
    
    /**
     * Get speedrun data (Requirement 6.7)
     */
    getSpeedrunData() {
        try {
            const saveData = this.load();
            return saveData.speedrun || {
                enabled: false,
                bestTotalTime: null,
                bestSplits: [],
                speedrunGhostFrames: []
            };
        } catch (error) {
            console.error('[SaveSystem] Get speedrun data failed:', error);
            return {
                enabled: false,
                bestTotalTime: null,
                bestSplits: [],
                speedrunGhostFrames: []
            };
        }
    }
    
    /**
     * Get current game data from game state (to be implemented by game integration)
     */
    getCurrentGameData() {
        // This will be populated by the game when integrating with existing systems
        // For now, return default data
        return this.createDefaultSaveData();
    }
    
    /**
     * Prune analytics data to reduce save size
     */
    pruneAnalyticsData(saveData) {
        // Keep only last 30 days of session data
        const thirtyDaysAgo = Date.now() - ANALYTICS_RETENTION_MS;
        
        if (saveData.analytics.sessionLengths) {
            saveData.analytics.sessionLengths = saveData.analytics.sessionLengths.slice(-100);
        }
        
        if (saveData.analytics.returnDates) {
            saveData.analytics.returnDates = saveData.analytics.returnDates
                .filter(date => new Date(date).getTime() > thirtyDaysAgo);
        }
        
        // Limit death locations per level
        for (const levelId in saveData.analytics.deathLocations) {
            const locations = saveData.analytics.deathLocations[levelId];
            if (locations && locations.length > 1000) {
                saveData.analytics.deathLocations[levelId] = locations.slice(-1000);
            }
        }
    }
    
    /**
     * Handle save errors with fallback strategies
     */
    handleSaveError(error) {
        console.error('[SaveSystem] Save error:', error);
        
        if (error.name === 'QuotaExceededError') {
            // LocalStorage quota exceeded
            console.warn('[SaveSystem] LocalStorage quota exceeded, attempting cleanup');
            try {
                const saveData = this.load();
                this.pruneAnalyticsData(saveData);
                // Try to save pruned data, but don't recurse if it fails again
                const serializedData = JSON.stringify(saveData);
                if (this.isLocalStorageAvailable) {
                    localStorage.setItem(SAVE_KEY, serializedData);
                } else {
                    this.fallbackStorage.set(SAVE_KEY, saveData);
                }
            } catch (cleanupError) {
                console.error('[SaveSystem] Cleanup failed:', cleanupError);
                this.showUserWarning('Storage full - some progress may not save');
            }
        } else {
            // Other save errors - fall back to in-memory storage
            this.isLocalStorageAvailable = false;
            this.showUserWarning('Save failed - progress will not persist between sessions');
        }
    }
    
    /**
     * Handle load errors with recovery strategies
     */
    handleLoadError(error) {
        console.error('[SaveSystem] Load error:', error);
        
        // Attempt data recovery
        const recovered = this.attemptDataRecovery();
        if (recovered) {
            console.log('[SaveSystem] Data recovery successful');
            return recovered;
        }
        
        // Recovery failed - start fresh
        this.showUserWarning('Save data corrupted - starting with fresh progress');
        return this.createDefaultSaveData();
    }
    
    /**
     * Attempt to recover corrupted save data
     */
    attemptDataRecovery() {
        try {
            // Try to recover from backup or partial data
            if (this.isLocalStorageAvailable) {
                const backupKey = SAVE_KEY + '_backup';
                const backupData = localStorage.getItem(backupKey);
                if (backupData) {
                    const parsed = JSON.parse(backupData);
                    if (this.validateData(parsed)) {
                        console.log('[SaveSystem] Recovered from backup');
                        return parsed;
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('[SaveSystem] Data recovery failed:', error);
            return null;
        }
    }
    
    /**
     * Show warning message to user (to be implemented by UI system)
     */
    showUserWarning(message) {
        console.warn('[SaveSystem] User warning:', message);
        // This will be integrated with the game's UI system
        // For now, just log to console
    }
    
    /**
     * Clear all save data (for testing or reset functionality)
     */
    clearAllData() {
        try {
            if (this.isLocalStorageAvailable && typeof localStorage !== 'undefined') {
                localStorage.removeItem(SAVE_KEY);
                localStorage.removeItem(SAVE_KEY + '_backup');
            }
            this.fallbackStorage.clear();
            
            console.log('[SaveSystem] All save data cleared');
            return true;
        } catch (error) {
            console.error('[SaveSystem] Clear data failed:', error);
            return false;
        }
    }
    
    /**
     * Create backup of current save data
     */
    createBackup() {
        try {
            if (!this.isLocalStorageAvailable) return false;
            
            const currentData = localStorage.getItem(SAVE_KEY);
            if (currentData) {
                localStorage.setItem(SAVE_KEY + '_backup', currentData);
                console.log('[SaveSystem] Backup created');
                return true;
            }
            return false;
        } catch (error) {
            console.error('[SaveSystem] Backup creation failed:', error);
            return false;
        }
    }
    
    /**
     * Get save system status for debugging
     */
    getStatus() {
        return {
            localStorageAvailable: this.isLocalStorageAvailable,
            saveExists: this.exists(),
            lastSaveTime: this.lastSaveTime,
            autoSaveEnabled: this.autoSaveEnabled,
            fallbackStorageSize: this.fallbackStorage.size
        };
    }
    
    /**
     * Get current LocalStorage usage in bytes
     */
    getLocalStorageUsage() {
        if (!this.isLocalStorageAvailable) return 0;
        try {
            let total = 0;
            for (const key in localStorage) {
                if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
                    total += (localStorage[key].length + key.length) * 2; // UTF-16 chars = 2 bytes each
                }
            }
            return total;
        } catch (e) {
            console.warn('[SaveSystem] Could not measure LocalStorage usage:', e.message);
            return 0;
        }
    }
    
    /**
     * Monitor LocalStorage usage and warn if approaching limit
     * Requirement 16: Warn if approaching 4MB (buffer before 5MB limit)
     */
    monitorStorageUsage() {
        if (!this.isLocalStorageAvailable) return;
        try {
            const usageBytes = this.getLocalStorageUsage();
            const usageMB = usageBytes / (1024 * 1024);
            
            if (usageBytes > LOCALSTORAGE_WARN_THRESHOLD) {
                console.warn(`[SaveSystem] LocalStorage usage is high: ${usageMB.toFixed(2)}MB (warning threshold: 4MB)`);
                this.showUserWarning(`Storage usage high (${usageMB.toFixed(1)}MB) - cleaning up old data`);
                // Trigger cleanup when approaching limit
                this.cleanupOldData();
            }
            
            return usageMB;
        } catch (e) {
            console.warn('[SaveSystem] Storage monitoring failed:', e.message);
            return 0;
        }
    }
    
    /**
     * Clean up analytics data older than 30 days
     * Called on game load and when storage is getting full
     */
    cleanupOldData() {
        try {
            const saveData = this.load();
            const beforeSize = JSON.stringify(saveData).length;
            
            this.pruneAnalyticsData(saveData);
            
            const afterSize = JSON.stringify(saveData).length;
            const savedBytes = beforeSize - afterSize;
            
            if (savedBytes > 0) {
                this.save(saveData);
                console.log(`[SaveSystem] Cleaned up old data, freed ${(savedBytes / 1024).toFixed(1)}KB`);
            }
            
            return savedBytes;
        } catch (e) {
            console.error('[SaveSystem] Data cleanup failed:', e);
            return 0;
        }
    }
    
    /**
     * Perform periodic cleanup - call once per session on game load
     * Removes analytics data older than 30 days and monitors storage usage
     */
    performPeriodicCleanup() {
        try {
            console.log('[SaveSystem] Performing periodic cleanup...');
            
            // Clean up old analytics data
            this.cleanupOldData();
            
            // Monitor storage usage and warn if needed
            this.monitorStorageUsage();
            
            console.log('[SaveSystem] Periodic cleanup complete');
        } catch (e) {
            console.error('[SaveSystem] Periodic cleanup failed:', e);
        }
    }
}

// Export singleton instance
export const saveSystem = new SaveSystem();