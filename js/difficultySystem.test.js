/*
 * difficultySystem.test.js
 * Unit tests for the Difficulty System
 * 
 * Tests difficulty modifiers, settings persistence, and game integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DifficultySystem, DIFFICULTY_LEVELS } from './difficultySystem.js';
import { COYOTE_DEATH_FRAMES, GAUGE_DRAIN_RATE } from './constants.js';

describe('Difficulty System', () => {
    let difficultySystem;
    
    beforeEach(() => {
        difficultySystem = new DifficultySystem();
        // Reset to default difficulty
        difficultySystem.resetToDefault();
    });
    
    describe('Difficulty Level Management', () => {
        it('should start with Normal difficulty by default', () => {
            expect(difficultySystem.getDifficulty()).toBe(DIFFICULTY_LEVELS.NORMAL);
        });
        
        it('should allow setting valid difficulty levels', () => {
            expect(difficultySystem.setDifficulty(DIFFICULTY_LEVELS.CASUAL)).toBe(true);
            expect(difficultySystem.getDifficulty()).toBe(DIFFICULTY_LEVELS.CASUAL);
            
            expect(difficultySystem.setDifficulty(DIFFICULTY_LEVELS.HARDCORE)).toBe(true);
            expect(difficultySystem.getDifficulty()).toBe(DIFFICULTY_LEVELS.HARDCORE);
        });
        
        it('should reject invalid difficulty levels', () => {
            expect(difficultySystem.setDifficulty('Invalid')).toBe(false);
            expect(difficultySystem.getDifficulty()).toBe(DIFFICULTY_LEVELS.NORMAL);
        });
        
        it('should cycle through difficulty levels', () => {
            expect(difficultySystem.getDifficulty()).toBe(DIFFICULTY_LEVELS.NORMAL);
            
            const next1 = difficultySystem.cycleDifficulty();
            expect(next1).toBe(DIFFICULTY_LEVELS.HARDCORE);
            
            const next2 = difficultySystem.cycleDifficulty();
            expect(next2).toBe(DIFFICULTY_LEVELS.CASUAL);
            
            const next3 = difficultySystem.cycleDifficulty();
            expect(next3).toBe(DIFFICULTY_LEVELS.NORMAL);
        });
        
        it('should return available difficulty levels', () => {
            const available = difficultySystem.getAvailableDifficulties();
            expect(available).toEqual([
                DIFFICULTY_LEVELS.CASUAL,
                DIFFICULTY_LEVELS.NORMAL,
                DIFFICULTY_LEVELS.HARDCORE
            ]);
        });
    });
    
    describe('Difficulty Modifiers', () => {
        it('should provide correct modifiers for Casual difficulty', () => {
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.CASUAL);
            const modifiers = difficultySystem.getModifiers();
            
            expect(modifiers.obstacleSpeedMultiplier).toBe(0.8); // -20%
            expect(modifiers.gaugeDrainMultiplier).toBe(0.7);    // -30%
            expect(modifiers.coyoteFrames).toBe(4);              // 4 frames
            expect(modifiers.ghostReplayEnabled).toBe(true);
            expect(modifiers.mercyHintsEnabled).toBe(true);
        });
        
        it('should provide correct modifiers for Normal difficulty', () => {
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.NORMAL);
            const modifiers = difficultySystem.getModifiers();
            
            expect(modifiers.obstacleSpeedMultiplier).toBe(1.0); // 0%
            expect(modifiers.gaugeDrainMultiplier).toBe(1.0);    // 0%
            expect(modifiers.coyoteFrames).toBe(2);              // 2 frames
            expect(modifiers.ghostReplayEnabled).toBe(true);
            expect(modifiers.mercyHintsEnabled).toBe(true);
        });
        
        it('should provide correct modifiers for Hardcore difficulty', () => {
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.HARDCORE);
            const modifiers = difficultySystem.getModifiers();
            
            expect(modifiers.obstacleSpeedMultiplier).toBe(1.15); // +15%
            expect(modifiers.gaugeDrainMultiplier).toBe(1.0);     // 0%
            expect(modifiers.coyoteFrames).toBe(2);               // 2 frames
            expect(modifiers.ghostReplayEnabled).toBe(false);
            expect(modifiers.mercyHintsEnabled).toBe(false);
        });
        
        it('should return modifier copies to prevent external modification', () => {
            const modifiers1 = difficultySystem.getModifiers();
            const modifiers2 = difficultySystem.getModifiers();
            
            expect(modifiers1).not.toBe(modifiers2); // Different objects
            expect(modifiers1).toEqual(modifiers2);  // Same content
            
            // Modifying returned object should not affect internal state
            modifiers1.obstacleSpeedMultiplier = 999;
            expect(difficultySystem.getModifiers().obstacleSpeedMultiplier).not.toBe(999);
        });
    });
    
    describe('Modifier Application', () => {
        it('should apply obstacle speed modifiers correctly', () => {
            const mockGame = {
                autonomousObstacles: [
                    { type: 'PISTON', period: 2.0 },
                    { type: 'BOUNCING_BALL', speed: 100 },
                    { type: 'ORBIT_SPHERE', speed: 1.0 },
                    { type: 'PENDULUM', frequency: 1.0 }
                ]
            };
            
            // Test Casual difficulty (-20% speed = slower obstacles)
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.CASUAL);
            difficultySystem.applyDifficultyModifiers(mockGame);
            
            // For period-based obstacles, slower = longer period
            expect(mockGame.autonomousObstacles[0].period).toBeCloseTo(2.5); // 2.0 / 0.8
            
            // For speed-based obstacles, slower = lower speed
            expect(mockGame.autonomousObstacles[1].speed).toBeCloseTo(80);   // 100 * 0.8
            expect(mockGame.autonomousObstacles[2].speed).toBeCloseTo(0.8);  // 1.0 * 0.8
            
            // For frequency-based obstacles, slower = lower frequency
            expect(mockGame.autonomousObstacles[3].frequency).toBeCloseTo(0.8); // 1.0 * 0.8
        });
        
        it('should apply gauge drain modifiers correctly', () => {
            const mockGame = {
                player: {}
            };
            
            // Test Casual difficulty (-30% drain = slower drain)
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.CASUAL);
            difficultySystem.applyDifficultyModifiers(mockGame);
            
            expect(mockGame.player.baseDrainRate).toBe(GAUGE_DRAIN_RATE);
            expect(mockGame.player.gaugeDrainRate).toBeCloseTo(GAUGE_DRAIN_RATE * 0.7);
            expect(mockGame.difficultyGaugeDrainRate).toBeCloseTo(GAUGE_DRAIN_RATE * 0.7);
        });
        
        it('should apply coyote frame modifiers correctly', () => {
            const mockGame = {};
            
            // Test Casual difficulty (4 coyote frames)
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.CASUAL);
            difficultySystem.applyDifficultyModifiers(mockGame);
            
            expect(mockGame.difficultyCoyoteFrames).toBe(4);
            
            // Test Normal difficulty (2 coyote frames)
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.NORMAL);
            difficultySystem.applyDifficultyModifiers(mockGame);
            
            expect(mockGame.difficultyCoyoteFrames).toBe(2);
        });
        
        it('should apply feature toggles correctly', () => {
            const mockGame = {};
            
            // Test Hardcore difficulty (features disabled)
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.HARDCORE);
            difficultySystem.applyDifficultyModifiers(mockGame);
            
            expect(mockGame.difficultyFeatures.ghostReplayEnabled).toBe(false);
            expect(mockGame.difficultyFeatures.mercyHintsEnabled).toBe(false);
            
            // Test Casual difficulty (features enabled)
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.CASUAL);
            difficultySystem.applyDifficultyModifiers(mockGame);
            
            expect(mockGame.difficultyFeatures.ghostReplayEnabled).toBe(true);
            expect(mockGame.difficultyFeatures.mercyHintsEnabled).toBe(true);
        });
        
        it('should preserve base speeds for repeated applications', () => {
            const mockGame = {
                autonomousObstacles: [
                    { type: 'PISTON', period: 2.0 }
                ]
            };
            
            // Apply Casual difficulty
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.CASUAL);
            difficultySystem.applyDifficultyModifiers(mockGame);
            
            const casualPeriod = mockGame.autonomousObstacles[0].period;
            expect(casualPeriod).toBeCloseTo(2.5); // 2.0 / 0.8
            
            // Apply Hardcore difficulty
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.HARDCORE);
            difficultySystem.applyDifficultyModifiers(mockGame);
            
            const hardcorePeriod = mockGame.autonomousObstacles[0].period;
            expect(hardcorePeriod).toBeCloseTo(1.74); // 2.0 / 1.15
            
            // Should be based on original speed, not previous modification
            expect(mockGame.autonomousObstacles[0].baseSpeeds.period).toBe(2.0);
        });
    });
    
    describe('Convenience Methods', () => {
        it('should provide individual modifier getters', () => {
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.CASUAL);
            
            expect(difficultySystem.getObstacleSpeedMultiplier()).toBe(0.8);
            expect(difficultySystem.getGaugeDrainMultiplier()).toBe(0.7);
            expect(difficultySystem.getCoyoteFrames()).toBe(4);
            expect(difficultySystem.isGhostReplayEnabled()).toBe(true);
            expect(difficultySystem.areMercyHintsEnabled()).toBe(true);
        });
        
        it('should provide difficulty descriptions', () => {
            const casualDesc = difficultySystem.getDifficultyDescription(DIFFICULTY_LEVELS.CASUAL);
            expect(casualDesc).toContain('Slower obstacles');
            
            const normalDesc = difficultySystem.getDifficultyDescription(DIFFICULTY_LEVELS.NORMAL);
            expect(normalDesc).toContain('Balanced experience');
            
            const hardcoreDesc = difficultySystem.getDifficultyDescription(DIFFICULTY_LEVELS.HARDCORE);
            expect(hardcoreDesc).toContain('Faster obstacles');
        });
        
        it('should provide modifier summaries for UI display', () => {
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.CASUAL);
            const summary = difficultySystem.getDifficultyModifierSummary();
            
            expect(summary.obstacleSpeed).toBe('-20%');
            expect(summary.gaugeDrain).toBe('-30%');
            expect(summary.coyoteFrames).toBe('4 frames');
            expect(summary.ghostReplay).toBe('Enabled');
            expect(summary.mercyHints).toBe('Enabled');
        });
    });
    
    describe('Error Handling', () => {
        it('should handle missing game state gracefully', () => {
            expect(() => {
                difficultySystem.applyDifficultyModifiers(null);
            }).not.toThrow();
            
            expect(() => {
                difficultySystem.applyDifficultyModifiers(undefined);
            }).not.toThrow();
        });
        
        it('should handle missing obstacle arrays gracefully', () => {
            const mockGame = {}; // No autonomousObstacles array
            
            expect(() => {
                difficultySystem.applyDifficultyModifiers(mockGame);
            }).not.toThrow();
        });
        
        it('should handle unknown obstacle types gracefully', () => {
            const mockGame = {
                autonomousObstacles: [
                    { type: 'UNKNOWN_TYPE', someProperty: 100 }
                ]
            };
            
            expect(() => {
                difficultySystem.applyDifficultyModifiers(mockGame);
            }).not.toThrow();
        });
    });
    
    describe('System Status', () => {
        it('should provide system status for debugging', () => {
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.HARDCORE);
            const status = difficultySystem.getStatus();
            
            expect(status.currentDifficulty).toBe(DIFFICULTY_LEVELS.HARDCORE);
            expect(status.modifiers).toBeDefined();
            expect(status.availableDifficulties).toEqual([
                DIFFICULTY_LEVELS.CASUAL,
                DIFFICULTY_LEVELS.NORMAL,
                DIFFICULTY_LEVELS.HARDCORE
            ]);
        });
    });
});