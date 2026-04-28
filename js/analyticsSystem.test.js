/*
 * analyticsSystem.test.js
 * Unit tests for Analytics and Telemetry System
 * 
 * Tests cover:
 * - Session tracking (Requirement 14.1)
 * - Level completion rate tracking (Requirement 14.2)
 * - Death tracking per level (Requirement 14.3)
 * - Return rate calculation (Requirement 14.4)
 * - Death location tracking (Requirement 14.5)
 * - Trap type death tracking (Requirement 14.6)
 * - Data persistence (Requirement 14.7)
 * - JSON export (Requirement 14.8)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsSystem } from './analyticsSystem.js';

// Mock saveSystem
vi.mock('./saveSystem.js', () => ({
    saveSystem: {
        load: vi.fn(() => ({
            analytics: {
                sessionLengths: [],
                returnDates: [],
                lastPlayDate: null,
                levelMetrics: {},
                deathLocations: {},
                trapDeaths: {},
            }
        })),
        save: vi.fn(),
    }
}));

describe('AnalyticsSystem', () => {
    let analytics;
    
    beforeEach(() => {
        analytics = new AnalyticsSystem();
        analytics.reset();
    });
    
    describe('Session Tracking (Requirement 14.1)', () => {
        it('should start a session', () => {
            analytics.startSession();
            expect(analytics.currentSession.active).toBe(true);
            expect(analytics.currentSession.startTime).toBeTruthy();
        });
        
        it('should end a session and record length', async () => {
            analytics.startSession();
            await new Promise(resolve => setTimeout(resolve, 10));
            analytics.endSession();
            expect(analytics.currentSession.active).toBe(false);
            expect(analytics.sessionLengths.length).toBe(1);
            expect(analytics.sessionLengths[0]).toBeGreaterThan(0);
        });
        
        it('should calculate average session length', () => {
            analytics.sessionLengths = [1000, 2000, 3000];
            expect(analytics.getAverageSessionLength()).toBe(2000);
        });
        
        it('should get current session length', async () => {
            analytics.startSession();
            await new Promise(resolve => setTimeout(resolve, 10));
            const length = analytics.getCurrentSessionLength();
            expect(length).toBeGreaterThan(0);
        });
    });
    
    describe('Level Completion Rate (Requirement 14.2)', () => {
        it('should track level attempts', () => {
            analytics.trackLevelAttempt(1);
            expect(analytics.levelMetrics[1].attempts).toBe(1);
        });
        
        it('should track level completions', () => {
            analytics.trackLevelAttempt(1);
            analytics.trackLevelCompletion(1);
            expect(analytics.levelMetrics[1].completions).toBe(1);
        });
        
        it('should calculate completion rate', () => {
            analytics.trackLevelAttempt(1);
            analytics.trackLevelAttempt(1);
            analytics.trackLevelCompletion(1);
            expect(analytics.getLevelCompletionRate(1)).toBe(0.5);
        });
        
        it('should return 0 completion rate for no attempts', () => {
            expect(analytics.getLevelCompletionRate(999)).toBe(0);
        });
    });
    
    describe('Death Tracking (Requirement 14.3)', () => {
        it('should track deaths per level', () => {
            analytics.trackDeath(1);
            analytics.trackDeath(1);
            expect(analytics.levelMetrics[1].deaths).toBe(2);
        });
        
        it('should calculate average deaths per level', () => {
            analytics.trackLevelAttempt(1);
            analytics.trackLevelAttempt(1);
            analytics.trackDeath(1);
            analytics.trackDeath(1);
            analytics.trackDeath(1);
            analytics.trackDeath(1);
            expect(analytics.getAverageDeathsPerLevel(1)).toBe(2);
        });
    });
    
    describe('Return Rate Tracking (Requirement 14.4)', () => {
        it('should track return dates', () => {
            const today = new Date();
            analytics.returnDates = [today];
            expect(analytics.returnDates.length).toBe(1);
        });
        
        it('should calculate return rates', () => {
            const now = Date.now();
            const oneDayAgo = now - (24 * 60 * 60 * 1000);
            const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000);
            
            analytics.returnDates = [
                new Date(twoDaysAgo),
                new Date(oneDayAgo),
                new Date(now)
            ];
            
            const rates = analytics.getReturnRates();
            expect(rates.day1).toBeGreaterThan(0);
            expect(rates.day7).toBeGreaterThan(0);
            expect(rates.day30).toBeGreaterThan(0);
        });
        
        it('should return 0 rates for no return dates', () => {
            const rates = analytics.getReturnRates();
            expect(rates.day1).toBe(0);
            expect(rates.day7).toBe(0);
            expect(rates.day30).toBe(0);
        });
    });
    
    describe('Death Location Tracking (Requirement 14.5)', () => {
        it('should track death locations', () => {
            analytics.trackDeathLocation(1, 100, 200);
            expect(analytics.deathLocations[1].length).toBe(1);
            expect(analytics.deathLocations[1][0]).toEqual({ x: 100, y: 200, count: 1 });
        });
        
        it('should increment count for nearby deaths', () => {
            analytics.trackDeathLocation(1, 100, 200);
            analytics.trackDeathLocation(1, 102, 202); // Within 8px radius
            expect(analytics.deathLocations[1].length).toBe(1);
            expect(analytics.deathLocations[1][0].count).toBe(2);
        });
        
        it('should create separate entries for distant deaths', () => {
            analytics.trackDeathLocation(1, 100, 200);
            analytics.trackDeathLocation(1, 200, 300); // Far away
            expect(analytics.deathLocations[1].length).toBe(2);
        });
        
        it('should get most common death locations', () => {
            analytics.trackDeathLocation(1, 100, 200);
            analytics.trackDeathLocation(1, 100, 200);
            analytics.trackDeathLocation(1, 100, 200);
            analytics.trackDeathLocation(1, 200, 300);
            
            const topLocations = analytics.getMostCommonDeathLocations(1, 2);
            expect(topLocations.length).toBe(2);
            expect(topLocations[0].count).toBe(3);
            expect(topLocations[1].count).toBe(1);
        });
    });
    
    describe('Trap Type Death Tracking (Requirement 14.6)', () => {
        it('should track trap type deaths', () => {
            analytics.trackTrapDeath('fake_safe_zone');
            analytics.trackTrapDeath('fake_safe_zone');
            analytics.trackTrapDeath('troll_token');
            
            expect(analytics.trapDeaths['fake_safe_zone']).toBe(2);
            expect(analytics.trapDeaths['troll_token']).toBe(1);
        });
        
        it('should get most common trap types', () => {
            analytics.trackTrapDeath('fake_safe_zone');
            analytics.trackTrapDeath('fake_safe_zone');
            analytics.trackTrapDeath('fake_safe_zone');
            analytics.trackTrapDeath('troll_token');
            analytics.trackTrapDeath('troll_token');
            analytics.trackTrapDeath('bait_path');
            
            const topTraps = analytics.getMostCommonTrapTypes(3);
            expect(topTraps.length).toBe(3);
            expect(topTraps[0].type).toBe('fake_safe_zone');
            expect(topTraps[0].count).toBe(3);
            expect(topTraps[1].type).toBe('troll_token');
            expect(topTraps[1].count).toBe(2);
        });
    });
    
    describe('JSON Export (Requirement 14.8)', () => {
        it('should export analytics as JSON', () => {
            analytics.trackLevelAttempt(1);
            analytics.trackLevelCompletion(1);
            analytics.trackDeath(1, 100, 200, 'fake_safe_zone');
            
            const json = analytics.exportAsJSON();
            expect(json).toBeTruthy();
            
            const data = JSON.parse(json);
            expect(data.version).toBe('1.0');
            expect(data.levels).toBeTruthy();
            expect(data.trapDeaths).toBeTruthy();
        });
        
        it('should include all required data in export', () => {
            analytics.sessionLengths = [1000, 2000];
            analytics.trackLevelAttempt(1);
            analytics.trackLevelCompletion(1);
            analytics.trackDeath(1, 100, 200, 'fake_safe_zone');
            
            const json = analytics.exportAsJSON();
            const data = JSON.parse(json);
            
            expect(data.sessions).toBeTruthy();
            expect(data.sessions.total).toBe(2);
            expect(data.levels).toBeTruthy();
            expect(data.levels.length).toBeGreaterThan(0);
            expect(data.returnRates).toBeTruthy();
            expect(data.trapDeaths).toBeTruthy();
        });
    });
    
    describe('Dashboard', () => {
        it('should toggle dashboard visibility', () => {
            expect(analytics.dashboardVisible).toBe(false);
            analytics.toggleDashboard();
            expect(analytics.dashboardVisible).toBe(true);
            analytics.toggleDashboard();
            expect(analytics.dashboardVisible).toBe(false);
        });
    });
    
    describe('Integration', () => {
        it('should track complete death with all data', () => {
            analytics.trackDeath(1, 100, 200, 'fake_safe_zone');
            
            expect(analytics.levelMetrics[1].deaths).toBe(1);
            expect(analytics.deathLocations[1].length).toBe(1);
            expect(analytics.trapDeaths['fake_safe_zone']).toBe(1);
        });
        
        it('should handle multiple levels', () => {
            analytics.trackLevelAttempt(1);
            analytics.trackLevelCompletion(1);
            analytics.trackLevelAttempt(2);
            analytics.trackLevelCompletion(2);
            
            expect(analytics.levelMetrics[1].completions).toBe(1);
            expect(analytics.levelMetrics[2].completions).toBe(1);
        });
    });
});
