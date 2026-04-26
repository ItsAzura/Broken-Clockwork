/*
 * difficultySystem.js
 * Difficulty System for Game Retention & Engagement System
 * 
 * Features:
 * - Three difficulty levels: Casual, Normal, Hardcore
 * - Obstacle speed modifiers (-20%, 0%, +15%)
 * - Gauge drain rate modifiers (-30%, 0%, 0%)
 * - Coyote frame adjustments (4, 2, 2 frames)
 * - Feature toggles (ghost replay, mercy hints)
 * - Integration with existing game systems
 * - Settings persistence through SaveSystem
 */

import { COLORS, COYOTE_DEATH_FRAMES, GAUGE_DRAIN_RATE } from './constants.js';
import { saveSystem } from './saveSystem.js';

// Difficulty level definitions
const DIFFICULTY_LEVELS = {
    CASUAL: 'Casual',
    NORMAL: 'Normal', 
    HARDCORE: 'Hardcore'
};

// Difficulty modifiers table
const DIFFICULTY_MODIFIERS = {
    [DIFFICULTY_LEVELS.CASUAL]: {
        obstacleSpeedMultiplier: 0.8,    // -20% obstacle speed
        gaugeDrainMultiplier: 0.7,       // -30% gauge drain (slower drain)
        coyoteFrames: 4,                 // 4 frames forgiveness
        ghostReplayEnabled: false,       // Ghost replay disabled
        mercyHintsEnabled: true          // Mercy hints enabled
    },
    [DIFFICULTY_LEVELS.NORMAL]: {
        obstacleSpeedMultiplier: 1.0,    // 0% obstacle speed (baseline)
        gaugeDrainMultiplier: 1.0,       // 0% gauge drain (baseline)
        coyoteFrames: 2,                 // 2 frames forgiveness (default)
        ghostReplayEnabled: false,       // Ghost replay disabled
        mercyHintsEnabled: true          // Mercy hints enabled
    },
    [DIFFICULTY_LEVELS.HARDCORE]: {
        obstacleSpeedMultiplier: 1.15,   // +15% obstacle speed
        gaugeDrainMultiplier: 1.0,       // 0% gauge drain (same as normal)
        coyoteFrames: 2,                 // 2 frames forgiveness (same as normal)
        ghostReplayEnabled: false,       // Ghost replay disabled
        mercyHintsEnabled: false         // Mercy hints disabled
    }
};

/**
 * DifficultySystem class manages game difficulty settings and modifiers
 */
export class DifficultySystem {
    constructor() {
        this.currentDifficulty = DIFFICULTY_LEVELS.NORMAL;
        this.modifiers = DIFFICULTY_MODIFIERS[this.currentDifficulty];
        
        // Load saved difficulty setting
        this.loadDifficultySettings();
        
        console.log('[DifficultySystem] Initialized with difficulty:', this.currentDifficulty);
    }
    
    /**
     * Load difficulty settings from save system
     */
    loadDifficultySettings() {
        try {
            const saveData = saveSystem.load();
            if (saveData.settings && saveData.settings.difficulty) {
                const savedDifficulty = saveData.settings.difficulty;
                if (Object.values(DIFFICULTY_LEVELS).includes(savedDifficulty)) {
                    this.setDifficulty(savedDifficulty);
                } else {
                    console.warn('[DifficultySystem] Invalid saved difficulty:', savedDifficulty);
                }
            }
        } catch (error) {
            console.error('[DifficultySystem] Failed to load difficulty settings:', error);
        }
    }
    
    /**
     * Save difficulty settings to save system
     */
    saveDifficultySettings() {
        try {
            saveSystem.onSettingsChange({ difficulty: this.currentDifficulty });
            console.log('[DifficultySystem] Difficulty settings saved:', this.currentDifficulty);
        } catch (error) {
            console.error('[DifficultySystem] Failed to save difficulty settings:', error);
        }
    }
    
    /**
     * Set the current difficulty level
     */
    setDifficulty(difficultyLevel) {
        if (!Object.values(DIFFICULTY_LEVELS).includes(difficultyLevel)) {
            console.error('[DifficultySystem] Invalid difficulty level:', difficultyLevel);
            return false;
        }
        
        const previousDifficulty = this.currentDifficulty;
        this.currentDifficulty = difficultyLevel;
        this.modifiers = DIFFICULTY_MODIFIERS[difficultyLevel];
        
        // Save the new setting
        this.saveDifficultySettings();
        
        console.log(`[DifficultySystem] Difficulty changed from ${previousDifficulty} to ${difficultyLevel}`);
        return true;
    }
    
    /**
     * Get the current difficulty level
     */
    getDifficulty() {
        return this.currentDifficulty;
    }
    
    /**
     * Get all available difficulty levels
     */
    getAvailableDifficulties() {
        return Object.values(DIFFICULTY_LEVELS);
    }
    
    /**
     * Get current difficulty modifiers
     */
    getModifiers() {
        return { ...this.modifiers }; // Return copy to prevent external modification
    }
    
    /**
     * Apply difficulty modifiers to game state
     * This should be called during game initialization and when difficulty changes
     */
    applyDifficultyModifiers(gameState) {
        if (!gameState) {
            console.warn('[DifficultySystem] No game state provided for modifier application');
            return;
        }
        
        // Apply obstacle speed modifiers
        this.applyObstacleSpeedModifiers(gameState);
        
        // Apply gauge drain modifiers
        this.applyGaugeDrainModifiers(gameState);
        
        // Apply coyote frame modifiers
        this.applyCoyoteFrameModifiers(gameState);
        
        // Apply feature toggles
        this.applyFeatureToggles(gameState);
        
        console.log(`[DifficultySystem] Applied ${this.currentDifficulty} difficulty modifiers`);
    }
    
    /**
     * Apply obstacle speed modifiers to all autonomous obstacles
     */
    applyObstacleSpeedModifiers(gameState) {
        if (!gameState.autonomousObstacles) return;
        
        const speedMultiplier = this.modifiers.obstacleSpeedMultiplier;
        
        for (const obstacle of gameState.autonomousObstacles) {
            // Apply base difficulty speed modifier
            obstacle.difficultySpeedMult = speedMultiplier;
            
            // Update the obstacle's effective speed multiplier
            // This preserves any existing speed multipliers from other systems
            if (obstacle.baseSpeeds === undefined) {
                // Store original speeds on first application
                obstacle.baseSpeeds = this.extractObstacleBaseSpeeds(obstacle);
            }
            
            // Apply difficulty modifier to base speeds
            this.applySpeedModifierToObstacle(obstacle, speedMultiplier);
        }
    }
    
    /**
     * Extract base speeds from an obstacle for later modification
     */
    extractObstacleBaseSpeeds(obstacle) {
        const baseSpeeds = {};
        
        switch (obstacle.type) {
            case 'PISTON':
                baseSpeeds.period = obstacle.period;
                break;
            case 'PENDULUM':
                baseSpeeds.frequency = obstacle.frequency;
                break;
            case 'BOUNCING_BALL':
                baseSpeeds.speed = obstacle.speed;
                break;
            case 'ORBIT_SPHERE':
                baseSpeeds.speed = obstacle.speed;
                break;
            case 'GEAR_SPINNER':
                baseSpeeds.rotationSpeed = obstacle.rotationSpeed;
                break;
            default:
                // For unknown obstacle types, try to preserve common speed properties
                if (obstacle.speed !== undefined) baseSpeeds.speed = obstacle.speed;
                if (obstacle.period !== undefined) baseSpeeds.period = obstacle.period;
                if (obstacle.frequency !== undefined) baseSpeeds.frequency = obstacle.frequency;
        }
        
        return baseSpeeds;
    }
    
    /**
     * Apply speed modifier to a specific obstacle
     */
    applySpeedModifierToObstacle(obstacle, speedMultiplier) {
        if (!obstacle.baseSpeeds) return;
        
        switch (obstacle.type) {
            case 'PISTON':
                if (obstacle.baseSpeeds.period !== undefined) {
                    // For period-based obstacles, faster = shorter period
                    obstacle.period = obstacle.baseSpeeds.period / speedMultiplier;
                }
                break;
                
            case 'PENDULUM':
                if (obstacle.baseSpeeds.frequency !== undefined) {
                    // For frequency-based obstacles, faster = higher frequency
                    obstacle.frequency = obstacle.baseSpeeds.frequency * speedMultiplier;
                }
                break;
                
            case 'BOUNCING_BALL':
            case 'ORBIT_SPHERE':
                if (obstacle.baseSpeeds.speed !== undefined) {
                    // For speed-based obstacles, directly multiply speed
                    obstacle.speed = obstacle.baseSpeeds.speed * speedMultiplier;
                }
                break;
                
            case 'GEAR_SPINNER':
                if (obstacle.baseSpeeds.rotationSpeed !== undefined) {
                    // For rotation-based obstacles, multiply rotation speed
                    obstacle.rotationSpeed = obstacle.baseSpeeds.rotationSpeed * speedMultiplier;
                }
                break;
                
            default:
                // For unknown obstacle types, apply to common properties
                if (obstacle.baseSpeeds.speed !== undefined) {
                    obstacle.speed = obstacle.baseSpeeds.speed * speedMultiplier;
                }
                if (obstacle.baseSpeeds.period !== undefined) {
                    obstacle.period = obstacle.baseSpeeds.period / speedMultiplier;
                }
                if (obstacle.baseSpeeds.frequency !== undefined) {
                    obstacle.frequency = obstacle.baseSpeeds.frequency * speedMultiplier;
                }
        }
    }
    
    /**
     * Apply gauge drain rate modifiers to player
     */
    applyGaugeDrainModifiers(gameState) {
        if (!gameState.player) return;
        
        const drainMultiplier = this.modifiers.gaugeDrainMultiplier;
        
        // Store original drain rate if not already stored
        if (gameState.player.baseDrainRate === undefined) {
            gameState.player.baseDrainRate = GAUGE_DRAIN_RATE;
        }
        
        // Apply difficulty modifier to gauge drain rate
        gameState.player.gaugeDrainRate = gameState.player.baseDrainRate * drainMultiplier;
        
        // Also update the global drain rate for systems that use it directly
        gameState.difficultyGaugeDrainRate = gameState.player.gaugeDrainRate;
    }
    
    /**
     * Apply coyote frame modifiers to death system
     */
    applyCoyoteFrameModifiers(gameState) {
        // Store the difficulty-modified coyote frames in game state
        gameState.difficultyCoyoteFrames = this.modifiers.coyoteFrames;
        
        // The death system will read this value instead of the constant
        console.log(`[DifficultySystem] Coyote frames set to: ${this.modifiers.coyoteFrames}`);
    }
    
    /**
     * Apply feature toggles (ghost replay, mercy hints)
     */
    applyFeatureToggles(gameState) {
        // Store feature toggle states in game state
        gameState.difficultyFeatures = {
            ghostReplayEnabled: this.modifiers.ghostReplayEnabled,
            mercyHintsEnabled: this.modifiers.mercyHintsEnabled
        };
        
        console.log('[DifficultySystem] Feature toggles applied:', gameState.difficultyFeatures);
    }
    
    /**
     * Get obstacle speed multiplier for current difficulty
     */
    getObstacleSpeedMultiplier() {
        return this.modifiers.obstacleSpeedMultiplier;
    }
    
    /**
     * Get gauge drain multiplier for current difficulty
     */
    getGaugeDrainMultiplier() {
        return this.modifiers.gaugeDrainMultiplier;
    }
    
    /**
     * Get coyote frames for current difficulty
     */
    getCoyoteFrames() {
        return this.modifiers.coyoteFrames;
    }
    
    /**
     * Check if ghost replay is enabled for current difficulty
     */
    isGhostReplayEnabled() {
        return this.modifiers.ghostReplayEnabled;
    }
    
    /**
     * Check if mercy hints are enabled for current difficulty
     */
    areMercyHintsEnabled() {
        return this.modifiers.mercyHintsEnabled;
    }
    
    /**
     * Get difficulty description for UI display
     */
    getDifficultyDescription(difficultyLevel = null) {
        const level = difficultyLevel || this.currentDifficulty;
        const modifiers = DIFFICULTY_MODIFIERS[level];
        
        if (!modifiers) return 'Unknown difficulty';
        
        const descriptions = {
            [DIFFICULTY_LEVELS.CASUAL]: 'Slower obstacles and more forgiving timing.',
            [DIFFICULTY_LEVELS.NORMAL]: 'The standard experience as originally intended.',
            [DIFFICULTY_LEVELS.HARDCORE]: 'Faster obstacles and a pure test of skill.'
        };
        
        return descriptions[level] || 'Unknown difficulty';
    }
    
    /**
     * Get difficulty modifier summary for UI display
     */
    getDifficultyModifierSummary(difficultyLevel = null) {
        const level = difficultyLevel || this.currentDifficulty;
        const modifiers = DIFFICULTY_MODIFIERS[level];
        
        if (!modifiers) return {};
        
        return {
            obstacleSpeed: `${modifiers.obstacleSpeedMultiplier === 1.0 ? '±0' : 
                          modifiers.obstacleSpeedMultiplier > 1.0 ? 
                          `+${Math.round((modifiers.obstacleSpeedMultiplier - 1) * 100)}` :
                          `${Math.round((modifiers.obstacleSpeedMultiplier - 1) * 100)}`}%`,
            gaugeDrain: `${modifiers.gaugeDrainMultiplier === 1.0 ? '±0' : 
                        modifiers.gaugeDrainMultiplier > 1.0 ? 
                        `+${Math.round((modifiers.gaugeDrainMultiplier - 1) * 100)}` :
                        `${Math.round((modifiers.gaugeDrainMultiplier - 1) * 100)}`}%`,
            coyoteFrames: `${modifiers.coyoteFrames} frames`,
            ghostReplay: modifiers.ghostReplayEnabled ? 'Enabled' : 'Disabled',
            mercyHints: modifiers.mercyHintsEnabled ? 'Enabled' : 'Disabled'
        };
    }
    
    /**
     * Cycle to next difficulty level (for quick switching)
     */
    cycleDifficulty() {
        const difficulties = Object.values(DIFFICULTY_LEVELS);
        const currentIndex = difficulties.indexOf(this.currentDifficulty);
        const nextIndex = (currentIndex + 1) % difficulties.length;
        
        this.setDifficulty(difficulties[nextIndex]);
        return this.currentDifficulty;
    }
    
    /**
     * Reset to default difficulty (Normal)
     */
    resetToDefault() {
        this.setDifficulty(DIFFICULTY_LEVELS.NORMAL);
    }
    
    /**
     * Get difficulty system status for debugging
     */
    getStatus() {
        return {
            currentDifficulty: this.currentDifficulty,
            modifiers: this.modifiers,
            availableDifficulties: Object.values(DIFFICULTY_LEVELS)
        };
    }
}

// Export singleton instance
export const difficultySystem = new DifficultySystem();

// Export difficulty levels for external use
export { DIFFICULTY_LEVELS };