/*
 * onboardingSystem.js
 * Onboarding Flow System for Game Retention & Engagement System
 * 
 * Features:
 * - First-time player detection based on save data existence
 * - Welcome screen with game introduction
 * - Difficulty selection prompt for new players
 * - Automatic tutorial mode start for first-time players
 * - Congratulations message after tutorial completion
 * - Level 1 unlock after tutorial completion
 * - Onboarding completion tracking in save system
 * - Onboarding skip option (Escape key)
 * 
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8
 */

import { saveSystem } from './saveSystem.js';
import { difficultySystem, DIFFICULTY_LEVELS } from './difficultySystem.js';
import { tutorialSystem } from './tutorialSystem.js';

/**
 * OnboardingSystem class manages the first-time player experience
 */
export class OnboardingSystem {
    constructor() {
        this.isFirstTimePlayer = false;
        this.onboardingCompleted = false;
        this.currentStep = 'welcome'; // 'welcome', 'difficulty', 'tutorial', 'complete'
        this.selectedDifficulty = 'Normal';
        this.skipRequested = false;
        
        console.log('[OnboardingSystem] Initialized');
    }
    
    /**
     * Check if this is a first-time player (Requirement 19.1)
     * Returns true if no save data exists
     */
    checkFirstTimePlayer() {
        try {
            const saveExists = saveSystem.exists();
            
            if (!saveExists) {
                // No save data - definitely first time
                this.isFirstTimePlayer = true;
                this.onboardingCompleted = false;
                console.log('[OnboardingSystem] First-time player detected (no save data)');
                return true;
            }
            
            // Load save data and check onboarding status
            const saveData = saveSystem.load();
            
            if (!saveData.player || saveData.player.onboardingCompleted === undefined) {
                // Old save format without onboarding tracking - treat as returning player
                this.isFirstTimePlayer = false;
                this.onboardingCompleted = true;
                console.log('[OnboardingSystem] Returning player (legacy save data)');
                return false;
            }
            
            // Check onboarding completion status
            this.onboardingCompleted = saveData.player.onboardingCompleted || false;
            this.isFirstTimePlayer = !this.onboardingCompleted;
            
            console.log('[OnboardingSystem] Player status:', {
                isFirstTime: this.isFirstTimePlayer,
                onboardingCompleted: this.onboardingCompleted
            });
            
            return this.isFirstTimePlayer;
            
        } catch (error) {
            console.error('[OnboardingSystem] Error checking first-time player:', error);
            // On error, assume returning player to avoid forcing onboarding
            this.isFirstTimePlayer = false;
            this.onboardingCompleted = true;
            return false;
        }
    }
    
    /**
     * Start the onboarding flow (Requirement 19.2)
     * Called when first-time player is detected
     */
    startOnboarding() {
        if (!this.isFirstTimePlayer) {
            console.warn('[OnboardingSystem] Attempted to start onboarding for non-first-time player');
            return false;
        }
        
        this.currentStep = 'welcome';
        this.skipRequested = false;
        console.log('[OnboardingSystem] Starting onboarding flow');
        return true;
    }
    
    /**
     * Advance to the next onboarding step
     */
    advanceStep() {
        switch (this.currentStep) {
            case 'welcome':
                this.currentStep = 'difficulty';
                console.log('[OnboardingSystem] Advanced to difficulty selection');
                break;
                
            case 'difficulty':
                this.currentStep = 'tutorial';
                console.log('[OnboardingSystem] Advanced to tutorial, difficulty:', this.selectedDifficulty);
                break;
                
            case 'tutorial':
                this.currentStep = 'complete';
                console.log('[OnboardingSystem] Advanced to completion');
                break;
                
            case 'complete':
                // Onboarding finished
                this.completeOnboarding();
                break;
        }
    }
    
    /**
     * Set the selected difficulty (Requirement 19.3)
     */
    setDifficulty(difficulty) {
        if (!Object.values(DIFFICULTY_LEVELS).includes(difficulty)) {
            console.error('[OnboardingSystem] Invalid difficulty:', difficulty);
            return false;
        }
        
        this.selectedDifficulty = difficulty;
        console.log('[OnboardingSystem] Difficulty selected:', difficulty);
        return true;
    }
    
    /**
     * Get the currently selected difficulty
     */
    getSelectedDifficulty() {
        return this.selectedDifficulty;
    }
    
    /**
     * Apply the selected difficulty to the game (Requirement 19.3)
     */
    applyDifficulty() {
        try {
            difficultySystem.setDifficulty(this.selectedDifficulty);
            console.log('[OnboardingSystem] Applied difficulty:', this.selectedDifficulty);
            return true;
        } catch (error) {
            console.error('[OnboardingSystem] Failed to apply difficulty:', error);
            return false;
        }
    }
    
    /**
     * Check if tutorial should start automatically (Requirement 19.4)
     */
    shouldStartTutorial() {
        return this.currentStep === 'tutorial' && !this.skipRequested;
    }
    
    /**
     * Mark tutorial as completed (Requirement 19.5)
     */
    onTutorialComplete() {
        if (this.currentStep !== 'tutorial') {
            console.warn('[OnboardingSystem] Tutorial completed but not in tutorial step');
            return;
        }
        
        console.log('[OnboardingSystem] Tutorial completed');
        this.currentStep = 'complete';
    }
    
    /**
     * Complete the onboarding flow (Requirements 19.6, 19.7)
     * - Marks onboarding as completed in save system
     * - Unlocks Level 1
     */
    completeOnboarding() {
        try {
            // Mark onboarding as completed in save system (Requirement 19.7)
            const saveData = saveSystem.load();
            
            if (!saveData.player) {
                saveData.player = {
                    totalDeaths: 0,
                    levelDeaths: {},
                    levelsCompleted: [],
                    currentLevel: 1,
                    tutorialCompleted: true,
                    onboardingCompleted: true
                };
            } else {
                saveData.player.onboardingCompleted = true;
                saveData.player.tutorialCompleted = true;
            }
            
            // Unlock Level 1 (Requirement 19.6)
            if (!saveData.player.levelsCompleted.includes(0)) {
                saveData.player.levelsCompleted.push(0); // Tutorial level
            }
            saveData.player.currentLevel = 1;
            
            // Save the updated data
            saveSystem.save(saveData);
            
            this.onboardingCompleted = true;
            this.isFirstTimePlayer = false;
            
            console.log('[OnboardingSystem] Onboarding completed and saved');
            return true;
            
        } catch (error) {
            console.error('[OnboardingSystem] Failed to complete onboarding:', error);
            return false;
        }
    }
    
    /**
     * Skip the onboarding flow (Requirement 19.8)
     * Allows player to skip with Escape key
     */
    skipOnboarding() {
        console.log('[OnboardingSystem] Onboarding skipped by player');
        this.skipRequested = true;
        
        // Still mark as completed to avoid showing again
        this.completeOnboarding();
        
        return true;
    }
    
    /**
     * Get the current onboarding step
     */
    getCurrentStep() {
        return this.currentStep;
    }
    
    /**
     * Check if onboarding is active
     */
    isActive() {
        return this.isFirstTimePlayer && !this.onboardingCompleted && !this.skipRequested;
    }
    
    /**
     * Check if onboarding is completed
     */
    isCompleted() {
        return this.onboardingCompleted;
    }
    
    /**
     * Reset onboarding state (for testing)
     */
    reset() {
        this.isFirstTimePlayer = false;
        this.onboardingCompleted = false;
        this.currentStep = 'welcome';
        this.selectedDifficulty = 'Normal';
        this.skipRequested = false;
        console.log('[OnboardingSystem] Reset to initial state');
    }
    
    /**
     * Get onboarding status for debugging
     */
    getStatus() {
        return {
            isFirstTimePlayer: this.isFirstTimePlayer,
            onboardingCompleted: this.onboardingCompleted,
            currentStep: this.currentStep,
            selectedDifficulty: this.selectedDifficulty,
            skipRequested: this.skipRequested,
            isActive: this.isActive()
        };
    }
}

// Export singleton instance
export const onboardingSystem = new OnboardingSystem();
