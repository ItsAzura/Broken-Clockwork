/*
 * progressionSystem.js
 * Core progression tracking system for Game Retention & Engagement System
 * 
 * Features:
 * - Skin unlock management (golden, ghost, speedrun)
 * - Achievement system (first_blood, persistent, flawless, close_call_master)
 * - Integration with existing death tracking and level completion systems
 * - Unlock notification queuing and display
 * - Progress persistence through SaveSystem
 */

import { COLORS } from './constants.js';
import { saveSystem } from './saveSystem.js';
import { getDeathCount, getLevelDeathCount } from './deathSystem.js';

// Skin unlock conditions
const SKIN_UNLOCK_CONDITIONS = {
    golden: { type: 'deaths', value: 50 },
    ghost: { type: 'deaths', value: 100 },
    speedrun: { type: 'level5_low_deaths', value: 30 }
};

// Achievement definitions
const ACHIEVEMENTS = {
    first_blood: {
        id: "first_blood",
        name: "First Blood",
        description: "Die for the first time",
        condition: (stats) => stats.totalDeaths >= 1,
        icon: "skull",
        rarity: "common"
    },
    persistent: {
        id: "persistent",
        name: "Persistent",
        description: "Die 100 times",
        condition: (stats) => stats.totalDeaths >= 100,
        icon: "gear",
        rarity: "uncommon"
    },
    flawless: {
        id: "flawless",
        name: "Flawless",
        description: "Complete any level with 0 deaths",
        condition: (stats) => {
            if (!stats.levelStats) return false;
            return Object.values(stats.levelStats).some(level => 
                level.completions > 0 && level.bestDeaths === 0);
        },
        icon: "crown",
        rarity: "rare"
    },
    close_call_master: {
        id: "close_call_master",
        name: "Close Call Master",
        description: "Survive 50 close calls",
        condition: (stats) => stats.closeCallCount >= 50,
        icon: "lightning",
        rarity: "epic"
    }
};

// Skin definitions
const SKINS = {
    default: {
        id: "default",
        name: "Default Mira",
        description: "The original clockwork doll",
        unlocked: true
    },
    golden: {
        id: "golden",
        name: "Golden Mira",
        description: "Forged in the fires of persistence",
        unlockCondition: { type: "deaths", value: 50 }
    },
    ghost: {
        id: "ghost",
        name: "Ghost Mira",
        description: "Echoes of a hundred deaths",
        unlockCondition: { type: "deaths", value: 100 }
    },
    speedrun: {
        id: "speedrun",
        name: "Speedrun Mira",
        description: "Built for velocity",
        unlockCondition: { type: "level5_low_deaths", value: 30 }
    }
};

/**
 * ProgressionSystem class manages unlockable content and achievement tracking
 */
export class ProgressionSystem {
    constructor() {
        this.notificationQueue = [];
        this.currentNotification = null;
        this.notificationTimer = 0;
        this.notificationDuration = 3.0; // 3 seconds display time
        
        // Load existing progression data
        this.loadProgressionData();
        
        console.log('[ProgressionSystem] Initialized');
    }
    
    /**
     * Load progression data from save system
     */
    loadProgressionData() {
        try {
            const saveData = saveSystem.load();
            this.progressionData = saveData.progression;
            this.statisticsData = saveData.statistics;
            this.playerData = saveData.player;
        } catch (error) {
            console.error('[ProgressionSystem] Failed to load progression data:', error);
            // Use default data if loading fails
            this.progressionData = {
                unlockedSkins: ["default"],
                unlockedAchievements: [],
                skinProgress: {
                    golden: { deaths: 0, unlocked: false },
                    ghost: { deaths: 0, unlocked: false },
                    speedrun: { level5Deaths: 0, unlocked: false }
                }
            };
            this.statisticsData = {
                closeCallCount: 0,
                levelStats: {}
            };
            this.playerData = {
                totalDeaths: 0,
                levelsCompleted: []
            };
        }
    }
    
    /**
     * Save progression data to save system
     */
    saveProgressionData() {
        try {
            const saveData = saveSystem.load();
            saveData.progression = this.progressionData;
            saveData.statistics = this.statisticsData;
            saveData.player = this.playerData;
            saveSystem.save(saveData);
        } catch (error) {
            console.error('[ProgressionSystem] Failed to save progression data:', error);
        }
    }
    
    /**
     * Update progression based on current game state
     */
    updateProgression(gameState) {
        const currentDeaths = getDeathCount();
        const levelDeaths = getLevelDeathCount();
        
        // Update player data
        this.playerData.totalDeaths = currentDeaths;
        
        // Check for skin unlocks
        this.checkSkinUnlocks(currentDeaths, gameState);
        
        // Check for achievement unlocks
        this.checkAchievements(gameState);
        
        // Save updated data
        this.saveProgressionData();
    }
    
    /**
     * Check skin unlock conditions based on total deaths and game state
     */
    checkSkinUnlocks(totalDeaths, gameState) {
        // Golden skin: 50 total deaths
        if (totalDeaths >= 50 && !this.isUnlocked('golden')) {
            this.unlockSkin('golden');
        }
        
        // Ghost skin: 100 total deaths
        if (totalDeaths >= 100 && !this.isUnlocked('ghost')) {
            this.unlockSkin('ghost');
        }
        
        // Speedrun skin: Complete Level 5 with <30 total deaths
        if (gameState && gameState.level === 5 && gameState.state === 'LEVEL_CLEAR') {
            if (totalDeaths < 30 && !this.isUnlocked('speedrun')) {
                this.unlockSkin('speedrun');
            }
        }
        
        // Update skin progress tracking
        this.progressionData.skinProgress.golden.deaths = totalDeaths;
        this.progressionData.skinProgress.ghost.deaths = totalDeaths;
        if (gameState && gameState.level === 5) {
            this.progressionData.skinProgress.speedrun.level5Deaths = totalDeaths;
        }
    }
    
    /**
     * Check achievement unlock conditions
     */
    checkAchievements(gameState) {
        const stats = {
            totalDeaths: this.playerData.totalDeaths,
            closeCallCount: this.statisticsData.closeCallCount || 0,
            levelStats: this.statisticsData.levelStats || {}
        };
        
        // Check each achievement
        for (const [achievementId, achievement] of Object.entries(ACHIEVEMENTS)) {
            if (!this.isAchievementUnlocked(achievementId)) {
                if (achievement.condition(stats)) {
                    this.unlockAchievement(achievementId);
                }
            }
        }
    }
    
    /**
     * Unlock a specific skin
     */
    unlockSkin(skinId) {
        if (this.isUnlocked(skinId)) {
            return; // Already unlocked
        }
        
        // Add to unlocked skins
        this.progressionData.unlockedSkins.push(skinId);
        
        // Update skin progress
        if (this.progressionData.skinProgress[skinId]) {
            this.progressionData.skinProgress[skinId].unlocked = true;
        }
        
        // Queue unlock notification
        const skin = SKINS[skinId];
        if (skin) {
            this.queueNotification({
                type: 'skin',
                title: 'SKIN UNLOCKED!',
                name: skin.name,
                description: skin.description,
                icon: 'skin',
                rarity: 'rare'
            });
        }
        
        // Trigger auto-save
        saveSystem.onUnlock('skin', skinId);
        
        console.log(`[ProgressionSystem] Skin unlocked: ${skinId}`);
    }
    
    /**
     * Unlock a specific achievement
     */
    unlockAchievement(achievementId) {
        if (this.isAchievementUnlocked(achievementId)) {
            return; // Already unlocked
        }
        
        // Add to unlocked achievements
        this.progressionData.unlockedAchievements.push(achievementId);
        
        // Queue unlock notification
        const achievement = ACHIEVEMENTS[achievementId];
        if (achievement) {
            this.queueNotification({
                type: 'achievement',
                title: 'ACHIEVEMENT UNLOCKED!',
                name: achievement.name,
                description: achievement.description,
                icon: achievement.icon,
                rarity: achievement.rarity
            });
        }
        
        // Trigger auto-save
        saveSystem.onUnlock('achievement', achievementId);
        
        console.log(`[ProgressionSystem] Achievement unlocked: ${achievementId}`);
    }
    
    /**
     * Check if a skin is unlocked
     */
    isUnlocked(skinId) {
        return this.progressionData.unlockedSkins.includes(skinId);
    }
    
    /**
     * Check if an achievement is unlocked
     */
    isAchievementUnlocked(achievementId) {
        return this.progressionData.unlockedAchievements.includes(achievementId);
    }
    
    /**
     * Get all unlocked skins
     */
    getUnlockedSkins() {
        return this.progressionData.unlockedSkins.slice(); // Return copy
    }
    
    /**
     * Get all unlocked achievements
     */
    getUnlockedAchievements() {
        return this.progressionData.unlockedAchievements.slice(); // Return copy
    }
    
    /**
     * Get skin unlock progress for UI display
     */
    getSkinProgress(skinId) {
        const skin = SKINS[skinId];
        if (!skin || skin.unlocked) {
            return { unlocked: true, progress: 100, requirement: null };
        }
        
        const condition = skin.unlockCondition;
        const currentDeaths = this.playerData.totalDeaths;
        
        switch (condition.type) {
            case 'deaths':
                return {
                    unlocked: this.isUnlocked(skinId),
                    progress: Math.min(100, (currentDeaths / condition.value) * 100),
                    requirement: `${currentDeaths}/${condition.value} deaths`,
                    current: currentDeaths,
                    target: condition.value
                };
                
            case 'level5_low_deaths':
                return {
                    unlocked: this.isUnlocked(skinId),
                    progress: currentDeaths < condition.value ? 100 : 0,
                    requirement: `Complete Level 5 with <${condition.value} deaths`,
                    current: currentDeaths,
                    target: condition.value
                };
                
            default:
                return { unlocked: false, progress: 0, requirement: 'Unknown' };
        }
    }
    
    /**
     * Get achievement progress for UI display
     */
    getAchievementProgress(achievementId) {
        const achievement = ACHIEVEMENTS[achievementId];
        if (!achievement) {
            return { unlocked: false, progress: 0, requirement: 'Unknown' };
        }
        
        if (this.isAchievementUnlocked(achievementId)) {
            return { unlocked: true, progress: 100, requirement: achievement.description };
        }
        
        const stats = {
            totalDeaths: this.playerData.totalDeaths,
            closeCallCount: this.statisticsData.closeCallCount || 0,
            levelStats: this.statisticsData.levelStats || {}
        };
        
        // Calculate progress based on achievement type
        switch (achievementId) {
            case 'first_blood':
                return {
                    unlocked: false,
                    progress: stats.totalDeaths > 0 ? 100 : 0,
                    requirement: achievement.description,
                    current: stats.totalDeaths > 0 ? 1 : 0,
                    target: 1
                };
                
            case 'persistent':
                return {
                    unlocked: false,
                    progress: Math.min(100, (stats.totalDeaths / 100) * 100),
                    requirement: achievement.description,
                    current: stats.totalDeaths,
                    target: 100
                };
                
            case 'close_call_master':
                return {
                    unlocked: false,
                    progress: Math.min(100, (stats.closeCallCount / 50) * 100),
                    requirement: achievement.description,
                    current: stats.closeCallCount,
                    target: 50
                };
                
            case 'flawless':
                const hasFlawless = Object.values(stats.levelStats).some(level => 
                    level.completions > 0 && level.bestDeaths === 0);
                return {
                    unlocked: false,
                    progress: hasFlawless ? 100 : 0,
                    requirement: achievement.description,
                    current: hasFlawless ? 1 : 0,
                    target: 1
                };
                
            default:
                return { unlocked: false, progress: 0, requirement: achievement.description };
        }
    }
    
    /**
     * Queue a notification for display
     */
    queueNotification(notification) {
        this.notificationQueue.push(notification);
        console.log(`[ProgressionSystem] Notification queued: ${notification.name}`);
    }
    
    /**
     * Update notification system (called each frame)
     */
    updateNotifications(dt) {
        // Show next notification if none is currently displayed
        if (!this.currentNotification && this.notificationQueue.length > 0) {
            this.currentNotification = this.notificationQueue.shift();
            this.notificationTimer = this.notificationDuration;
            console.log(`[ProgressionSystem] Showing notification: ${this.currentNotification.name}`);
        }
        
        // Update current notification timer
        if (this.currentNotification && this.notificationTimer > 0) {
            this.notificationTimer -= dt;
            
            if (this.notificationTimer <= 0) {
                this.currentNotification = null;
            }
        }
    }
    
    /**
     * Get current notification for rendering
     */
    getCurrentNotification() {
        return this.currentNotification;
    }
    
    /**
     * Get notification display alpha based on timer
     */
    getNotificationAlpha() {
        if (!this.currentNotification || this.notificationTimer <= 0) {
            return 0;
        }
        
        const fadeTime = 0.5; // Fade in/out duration
        const timeElapsed = this.notificationDuration - this.notificationTimer;
        
        if (timeElapsed < fadeTime) {
            // Fade in - alpha increases from 0 to 1 over fadeTime
            return timeElapsed / fadeTime;
        } else if (this.notificationTimer < fadeTime) {
            // Fade out - alpha decreases from 1 to 0 over fadeTime
            return this.notificationTimer / fadeTime;
        } else {
            // Full opacity
            return 1.0;
        }
    }
    
    /**
     * Record a close call for achievement tracking
     */
    recordCloseCall() {
        this.statisticsData.closeCallCount = (this.statisticsData.closeCallCount || 0) + 1;
        
        // Check for close call master achievement
        if (this.statisticsData.closeCallCount >= 50 && !this.isAchievementUnlocked('close_call_master')) {
            this.unlockAchievement('close_call_master');
        }
        
        this.saveProgressionData();
    }
    
    /**
     * Record level completion for achievement tracking
     */
    recordLevelCompletion(levelId, deathCount) {
        // Update level statistics
        if (!this.statisticsData.levelStats[levelId]) {
            this.statisticsData.levelStats[levelId] = {
                attempts: 0,
                completions: 0,
                bestDeaths: Infinity,
                bestTime: Infinity,
                totalDeaths: 0
            };
        }
        
        const levelStats = this.statisticsData.levelStats[levelId];
        levelStats.completions++;
        levelStats.bestDeaths = Math.min(levelStats.bestDeaths, deathCount);
        
        // Add to completed levels if not already there
        if (!this.playerData.levelsCompleted.includes(levelId)) {
            this.playerData.levelsCompleted.push(levelId);
        }
        
        // Check for flawless achievement
        if (deathCount === 0 && !this.isAchievementUnlocked('flawless')) {
            this.unlockAchievement('flawless');
        }
        
        // Check for speedrun skin unlock (Level 5 with <30 total deaths)
        if (levelId === 5 && this.playerData.totalDeaths < 30 && !this.isUnlocked('speedrun')) {
            this.unlockSkin('speedrun');
        }
        
        this.saveProgressionData();
    }
    
    /**
     * Get all available skins for UI display
     */
    getAllSkins() {
        return Object.values(SKINS);
    }
    
    /**
     * Get all available achievements for UI display
     */
    getAllAchievements() {
        return Object.values(ACHIEVEMENTS);
    }
    
    /**
     * Get progression summary for debugging
     */
    getProgressionSummary() {
        return {
            unlockedSkins: this.progressionData.unlockedSkins,
            unlockedAchievements: this.progressionData.unlockedAchievements,
            totalDeaths: this.playerData.totalDeaths,
            closeCallCount: this.statisticsData.closeCallCount,
            levelsCompleted: this.playerData.levelsCompleted.length,
            notificationQueueLength: this.notificationQueue.length,
            currentNotification: this.currentNotification?.name || null
        };
    }
}

// Export singleton instance
export const progressionSystem = new ProgressionSystem();