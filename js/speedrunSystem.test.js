/**
 * speedrunSystem.test.js
 * Unit tests for Speedrun Mode implementation
 * 
 * Tests Requirements 6.1-6.8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpeedrunSystem } from './speedrunSystem.js';

describe('SpeedrunSystem', () => {
    let speedrunSystem;

    beforeEach(() => {
        speedrunSystem = new SpeedrunSystem();
    });

    describe('Requirement 6.8: Enable/Disable Speedrun Mode', () => {
        it('should start disabled by default', () => {
            expect(speedrunSystem.isEnabled()).toBe(false);
        });

        it('should enable speedrun mode', () => {
            speedrunSystem.setEnabled(true);
            expect(speedrunSystem.isEnabled()).toBe(true);
        });

        it('should disable speedrun mode and reset state', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.start(1);
            speedrunSystem.setEnabled(false);
            
            expect(speedrunSystem.isEnabled()).toBe(false);
            expect(speedrunSystem.active).toBe(false);
        });
    });

    describe('Requirement 6.1: Timer in MM:SS.mmm format', () => {
        it('should format time correctly', () => {
            expect(speedrunSystem.formatTime(0)).toBe('00:00.000');
            expect(speedrunSystem.formatTime(1234)).toBe('00:01.234');
            expect(speedrunSystem.formatTime(61234)).toBe('01:01.234');
            expect(speedrunSystem.formatTime(125999)).toBe('02:05.999');
        });

        it('should display current time in correct format', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.start(1);
            speedrunSystem.currentTime = 12345;
            
            const timeString = speedrunSystem.getCurrentTimeString();
            expect(timeString).toBe('00:12.345');
        });
    });

    describe('Requirement 6.2: Record split times', () => {
        it('should record split for level completion', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.start(1);
            speedrunSystem.currentTime = 5000;
            
            const split = speedrunSystem.recordSplit(1);
            
            expect(split).toBeDefined();
            expect(split.level).toBe(1);
            expect(split.time).toBe(5000);
            expect(speedrunSystem.splits.length).toBe(1);
        });

        it('should not record split when not active', () => {
            speedrunSystem.recordSplit(1);
            expect(speedrunSystem.splits.length).toBe(0);
        });
    });

    describe('Requirement 6.3: Display current split vs personal best', () => {
        it('should calculate delta from personal best', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.bestSplits = [{ level: 1, time: 5000 }];
            
            speedrunSystem.start(1);
            speedrunSystem.currentTime = 4500;
            const split = speedrunSystem.recordSplit(1);
            
            expect(split.delta).toBe(-500); // 500ms faster
            expect(split.isFaster).toBe(true);
        });

        it('should show null delta when no personal best exists', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.start(1);
            speedrunSystem.currentTime = 5000;
            
            const split = speedrunSystem.recordSplit(1);
            
            expect(split.delta).toBeNull();
            expect(split.isFaster).toBe(false);
        });
    });

    describe('Requirement 6.4: Highlight faster splits', () => {
        it('should mark split as faster when beating personal best', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.bestSplits = [{ level: 1, time: 5000 }];
            
            speedrunSystem.start(1);
            speedrunSystem.currentTime = 4500;
            const split = speedrunSystem.recordSplit(1);
            
            expect(split.isFaster).toBe(true);
        });

        it('should not mark split as faster when slower than personal best', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.bestSplits = [{ level: 1, time: 5000 }];
            
            speedrunSystem.start(1);
            speedrunSystem.currentTime = 5500;
            const split = speedrunSystem.recordSplit(1);
            
            expect(split.isFaster).toBe(false);
        });
    });

    describe('Requirement 6.5: Ghost race support', () => {
        it('should record ghost frames', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.start(1);
            
            speedrunSystem.recordGhostFrame({
                x: 100,
                y: 200,
                animFrame: 0,
                facing: 1,
                anim: 'walk'
            });
            
            expect(speedrunSystem.speedrunGhostFrames.length).toBe(1);
            expect(speedrunSystem.speedrunGhostFrames[0].x).toBe(100);
        });

        it('should retrieve ghost frame for current time', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.start(1);
            speedrunSystem.currentTime = 1000;
            
            speedrunSystem.recordGhostFrame({
                x: 100,
                y: 200,
                animFrame: 0,
                facing: 1,
                anim: 'walk'
            });
            
            const ghostFrame = speedrunSystem.getGhostFrame(1000);
            expect(ghostFrame).toBeDefined();
            expect(ghostFrame.x).toBe(100);
        });

        it('should return null when no ghost frames exist', () => {
            const ghostFrame = speedrunSystem.getGhostFrame(1000);
            expect(ghostFrame).toBeNull();
        });
    });

    describe('Requirement 6.6: Pause timer during pause menu', () => {
        it('should pause timer', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.start(1);
            
            speedrunSystem.pause();
            
            expect(speedrunSystem.isPaused).toBe(true);
        });

        it('should resume timer and track paused time', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.start(1);
            
            speedrunSystem.pause();
            speedrunSystem.pauseStartTime = performance.now() - 1000; // Simulate 1 second pause
            speedrunSystem.resume();
            
            expect(speedrunSystem.isPaused).toBe(false);
            expect(speedrunSystem.totalPausedTime).toBeGreaterThan(0);
        });

        it('should not update timer when paused', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.start(1);
            const initialTime = speedrunSystem.currentTime;
            
            speedrunSystem.pause();
            speedrunSystem.update(0.016); // 1 frame
            
            expect(speedrunSystem.currentTime).toBe(initialTime);
        });
    });

    describe('Requirement 6.7: Persist speedrun data', () => {
        it('should serialize speedrun data to JSON', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.bestTotalTime = 120000;
            speedrunSystem.bestSplits = [
                { level: 1, time: 30000 },
                { level: 2, time: 60000 }
            ];
            
            const json = speedrunSystem.toJSON();
            
            expect(json.enabled).toBe(true);
            expect(json.bestTotalTime).toBe(120000);
            expect(json.bestSplits.length).toBe(2);
        });

        it('should deserialize speedrun data from JSON', () => {
            const data = {
                enabled: true,
                bestTotalTime: 120000,
                bestSplits: [
                    { level: 1, time: 30000 },
                    { level: 2, time: 60000 }
                ],
                speedrunGhostFrames: []
            };
            
            speedrunSystem.fromJSON(data);
            
            expect(speedrunSystem.enabled).toBe(true);
            expect(speedrunSystem.bestTotalTime).toBe(120000);
            expect(speedrunSystem.bestSplits.length).toBe(2);
        });
    });

    describe('Complete speedrun workflow', () => {
        it('should update personal best on completion', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.start(1);
            speedrunSystem.currentTime = 100000;
            
            speedrunSystem.recordSplit(1);
            speedrunSystem.recordSplit(2);
            
            const isNewBest = speedrunSystem.complete(2);
            
            expect(isNewBest).toBe(true);
            expect(speedrunSystem.bestTotalTime).toBe(100000);
            expect(speedrunSystem.bestSplits.length).toBe(2);
        });

        it('should not update personal best when slower', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.bestTotalTime = 50000;
            
            speedrunSystem.start(1);
            speedrunSystem.currentTime = 100000;
            
            const isNewBest = speedrunSystem.complete(2);
            
            expect(isNewBest).toBe(false);
            expect(speedrunSystem.bestTotalTime).toBe(50000);
        });
    });

    describe('Delta formatting', () => {
        it('should format positive delta with + sign', () => {
            expect(speedrunSystem.formatDelta(1234)).toBe('+1.234');
        });

        it('should format negative delta with - sign', () => {
            expect(speedrunSystem.formatDelta(-1234)).toBe('-1.234');
        });

        it('should format zero delta with + sign', () => {
            expect(speedrunSystem.formatDelta(0)).toBe('+0.000');
        });
    });
});
