/*
 * speedrunSystem.js
 * Speedrun Mode implementation with timer, split tracking, and ghost replay integration
 * 
 * Requirements:
 * - 6.1: Display timer in MM:SS.mmm format
 * - 6.2: Record split times for each level completion
 * - 6.3: Display current split vs personal best split
 * - 6.4: Highlight faster splits in COLORS.GLOW_WARM
 * - 6.5: Support ghost race showing personal best speedrun attempt
 * - 6.6: Pause timer during pause menu
 * - 6.7: Persist best speedrun times and splits using Save_System
 * - 6.8: Toggleable from title screen
 */

import { COLORS } from './constants.js';

/**
 * SpeedrunSystem class manages speedrun mode timer, splits, and ghost replay
 */
export class SpeedrunSystem {
    constructor() {
        // Speedrun mode state
        this.enabled = false;
        this.active = false;
        
        // Timer state
        this.currentTime = 0;        // Current run time in milliseconds
        this.isPaused = false;
        this.startTime = 0;
        this.pauseStartTime = 0;
        this.totalPausedTime = 0;
        
        // Split tracking
        this.splits = [];            // Current run splits: [{ level, time, delta }]
        this.bestSplits = [];        // Personal best splits: [{ level, time }]
        this.bestTotalTime = null;   // Best total completion time
        
        // Ghost replay for speedrun mode
        this.speedrunGhostFrames = [];  // Ghost replay frames for best speedrun
        this.currentGhostIndex = 0;
        
        // Level tracking
        this.currentLevel = 1;
        this.runStartLevel = 1;
    }
    
    /**
     * Enable or disable speedrun mode
     * @param {boolean} enabled - Whether speedrun mode is enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.reset();
        }
    }
    
    /**
     * Check if speedrun mode is enabled
     * @returns {boolean}
     */
    isEnabled() {
        return this.enabled;
    }
    
    /**
     * Start a new speedrun
     * @param {number} startLevel - Starting level (default 1)
     */
    start(startLevel = 1) {
        if (!this.enabled) return;
        
        this.active = true;
        this.currentTime = 0;
        this.isPaused = false;
        this.startTime = performance.now();
        this.pauseStartTime = 0;
        this.totalPausedTime = 0;
        this.splits = [];
        this.currentLevel = startLevel;
        this.runStartLevel = startLevel;
        this.currentGhostIndex = 0;
        
        console.log('[SpeedrunSystem] Started speedrun from level', startLevel);
    }
    
    /**
     * Stop the current speedrun
     */
    stop() {
        this.active = false;
        this.isPaused = false;
        console.log('[SpeedrunSystem] Stopped speedrun');
    }
    
    /**
     * Reset speedrun state
     */
    reset() {
        this.active = false;
        this.currentTime = 0;
        this.isPaused = false;
        this.startTime = 0;
        this.pauseStartTime = 0;
        this.totalPausedTime = 0;
        this.splits = [];
        this.currentLevel = 1;
        this.runStartLevel = 1;
        this.currentGhostIndex = 0;
    }
    
    /**
     * Pause the speedrun timer (Requirement 6.6)
     */
    pause() {
        if (!this.active || this.isPaused) return;
        
        this.isPaused = true;
        this.pauseStartTime = performance.now();
        console.log('[SpeedrunSystem] Timer paused');
    }
    
    /**
     * Resume the speedrun timer (Requirement 6.6)
     */
    resume() {
        if (!this.active || !this.isPaused) return;
        
        const pauseDuration = performance.now() - this.pauseStartTime;
        this.totalPausedTime += pauseDuration;
        this.isPaused = false;
        this.pauseStartTime = 0;
        console.log('[SpeedrunSystem] Timer resumed');
    }
    
    /**
     * Update speedrun timer
     * @param {number} dt - Delta time (not used, we use performance.now() for accuracy)
     */
    update(dt) {
        if (!this.active || this.isPaused) return;
        
        // Calculate current time based on performance.now() for accuracy
        const now = performance.now();
        this.currentTime = now - this.startTime - this.totalPausedTime;
    }
    
    /**
     * Record a split when a level is completed (Requirement 6.2)
     * @param {number} level - Level number that was completed
     */
    recordSplit(level) {
        if (!this.active) return;
        
        const splitTime = this.currentTime;
        
        // Calculate delta from personal best split
        let delta = null;
        const bestSplit = this.bestSplits.find(s => s.level === level);
        if (bestSplit) {
            delta = splitTime - bestSplit.time;
        }
        
        // Record the split
        const split = {
            level: level,
            time: splitTime,
            delta: delta,
            isFaster: delta !== null && delta < 0
        };
        
        this.splits.push(split);
        this.currentLevel = level + 1;
        
        console.log('[SpeedrunSystem] Recorded split for level', level, 
                    'Time:', this.formatTime(splitTime), 
                    'Delta:', delta !== null ? this.formatDelta(delta) : 'N/A');
        
        return split;
    }
    
    /**
     * Complete the speedrun and update personal bests if applicable
     * @param {number} finalLevel - Final level completed
     * @returns {boolean} - True if this was a new personal best
     */
    complete(finalLevel) {
        if (!this.active) return false;
        
        const finalTime = this.currentTime;
        let isNewBest = false;
        
        // Check if this is a new personal best
        if (this.bestTotalTime === null || finalTime < this.bestTotalTime) {
            isNewBest = true;
            this.bestTotalTime = finalTime;
            
            // Update best splits
            this.bestSplits = this.splits.map(split => ({
                level: split.level,
                time: split.time
            }));
            
            console.log('[SpeedrunSystem] NEW PERSONAL BEST!', this.formatTime(finalTime));
        }
        
        this.stop();
        return isNewBest;
    }
    
    /**
     * Format time in MM:SS.mmm format (Requirement 6.1)
     * @param {number} milliseconds - Time in milliseconds
     * @returns {string} - Formatted time string
     */
    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const ms = Math.floor(milliseconds % 1000);
        
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }
    
    /**
     * Format delta time with +/- prefix
     * @param {number} milliseconds - Delta time in milliseconds
     * @returns {string} - Formatted delta string
     */
    formatDelta(milliseconds) {
        const sign = milliseconds >= 0 ? '+' : '-';
        const totalSeconds = Math.floor(Math.abs(milliseconds) / 1000);
        const seconds = totalSeconds % 60;
        const ms = Math.floor(Math.abs(milliseconds) % 1000);
        
        return `${sign}${seconds}.${String(ms).padStart(3, '0')}`;
    }
    
    /**
     * Get current timer display string (Requirement 6.1)
     * @returns {string} - Formatted current time
     */
    getCurrentTimeString() {
        return this.formatTime(this.currentTime);
    }
    
    /**
     * Get split information for display (Requirement 6.3)
     * @param {number} level - Level number
     * @returns {Object|null} - Split info with time, delta, and isFaster flag
     */
    getSplitInfo(level) {
        const split = this.splits.find(s => s.level === level);
        if (!split) return null;
        
        return {
            time: this.formatTime(split.time),
            delta: split.delta !== null ? this.formatDelta(split.delta) : null,
            isFaster: split.isFaster,
            color: split.isFaster ? COLORS.GLOW_WARM : COLORS.GAUGE_LOW
        };
    }
    
    /**
     * Get all splits for display
     * @returns {Array} - Array of split info objects
     */
    getAllSplits() {
        return this.splits.map(split => ({
            level: split.level,
            time: this.formatTime(split.time),
            delta: split.delta !== null ? this.formatDelta(split.delta) : null,
            isFaster: split.isFaster,
            color: split.isFaster ? COLORS.GLOW_WARM : COLORS.GAUGE_LOW
        }));
    }
    
    /**
     * Get personal best time string
     * @returns {string|null} - Formatted best time or null if no best
     */
    getBestTimeString() {
        if (this.bestTotalTime === null) return null;
        return this.formatTime(this.bestTotalTime);
    }
    
    /**
     * Record ghost frame for speedrun replay (Requirement 6.5)
     * @param {Object} frame - Player state frame
     */
    recordGhostFrame(frame) {
        if (!this.active) return;
        
        this.speedrunGhostFrames.push({
            x: frame.x,
            y: frame.y,
            animFrame: frame.animFrame || 0,
            facing: frame.facing || 1,
            anim: frame.anim || 'idle',
            time: this.currentTime
        });
    }
    
    /**
     * Get current ghost frame for display (Requirement 6.5)
     * @param {number} currentTime - Current run time
     * @returns {Object|null} - Ghost frame or null
     */
    getGhostFrame(currentTime) {
        if (this.speedrunGhostFrames.length === 0) return null;
        
        // Find the frame closest to current time
        let closestFrame = null;
        let minDiff = Infinity;
        
        for (const frame of this.speedrunGhostFrames) {
            const diff = Math.abs(frame.time - currentTime);
            if (diff < minDiff) {
                minDiff = diff;
                closestFrame = frame;
            }
        }
        
        return closestFrame;
    }
    
    /**
     * Save speedrun data to save system (Requirement 6.7)
     * @returns {Object} - Serializable speedrun data
     */
    toJSON() {
        return {
            enabled: this.enabled,
            bestTotalTime: this.bestTotalTime,
            bestSplits: this.bestSplits,
            speedrunGhostFrames: this.speedrunGhostFrames
        };
    }
    
    /**
     * Load speedrun data from save system (Requirement 6.7)
     * @param {Object} data - Saved speedrun data
     */
    fromJSON(data) {
        if (!data) return;
        
        this.enabled = data.enabled || false;
        this.bestTotalTime = data.bestTotalTime || null;
        this.bestSplits = data.bestSplits || [];
        this.speedrunGhostFrames = data.speedrunGhostFrames || [];
        
        console.log('[SpeedrunSystem] Loaded speedrun data:', {
            enabled: this.enabled,
            bestTime: this.bestTotalTime !== null ? this.formatTime(this.bestTotalTime) : 'N/A',
            splits: this.bestSplits.length
        });
    }
}

// Create singleton instance
export const speedrunSystem = new SpeedrunSystem();
