/*
 * difficultySystem.ui.test.js
 * UI integration tests for the Difficulty System
 * 
 * Tests the enhanced UI components and integration with game systems
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DifficultySystem, DIFFICULTY_LEVELS } from './difficultySystem.js';

describe('Difficulty System UI Integration', () => {
    let difficultySystem;
    
    beforeEach(() => {
        difficultySystem = new DifficultySystem();
        difficultySystem.resetToDefault();
    });
    
    describe('UI Display Methods', () => {
        it('should provide difficulty descriptions for all levels', () => {
            const casualDesc = difficultySystem.getDifficultyDescription(DIFFICULTY_LEVELS.CASUAL);
            const normalDesc = difficultySystem.getDifficultyDescription(DIFFICULTY_LEVELS.NORMAL);
            const hardcoreDesc = difficultySystem.getDifficultyDescription(DIFFICULTY_LEVELS.HARDCORE);
            
            expect(casualDesc).toContain('Slower obstacles');
            expect(normalDesc).toContain('Balanced experience');
            expect(hardcoreDesc).toContain('Faster obstacles');
        });
        
        it('should provide modifier summaries for UI display', () => {
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.CASUAL);
            const casualSummary = difficultySystem.getDifficultyModifierSummary();
            
            expect(casualSummary.obstacleSpeed).toBe('-20%');
            expect(casualSummary.gaugeDrain).toBe('-30%');
            expect(casualSummary.coyoteFrames).toBe('4 frames');
            expect(casualSummary.ghostReplay).toBe('Enabled');
            expect(casualSummary.mercyHints).toBe('Enabled');
            
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.HARDCORE);
            const hardcoreSummary = difficultySystem.getDifficultyModifierSummary();
            
            expect(hardcoreSummary.obstacleSpeed).toBe('+15%');
            expect(hardcoreSummary.gaugeDrain).toBe('±0%');
            expect(hardcoreSummary.coyoteFrames).toBe('2 frames');
            expect(hardcoreSummary.ghostReplay).toBe('Disabled');
            expect(hardcoreSummary.mercyHints).toBe('Disabled');
        });
        
        it('should handle current difficulty display correctly', () => {
            // Test default difficulty
            expect(difficultySystem.getDifficulty()).toBe(DIFFICULTY_LEVELS.NORMAL);
            
            // Test cycling through difficulties
            const next1 = difficultySystem.cycleDifficulty();
            expect(next1).toBe(DIFFICULTY_LEVELS.HARDCORE);
            
            const next2 = difficultySystem.cycleDifficulty();
            expect(next2).toBe(DIFFICULTY_LEVELS.CASUAL);
            
            const next3 = difficultySystem.cycleDifficulty();
            expect(next3).toBe(DIFFICULTY_LEVELS.NORMAL);
        });
    });
    
    describe('Game State Integration', () => {
        it('should apply modifiers to game state correctly', () => {
            const mockGame = {
                autonomousObstacles: [
                    { type: 'PISTON', period: 2.0 },
                    { type: 'PENDULUM', frequency: 1.0 }
                ],
                player: {
                    gauge: 100,
                    gaugeMax: 100
                }
            };
            
            // Test Casual difficulty application
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.CASUAL);
            difficultySystem.applyDifficultyModifiers(mockGame);
            
            // Check that modifiers are applied
            expect(mockGame.difficultyCoyoteFrames).toBe(4);
            expect(mockGame.difficultyFeatures.ghostReplayEnabled).toBe(true);
            expect(mockGame.difficultyFeatures.mercyHintsEnabled).toBe(true);
            expect(mockGame.player.gaugeDrainRate).toBeLessThan(mockGame.player.baseDrainRate);
            
            // Test Hardcore difficulty application
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.HARDCORE);
            difficultySystem.applyDifficultyModifiers(mockGame);
            
            expect(mockGame.difficultyCoyoteFrames).toBe(2);
            expect(mockGame.difficultyFeatures.ghostReplayEnabled).toBe(false);
            expect(mockGame.difficultyFeatures.mercyHintsEnabled).toBe(false);
        });
        
        it('should preserve base speeds across multiple applications', () => {
            const mockObstacle = { type: 'PISTON', period: 2.0 };
            const mockGame = { autonomousObstacles: [mockObstacle], player: {} };
            
            // Apply Casual difficulty
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.CASUAL);
            difficultySystem.applyDifficultyModifiers(mockGame);
            
            const casualPeriod = mockObstacle.period;
            expect(mockObstacle.baseSpeeds.period).toBe(2.0); // Original preserved
            
            // Apply Hardcore difficulty
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.HARDCORE);
            difficultySystem.applyDifficultyModifiers(mockGame);
            
            const hardcorePeriod = mockObstacle.period;
            expect(mockObstacle.baseSpeeds.period).toBe(2.0); // Still preserved
            expect(hardcorePeriod).toBeLessThan(casualPeriod); // Faster in hardcore
        });
    });
    
    describe('Settings Persistence', () => {
        it('should save and load difficulty settings', () => {
            // Change difficulty
            difficultySystem.setDifficulty(DIFFICULTY_LEVELS.HARDCORE);
            expect(difficultySystem.getDifficulty()).toBe(DIFFICULTY_LEVELS.HARDCORE);
            
            // Create new instance (simulates game restart)
            const newDifficultySystem = new DifficultySystem();
            
            // Should load the saved difficulty
            expect(newDifficultySystem.getDifficulty()).toBe(DIFFICULTY_LEVELS.HARDCORE);
        });
    });
});