/*
 * onboardingSystem.test.js
 * Integration tests for Onboarding Flow (Task 19)
 * 
 * Tests Requirements 19.1-19.8:
 * - First-time player detection
 * - Welcome screen display
 * - Difficulty selection
 * - Tutorial mode start
 * - Congratulations message
 * - Level 1 unlock
 * - Onboarding completion tracking
 * - Skip functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OnboardingSystem } from './onboardingSystem.js';
import { saveSystem } from './saveSystem.js';
import { difficultySystem } from './difficultySystem.js';

describe('OnboardingSystem Integration', () => {
    let onboarding;

    beforeEach(() => {
        // Reset save system for clean state
        saveSystem.clearAllData();
        onboarding = new OnboardingSystem();
    });

    describe('Requirement 19.1: First-time Player Detection', () => {
        it('should detect first-time player when no save data exists', () => {
            // Clear any existing save data
            saveSystem.clearAllData();
            
            const isFirstTime = onboarding.checkFirstTimePlayer();
            
            expect(isFirstTime).toBe(true);
            expect(onboarding.isFirstTimePlayer).toBe(true);
            expect(onboarding.onboardingCompleted).toBe(false);
        });

        it('should detect returning player when save data exists with onboarding completed', () => {
            // Create save data with completed onboarding
            const saveData = saveSystem.load();
            saveData.player.onboardingCompleted = true;
            saveSystem.save(saveData);
            
            const isFirstTime = onboarding.checkFirstTimePlayer();
            
            expect(isFirstTime).toBe(false);
            expect(onboarding.isFirstTimePlayer).toBe(false);
            expect(onboarding.onboardingCompleted).toBe(true);
        });

        it('should treat legacy save data without onboarding flag as returning player', () => {
            // Create save data without onboarding flag (legacy format)
            const saveData = saveSystem.load();
            delete saveData.player.onboardingCompleted;
            saveSystem.save(saveData);
            
            const isFirstTime = onboarding.checkFirstTimePlayer();
            
            expect(isFirstTime).toBe(false);
            expect(onboarding.onboardingCompleted).toBe(true);
        });
    });

    describe('Requirement 19.2: Welcome Screen and Onboarding Start', () => {
        it('should start onboarding for first-time player', () => {
            onboarding.isFirstTimePlayer = true;
            onboarding.onboardingCompleted = false;
            
            const started = onboarding.startOnboarding();
            
            expect(started).toBe(true);
            expect(onboarding.getCurrentStep()).toBe('welcome');
            expect(onboarding.skipRequested).toBe(false);
        });

        it('should not start onboarding for returning player', () => {
            onboarding.isFirstTimePlayer = false;
            onboarding.onboardingCompleted = true;
            
            const started = onboarding.startOnboarding();
            
            expect(started).toBe(false);
        });

        it('should advance from welcome to difficulty selection', () => {
            onboarding.startOnboarding();
            expect(onboarding.getCurrentStep()).toBe('welcome');
            
            onboarding.advanceStep();
            
            expect(onboarding.getCurrentStep()).toBe('difficulty');
        });
    });

    describe('Requirement 19.3: Difficulty Selection', () => {
        it('should allow selecting Casual difficulty', () => {
            onboarding.startOnboarding();
            onboarding.advanceStep(); // Move to difficulty step
            
            const result = onboarding.setDifficulty('Casual');
            
            expect(result).toBe(true);
            expect(onboarding.getSelectedDifficulty()).toBe('Casual');
        });

        it('should allow selecting Normal difficulty', () => {
            onboarding.startOnboarding();
            onboarding.advanceStep();
            
            const result = onboarding.setDifficulty('Normal');
            
            expect(result).toBe(true);
            expect(onboarding.getSelectedDifficulty()).toBe('Normal');
        });

        it('should allow selecting Hardcore difficulty', () => {
            onboarding.startOnboarding();
            onboarding.advanceStep();
            
            const result = onboarding.setDifficulty('Hardcore');
            
            expect(result).toBe(true);
            expect(onboarding.getSelectedDifficulty()).toBe('Hardcore');
        });

        it('should reject invalid difficulty', () => {
            onboarding.startOnboarding();
            onboarding.advanceStep();
            
            const result = onboarding.setDifficulty('Invalid');
            
            expect(result).toBe(false);
            expect(onboarding.getSelectedDifficulty()).toBe('Normal'); // Should remain default
        });

        it('should apply selected difficulty to difficulty system', () => {
            onboarding.startOnboarding();
            onboarding.advanceStep();
            onboarding.setDifficulty('Casual');
            
            const result = onboarding.applyDifficulty();
            
            expect(result).toBe(true);
            expect(difficultySystem.getDifficulty()).toBe('Casual');
        });

        it('should advance from difficulty to tutorial', () => {
            onboarding.startOnboarding();
            onboarding.advanceStep(); // welcome -> difficulty
            expect(onboarding.getCurrentStep()).toBe('difficulty');
            
            onboarding.advanceStep(); // difficulty -> tutorial
            
            expect(onboarding.getCurrentStep()).toBe('tutorial');
        });
    });

    describe('Requirement 19.4: Tutorial Mode Start', () => {
        it('should indicate tutorial should start when in tutorial step', () => {
            onboarding.isFirstTimePlayer = true;
            onboarding.startOnboarding();
            onboarding.advanceStep(); // welcome -> difficulty
            onboarding.advanceStep(); // difficulty -> tutorial
            
            const shouldStart = onboarding.shouldStartTutorial();
            
            expect(shouldStart).toBe(true);
        });

        it('should not start tutorial if skip was requested', () => {
            onboarding.isFirstTimePlayer = true;
            onboarding.startOnboarding();
            onboarding.advanceStep();
            onboarding.advanceStep();
            onboarding.skipRequested = true;
            
            const shouldStart = onboarding.shouldStartTutorial();
            
            expect(shouldStart).toBe(false);
        });

        it('should not start tutorial if not in tutorial step', () => {
            onboarding.startOnboarding();
            // Still in welcome step
            
            const shouldStart = onboarding.shouldStartTutorial();
            
            expect(shouldStart).toBe(false);
        });
    });

    describe('Requirement 19.5: Tutorial Completion', () => {
        it('should mark tutorial as completed', () => {
            onboarding.startOnboarding();
            onboarding.advanceStep(); // welcome -> difficulty
            onboarding.advanceStep(); // difficulty -> tutorial
            
            onboarding.onTutorialComplete();
            
            expect(onboarding.getCurrentStep()).toBe('complete');
        });

        it('should handle tutorial completion from wrong step gracefully', () => {
            onboarding.startOnboarding();
            // Still in welcome step
            
            onboarding.onTutorialComplete();
            
            // Should not crash, just log warning
            expect(onboarding.getCurrentStep()).toBe('welcome');
        });
    });

    describe('Requirement 19.6, 19.7: Onboarding Completion and Save', () => {
        it('should mark onboarding as completed in save system', () => {
            onboarding.isFirstTimePlayer = true;
            onboarding.startOnboarding();
            
            const result = onboarding.completeOnboarding();
            
            expect(result).toBe(true);
            expect(onboarding.onboardingCompleted).toBe(true);
            expect(onboarding.isFirstTimePlayer).toBe(false);
            
            // Verify save data
            const saveData = saveSystem.load();
            expect(saveData.player.onboardingCompleted).toBe(true);
            expect(saveData.player.tutorialCompleted).toBe(true);
        });

        it('should unlock Level 1 after onboarding completion', () => {
            onboarding.isFirstTimePlayer = true;
            onboarding.startOnboarding();
            
            onboarding.completeOnboarding();
            
            const saveData = saveSystem.load();
            expect(saveData.player.currentLevel).toBe(1);
            expect(saveData.player.levelsCompleted).toContain(0); // Tutorial level
        });

        it('should persist onboarding completion across sessions', () => {
            onboarding.isFirstTimePlayer = true;
            onboarding.startOnboarding();
            onboarding.completeOnboarding();
            
            // Create new onboarding instance (simulates new session)
            const newOnboarding = new OnboardingSystem();
            const isFirstTime = newOnboarding.checkFirstTimePlayer();
            
            expect(isFirstTime).toBe(false);
            expect(newOnboarding.onboardingCompleted).toBe(true);
        });
    });

    describe('Requirement 19.8: Skip Functionality', () => {
        it('should allow skipping onboarding', () => {
            onboarding.isFirstTimePlayer = true;
            onboarding.startOnboarding();
            
            const result = onboarding.skipOnboarding();
            
            expect(result).toBe(true);
            expect(onboarding.skipRequested).toBe(true);
        });

        it('should mark onboarding as completed when skipped', () => {
            onboarding.isFirstTimePlayer = true;
            onboarding.startOnboarding();
            
            onboarding.skipOnboarding();
            
            expect(onboarding.onboardingCompleted).toBe(true);
            
            // Verify save data
            const saveData = saveSystem.load();
            expect(saveData.player.onboardingCompleted).toBe(true);
        });

        it('should not show onboarding again after skip', () => {
            onboarding.isFirstTimePlayer = true;
            onboarding.startOnboarding();
            onboarding.skipOnboarding();
            
            // Create new onboarding instance
            const newOnboarding = new OnboardingSystem();
            const isFirstTime = newOnboarding.checkFirstTimePlayer();
            
            expect(isFirstTime).toBe(false);
        });
    });

    describe('Onboarding Flow Integration', () => {
        it('should complete full onboarding flow', () => {
            // Step 1: Check first-time player
            const isFirstTime = onboarding.checkFirstTimePlayer();
            expect(isFirstTime).toBe(true);
            
            // Step 2: Start onboarding
            onboarding.startOnboarding();
            expect(onboarding.getCurrentStep()).toBe('welcome');
            
            // Step 3: Advance to difficulty
            onboarding.advanceStep();
            expect(onboarding.getCurrentStep()).toBe('difficulty');
            
            // Step 4: Select difficulty
            onboarding.setDifficulty('Normal');
            onboarding.applyDifficulty();
            expect(difficultySystem.getDifficulty()).toBe('Normal');
            
            // Step 5: Advance to tutorial
            onboarding.advanceStep();
            expect(onboarding.getCurrentStep()).toBe('tutorial');
            expect(onboarding.shouldStartTutorial()).toBe(true);
            
            // Step 6: Complete tutorial
            onboarding.onTutorialComplete();
            expect(onboarding.getCurrentStep()).toBe('complete');
            
            // Step 7: Complete onboarding
            onboarding.completeOnboarding();
            expect(onboarding.onboardingCompleted).toBe(true);
            
            // Verify save data
            const saveData = saveSystem.load();
            expect(saveData.player.onboardingCompleted).toBe(true);
            expect(saveData.player.currentLevel).toBe(1);
        });

        it('should handle skip at any point', () => {
            onboarding.checkFirstTimePlayer();
            onboarding.startOnboarding();
            onboarding.advanceStep(); // At difficulty selection
            
            // Skip from difficulty selection
            onboarding.skipOnboarding();
            
            expect(onboarding.skipRequested).toBe(true);
            expect(onboarding.onboardingCompleted).toBe(true);
            
            const saveData = saveSystem.load();
            expect(saveData.player.onboardingCompleted).toBe(true);
        });
    });

    describe('Onboarding Status', () => {
        it('should provide accurate status information', () => {
            onboarding.isFirstTimePlayer = true;
            onboarding.startOnboarding();
            onboarding.advanceStep();
            onboarding.setDifficulty('Casual');
            
            const status = onboarding.getStatus();
            
            expect(status.isFirstTimePlayer).toBe(true);
            expect(status.onboardingCompleted).toBe(false);
            expect(status.currentStep).toBe('difficulty');
            expect(status.selectedDifficulty).toBe('Casual');
            expect(status.skipRequested).toBe(false);
            expect(status.isActive).toBe(true);
        });

        it('should indicate onboarding is not active when completed', () => {
            onboarding.isFirstTimePlayer = true;
            onboarding.startOnboarding();
            onboarding.completeOnboarding();
            
            expect(onboarding.isActive()).toBe(false);
            expect(onboarding.isCompleted()).toBe(true);
        });
    });
});
