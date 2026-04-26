/*
 * leaderboardSystem.js
 * Local Leaderboard System for Game Retention & Engagement System
 * 
 * Features (Requirements 7.1-7.8):
 * - Track top 10 attempts per level based on death count (7.1)
 * - Track top 10 speedrun times per level (7.2)
 * - Insert new personal bests into appropriate position (7.4)
 * - Persist leaderboard data using Save_System (7.5)
 * - Support filtering by metric (deaths, time, completion rate) (7.7)
 * - Display player's current rank for active level (7.8)
 */

import { saveSystem } from './saveSystem.js';

/**
 * LeaderboardSystem class handles local ranking and personal best tracking
 */
export class LeaderboardSystem {
    constructor() {
        this.leaderboards = {}; // { levelId: { deaths: [], time: [] } }
        this.maxEntries = 10;
        this.currentLevelId = null;
        this.currentAttempt = null; // { deaths: 0, time: 0, startTime: 0 }
        
        console.log('[LeaderboardSystem] Initialized');
    }
    
    /**
     * Initialize leaderboard system and load persisted data
     */
    init() {
        try {
            const saveData = saveSystem.load();
            
            // Load leaderboard data from save system (Requirement 7.5)
            if (saveData.leaderboards) {
                this.leaderboards = saveData.leaderboards;
                console.log('[LeaderboardSystem] Loaded leaderboard data from save');
            } else {
                this.leaderboards = {};
                console.log('[LeaderboardSystem] No existing leaderboard data, starting fresh');
            }
            
        } catch (error) {
            console.error('[LeaderboardSystem] Init failed:', error);
            this.leaderboards = {};
        }
    }
    
    /**
     * Start tracking a new level attempt
     */
    startAttempt(levelId) {
        this.currentLevelId = levelId;
        this.currentAttempt = {
            deaths: 0,
            time: 0,
            startTime: Date.now()
        };
        
        // Ensure leaderboard exists for this level
        if (!this.leaderboards[levelId]) {
            this.leaderboards[levelId] = {
                deaths: [],
                time: []
            };
        }
        
        console.log(`[LeaderboardSystem] Started attempt for level ${levelId}`);
    }
    
    /**
     * Update current attempt death count
     */
    recordDeath() {
        if (this.currentAttempt) {
            this.currentAttempt.deaths++;
        }
    }
    
    /**
     * Complete current attempt and insert into leaderboard if it qualifies
     * Returns { deathsRank, timeRank, isNewBest } (Requirement 7.4)
     */
    completeAttempt(levelId, deathCount, completionTime) {
        if (!levelId) {
            console.warn('[LeaderboardSystem] completeAttempt called without levelId');
            return { deathsRank: null, timeRank: null, isNewBest: false };
        }
        
        // Ensure leaderboard exists for this level
        if (!this.leaderboards[levelId]) {
            this.leaderboards[levelId] = {
                deaths: [],
                time: []
            };
        }
        
        const now = new Date().toISOString();
        
        // Insert death count entry (Requirement 7.1, 7.4)
        const deathEntry = {
            rank: 0, // Will be calculated after insertion
            deaths: deathCount,
            date: now
        };
        const deathsRank = this.insertEntry(levelId, 'deaths', deathEntry);
        
        // Insert time entry (Requirement 7.2, 7.4)
        const timeEntry = {
            rank: 0, // Will be calculated after insertion
            time: completionTime,
            date: now
        };
        const timeRank = this.insertEntry(levelId, 'time', timeEntry);
        
        // Check if this is a new personal best
        const isNewBest = deathsRank === 1 || timeRank === 1;
        
        // Persist to save system (Requirement 7.5)
        this.persist();
        
        console.log(`[LeaderboardSystem] Completed level ${levelId}: deaths rank ${deathsRank}, time rank ${timeRank}`);
        
        return { deathsRank, timeRank, isNewBest };
    }
    
    /**
     * Insert entry into leaderboard and return rank (1-10, or null if didn't qualify)
     * Uses ranking algorithm to maintain sorted order (Requirement 7.4)
     */
    insertEntry(levelId, metric, entry) {
        // Ensure leaderboard structure exists for this level
        if (!this.leaderboards[levelId]) {
            this.leaderboards[levelId] = { deaths: [], time: [] };
        }

        const leaderboard = this.leaderboards[levelId][metric];
        
        // Determine sort order (lower is better for both deaths and time)
        const getValue = (e) => metric === 'deaths' ? e.deaths : e.time;
        
        // Find insertion position using binary search for efficiency
        let insertIndex = leaderboard.length;
        for (let i = 0; i < leaderboard.length; i++) {
            if (getValue(entry) < getValue(leaderboard[i])) {
                insertIndex = i;
                break;
            }
        }
        
        // Insert entry at appropriate position
        leaderboard.splice(insertIndex, 0, entry);
        
        // Trim to max entries (top 10)
        if (leaderboard.length > this.maxEntries) {
            leaderboard.length = this.maxEntries;
        }
        
        // Update ranks for all entries
        for (let i = 0; i < leaderboard.length; i++) {
            leaderboard[i].rank = i + 1;
        }
        
        // Return rank (1-based), or null if didn't make top 10
        const rank = insertIndex < this.maxEntries ? insertIndex + 1 : null;
        
        return rank;
    }
    
    /**
     * Get leaderboard entries for a level and metric (Requirement 7.3, 7.7)
     * @param {number} levelId - Level identifier
     * @param {string} metric - 'deaths' or 'time'
     * @returns {Array} Array of leaderboard entries with rank, score, and date
     */
    getLeaderboard(levelId, metric = 'deaths') {
        if (!this.leaderboards[levelId]) {
            return [];
        }
        
        const leaderboard = this.leaderboards[levelId][metric];
        if (!leaderboard) {
            return [];
        }
        
        // Return copy to prevent external modification
        return leaderboard.map(entry => ({ ...entry }));
    }
    
    /**
     * Get player's current best rank for a level (Requirement 7.8)
     * When called with two arguments, returns the rank of the best (first) entry.
     * When called with three arguments, returns the projected rank for the given value.
     * @param {number} levelId - Level identifier
     * @param {string} metric - 'deaths' or 'time'
     * @param {number} [currentValue] - Optional current attempt value (deaths or time)
     * @returns {number|null} Rank (1-based), or null if no entries and no value provided
     */
    getCurrentRank(levelId, metric, currentValue) {
        if (!this.leaderboards[levelId]) {
            return currentValue !== undefined ? 1 : null;
        }

        const leaderboard = this.leaderboards[levelId][metric];
        if (!leaderboard || leaderboard.length === 0) {
            return currentValue !== undefined ? 1 : null;
        }

        // If no value provided, return the rank of the best entry (rank 1)
        if (currentValue === undefined) {
            return leaderboard[0].rank;
        }

        // Find where current value would rank
        const getValue = (e) => metric === 'deaths' ? e.deaths : e.time;

        let rank = 1;
        for (const entry of leaderboard) {
            if (currentValue > getValue(entry)) {
                rank++;
            } else {
                break;
            }
        }

        return rank;
    }
    
    /**
     * Get best score for a level and metric
     * @param {number} levelId - Level identifier
     * @param {string} metric - 'deaths' or 'time'
     * @returns {number|null} Best score, or null if no entries
     */
    getBestScore(levelId, metric) {
        const leaderboard = this.getLeaderboard(levelId, metric);
        if (leaderboard.length === 0) {
            return null;
        }
        
        const firstEntry = leaderboard[0];
        return metric === 'deaths' ? firstEntry.deaths : firstEntry.time;
    }
    
    /**
     * Get completion rate for a level
     * @param {number} levelId - Level identifier
     * @returns {number} Completion rate (0-100%)
     */
    getCompletionRate(levelId) {
        if (!this.leaderboards[levelId]) {
            return 0;
        }
        
        // Completion rate = (completions / attempts) * 100
        // For now, we track completions via leaderboard entries
        // This is a simplified calculation - could be enhanced with attempt tracking
        const completions = this.leaderboards[levelId].deaths.length;
        
        // Load attempt count from save system statistics
        try {
            const saveData = saveSystem.load();
            const levelStats = saveData.statistics.levelStats[levelId];
            if (levelStats && levelStats.attempts > 0) {
                return Math.round((levelStats.completions / levelStats.attempts) * 100);
            }
        } catch (error) {
            console.error('[LeaderboardSystem] Error calculating completion rate:', error);
        }
        
        // Fallback: if we have completions, assume 100% (all tracked attempts completed)
        return completions > 0 ? 100 : 0;
    }
    
    /**
     * Get all metrics for a level (for filtering support - Requirement 7.7)
     * @param {number} levelId - Level identifier
     * @returns {Object} Object with deaths, time, and completionRate leaderboards
     */
    getAllMetrics(levelId) {
        return {
            deaths: this.getLeaderboard(levelId, 'deaths'),
            time: this.getLeaderboard(levelId, 'time'),
            completionRate: this.getCompletionRate(levelId)
        };
    }
    
    /**
     * Check if a score would make the top 10
     * @param {number} levelId - Level identifier
     * @param {string} metric - 'deaths' or 'time'
     * @param {number} value - Score value
     * @returns {boolean} True if would make top 10
     */
    wouldMakeTop10(levelId, metric, value) {
        const leaderboard = this.getLeaderboard(levelId, metric);
        
        // If less than 10 entries, always makes it
        if (leaderboard.length < this.maxEntries) {
            return true;
        }
        
        // Check if better than worst entry
        const worstEntry = leaderboard[leaderboard.length - 1];
        const worstValue = metric === 'deaths' ? worstEntry.deaths : worstEntry.time;
        
        return value < worstValue;
    }
    
    /**
     * Clear leaderboard for a specific level
     * @param {number} levelId - Level identifier
     */
    clearLevel(levelId) {
        if (this.leaderboards[levelId]) {
            delete this.leaderboards[levelId];
            this.persist();
            console.log(`[LeaderboardSystem] Cleared leaderboard for level ${levelId}`);
        }
    }
    
    /**
     * Clear all leaderboards
     */
    clearAll() {
        this.leaderboards = {};
        this.persist();
        console.log('[LeaderboardSystem] Cleared all leaderboards');
    }
    
    /**
     * Persist leaderboard data to save system (Requirement 7.5)
     */
    persist() {
        try {
            const saveData = saveSystem.load();
            saveData.leaderboards = this.leaderboards;
            saveSystem.save(saveData);
            console.log('[LeaderboardSystem] Persisted leaderboard data');
        } catch (error) {
            console.error('[LeaderboardSystem] Persist failed:', error);
        }
    }
    
    /**
     * Export leaderboard data as JSON for debugging
     */
    exportData() {
        return JSON.stringify(this.leaderboards, null, 2);
    }
    
    /**
     * Import leaderboard data from JSON
     */
    importData(jsonString) {
        try {
            const importedData = JSON.parse(jsonString);
            this.leaderboards = importedData;
            this.persist();
            console.log('[LeaderboardSystem] Imported leaderboard data');
            return true;
        } catch (error) {
            console.error('[LeaderboardSystem] Import failed:', error);
            return false;
        }
    }
    
    /**
     * Add a death-count entry for a level (Requirement 7.1, 7.4)
     * @param {number} levelId - Level identifier
     * @param {number} deaths - Death count for this attempt
     * @returns {number|null} Rank achieved (1-10), or null if didn't make top 10
     */
    addDeathEntry(levelId, deaths) {
        if (!this.leaderboards[levelId]) {
            this.leaderboards[levelId] = { deaths: [], time: [] };
        }

        const entry = {
            rank: 0,
            deaths: deaths,
            date: new Date().toISOString(),
            isPersonalBest: false
        };

        const rank = this.insertEntry(levelId, 'deaths', entry);

        // Mark as personal best if rank 1
        if (rank === 1 && this.leaderboards[levelId].deaths.length > 0) {
            this.leaderboards[levelId].deaths[0].isPersonalBest = true;
        }

        this.persist();
        return rank;
    }

    /**
     * Add a speedrun time entry for a level (Requirement 7.2, 7.4)
     * @param {number} levelId - Level identifier
     * @param {number} timeMs - Completion time in milliseconds
     * @returns {number|null} Rank achieved (1-10), or null if didn't make top 10
     */
    addTimeEntry(levelId, timeMs) {
        if (!this.leaderboards[levelId]) {
            this.leaderboards[levelId] = { deaths: [], time: [] };
        }

        const entry = {
            rank: 0,
            time: timeMs,
            date: new Date().toISOString(),
            isPersonalBest: false
        };

        const rank = this.insertEntry(levelId, 'time', entry);

        // Mark as personal best if rank 1
        if (rank === 1 && this.leaderboards[levelId].time.length > 0) {
            this.leaderboards[levelId].time[0].isPersonalBest = true;
        }

        this.persist();
        return rank;
    }

    /**
     * Get top 10 death entries for a level, sorted ascending by deaths (Requirement 7.1)
     * @param {number} levelId - Level identifier
     * @returns {Array} Array of death leaderboard entries
     */
    getDeathLeaderboard(levelId) {
        return this.getLeaderboard(levelId, 'deaths');
    }

    /**
     * Get top 10 time entries for a level, sorted ascending by time (Requirement 7.2)
     * @param {number} levelId - Level identifier
     * @returns {Array} Array of time leaderboard entries
     */
    getTimeLeaderboard(levelId) {
        return this.getLeaderboard(levelId, 'time');
    }

    /**
     * Get what rank a given value would be (or is) in the leaderboard (Requirement 7.8)
     * @param {number} levelId - Level identifier
     * @param {string} metric - 'deaths' or 'time'
     * @param {number} value - The value to rank
     * @returns {number} Projected rank (1-based); returns maxEntries+1 if outside top 10
     */
    getPlayerRank(levelId, metric, value) {
        if (!this.leaderboards[levelId]) {
            return 1; // First entry would be rank 1
        }

        const leaderboard = this.leaderboards[levelId][metric];
        if (!leaderboard || leaderboard.length === 0) {
            return 1;
        }

        const getValue = (e) => metric === 'deaths' ? e.deaths : e.time;

        let rank = 1;
        for (const entry of leaderboard) {
            if (value > getValue(entry)) {
                rank++;
            } else {
                break;
            }
        }

        return rank;
    }

    /**
     * Check if any entries exist for a level/metric (Requirement 7.8)
     * @param {number} levelId - Level identifier
     * @param {string} metric - 'deaths' or 'time'
     * @returns {boolean} True if entries exist
     */
    hasEntry(levelId, metric) {
        if (!this.leaderboards[levelId]) return false;
        const leaderboard = this.leaderboards[levelId][metric];
        return Array.isArray(leaderboard) && leaderboard.length > 0;
    }

    /**
     * Clear leaderboard for a level/metric (for testing/reset)
     * @param {number} levelId - Level identifier
     * @param {string} metric - 'deaths' or 'time'
     */
    clearLeaderboard(levelId, metric) {
        if (this.leaderboards[levelId] && this.leaderboards[levelId][metric]) {
            this.leaderboards[levelId][metric] = [];
            this.persist();
            console.log(`[LeaderboardSystem] Cleared ${metric} leaderboard for level ${levelId}`);
        }
    }

    /**
     * Get statistics summary for debugging
     */
    getStats() {
        const stats = {
            totalLevels: Object.keys(this.leaderboards).length,
            totalEntries: 0,
            levelStats: {}
        };
        
        for (const levelId in this.leaderboards) {
            const deathEntries = this.leaderboards[levelId].deaths.length;
            const timeEntries = this.leaderboards[levelId].time.length;
            
            stats.totalEntries += deathEntries + timeEntries;
            stats.levelStats[levelId] = {
                deathEntries,
                timeEntries,
                bestDeaths: this.getBestScore(levelId, 'deaths'),
                bestTime: this.getBestScore(levelId, 'time')
            };
        }
        
        return stats;
    }
}

// Export singleton instance
export const leaderboardSystem = new LeaderboardSystem();

// Expose as global for non-module scripts
if (typeof window !== 'undefined') {
    window.leaderboardSystem = leaderboardSystem;
}
