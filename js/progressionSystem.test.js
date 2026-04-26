/*
 * progressionSystem.test.js
 * Unit tests for the ProgressionSystem class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressionSystem } from './progressionSystem.js';
import { saveSystem } from './saveSystem.js';

// Mock the deathSystem module
vi.mock('./deathSystem.js', () => ({
    getDeathCount: vi.fn(() => 0),
    getLevelDeathCount: vi.fn(() => 0)
}));

// Import the mocked functions
import { getDeathCount, getLevelDeathCount } from './deathSystem.js';

describe('ProgressionSystem', () => {
    let progressionSystem;
    
    beforeEach(() => {
        // Clear save data before each test
        saveSystem.clearAllData();
        progressionSystem = new ProgressionSystem();
    });
    
    afterEach(() => {
        // Clean up after each test
        saveSystem.clearAllData();
    });
    
    describe('Skin Unlock Conditions', () => {
        it('should unlock golden skin at 50 deaths', () => {
            expect(progressionSystem.isUnlocked('golden')).toBe(false);
            
            // Simulate 50 deaths
            progressionSystem.checkSkinUnlocks(50, { level: 1 });
            
            expect(progressionSystem.isUnlocked('golden')).toBe(true);
            expect(progressionSystem.getUnlockedSkins()).toContain('golden');
        });
        
        it('should unlock ghost skin at 100 deaths', () => {
            expect(progressionSystem.isUnlocked('ghost')).toBe(false);
            
            // Simulate 100 deaths
            progressionSystem.checkSkinUnlocks(100, { level: 1 });
            
            expect(progressionSystem.isUnlocked('ghost')).toBe(true);
            expect(progressionSystem.getUnlockedSkins()).toContain('ghost');
        });
        
        it('should unlock speedrun skin when completing Level 5 with <30 deaths', () => {
            expect(progressionSystem.isUnlocked('speedrun')).toBe(false);
            
            // Simulate completing Level 5 with 25 deaths
            progressionSystem.checkSkinUnlocks(25, { level: 5, state: 'LEVEL_CLEAR' });
            
            expect(progressionSystem.isUnlocked('speedrun')).toBe(true);
            expect(progressionSystem.getUnlockedSkins()).toContain('speedrun');
        });
        
        it('should not unlock speedrun skin when completing Level 5 with >=30 deaths', () => {
            expect(progressionSystem.isUnlocked('speedrun')).toBe(false);
            
            // Simulate completing Level 5 with 35 deaths
            progressionSystem.checkSkinUnlocks(35, { level: 5, state: 'LEVEL_CLEAR' });
            
            expect(progressionSystem.isUnlocked('speedrun')).toBe(false);
        });
        
        it('should not unlock speedrun skin when not on Level 5', () => {
            expect(progressionSystem.isUnlocked('speedrun')).toBe(false);
            
            // Simulate completing Level 3 with 25 deaths
            progressionSystem.checkSkinUnlocks(25, { level: 3, state: 'LEVEL_CLEAR' });
            
            expect(progressionSystem.isUnlocked('speedrun')).toBe(false);
        });
    });
    
    describe('Achievement System', () => {
        it('should unlock first_blood achievement on first death', () => {
            expect(progressionSystem.isAchievementUnlocked('first_blood')).toBe(false);
            
            // Update player data to have 1 death
            progressionSystem.playerData.totalDeaths = 1;
            progressionSystem.checkAchievements({});
            
            expect(progressionSystem.isAchievementUnlocked('first_blood')).toBe(true);
        });
        
        it('should unlock persistent achievement at 100 deaths', () => {
            expect(progressionSystem.isAchievementUnlocked('persistent')).toBe(false);
            
            // Update player data to have 100 deaths
            progressionSystem.playerData.totalDeaths = 100;
            progressionSystem.checkAchievements({});
            
            expect(progressionSystem.isAchievementUnlocked('persistent')).toBe(true);
        });
        
        it('should unlock close_call_master achievement at 50 close calls', () => {
            expect(progressionSystem.isAchievementUnlocked('close_call_master')).toBe(false);
            
            // Simulate 50 close calls
            for (let i = 0; i < 50; i++) {
                progressionSystem.recordCloseCall();
            }
            
            expect(progressionSystem.isAchievementUnlocked('close_call_master')).toBe(true);
        });
        
        it('should unlock flawless achievement when completing level with 0 deaths', () => {
            expect(progressionSystem.isAchievementUnlocked('flawless')).toBe(false);
            
            // Record a level completion with 0 deaths
            progressionSystem.recordLevelCompletion(1, 0);
            
            expect(progressionSystem.isAchievementUnlocked('flawless')).toBe(true);
        });
    });
    
    describe('Progress Tracking', () => {
        it('should track skin unlock progress correctly', () => {
            const goldenProgress = progressionSystem.getSkinProgress('golden');
            expect(goldenProgress.unlocked).toBe(false);
            expect(goldenProgress.current).toBe(0);
            expect(goldenProgress.target).toBe(50);
            
            // Simulate 25 deaths (50% progress)
            progressionSystem.playerData.totalDeaths = 25;
            const updatedProgress = progressionSystem.getSkinProgress('golden');
            expect(updatedProgress.progress).toBe(50);
            expect(updatedProgress.current).toBe(25);
        });
        
        it('should track achievement progress correctly', () => {
            const persistentProgress = progressionSystem.getAchievementProgress('persistent');
            expect(persistentProgress.unlocked).toBe(false);
            expect(persistentProgress.current).toBe(0);
            expect(persistentProgress.target).toBe(100);
            
            // Simulate 50 deaths (50% progress)
            progressionSystem.playerData.totalDeaths = 50;
            const updatedProgress = progressionSystem.getAchievementProgress('persistent');
            expect(updatedProgress.progress).toBe(50);
            expect(updatedProgress.current).toBe(50);
        });
    });
    
    describe('Notification System', () => {
        it('should queue notifications when unlocking items', () => {
            expect(progressionSystem.getCurrentNotification()).toBe(null);
            
            // Unlock golden skin
            progressionSystem.unlockSkin('golden');
            
            // Should have queued a notification
            expect(progressionSystem.notificationQueue.length).toBe(1);
            
            // Update notifications to show the queued one
            progressionSystem.updateNotifications(0.1);
            
            const notification = progressionSystem.getCurrentNotification();
            expect(notification).not.toBe(null);
            expect(notification.type).toBe('skin');
            expect(notification.name).toBe('Golden Mira');
        });
        
        it('should fade notifications in and out', () => {
            progressionSystem.unlockSkin('golden');
            progressionSystem.updateNotifications(0.1);
            
            // Should fade in (notification just started)
            const fadeInAlpha = progressionSystem.getNotificationAlpha();
            expect(fadeInAlpha).toBeGreaterThan(0);
            expect(fadeInAlpha).toBeLessThanOrEqual(1);
            
            // Wait for fade out period
            progressionSystem.updateNotifications(2.5); // Move to fade out period
            
            // Should be fading out
            const fadeOutAlpha = progressionSystem.getNotificationAlpha();
            expect(fadeOutAlpha).toBeGreaterThan(0);
            expect(fadeOutAlpha).toBeLessThan(1);
        });
    });
    
    describe('Data Persistence', () => {
        it('should save and load progression data', () => {
            // Unlock some items
            progressionSystem.unlockSkin('golden');
            progressionSystem.unlockAchievement('first_blood');
            
            // Create new instance (simulates game restart)
            const newProgressionSystem = new ProgressionSystem();
            
            // Should have loaded the unlocked items
            expect(newProgressionSystem.isUnlocked('golden')).toBe(true);
            expect(newProgressionSystem.isAchievementUnlocked('first_blood')).toBe(true);
        });
        
        it('should update progression based on game state', () => {
            const gameState = {
                level: 1,
                state: 'PLAYING'
            };
            
            // Mock death count to return 50
            getDeathCount.mockReturnValue(50);
            
            progressionSystem.updateProgression(gameState);
            
            // Should have unlocked golden skin
            expect(progressionSystem.isUnlocked('golden')).toBe(true);
        });
    });
    
    describe('Level Completion Tracking', () => {
        it('should record level completion statistics', () => {
            progressionSystem.recordLevelCompletion(1, 5);
            
            const levelStats = progressionSystem.statisticsData.levelStats[1];
            expect(levelStats.completions).toBe(1);
            expect(levelStats.bestDeaths).toBe(5);
            
            // Complete again with fewer deaths
            progressionSystem.recordLevelCompletion(1, 3);
            
            expect(levelStats.completions).toBe(2);
            expect(levelStats.bestDeaths).toBe(3); // Should update to better score
        });
        
        it('should add completed levels to player data', () => {
            expect(progressionSystem.playerData.levelsCompleted).not.toContain(1);
            
            progressionSystem.recordLevelCompletion(1, 5);
            
            expect(progressionSystem.playerData.levelsCompleted).toContain(1);
        });
    });
    
    describe('Close Call Tracking', () => {
        it('should increment close call count', () => {
            expect(progressionSystem.statisticsData.closeCallCount).toBe(0);
            
            progressionSystem.recordCloseCall();
            
            expect(progressionSystem.statisticsData.closeCallCount).toBe(1);
        });
        
        it('should unlock achievement after 50 close calls', () => {
            expect(progressionSystem.isAchievementUnlocked('close_call_master')).toBe(false);
            
            // Record 50 close calls
            for (let i = 0; i < 50; i++) {
                progressionSystem.recordCloseCall();
            }
            
            expect(progressionSystem.isAchievementUnlocked('close_call_master')).toBe(true);
        });
    });
    
    describe('Progression Summary', () => {
        it('should provide comprehensive progression summary', () => {
            progressionSystem.unlockSkin('golden');
            progressionSystem.unlockAchievement('first_blood');
            progressionSystem.recordCloseCall();
            progressionSystem.recordLevelCompletion(1, 5);
            
            const summary = progressionSystem.getProgressionSummary();
            
            expect(summary.unlockedSkins).toContain('golden');
            expect(summary.unlockedAchievements).toContain('first_blood');
            expect(summary.closeCallCount).toBe(1);
            expect(summary.levelsCompleted).toBe(1);
        });
    });
});