/*
 * metricsSystem.test.js
 * Unit tests for Success Metrics Tracking System
 * 
 * Tests:
 * - Session length tracking and target comparison
 * - Level 1 completion rate tracking
 * - Day 7 return rate tracking
 * - Average deaths to beat game tracking
 * - Metrics export functionality
 * - Per-difficulty metrics calculation
 * - Metrics history persistence
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsSystem } from './metricsSystem.js';
import { analyticsSystem } from './analyticsSystem.js';
import { saveSystem } from './saveSystem.js';

// Mock the dependencies
vi.mock('./analyticsSystem.js', () => ({
    analyticsSystem: {
        getAverageSessionLength: vi.fn(() => 0),
        getCurrentSessionLength: vi.fn(() => 0),
        getLevelCompletionRate: vi.fn(() => 0),
        getReturnRates: vi.fn(() => ({ day1: 0, day7: 0, day30: 0 })),
        levelMetrics: {},
        exportAsJSON: vi.fn(() => '{}'),
    },
}));

vi.mock('./saveSystem.js', () => ({
    saveSystem: {
        load: vi.fn(() => ({
            statistics: {
                difficultyStats: {
                    Casual: {
                        sessionCount: 0,
                        totalPlayTime: 0,
                        levelCompletions: {},
                        levelAttempts: {},
                        totalDeaths: 0,
                    },
                    Normal: {
                        sessionCount: 0,
                        totalPlayTime: 0,
                        levelCompletions: {},
                        levelAttempts: {},
                        totalDeaths: 0,
                    },
                    Hardcore: {
                        sessionCount: 0,
                        totalPlayTime: 0,
                        levelCompletions: {},
                        levelAttempts: {},
                        totalDeaths: 0,
                    },
                },
            },
            metrics: {
                history: [],
            },
        })),
        save: vi.fn(),
    },
}));

describe('MetricsSystem', () => {
    let metricsSystem;
    
    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();
        
        // Create fresh instance
        metricsSystem = new MetricsSystem();
    });
    
    describe('Session Length Metric (Requirement 20.1)', () => {
        it('should track average session length vs 15 minute target', () => {
            // Mock 10 minute average session
            analyticsSystem.getAverageSessionLength.mockReturnValue(10 * 60 * 1000);
            
            const metric = metricsSystem.getSessionLengthMetric();
            
            expect(metric.name).toBe('Average Session Length');
            expect(metric.current).toBe(10 * 60 * 1000);
            expect(metric.target).toBe(15 * 60 * 1000);
            expect(metric.meetsTarget).toBe(false);
            expect(metric.percentage).toBeCloseTo(66.67, 1);
        });
        
        it('should indicate when session length meets target', () => {
            // Mock 20 minute average session
            analyticsSystem.getAverageSessionLength.mockReturnValue(20 * 60 * 1000);
            
            const metric = metricsSystem.getSessionLengthMetric();
            
            expect(metric.meetsTarget).toBe(true);
            expect(metric.percentage).toBeCloseTo(133.33, 1);
        });
        
        it('should format session length as readable time', () => {
            analyticsSystem.getAverageSessionLength.mockReturnValue(10 * 60 * 1000);
            
            const metric = metricsSystem.getSessionLengthMetric();
            
            expect(metric.currentFormatted).toBe('10m 0s');
            expect(metric.targetFormatted).toBe('15m 0s');
        });
    });
    
    describe('Level 1 Completion Rate Metric (Requirement 20.2)', () => {
        it('should track Level 1 completion rate vs 70% target', () => {
            // Mock 50% completion rate
            analyticsSystem.getLevelCompletionRate.mockReturnValue(0.5);
            
            const metric = metricsSystem.getLevel1CompletionMetric();
            
            expect(metric.name).toBe('Level 1 Completion Rate');
            expect(metric.current).toBe(0.5);
            expect(metric.target).toBe(0.70);
            expect(metric.meetsTarget).toBe(false);
            expect(metric.percentage).toBeCloseTo(71.43, 1);
        });
        
        it('should indicate when completion rate meets target', () => {
            // Mock 80% completion rate
            analyticsSystem.getLevelCompletionRate.mockReturnValue(0.8);
            
            const metric = metricsSystem.getLevel1CompletionMetric();
            
            expect(metric.meetsTarget).toBe(true);
            expect(metric.percentage).toBeCloseTo(114.29, 1);
        });
        
        it('should format completion rate as percentage', () => {
            analyticsSystem.getLevelCompletionRate.mockReturnValue(0.65);
            
            const metric = metricsSystem.getLevel1CompletionMetric();
            
            expect(metric.currentFormatted).toBe('65.0%');
            expect(metric.targetFormatted).toBe('70%');
        });
    });
    
    describe('Day 7 Return Rate Metric (Requirement 20.3)', () => {
        it('should track Day 7 return rate vs 30% target', () => {
            // Mock 20% return rate
            analyticsSystem.getReturnRates.mockReturnValue({ day1: 0.5, day7: 0.2, day30: 0.1 });
            
            const metric = metricsSystem.getDay7ReturnMetric();
            
            expect(metric.name).toBe('Day 7 Return Rate');
            expect(metric.current).toBe(0.2);
            expect(metric.target).toBe(0.30);
            expect(metric.meetsTarget).toBe(false);
            expect(metric.percentage).toBeCloseTo(66.67, 1);
        });
        
        it('should indicate when return rate meets target', () => {
            // Mock 40% return rate
            analyticsSystem.getReturnRates.mockReturnValue({ day1: 0.6, day7: 0.4, day30: 0.2 });
            
            const metric = metricsSystem.getDay7ReturnMetric();
            
            expect(metric.meetsTarget).toBe(true);
            expect(metric.percentage).toBeCloseTo(133.33, 1);
        });
    });
    
    describe('Average Deaths Metric (Requirement 20.4)', () => {
        it('should track average deaths vs 100-150 target range', () => {
            // Mock level metrics with 200 average deaths
            analyticsSystem.levelMetrics = {
                1: { completions: 1, deaths: 50 },
                2: { completions: 1, deaths: 150 },
            };
            
            const metric = metricsSystem.getAverageDeathsMetric();
            
            expect(metric.name).toBe('Average Deaths to Beat Game');
            expect(metric.current).toBe(100); // (50 + 150) / 2
            expect(metric.target).toEqual({ min: 100, max: 150 });
            expect(metric.meetsTarget).toBe(true);
        });
        
        it('should indicate when deaths are outside target range', () => {
            // Mock level metrics with 300 average deaths
            analyticsSystem.levelMetrics = {
                1: { completions: 1, deaths: 300 },
            };
            
            const metric = metricsSystem.getAverageDeathsMetric();
            
            expect(metric.current).toBe(300);
            expect(metric.meetsTarget).toBe(false);
        });
        
        it('should handle no completions gracefully', () => {
            analyticsSystem.levelMetrics = {};
            
            const metric = metricsSystem.getAverageDeathsMetric();
            
            expect(metric.current).toBe(0);
            expect(metric.totalCompletions).toBe(0);
        });
    });
    
    describe('Metrics Export (Requirement 20.6)', () => {
        it('should export all metrics as JSON', () => {
            analyticsSystem.getAverageSessionLength.mockReturnValue(10 * 60 * 1000);
            analyticsSystem.getLevelCompletionRate.mockReturnValue(0.65);
            analyticsSystem.getReturnRates.mockReturnValue({ day1: 0.5, day7: 0.25, day30: 0.1 });
            analyticsSystem.levelMetrics = {
                1: { completions: 1, deaths: 120 },
            };
            
            const json = metricsSystem.exportMetrics();
            const data = JSON.parse(json);
            
            expect(data.version).toBe('1.0');
            expect(data.exportDate).toBeDefined();
            expect(data.successMetrics).toBeDefined();
            expect(data.successMetrics.sessionLength).toBeDefined();
            expect(data.successMetrics.level1Completion).toBeDefined();
            expect(data.successMetrics.day7Return).toBeDefined();
            expect(data.successMetrics.averageDeaths).toBeDefined();
        });
        
        it('should include per-difficulty metrics in export', () => {
            const json = metricsSystem.exportMetrics();
            const data = JSON.parse(json);
            
            expect(data.perDifficulty).toBeDefined();
            expect(data.perDifficulty.Casual).toBeDefined();
            expect(data.perDifficulty.Normal).toBeDefined();
            expect(data.perDifficulty.Hardcore).toBeDefined();
        });
        
        it('should include metrics history in export', () => {
            metricsSystem.metricsHistory = [
                { timestamp: Date.now(), sessionLength: 600000, level1Completion: 0.5 },
            ];
            
            const json = metricsSystem.exportMetrics();
            const data = JSON.parse(json);
            
            expect(data.history).toBeDefined();
            expect(data.history.length).toBe(1);
        });
    });
    
    describe('Per-Difficulty Metrics (Requirement 20.7)', () => {
        it('should calculate metrics for each difficulty level', () => {
            saveSystem.load.mockReturnValue({
                statistics: {
                    difficultyStats: {
                        Casual: {
                            sessionCount: 5,
                            totalPlayTime: 50 * 60 * 1000, // 50 minutes
                            levelCompletions: { 1: 4 },
                            levelAttempts: { 1: 5 },
                            totalDeaths: 50,
                        },
                        Normal: {
                            sessionCount: 3,
                            totalPlayTime: 30 * 60 * 1000, // 30 minutes
                            levelCompletions: { 1: 2 },
                            levelAttempts: { 1: 4 },
                            totalDeaths: 80,
                        },
                        Hardcore: {
                            sessionCount: 1,
                            totalPlayTime: 5 * 60 * 1000, // 5 minutes
                            levelCompletions: { 1: 0 },
                            levelAttempts: { 1: 2 },
                            totalDeaths: 100,
                        },
                    },
                },
                metrics: { history: [] },
            });
            
            const perDifficulty = metricsSystem.getMetricsPerDifficulty();
            
            expect(perDifficulty.Casual).toBeDefined();
            expect(perDifficulty.Casual.sessionLength.current).toBe(10 * 60 * 1000); // 50/5
            expect(perDifficulty.Casual.level1Completion.current).toBe(0.8); // 4/5
            expect(perDifficulty.Casual.totalDeaths).toBe(50);
            
            expect(perDifficulty.Normal).toBeDefined();
            expect(perDifficulty.Normal.sessionLength.current).toBe(10 * 60 * 1000); // 30/3
            expect(perDifficulty.Normal.level1Completion.current).toBe(0.5); // 2/4
            
            expect(perDifficulty.Hardcore).toBeDefined();
            expect(perDifficulty.Hardcore.sessionLength.current).toBe(5 * 60 * 1000); // 5/1
            expect(perDifficulty.Hardcore.level1Completion.current).toBe(0); // 0/2
        });
    });
    
    describe('Metrics History (Requirement 20.8)', () => {
        it('should record metrics snapshots', () => {
            analyticsSystem.getAverageSessionLength.mockReturnValue(10 * 60 * 1000);
            analyticsSystem.getLevelCompletionRate.mockReturnValue(0.65);
            analyticsSystem.getReturnRates.mockReturnValue({ day1: 0.5, day7: 0.25, day30: 0.1 });
            analyticsSystem.levelMetrics = {
                1: { completions: 1, deaths: 120 },
            };
            
            metricsSystem.recordMetricsSnapshot();
            
            expect(metricsSystem.metricsHistory.length).toBe(1);
            expect(metricsSystem.metricsHistory[0].sessionLength).toBe(10 * 60 * 1000);
            expect(metricsSystem.metricsHistory[0].level1Completion).toBe(0.65);
            expect(metricsSystem.metricsHistory[0].day7Return).toBe(0.25);
            expect(metricsSystem.metricsHistory[0].averageDeaths).toBe(120);
        });
        
        it('should limit history to 100 snapshots', () => {
            // Add 150 snapshots
            for (let i = 0; i < 150; i++) {
                metricsSystem.recordMetricsSnapshot();
            }
            
            expect(metricsSystem.metricsHistory.length).toBe(100);
        });
        
        it('should persist metrics history to save system', () => {
            metricsSystem.recordMetricsSnapshot();
            
            expect(saveSystem.save).toHaveBeenCalled();
        });
    });
    
    describe('Dashboard Toggle (Requirement 20.5)', () => {
        it('should toggle dashboard visibility', () => {
            expect(metricsSystem.dashboardVisible).toBe(false);
            
            metricsSystem.toggleDashboard();
            expect(metricsSystem.dashboardVisible).toBe(true);
            
            metricsSystem.toggleDashboard();
            expect(metricsSystem.dashboardVisible).toBe(false);
        });
    });
    
    describe('Time Formatting', () => {
        it('should format milliseconds to readable time', () => {
            expect(metricsSystem.formatTime(0)).toBe('0s');
            expect(metricsSystem.formatTime(30 * 1000)).toBe('30s');
            expect(metricsSystem.formatTime(90 * 1000)).toBe('1m 30s');
            expect(metricsSystem.formatTime(15 * 60 * 1000)).toBe('15m 0s');
        });
    });
});
