/*
 * progressTracker.test.js
 * Unit tests for Enhanced Progress Tracker UI
 * 
 * Tests Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgressTracker } from './progressTracker.js';

// Mock saveSystem
vi.mock('./saveSystem.js', () => ({
    saveSystem: {
        load: vi.fn(() => ({
            progressTracking: {
                personalBests: {}
            }
        })),
        updateProgressTracking: vi.fn()
    }
}));

describe('ProgressTracker', () => {
    let tracker;
    
    beforeEach(() => {
        tracker = new ProgressTracker();
        tracker.personalBests = {}; // Reset personal bests
    });
    
    describe('calculateDistance', () => {
        it('should calculate Manhattan distance from spawn to player', () => {
            // Requirement 4.1: Calculate distance from spawn point
            const player = { x: 100, y: 50 };
            const spawn = { x: 0, y: 0 };
            
            const distance = tracker.calculateDistance(player, spawn);
            
            expect(distance).toBe(150); // |100-0| + |50-0| = 150
        });
        
        it('should handle negative coordinates', () => {
            const player = { x: -50, y: -30 };
            const spawn = { x: 0, y: 0 };
            
            const distance = tracker.calculateDistance(player, spawn);
            
            expect(distance).toBe(80); // |-50-0| + |-30-0| = 80
        });
        
        it('should return 0 when player is at spawn', () => {
            const player = { x: 100, y: 100 };
            const spawn = { x: 100, y: 100 };
            
            const distance = tracker.calculateDistance(player, spawn);
            
            expect(distance).toBe(0);
        });
        
        it('should handle null player or spawn', () => {
            expect(tracker.calculateDistance(null, { x: 0, y: 0 })).toBe(0);
            expect(tracker.calculateDistance({ x: 0, y: 0 }, null)).toBe(0);
        });
    });
    
    describe('calculateDistanceToExit', () => {
        it('should calculate Manhattan distance to exit door center', () => {
            // Requirement 4.3: Calculate distance to exit door
            const player = { x: 100, y: 100 };
            const exitDoor = { x: 200, y: 150, w: 16, h: 16 };
            
            const distance = tracker.calculateDistanceToExit(player, exitDoor);
            
            // Exit center: (200 + 8, 150 + 8) = (208, 158)
            // Distance: |100-208| + |100-158| = 108 + 58 = 166
            expect(distance).toBe(166);
        });
        
        it('should handle null player or exit door', () => {
            expect(tracker.calculateDistanceToExit(null, { x: 0, y: 0, w: 16, h: 16 })).toBe(0);
            expect(tracker.calculateDistanceToExit({ x: 0, y: 0 }, null)).toBe(0);
        });
    });
    
    describe('getPersonalBest', () => {
        it('should return personal best distance for a level', () => {
            // Requirement 4.2: Track personal best per level
            tracker.personalBests[1] = 250;
            
            const best = tracker.getPersonalBest(1);
            
            expect(best).toBe(250);
        });
        
        it('should return 0 if no personal best exists', () => {
            const best = tracker.getPersonalBest(99);
            
            expect(best).toBe(0);
        });
    });
    
    describe('updatePersonalBest', () => {
        it('should update personal best when distance is higher', () => {
            // Requirement 4.2, 4.7: Update and persist personal best
            tracker.personalBests[1] = 100;
            
            const isNewBest = tracker.updatePersonalBest(1, 150);
            
            expect(isNewBest).toBe(true);
            expect(tracker.personalBests[1]).toBe(150);
        });
        
        it('should not update personal best when distance is lower', () => {
            tracker.personalBests[1] = 200;
            
            const isNewBest = tracker.updatePersonalBest(1, 150);
            
            expect(isNewBest).toBe(false);
            expect(tracker.personalBests[1]).toBe(200);
        });
        
        it('should set initial personal best', () => {
            const isNewBest = tracker.updatePersonalBest(1, 100);
            
            expect(isNewBest).toBe(true);
            expect(tracker.personalBests[1]).toBe(100);
        });
    });
    
    describe('isBeatingBest', () => {
        it('should return true when current distance exceeds personal best', () => {
            // Requirement 4.4: Detect when beating personal best
            tracker.personalBests[1] = 100;
            
            const isBeating = tracker.isBeatingBest(150, 1);
            
            expect(isBeating).toBe(true);
        });
        
        it('should return false when current distance is lower than personal best', () => {
            tracker.personalBests[1] = 200;
            
            const isBeating = tracker.isBeatingBest(150, 1);
            
            expect(isBeating).toBe(false);
        });
        
        it('should return true when no personal best exists', () => {
            const isBeating = tracker.isBeatingBest(50, 1);
            
            expect(isBeating).toBe(true);
        });
    });
    
    describe('getProgressPercentage', () => {
        it('should calculate progress percentage from spawn to exit', () => {
            // Requirement 4.8: Calculate progress percentage (0-100%)
            const player = { x: 50, y: 0 };
            const spawn = { x: 0, y: 0 };
            const exitDoor = { x: 100, y: 0, w: 16, h: 16 };
            
            const progress = tracker.getProgressPercentage(player, spawn, exitDoor);
            
            // Current distance: 50
            // Total distance to exit center (108, 8): 108 + 8 = 116
            // Progress: (50 / 116) * 100 ≈ 43.1%
            expect(progress).toBeCloseTo(43.1, 1);
        });
        
        it('should return 0 when player is at spawn', () => {
            const player = { x: 0, y: 0 };
            const spawn = { x: 0, y: 0 };
            const exitDoor = { x: 100, y: 0, w: 16, h: 16 };
            
            const progress = tracker.getProgressPercentage(player, spawn, exitDoor);
            
            expect(progress).toBe(0);
        });
        
        it('should clamp progress to 100% maximum', () => {
            const player = { x: 200, y: 0 };
            const spawn = { x: 0, y: 0 };
            const exitDoor = { x: 50, y: 0, w: 16, h: 16 };
            
            const progress = tracker.getProgressPercentage(player, spawn, exitDoor);
            
            expect(progress).toBe(100);
        });
        
        it('should handle null inputs', () => {
            expect(tracker.getProgressPercentage(null, { x: 0, y: 0 }, { x: 100, y: 0, w: 16, h: 16 })).toBe(0);
            expect(tracker.getProgressPercentage({ x: 0, y: 0 }, null, { x: 100, y: 0, w: 16, h: 16 })).toBe(0);
            expect(tracker.getProgressPercentage({ x: 0, y: 0 }, { x: 0, y: 0 }, null)).toBe(0);
        });
    });
    
    describe('update', () => {
        it('should update current distance', () => {
            // Requirement 4.5: Update every frame
            const player = { x: 100, y: 50 };
            const spawn = { x: 0, y: 0 };
            
            tracker.update(player, spawn, 1);
            
            expect(tracker.currentDistance).toBe(150);
        });
        
        it('should detect new personal best', () => {
            // Requirement 4.4, 4.6: Detect and highlight new best
            tracker.personalBests[1] = 100;
            const player = { x: 150, y: 0 };
            const spawn = { x: 0, y: 0 };
            
            tracker.update(player, spawn, 1);
            
            expect(tracker.isNewBest).toBe(true);
            expect(tracker.personalBests[1]).toBe(150);
        });
        
        it('should trigger "NEW BEST!" message when first exceeding personal best', () => {
            // Requirement 4.6: Display "NEW BEST!" message
            tracker.personalBests[1] = 100;
            tracker.isNewBest = false;
            const player = { x: 150, y: 0 };
            const spawn = { x: 0, y: 0 };
            
            tracker.update(player, spawn, 1);
            
            // Timer is set to 60 and then decremented to 59 in the same update
            expect(tracker.newBestTimer).toBe(59);
        });
        
        it('should not retrigger "NEW BEST!" message while already beating best', () => {
            tracker.personalBests[1] = 100;
            tracker.isNewBest = true;
            tracker.newBestTimer = 30;
            const player = { x: 160, y: 0 };
            const spawn = { x: 0, y: 0 };
            
            tracker.update(player, spawn, 1);
            
            expect(tracker.newBestTimer).toBe(29); // Decremented, not reset
        });
        
        it('should handle null player or spawn', () => {
            expect(() => tracker.update(null, { x: 0, y: 0 }, 1)).not.toThrow();
            expect(() => tracker.update({ x: 0, y: 0 }, null, 1)).not.toThrow();
        });
    });
    
    describe('getState', () => {
        it('should return current tracker state', () => {
            tracker.currentDistance = 150;
            tracker.isNewBest = true;
            tracker.newBestTimer = 30;
            
            const state = tracker.getState();
            
            expect(state.currentDistance).toBe(150);
            expect(state.isNewBest).toBe(true);
            expect(state.showNewBestMessage).toBe(true);
            expect(state.newBestAlpha).toBeGreaterThan(0);
        });
        
        it('should calculate fade-out alpha for "NEW BEST!" message', () => {
            tracker.newBestTimer = 10;
            
            const state = tracker.getState();
            
            expect(state.newBestAlpha).toBeCloseTo(0.67, 2); // 10/15 ≈ 0.67
        });
    });
    
    describe('reset', () => {
        it('should reset tracker state without clearing personal bests', () => {
            tracker.currentDistance = 150;
            tracker.isNewBest = true;
            tracker.newBestTimer = 30;
            tracker.personalBests[1] = 200;
            
            tracker.reset();
            
            expect(tracker.currentDistance).toBe(0);
            expect(tracker.isNewBest).toBe(false);
            expect(tracker.newBestTimer).toBe(0);
            expect(tracker.personalBests[1]).toBe(200); // Personal bests preserved
        });
    });
    
    describe('clearAllBests', () => {
        it('should clear all personal bests and reset state', () => {
            tracker.personalBests[1] = 200;
            tracker.personalBests[2] = 300;
            tracker.currentDistance = 150;
            
            tracker.clearAllBests();
            
            expect(tracker.personalBests).toEqual({});
            expect(tracker.currentDistance).toBe(0);
        });
    });
});
