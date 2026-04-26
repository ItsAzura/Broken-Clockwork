/*
 * metricsSystem.js
 * Success Metrics Tracking System for Game Retention & Engagement
 * 
 * Features:
 * - Tracks success criteria metrics (session length, Level 1 completion, Day 7 return, average deaths)
 * - Compares actual metrics vs target values
 * - Developer dashboard with F12 toggle
 * - Metrics export as JSON
 * - Per-difficulty level calculation
 * - Integration with save system for persistence
 * - Metrics history tracking
 * 
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8
 */

import { COLORS, SCREEN_W, SCREEN_H } from './constants.js';
import { drawPixelRect, drawPixelBorder, drawPixelText, measurePixelText } from './draw.js';
import { analyticsSystem } from './analyticsSystem.js';
import { saveSystem } from './saveSystem.js';

/**
 * Success criteria targets
 * **Validates: Requirements 20.1, 20.2, 20.3, 20.4**
 */
const SUCCESS_TARGETS = {
    sessionLength: 15 * 60 * 1000,  // 15 minutes in milliseconds (Requirement 20.1)
    level1Completion: 0.70,          // 70% completion rate (Requirement 20.2)
    day7Return: 0.30,                // 30% return rate (Requirement 20.3)
    averageDeaths: { min: 100, max: 150 }, // 100-150 deaths to beat game (Requirement 20.4)
};

/**
 * MetricsSystem class handles success criteria tracking and developer dashboard
 * **Validates: Requirements 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8**
 */
export class MetricsSystem {
    constructor() {
        // Dashboard state (Requirement 20.5)
        this.dashboardVisible = false;
        this.dashboardScroll = 0;
        
        // Metrics history for tracking over time (Requirement 20.8)
        this.metricsHistory = [];
        
        // Load persisted data
        this.loadFromSave();
        
        console.log('[MetricsSystem] Initialized');
    }
    
    /**
     * Calculate current session length metric vs target
     * **Validates: Requirement 20.1**
     */
    getSessionLengthMetric() {
        const avgSessionLength = analyticsSystem.getAverageSessionLength();
        const currentSessionLength = analyticsSystem.getCurrentSessionLength();
        
        return {
            name: 'Average Session Length',
            current: avgSessionLength,
            currentFormatted: this.formatTime(avgSessionLength),
            target: SUCCESS_TARGETS.sessionLength,
            targetFormatted: this.formatTime(SUCCESS_TARGETS.sessionLength),
            percentage: (avgSessionLength / SUCCESS_TARGETS.sessionLength) * 100,
            meetsTarget: avgSessionLength >= SUCCESS_TARGETS.sessionLength,
            currentSession: currentSessionLength,
            currentSessionFormatted: this.formatTime(currentSessionLength),
        };
    }
    
    /**
     * Calculate Level 1 completion rate metric vs target
     * **Validates: Requirement 20.2**
     */
    getLevel1CompletionMetric() {
        const completionRate = analyticsSystem.getLevelCompletionRate(1);
        
        return {
            name: 'Level 1 Completion Rate',
            current: completionRate,
            currentFormatted: `${(completionRate * 100).toFixed(1)}%`,
            target: SUCCESS_TARGETS.level1Completion,
            targetFormatted: `${(SUCCESS_TARGETS.level1Completion * 100).toFixed(0)}%`,
            percentage: (completionRate / SUCCESS_TARGETS.level1Completion) * 100,
            meetsTarget: completionRate >= SUCCESS_TARGETS.level1Completion,
        };
    }
    
    /**
     * Calculate Day 7 return rate metric vs target
     * **Validates: Requirement 20.3**
     */
    getDay7ReturnMetric() {
        const returnRates = analyticsSystem.getReturnRates();
        const day7Return = returnRates.day7;
        
        return {
            name: 'Day 7 Return Rate',
            current: day7Return,
            currentFormatted: `${(day7Return * 100).toFixed(1)}%`,
            target: SUCCESS_TARGETS.day7Return,
            targetFormatted: `${(SUCCESS_TARGETS.day7Return * 100).toFixed(0)}%`,
            percentage: (day7Return / SUCCESS_TARGETS.day7Return) * 100,
            meetsTarget: day7Return >= SUCCESS_TARGETS.day7Return,
        };
    }
    
    /**
     * Calculate average deaths to beat game metric vs target
     * **Validates: Requirement 20.4**
     */
    getAverageDeathsMetric() {
        // Calculate total deaths across all levels
        let totalDeaths = 0;
        let totalCompletions = 0;
        
        for (const levelId in analyticsSystem.levelMetrics) {
            const metrics = analyticsSystem.levelMetrics[levelId];
            if (metrics.completions > 0) {
                totalDeaths += metrics.deaths;
                totalCompletions += metrics.completions;
            }
        }
        
        const avgDeaths = totalCompletions > 0 ? totalDeaths / totalCompletions : 0;
        const targetMin = SUCCESS_TARGETS.averageDeaths.min;
        const targetMax = SUCCESS_TARGETS.averageDeaths.max;
        const targetMid = (targetMin + targetMax) / 2;
        
        // Check if within target range
        const meetsTarget = avgDeaths >= targetMin && avgDeaths <= targetMax;
        
        // Calculate percentage (100% = target midpoint)
        const percentage = (avgDeaths / targetMid) * 100;
        
        return {
            name: 'Average Deaths to Beat Game',
            current: avgDeaths,
            currentFormatted: avgDeaths.toFixed(1),
            target: { min: targetMin, max: targetMax },
            targetFormatted: `${targetMin}-${targetMax}`,
            percentage: percentage,
            meetsTarget: meetsTarget,
            totalDeaths: totalDeaths,
            totalCompletions: totalCompletions,
        };
    }
    
    /**
     * Get all success metrics
     * **Validates: Requirements 20.1, 20.2, 20.3, 20.4**
     */
    getAllMetrics() {
        return {
            sessionLength: this.getSessionLengthMetric(),
            level1Completion: this.getLevel1CompletionMetric(),
            day7Return: this.getDay7ReturnMetric(),
            averageDeaths: this.getAverageDeathsMetric(),
        };
    }
    
    /**
     * Calculate metrics per difficulty level
     * **Validates: Requirement 20.7**
     */
    getMetricsPerDifficulty() {
        // Load save data to get difficulty-specific stats
        const saveData = saveSystem.load();
        const difficultyStats = saveData.statistics.difficultyStats || {};
        
        const difficulties = ['Casual', 'Normal', 'Hardcore'];
        const result = {};
        
        for (const difficulty of difficulties) {
            const stats = difficultyStats[difficulty] || {
                sessionCount: 0,
                totalPlayTime: 0,
                levelCompletions: {},
                totalDeaths: 0,
            };
            
            // Calculate metrics for this difficulty
            const avgSessionLength = stats.sessionCount > 0 
                ? stats.totalPlayTime / stats.sessionCount 
                : 0;
            
            const level1Completions = stats.levelCompletions[1] || 0;
            const level1Attempts = stats.levelAttempts?.[1] || 0;
            const level1CompletionRate = level1Attempts > 0 
                ? level1Completions / level1Attempts 
                : 0;
            
            result[difficulty] = {
                sessionLength: {
                    current: avgSessionLength,
                    formatted: this.formatTime(avgSessionLength),
                    meetsTarget: avgSessionLength >= SUCCESS_TARGETS.sessionLength,
                },
                level1Completion: {
                    current: level1CompletionRate,
                    formatted: `${(level1CompletionRate * 100).toFixed(1)}%`,
                    meetsTarget: level1CompletionRate >= SUCCESS_TARGETS.level1Completion,
                },
                totalDeaths: stats.totalDeaths || 0,
                sessionCount: stats.sessionCount || 0,
            };
        }
        
        return result;
    }
    
    /**
     * Toggle developer dashboard visibility
     * **Validates: Requirement 20.5**
     */
    toggleDashboard() {
        this.dashboardVisible = !this.dashboardVisible;
        console.log(`[MetricsSystem] Dashboard ${this.dashboardVisible ? 'shown' : 'hidden'}`);
    }
    
    /**
     * Export metrics as JSON for external analysis
     * **Validates: Requirement 20.6**
     */
    exportMetrics() {
        const metrics = this.getAllMetrics();
        const perDifficulty = this.getMetricsPerDifficulty();
        
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            
            // Success criteria metrics
            successMetrics: {
                sessionLength: {
                    current: metrics.sessionLength.current,
                    target: metrics.sessionLength.target,
                    meetsTarget: metrics.sessionLength.meetsTarget,
                    percentage: metrics.sessionLength.percentage,
                },
                level1Completion: {
                    current: metrics.level1Completion.current,
                    target: metrics.level1Completion.target,
                    meetsTarget: metrics.level1Completion.meetsTarget,
                    percentage: metrics.level1Completion.percentage,
                },
                day7Return: {
                    current: metrics.day7Return.current,
                    target: metrics.day7Return.target,
                    meetsTarget: metrics.day7Return.meetsTarget,
                    percentage: metrics.day7Return.percentage,
                },
                averageDeaths: {
                    current: metrics.averageDeaths.current,
                    target: metrics.averageDeaths.target,
                    meetsTarget: metrics.averageDeaths.meetsTarget,
                    percentage: metrics.averageDeaths.percentage,
                    totalDeaths: metrics.averageDeaths.totalDeaths,
                    totalCompletions: metrics.averageDeaths.totalCompletions,
                },
            },
            
            // Per-difficulty metrics
            perDifficulty: perDifficulty,
            
            // Metrics history
            history: this.metricsHistory,
            
            // Raw analytics data
            analyticsData: JSON.parse(analyticsSystem.exportAsJSON()),
        };
        
        return JSON.stringify(exportData, null, 2);
    }
    
    /**
     * Render developer metrics dashboard
     * **Validates: Requirement 20.5**
     */
    renderDashboard(ctx) {
        if (!this.dashboardVisible) return;
        
        const padding = 8;
        const lineHeight = 10;
        let y = padding;
        
        // Semi-transparent background using consistent COLORS palette (Requirement 17.2)
        drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, COLORS.UI_BG);
        
        // Title
        drawPixelText(ctx, 'SUCCESS METRICS DASHBOARD (F12 to close)', padding, y, COLORS.GLOW_WARM, 1);
        y += lineHeight * 2;
        
        // Get all metrics
        const metrics = this.getAllMetrics();
        
        // Session Length Metric (Requirement 20.1)
        this.renderMetric(ctx, metrics.sessionLength, padding, y);
        y += lineHeight * 3;
        
        // Level 1 Completion Metric (Requirement 20.2)
        this.renderMetric(ctx, metrics.level1Completion, padding, y);
        y += lineHeight * 3;
        
        // Day 7 Return Metric (Requirement 20.3)
        this.renderMetric(ctx, metrics.day7Return, padding, y);
        y += lineHeight * 3;
        
        // Average Deaths Metric (Requirement 20.4)
        this.renderMetric(ctx, metrics.averageDeaths, padding, y);
        y += lineHeight * 3;
        
        // Per-difficulty breakdown (Requirement 20.7)
        drawPixelText(ctx, '=== PER-DIFFICULTY METRICS ===', padding, y, COLORS.UI_TEXT, 1);
        y += lineHeight;
        
        const perDifficulty = this.getMetricsPerDifficulty();
        for (const [difficulty, stats] of Object.entries(perDifficulty)) {
            if (y > SCREEN_H - lineHeight * 4) break; // Stop if running out of space
            
            const color = stats.sessionLength.meetsTarget ? COLORS.GLOW_WARM : COLORS.UI_MUTED;
            drawPixelText(ctx, `${difficulty}: ${stats.sessionLength.formatted} avg, ${stats.level1Completion.formatted} L1 comp`, 
                padding, y, color, 1);
            y += lineHeight;
        }
        
        y += lineHeight;
        
        // Export hint
        y = SCREEN_H - lineHeight * 2;
        drawPixelText(ctx, 'Press E to export metrics JSON to console', padding, y, COLORS.GAUGE_LOW, 1);
    }
    
    /**
     * Render a single metric with target comparison
     */
    renderMetric(ctx, metric, x, y) {
        const lineHeight = 10;
        
        // Metric name
        drawPixelText(ctx, metric.name, x, y, COLORS.UI_TEXT, 1);
        y += lineHeight;
        
        // Current vs Target
        const color = metric.meetsTarget ? COLORS.GLOW_WARM : COLORS.GAUGE_LOW;
        const status = metric.meetsTarget ? 'MEETS TARGET' : 'BELOW TARGET';
        
        drawPixelText(ctx, `Current: ${metric.currentFormatted} | Target: ${metric.targetFormatted}`, 
            x, y, color, 1);
        y += lineHeight;
        
        // Status and percentage
        const percentageText = `${metric.percentage.toFixed(1)}% of target - ${status}`;
        drawPixelText(ctx, percentageText, x, y, color, 1);
    }
    
    /**
     * Handle dashboard input
     */
    handleDashboardInput(key) {
        if (!this.dashboardVisible) return false;
        
        if (key === 'e' || key === 'E') {
            const json = this.exportMetrics();
            console.log('=== METRICS EXPORT ===');
            console.log(json);
            console.log('=== END EXPORT ===');
            return true;
        }
        
        return false;
    }
    
    /**
     * Record metrics snapshot for history tracking
     * **Validates: Requirement 20.8**
     */
    recordMetricsSnapshot() {
        const metrics = this.getAllMetrics();
        const snapshot = {
            timestamp: Date.now(),
            sessionLength: metrics.sessionLength.current,
            level1Completion: metrics.level1Completion.current,
            day7Return: metrics.day7Return.current,
            averageDeaths: metrics.averageDeaths.current,
        };
        
        this.metricsHistory.push(snapshot);
        
        // Keep only last 100 snapshots to avoid bloat
        if (this.metricsHistory.length > 100) {
            this.metricsHistory.shift();
        }
        
        this.persist();
    }
    
    /**
     * Persist metrics data to save system
     * **Validates: Requirement 20.8**
     */
    persist() {
        try {
            const saveData = saveSystem.load();
            
            if (!saveData.metrics) {
                saveData.metrics = {};
            }
            
            saveData.metrics = {
                history: this.metricsHistory,
            };
            
            saveSystem.save(saveData);
        } catch (error) {
            console.error('[MetricsSystem] Failed to persist data:', error);
        }
    }
    
    /**
     * Load metrics data from save system
     * **Validates: Requirement 20.8**
     */
    loadFromSave() {
        try {
            const saveData = saveSystem.load();
            
            if (!saveData.metrics) {
                console.log('[MetricsSystem] No saved metrics data found');
                return;
            }
            
            this.metricsHistory = saveData.metrics.history || [];
            
            console.log('[MetricsSystem] Loaded metrics data from save');
        } catch (error) {
            console.error('[MetricsSystem] Failed to load metrics data:', error);
        }
    }
    
    /**
     * Format time in milliseconds to readable string
     */
    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    /**
     * Reset all metrics data (for testing)
     */
    reset() {
        this.metricsHistory = [];
        this.dashboardVisible = false;
        console.log('[MetricsSystem] Reset all metrics data');
    }
}

// Export singleton instance
export const metricsSystem = new MetricsSystem();
