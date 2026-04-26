/*
 * progressTracker.js
 * Enhanced Progress Tracker UI for Game Retention & Engagement System
 * 
 * Features:
 * - Real-time distance calculation from spawn point (Manhattan distance)
 * - Personal best tracking per level
 * - Progress percentage calculation (spawn to exit)
 * - "NEW BEST!" detection and highlighting
 * - Integration with save system for persistence
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 4.8
 */

import { COLORS } from './constants.js';
import { saveSystem } from './saveSystem.js';

/**
 * ProgressTracker class handles real-time progress tracking and visualization
 */
export class ProgressTracker {
    constructor() {
        this.currentDistance = 0;
        this.personalBests = {}; // { levelId: bestDistance }
        this.isNewBest = false;
        this.newBestTimer = 0;
        this.newBestDisplayFrames = 60; // 1 second at 60fps
        
        // Load personal bests from save system
        this.loadPersonalBests();
    }
    
    /**
     * Load personal bests from save system
     */
    loadPersonalBests() {
        try {
            const saveData = saveSystem.load();
            if (saveData && saveData.progressTracking && saveData.progressTracking.personalBests) {
                this.personalBests = saveData.progressTracking.personalBests;
            }
        } catch (error) {
            console.error('[ProgressTracker] Failed to load personal bests:', error);
            this.personalBests = {};
        }
    }
    
    /**
     * Calculate Manhattan distance from spawn point to player
     * Requirements: 4.1
     * 
     * @param {Object} player - Player object with x, y coordinates
     * @param {Object} spawn - Spawn point with x, y coordinates
     * @returns {number} Manhattan distance
     */
    calculateDistance(player, spawn) {
        if (!player || !spawn) return 0;
        return Math.abs(player.x - spawn.x) + Math.abs(player.y - spawn.y);
    }
    
    /**
     * Calculate distance from player to exit door
     * Requirements: 4.3
     * 
     * @param {Object} player - Player object with x, y coordinates
     * @param {Object} exitDoor - Exit door object with x, y, w, h
     * @returns {number} Manhattan distance to exit door center
     */
    calculateDistanceToExit(player, exitDoor) {
        if (!player || !exitDoor) return 0;
        
        // Calculate exit door center
        const exitCenterX = exitDoor.x + (exitDoor.w / 2);
        const exitCenterY = exitDoor.y + (exitDoor.h / 2);
        
        return Math.abs(player.x - exitCenterX) + Math.abs(player.y - exitCenterY);
    }
    
    /**
     * Get personal best distance for a level
     * Requirements: 4.2
     * 
     * @param {number} levelId - Level identifier
     * @returns {number} Personal best distance (0 if none)
     */
    getPersonalBest(levelId) {
        return this.personalBests[levelId] || 0;
    }
    
    /**
     * Update personal best distance for a level
     * Requirements: 4.2, 4.7
     * 
     * @param {number} levelId - Level identifier
     * @param {number} distance - Current distance
     * @returns {boolean} True if new personal best was set
     */
    updatePersonalBest(levelId, distance) {
        const currentBest = this.getPersonalBest(levelId);
        
        if (distance > currentBest) {
            this.personalBests[levelId] = distance;
            
            // Persist to save system
            try {
                saveSystem.updateProgressTracking(levelId, distance);
            } catch (error) {
                console.error('[ProgressTracker] Failed to save personal best:', error);
            }
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if current distance exceeds personal best
     * Requirements: 4.4, 4.6
     * 
     * @param {number} currentDistance - Current distance from spawn
     * @param {number} levelId - Level identifier
     * @returns {boolean} True if beating personal best
     */
    isBeatingBest(currentDistance, levelId) {
        const personalBest = this.getPersonalBest(levelId);
        return currentDistance > personalBest;
    }
    
    /**
     * Calculate progress percentage from spawn to exit
     * Requirements: 4.8
     * 
     * @param {Object} player - Player object with x, y coordinates
     * @param {Object} spawn - Spawn point with x, y coordinates
     * @param {Object} exitDoor - Exit door object with x, y, w, h
     * @returns {number} Progress percentage (0-100)
     */
    getProgressPercentage(player, spawn, exitDoor) {
        if (!player || !spawn || !exitDoor) return 0;
        
        // Calculate total distance from spawn to exit
        const exitCenterX = exitDoor.x + (exitDoor.w / 2);
        const exitCenterY = exitDoor.y + (exitDoor.h / 2);
        const totalDistance = Math.abs(exitCenterX - spawn.x) + Math.abs(exitCenterY - spawn.y);
        
        if (totalDistance === 0) return 100;
        
        // Calculate current distance from spawn
        const currentDistance = this.calculateDistance(player, spawn);
        
        // Calculate progress percentage
        const progress = (currentDistance / totalDistance) * 100;
        
        // Clamp to 0-100 range
        return Math.max(0, Math.min(100, progress));
    }
    
    /**
     * Update progress tracker state (call every frame during gameplay)
     * Requirements: 4.1, 4.2, 4.4, 4.5, 4.6
     * 
     * @param {Object} player - Player object
     * @param {Object} spawn - Spawn point
     * @param {number} levelId - Current level identifier
     */
    update(player, spawn, levelId) {
        if (!player || !spawn) return;
        
        // Calculate current distance
        this.currentDistance = this.calculateDistance(player, spawn);
        
        // Check if beating personal best
        const wasNewBest = this.isNewBest;
        this.isNewBest = this.isBeatingBest(this.currentDistance, levelId);
        
        // Trigger "NEW BEST!" message when first exceeding personal best
        if (this.isNewBest && !wasNewBest) {
            this.newBestTimer = this.newBestDisplayFrames;
        }
        
        // Update personal best if current distance is higher
        if (this.isNewBest) {
            this.updatePersonalBest(levelId, this.currentDistance);
        }
        
        // Decrement new best timer
        if (this.newBestTimer > 0) {
            this.newBestTimer--;
        }
    }
    
    /**
     * Get current tracker state for UI rendering
     * 
     * @returns {Object} Tracker state
     */
    getState() {
        return {
            currentDistance: this.currentDistance,
            isNewBest: this.isNewBest,
            showNewBestMessage: this.newBestTimer > 0,
            newBestAlpha: Math.min(1, this.newBestTimer / 15) // Fade out in last 15 frames
        };
    }
    
    /**
     * Reset tracker state for new level or respawn
     */
    reset() {
        this.currentDistance = 0;
        this.isNewBest = false;
        this.newBestTimer = 0;
    }
    
    /**
     * Clear all personal bests (for testing or reset functionality)
     */
    clearAllBests() {
        this.personalBests = {};
        this.reset();
    }
}

// Export singleton instance
export const progressTracker = new ProgressTracker();
