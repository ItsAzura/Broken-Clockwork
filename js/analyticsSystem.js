/*
 * analyticsSystem.js
 * Analytics and Telemetry System for Game Retention & Engagement
 * 
 * Features:
 * - Session tracking (start/end times, session length)
 * - Level completion rate tracking
 * - Death count tracking per level
 * - Return rate tracking (Day 1, Day 7, Day 30)
 * - Death location tracking per level
 * - Trap type death tracking
 * - Integration with save system for persistence
 * - JSON export functionality
 * - Developer dashboard (F12 toggle)
 * - Privacy-compliant (all data stays local)
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8
 */

import { COLORS, SCREEN_W, SCREEN_H } from './constants.js';
import { drawPixelRect, drawPixelBorder, drawPixelText, measurePixelText } from './draw.js';
import { saveSystem } from './saveSystem.js';

/**
 * AnalyticsSystem class handles all player behavior tracking and metrics
 * **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8**
 */
export class AnalyticsSystem {
    constructor() {
        // Session tracking (Requirement 14.1)
        this.currentSession = {
            startTime: null,
            endTime: null,
            active: false,
        };
        
        // Level tracking (Requirements 14.2, 14.3)
        this.levelMetrics = {}; // { levelId: { attempts, completions, deaths, deathLocations, trapDeaths } }
        
        // Return rate tracking (Requirement 14.4)
        this.returnDates = []; // Array of Date objects when player returned
        this.lastPlayDate = null;
        
        // Death location tracking (Requirement 14.5)
        this.deathLocations = {}; // { levelId: [{ x, y, count }] }
        
        // Trap type death tracking (Requirement 14.6)
        this.trapDeaths = {}; // { trapType: count }
        
        // Session history
        this.sessionLengths = []; // Array of session lengths in milliseconds
        
        // Dashboard state
        this.dashboardVisible = false;
        this.dashboardScroll = 0;
        
        // Load persisted data
        this.loadFromSave();
        
        console.log('[AnalyticsSystem] Initialized');
    }
    
    /**
     * Start a new session
     * **Validates: Requirement 14.1**
     */
    startSession() {
        if (this.currentSession.active) {
            console.warn('[AnalyticsSystem] Session already active');
            return;
        }
        
        this.currentSession = {
            startTime: Date.now(),
            endTime: null,
            active: true,
        };
        
        // Track return date (Requirement 14.4)
        const today = new Date().toDateString();
        if (!this.lastPlayDate || this.lastPlayDate !== today) {
            this.returnDates.push(new Date());
            this.lastPlayDate = today;
            this.persist();
        }
        
        console.log('[AnalyticsSystem] Session started');
    }
    
    /**
     * End the current session
     * **Validates: Requirement 14.1**
     */
    endSession() {
        if (!this.currentSession.active) {
            console.warn('[AnalyticsSystem] No active session to end');
            return;
        }
        
        this.currentSession.endTime = Date.now();
        this.currentSession.active = false;
        
        const sessionLength = this.currentSession.endTime - this.currentSession.startTime;
        this.sessionLengths.push(sessionLength);
        
        // Persist session data
        this.persist();
        
        console.log(`[AnalyticsSystem] Session ended, duration: ${(sessionLength / 1000).toFixed(1)}s`);
    }
    
    /**
     * Get current session length in milliseconds
     * **Validates: Requirement 14.1**
     */
    getCurrentSessionLength() {
        if (!this.currentSession.active) return 0;
        return Date.now() - this.currentSession.startTime;
    }
    
    /**
     * Get average session length in milliseconds
     * **Validates: Requirement 14.1**
     */
    getAverageSessionLength() {
        if (this.sessionLengths.length === 0) return 0;
        const total = this.sessionLengths.reduce((sum, length) => sum + length, 0);
        return total / this.sessionLengths.length;
    }
    
    /**
     * Track level attempt
     * **Validates: Requirement 14.2**
     */
    trackLevelAttempt(levelId) {
        if (!this.levelMetrics[levelId]) {
            this.levelMetrics[levelId] = {
                attempts: 0,
                completions: 0,
                deaths: 0,
                deathLocations: [],
                trapDeaths: {},
            };
        }
        
        this.levelMetrics[levelId].attempts++;
    }
    
    /**
     * Track level completion
     * **Validates: Requirement 14.2**
     */
    trackLevelCompletion(levelId) {
        if (!this.levelMetrics[levelId]) {
            this.trackLevelAttempt(levelId);
        }
        
        this.levelMetrics[levelId].completions++;
        this.persist();
        
        console.log(`[AnalyticsSystem] Level ${levelId} completed`);
    }
    
    /**
     * Get level completion rate (0-1)
     * **Validates: Requirement 14.2**
     */
    getLevelCompletionRate(levelId) {
        const metrics = this.levelMetrics[levelId];
        if (!metrics || metrics.attempts === 0) return 0;
        return metrics.completions / metrics.attempts;
    }
    
    /**
     * Track death in a level
     * **Validates: Requirement 14.3**
     */
    trackDeath(levelId, x = null, y = null, trapType = null) {
        if (!this.levelMetrics[levelId]) {
            this.trackLevelAttempt(levelId);
        }
        
        this.levelMetrics[levelId].deaths++;
        
        // Track death location (Requirement 14.5)
        if (x !== null && y !== null) {
            this.trackDeathLocation(levelId, x, y);
        }
        
        // Track trap type (Requirement 14.6)
        if (trapType) {
            this.trackTrapDeath(trapType);
        }
    }
    
    /**
     * Get average deaths per level
     * **Validates: Requirement 14.3**
     */
    getAverageDeathsPerLevel(levelId) {
        const metrics = this.levelMetrics[levelId];
        if (!metrics || metrics.attempts === 0) return 0;
        return metrics.deaths / metrics.attempts;
    }
    
    /**
     * Track death location
     * **Validates: Requirement 14.5**
     */
    trackDeathLocation(levelId, x, y) {
        if (!this.deathLocations[levelId]) {
            this.deathLocations[levelId] = [];
        }
        
        // Check if location already exists (within 8px radius)
        const existingLocation = this.deathLocations[levelId].find(loc => {
            const dx = loc.x - x;
            const dy = loc.y - y;
            return Math.sqrt(dx * dx + dy * dy) < 8;
        });
        
        if (existingLocation) {
            existingLocation.count++;
        } else {
            this.deathLocations[levelId].push({ x, y, count: 1 });
        }
    }
    
    /**
     * Get most common death locations for a level
     * **Validates: Requirement 14.5**
     */
    getMostCommonDeathLocations(levelId, limit = 5) {
        const locations = this.deathLocations[levelId] || [];
        return locations
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }
    
    /**
     * Track trap type death
     * **Validates: Requirement 14.6**
     */
    trackTrapDeath(trapType) {
        if (!this.trapDeaths[trapType]) {
            this.trapDeaths[trapType] = 0;
        }
        this.trapDeaths[trapType]++;
    }
    
    /**
     * Get most common trap types causing death
     * **Validates: Requirement 14.6**
     */
    getMostCommonTrapTypes(limit = 5) {
        const trapTypes = Object.entries(this.trapDeaths)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
        return trapTypes;
    }
    
    /**
     * Calculate return rates
     * **Validates: Requirement 14.4**
     */
    getReturnRates() {
        if (this.returnDates.length === 0) {
            return { day1: 0, day7: 0, day30: 0 };
        }
        
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        // Sort return dates
        const sortedDates = this.returnDates
            .map(d => new Date(d).getTime())
            .sort((a, b) => a - b);
        
        // Calculate return rates
        let day1Returns = 0;
        let day7Returns = 0;
        let day30Returns = 0;
        let totalSessions = sortedDates.length;
        
        for (let i = 0; i < sortedDates.length - 1; i++) {
            const currentDate = sortedDates[i];
            const nextDate = sortedDates[i + 1];
            const daysDiff = (nextDate - currentDate) / oneDayMs;
            
            if (daysDiff <= 1) day1Returns++;
            if (daysDiff <= 7) day7Returns++;
            if (daysDiff <= 30) day30Returns++;
        }
        
        return {
            day1: totalSessions > 1 ? day1Returns / (totalSessions - 1) : 0,
            day7: totalSessions > 1 ? day7Returns / (totalSessions - 1) : 0,
            day30: totalSessions > 1 ? day30Returns / (totalSessions - 1) : 0,
        };
    }
    
    /**
     * Export analytics data as JSON
     * **Validates: Requirement 14.8**
     */
    exportAsJSON() {
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            
            // Session metrics
            sessions: {
                total: this.sessionLengths.length,
                averageLength: this.getAverageSessionLength(),
                currentSessionLength: this.getCurrentSessionLength(),
                sessionLengths: this.sessionLengths,
            },
            
            // Level metrics
            levels: Object.entries(this.levelMetrics).map(([levelId, metrics]) => ({
                levelId: parseInt(levelId),
                attempts: metrics.attempts,
                completions: metrics.completions,
                completionRate: this.getLevelCompletionRate(levelId),
                deaths: metrics.deaths,
                averageDeaths: this.getAverageDeathsPerLevel(levelId),
                deathLocations: this.deathLocations[levelId] || [],
            })),
            
            // Return rates
            returnRates: this.getReturnRates(),
            returnDates: this.returnDates.map(d => new Date(d).toISOString()),
            
            // Trap deaths
            trapDeaths: this.trapDeaths,
            mostCommonTraps: this.getMostCommonTrapTypes(10),
        };
        
        return JSON.stringify(data, null, 2);
    }
    
    /**
     * Persist analytics data to save system
     * **Validates: Requirement 14.7**
     */
    persist() {
        try {
            const saveData = saveSystem.load();
            
            if (!saveData.analytics) {
                saveData.analytics = {};
            }
            
            // Update analytics data in save
            saveData.analytics = {
                sessionLengths: this.sessionLengths,
                returnDates: this.returnDates.map(d => new Date(d).toISOString()),
                lastPlayDate: this.lastPlayDate,
                levelMetrics: this.levelMetrics,
                deathLocations: this.deathLocations,
                trapDeaths: this.trapDeaths,
            };
            
            saveSystem.save(saveData);
        } catch (error) {
            console.error('[AnalyticsSystem] Failed to persist data:', error);
        }
    }
    
    /**
     * Load analytics data from save system
     * **Validates: Requirement 14.7**
     */
    loadFromSave() {
        try {
            const saveData = saveSystem.load();
            
            if (!saveData.analytics) {
                console.log('[AnalyticsSystem] No saved analytics data found');
                return;
            }
            
            const analytics = saveData.analytics;
            
            // Load session data
            this.sessionLengths = analytics.sessionLengths || [];
            this.returnDates = (analytics.returnDates || []).map(d => new Date(d));
            this.lastPlayDate = analytics.lastPlayDate || null;
            
            // Load level metrics
            this.levelMetrics = analytics.levelMetrics || {};
            
            // Load death locations
            this.deathLocations = analytics.deathLocations || {};
            
            // Load trap deaths
            this.trapDeaths = analytics.trapDeaths || {};
            
            console.log('[AnalyticsSystem] Loaded analytics data from save');
        } catch (error) {
            console.error('[AnalyticsSystem] Failed to load analytics data:', error);
        }
    }
    
    /**
     * Toggle developer dashboard visibility
     */
    toggleDashboard() {
        this.dashboardVisible = !this.dashboardVisible;
        console.log(`[AnalyticsSystem] Dashboard ${this.dashboardVisible ? 'shown' : 'hidden'}`);
    }
    
    /**
     * Render developer dashboard (F12 toggle)
     */
    renderDashboard(ctx) {
        if (!this.dashboardVisible) return;
        
        const padding = 8;
        const lineHeight = 10;
        let y = padding;
        
        // Semi-transparent background
        ctx.fillStyle = 'rgba(13, 9, 5, 0.95)';
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
        
        // Title
        drawPixelText(ctx, 'ANALYTICS DASHBOARD (F12 to close)', padding, y, COLORS.GLOW_WARM, 1);
        y += lineHeight * 2;
        
        // Session metrics
        drawPixelText(ctx, '=== SESSION METRICS ===', padding, y, COLORS.UI_TEXT, 1);
        y += lineHeight;
        
        const avgSessionSec = (this.getAverageSessionLength() / 1000).toFixed(1);
        const currentSessionSec = (this.getCurrentSessionLength() / 1000).toFixed(1);
        
        drawPixelText(ctx, `Total Sessions: ${this.sessionLengths.length}`, padding, y, COLORS.UI_MUTED, 1);
        y += lineHeight;
        drawPixelText(ctx, `Avg Session: ${avgSessionSec}s`, padding, y, COLORS.UI_MUTED, 1);
        y += lineHeight;
        drawPixelText(ctx, `Current: ${currentSessionSec}s`, padding, y, COLORS.UI_MUTED, 1);
        y += lineHeight * 2;
        
        // Return rates
        const returnRates = this.getReturnRates();
        drawPixelText(ctx, '=== RETURN RATES ===', padding, y, COLORS.UI_TEXT, 1);
        y += lineHeight;
        drawPixelText(ctx, `Day 1: ${(returnRates.day1 * 100).toFixed(1)}%`, padding, y, COLORS.UI_MUTED, 1);
        y += lineHeight;
        drawPixelText(ctx, `Day 7: ${(returnRates.day7 * 100).toFixed(1)}%`, padding, y, COLORS.UI_MUTED, 1);
        y += lineHeight;
        drawPixelText(ctx, `Day 30: ${(returnRates.day30 * 100).toFixed(1)}%`, padding, y, COLORS.UI_MUTED, 1);
        y += lineHeight * 2;
        
        // Level metrics
        drawPixelText(ctx, '=== LEVEL METRICS ===', padding, y, COLORS.UI_TEXT, 1);
        y += lineHeight;
        
        const levelIds = Object.keys(this.levelMetrics).sort((a, b) => parseInt(a) - parseInt(b));
        for (const levelId of levelIds) {
            if (y > SCREEN_H - lineHeight * 2) break; // Stop if running out of space
            
            const metrics = this.levelMetrics[levelId];
            const completionRate = (this.getLevelCompletionRate(levelId) * 100).toFixed(1);
            const avgDeaths = this.getAverageDeathsPerLevel(levelId).toFixed(1);
            
            drawPixelText(ctx, `L${levelId}: ${metrics.completions}/${metrics.attempts} (${completionRate}%) ${avgDeaths} deaths`, 
                padding, y, COLORS.UI_MUTED, 1);
            y += lineHeight;
        }
        
        y += lineHeight;
        
        // Trap deaths
        if (y < SCREEN_H - lineHeight * 8) {
            drawPixelText(ctx, '=== TOP TRAP DEATHS ===', padding, y, COLORS.UI_TEXT, 1);
            y += lineHeight;
            
            const topTraps = this.getMostCommonTrapTypes(5);
            for (const trap of topTraps) {
                if (y > SCREEN_H - lineHeight * 2) break;
                drawPixelText(ctx, `${trap.type}: ${trap.count}`, padding, y, COLORS.UI_MUTED, 1);
                y += lineHeight;
            }
        }
        
        // Export hint
        y = SCREEN_H - lineHeight * 2;
        drawPixelText(ctx, 'Press E to export JSON to console', padding, y, COLORS.GAUGE_LOW, 1);
    }
    
    /**
     * Handle dashboard input
     */
    handleDashboardInput(key) {
        if (!this.dashboardVisible) return false;
        
        if (key === 'e' || key === 'E') {
            const json = this.exportAsJSON();
            console.log('=== ANALYTICS EXPORT ===');
            console.log(json);
            console.log('=== END EXPORT ===');
            return true;
        }
        
        return false;
    }
    
    /**
     * Reset all analytics data (for testing)
     */
    reset() {
        this.currentSession = {
            startTime: null,
            endTime: null,
            active: false,
        };
        this.levelMetrics = {};
        this.returnDates = [];
        this.lastPlayDate = null;
        this.deathLocations = {};
        this.trapDeaths = {};
        this.sessionLengths = [];
        this.dashboardVisible = false;
        
        console.log('[AnalyticsSystem] Reset all analytics data');
    }
}

// Export singleton instance
export const analyticsSystem = new AnalyticsSystem();
