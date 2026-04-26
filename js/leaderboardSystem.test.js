/*
 * leaderboardSystem.test.js
 * Unit tests for Local Leaderboard System
 * 
 * Tests Requirements 7.1-7.8:
 * - Top 10 tracking per level (7.1, 7.2)
 * - Entry insertion and ranking (7.4)
 * - Data persistence (7.5)
 * - Metric filtering (7.7)
 * - Current rank display (7.8)
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { LeaderboardSystem } from './leaderboardSystem.js';
import { saveSystem } from './saveSystem.js';

// Mock saveSystem
vi.mock('./saveSystem.js', () => ({
    saveSystem: {
        load: vi.fn(() => ({
            version: "1.0",
            player: { totalDeaths: 0, levelDeaths: {}, levelsCompleted: [], currentLevel: 1 },
            progression: { unlockedSkins: ["default"], unlockedAchievements: [], skinProgress: {} },
            settings: { difficulty: "Normal", selectedSkin: "default", audioVolume: { music: 0.7, sfx: 0.7 } },
            statistics: { sessionCount: 0, totalPlayTime: 0, levelStats: {} },
            leaderboards: {}
        })),
        save: vi.fn(),
        exists: vi.fn(() => false)
    }
}));

describe('LeaderboardSystem', () => {
    let leaderboard;
    
    beforeEach(() => {
        leaderboard = new LeaderboardSystem();
        leaderboard.init();
        vi.clearAllMocks();
    });
    
    describe('Initialization', () => {
        test('should initialize with empty leaderboards', () => {
            expect(leaderboard.leaderboards).toEqual({});
            expect(leaderboard.maxEntries).toBe(10);
        });
        
        test('should load existing leaderboard data from save system', () => {
            const existingData = {
                1: {
                    deaths: [{ rank: 1, deaths: 5, date: '2024-01-01' }],
                    time: [{ rank: 1, time: 30.5, date: '2024-01-01' }]
                }
            };
            
            saveSystem.load.mockReturnValueOnce({
                version: "1.0",
                player: {},
                progression: {},
                settings: {},
                statistics: {},
                leaderboards: existingData
            });
            
            const lb = new LeaderboardSystem();
            lb.init();
            
            expect(lb.leaderboards).toEqual(existingData);
        });
    });
    
    describe('Attempt Tracking', () => {
        test('should start tracking a new attempt', () => {
            leaderboard.startAttempt(1);
            
            expect(leaderboard.currentLevelId).toBe(1);
            expect(leaderboard.currentAttempt).toEqual({
                deaths: 0,
                time: 0,
                startTime: expect.any(Number)
            });
        });
        
        test('should record deaths during attempt', () => {
            leaderboard.startAttempt(1);
            leaderboard.recordDeath();
            leaderboard.recordDeath();
            
            expect(leaderboard.currentAttempt.deaths).toBe(2);
        });
        
        test('should create leaderboard structure for new level', () => {
            leaderboard.startAttempt(1);
            
            expect(leaderboard.leaderboards[1]).toEqual({
                deaths: [],
                time: []
            });
        });
    });
    
    describe('Entry Insertion and Ranking (Requirement 7.4)', () => {
        test('should insert first entry with rank 1', () => {
            const rank = leaderboard.insertEntry(1, 'deaths', {
                rank: 0,
                deaths: 10,
                date: '2024-01-01'
            });
            
            expect(rank).toBe(1);
            expect(leaderboard.leaderboards[1].deaths[0]).toEqual({
                rank: 1,
                deaths: 10,
                date: '2024-01-01'
            });
        });
        
        test('should insert entries in sorted order (lower deaths = better)', () => {
            leaderboard.leaderboards[1] = { deaths: [], time: [] };
            
            leaderboard.insertEntry(1, 'deaths', { rank: 0, deaths: 10, date: '2024-01-01' });
            leaderboard.insertEntry(1, 'deaths', { rank: 0, deaths: 5, date: '2024-01-02' });
            leaderboard.insertEntry(1, 'deaths', { rank: 0, deaths: 15, date: '2024-01-03' });
            
            const deaths = leaderboard.leaderboards[1].deaths;
            expect(deaths[0].deaths).toBe(5);
            expect(deaths[1].deaths).toBe(10);
            expect(deaths[2].deaths).toBe(15);
        });
        
        test('should update ranks after insertion', () => {
            leaderboard.leaderboards[1] = { deaths: [], time: [] };
            
            leaderboard.insertEntry(1, 'deaths', { rank: 0, deaths: 10, date: '2024-01-01' });
            leaderboard.insertEntry(1, 'deaths', { rank: 0, deaths: 5, date: '2024-01-02' });
            leaderboard.insertEntry(1, 'deaths', { rank: 0, deaths: 15, date: '2024-01-03' });
            
            const deaths = leaderboard.leaderboards[1].deaths;
            expect(deaths[0].rank).toBe(1);
            expect(deaths[1].rank).toBe(2);
            expect(deaths[2].rank).toBe(3);
        });
        
        test('should limit entries to top 10 (Requirement 7.1)', () => {
            leaderboard.leaderboards[1] = { deaths: [], time: [] };
            
            // Insert 15 entries
            for (let i = 1; i <= 15; i++) {
                leaderboard.insertEntry(1, 'deaths', {
                    rank: 0,
                    deaths: i * 5,
                    date: `2024-01-${String(i).padStart(2, '0')}`
                });
            }
            
            expect(leaderboard.leaderboards[1].deaths.length).toBe(10);
            expect(leaderboard.leaderboards[1].deaths[9].deaths).toBe(50); // 10th best
        });
        
        test('should return null rank if entry does not make top 10', () => {
            leaderboard.leaderboards[1] = { deaths: [], time: [] };
            
            // Fill with 10 entries (deaths: 5, 10, 15, ..., 50)
            for (let i = 1; i <= 10; i++) {
                leaderboard.insertEntry(1, 'deaths', {
                    rank: 0,
                    deaths: i * 5,
                    date: `2024-01-${String(i).padStart(2, '0')}`
                });
            }
            
            // Try to insert worse entry
            const rank = leaderboard.insertEntry(1, 'deaths', {
                rank: 0,
                deaths: 100,
                date: '2024-01-11'
            });
            
            expect(rank).toBeNull();
            expect(leaderboard.leaderboards[1].deaths.length).toBe(10);
        });
        
        test('should handle time entries with same logic', () => {
            leaderboard.leaderboards[1] = { deaths: [], time: [] };
            
            leaderboard.insertEntry(1, 'time', { rank: 0, time: 45.5, date: '2024-01-01' });
            leaderboard.insertEntry(1, 'time', { rank: 0, time: 30.2, date: '2024-01-02' });
            leaderboard.insertEntry(1, 'time', { rank: 0, time: 60.8, date: '2024-01-03' });
            
            const times = leaderboard.leaderboards[1].time;
            expect(times[0].time).toBe(30.2);
            expect(times[1].time).toBe(45.5);
            expect(times[2].time).toBe(60.8);
        });
    });
    
    describe('Complete Attempt', () => {
        test('should insert both death and time entries on completion', () => {
            const result = leaderboard.completeAttempt(1, 10, 45.5);
            
            expect(result.deathsRank).toBe(1);
            expect(result.timeRank).toBe(1);
            expect(result.isNewBest).toBe(true);
        });
        
        test('should persist data after completion (Requirement 7.5)', () => {
            leaderboard.completeAttempt(1, 10, 45.5);
            
            expect(saveSystem.save).toHaveBeenCalled();
        });
        
        test('should return correct ranks for non-best attempts', () => {
            leaderboard.completeAttempt(1, 10, 45.5);
            const result = leaderboard.completeAttempt(1, 15, 50.0);
            
            expect(result.deathsRank).toBe(2);
            expect(result.timeRank).toBe(2);
            expect(result.isNewBest).toBe(false);
        });
    });
    
    describe('Get Leaderboard (Requirement 7.3)', () => {
        beforeEach(() => {
            leaderboard.leaderboards[1] = {
                deaths: [
                    { rank: 1, deaths: 5, date: '2024-01-01' },
                    { rank: 2, deaths: 10, date: '2024-01-02' },
                    { rank: 3, deaths: 15, date: '2024-01-03' }
                ],
                time: [
                    { rank: 1, time: 30.5, date: '2024-01-01' },
                    { rank: 2, time: 45.2, date: '2024-01-02' }
                ]
            };
        });
        
        test('should return leaderboard entries with rank, score, and date', () => {
            const deaths = leaderboard.getLeaderboard(1, 'deaths');
            
            expect(deaths).toHaveLength(3);
            expect(deaths[0]).toEqual({ rank: 1, deaths: 5, date: '2024-01-01' });
            expect(deaths[1]).toEqual({ rank: 2, deaths: 10, date: '2024-01-02' });
            expect(deaths[2]).toEqual({ rank: 3, deaths: 15, date: '2024-01-03' });
        });
        
        test('should return time leaderboard', () => {
            const times = leaderboard.getLeaderboard(1, 'time');
            
            expect(times).toHaveLength(2);
            expect(times[0]).toEqual({ rank: 1, time: 30.5, date: '2024-01-01' });
        });
        
        test('should return empty array for non-existent level', () => {
            const deaths = leaderboard.getLeaderboard(99, 'deaths');
            
            expect(deaths).toEqual([]);
        });
        
        test('should return copy to prevent external modification', () => {
            const deaths = leaderboard.getLeaderboard(1, 'deaths');
            deaths[0].deaths = 999;
            
            const original = leaderboard.leaderboards[1].deaths[0].deaths;
            expect(original).toBe(5);
        });
    });
    
    describe('Get Current Rank (Requirement 7.8)', () => {
        beforeEach(() => {
            leaderboard.leaderboards[1] = {
                deaths: [
                    { rank: 1, deaths: 5, date: '2024-01-01' },
                    { rank: 2, deaths: 10, date: '2024-01-02' },
                    { rank: 3, deaths: 15, date: '2024-01-03' }
                ],
                time: []
            };
        });
        
        test('should return rank 1 for best current value', () => {
            const rank = leaderboard.getCurrentRank(1, 'deaths', 3);
            expect(rank).toBe(1);
        });
        
        test('should return rank 2 for second-best current value', () => {
            const rank = leaderboard.getCurrentRank(1, 'deaths', 7);
            expect(rank).toBe(2);
        });
        
        test('should return rank 4 for worse than all entries', () => {
            const rank = leaderboard.getCurrentRank(1, 'deaths', 20);
            expect(rank).toBe(4);
        });
        
        test('should return rank 1 for first attempt on new level', () => {
            const rank = leaderboard.getCurrentRank(99, 'deaths', 50);
            expect(rank).toBe(1);
        });
    });
    
    describe('Metric Filtering (Requirement 7.7)', () => {
        beforeEach(() => {
            leaderboard.leaderboards[1] = {
                deaths: [
                    { rank: 1, deaths: 5, date: '2024-01-01' },
                    { rank: 2, deaths: 10, date: '2024-01-02' }
                ],
                time: [
                    { rank: 1, time: 30.5, date: '2024-01-01' }
                ]
            };
        });
        
        test('should get all metrics for a level', () => {
            const metrics = leaderboard.getAllMetrics(1);
            
            expect(metrics.deaths).toHaveLength(2);
            expect(metrics.time).toHaveLength(1);
            expect(metrics.completionRate).toBeGreaterThanOrEqual(0);
        });
        
        test('should support filtering by deaths metric', () => {
            const deaths = leaderboard.getLeaderboard(1, 'deaths');
            expect(deaths).toHaveLength(2);
        });
        
        test('should support filtering by time metric', () => {
            const times = leaderboard.getLeaderboard(1, 'time');
            expect(times).toHaveLength(1);
        });
    });
    
    describe('Best Score', () => {
        beforeEach(() => {
            leaderboard.leaderboards[1] = {
                deaths: [
                    { rank: 1, deaths: 5, date: '2024-01-01' },
                    { rank: 2, deaths: 10, date: '2024-01-02' }
                ],
                time: [
                    { rank: 1, time: 30.5, date: '2024-01-01' }
                ]
            };
        });
        
        test('should return best death count', () => {
            const best = leaderboard.getBestScore(1, 'deaths');
            expect(best).toBe(5);
        });
        
        test('should return best time', () => {
            const best = leaderboard.getBestScore(1, 'time');
            expect(best).toBe(30.5);
        });
        
        test('should return null for empty leaderboard', () => {
            const best = leaderboard.getBestScore(99, 'deaths');
            expect(best).toBeNull();
        });
    });
    
    describe('Would Make Top 10', () => {
        beforeEach(() => {
            leaderboard.leaderboards[1] = { deaths: [], time: [] };
            
            // Fill with 10 entries (deaths: 5, 10, 15, ..., 50)
            for (let i = 1; i <= 10; i++) {
                leaderboard.insertEntry(1, 'deaths', {
                    rank: 0,
                    deaths: i * 5,
                    date: `2024-01-${String(i).padStart(2, '0')}`
                });
            }
        });
        
        test('should return true if score would make top 10', () => {
            const wouldMake = leaderboard.wouldMakeTop10(1, 'deaths', 25);
            expect(wouldMake).toBe(true);
        });
        
        test('should return false if score would not make top 10', () => {
            const wouldMake = leaderboard.wouldMakeTop10(1, 'deaths', 100);
            expect(wouldMake).toBe(false);
        });
        
        test('should return true if leaderboard has less than 10 entries', () => {
            leaderboard.leaderboards[2] = { deaths: [], time: [] };
            leaderboard.insertEntry(2, 'deaths', { rank: 0, deaths: 10, date: '2024-01-01' });
            
            const wouldMake = leaderboard.wouldMakeTop10(2, 'deaths', 100);
            expect(wouldMake).toBe(true);
        });
    });
    
    describe('Clear Operations', () => {
        beforeEach(() => {
            leaderboard.leaderboards[1] = {
                deaths: [{ rank: 1, deaths: 5, date: '2024-01-01' }],
                time: [{ rank: 1, time: 30.5, date: '2024-01-01' }]
            };
            leaderboard.leaderboards[2] = {
                deaths: [{ rank: 1, deaths: 10, date: '2024-01-02' }],
                time: []
            };
        });
        
        test('should clear leaderboard for specific level', () => {
            leaderboard.clearLevel(1);
            
            expect(leaderboard.leaderboards[1]).toBeUndefined();
            expect(leaderboard.leaderboards[2]).toBeDefined();
            expect(saveSystem.save).toHaveBeenCalled();
        });
        
        test('should clear all leaderboards', () => {
            leaderboard.clearAll();
            
            expect(leaderboard.leaderboards).toEqual({});
            expect(saveSystem.save).toHaveBeenCalled();
        });
    });
    
    describe('Data Persistence (Requirement 7.5)', () => {
        test('should persist leaderboard data to save system', () => {
            leaderboard.leaderboards[1] = {
                deaths: [{ rank: 1, deaths: 5, date: '2024-01-01' }],
                time: []
            };
            
            leaderboard.persist();
            
            expect(saveSystem.save).toHaveBeenCalled();
            const saveCall = saveSystem.save.mock.calls[0][0];
            expect(saveCall.leaderboards).toEqual(leaderboard.leaderboards);
        });
    });
    
    describe('Export/Import', () => {
        test('should export leaderboard data as JSON', () => {
            leaderboard.leaderboards[1] = {
                deaths: [{ rank: 1, deaths: 5, date: '2024-01-01' }],
                time: []
            };
            
            const exported = leaderboard.exportData();
            const parsed = JSON.parse(exported);
            
            expect(parsed).toEqual(leaderboard.leaderboards);
        });
        
        test('should import leaderboard data from JSON', () => {
            const data = {
                1: {
                    deaths: [{ rank: 1, deaths: 5, date: '2024-01-01' }],
                    time: []
                }
            };
            
            const success = leaderboard.importData(JSON.stringify(data));
            
            expect(success).toBe(true);
            expect(leaderboard.leaderboards).toEqual(data);
            expect(saveSystem.save).toHaveBeenCalled();
        });
    });
    
    describe('Statistics', () => {
        beforeEach(() => {
            leaderboard.leaderboards[1] = {
                deaths: [
                    { rank: 1, deaths: 5, date: '2024-01-01' },
                    { rank: 2, deaths: 10, date: '2024-01-02' }
                ],
                time: [{ rank: 1, time: 30.5, date: '2024-01-01' }]
            };
            leaderboard.leaderboards[2] = {
                deaths: [{ rank: 1, deaths: 8, date: '2024-01-03' }],
                time: []
            };
        });
        
        test('should return statistics summary', () => {
            const stats = leaderboard.getStats();
            
            expect(stats.totalLevels).toBe(2);
            expect(stats.totalEntries).toBe(4); // 2 deaths + 1 time + 1 death
            expect(stats.levelStats[1].deathEntries).toBe(2);
            expect(stats.levelStats[1].timeEntries).toBe(1);
            expect(stats.levelStats[1].bestDeaths).toBe(5);
            expect(stats.levelStats[1].bestTime).toBe(30.5);
        });
    });
});
