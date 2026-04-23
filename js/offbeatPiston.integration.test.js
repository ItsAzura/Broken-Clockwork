/**
 * Integration tests for Offbeat Piston (Timing Troll)
 * Validates task 10: Implement offbeat piston troll
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AutonomousObstacle } from './AutonomousObstacle.js';
import { AUTO, OFFBEAT_PISTON_CYCLE } from './constants.js';

describe('Offbeat Piston Integration Tests', () => {
    let offbeatPiston;

    beforeEach(() => {
        // Create an offbeat piston
        offbeatPiston = new AutonomousObstacle({
            type: AUTO.PISTON,
            id: 'test_offbeat_piston',
            isOffbeat: true,
            offbeatCycle: OFFBEAT_PISTON_CYCLE,
            ax: 100, ay: 100,
            bx: 150, by: 100,
            w: 16, h: 8,
            initialTime: 0
        });
    });

    describe('Task 10.1: Offbeat piston properties', () => {
        it('should initialize offbeat properties correctly', () => {
            expect(offbeatPiston.isOffbeat).toBe(true);
            expect(offbeatPiston.offbeatCycle).toBe(OFFBEAT_PISTON_CYCLE);
            expect(offbeatPiston.offbeatMercyGlow).toBe(false);
            expect(offbeatPiston._offbeatPhase).toBe(0);
            expect(offbeatPiston._prevOffbeatBeat).toBe(-1);
        });

        it('should have correct cycle duration', () => {
            expect(OFFBEAT_PISTON_CYCLE).toBe(3.0);
        });
    });

    describe('Task 10.2: Offbeat timing in piston update', () => {
        it('should use 4-beat cycle for offbeat pistons', () => {
            // Track positions through the cycle
            const positions = [];
            const dt = 0.016; // ~60fps
            
            // Update through several beats
            for (let i = 0; i < 200; i++) {
                offbeatPiston.update(dt, i * dt);
                positions.push(offbeatPiston.x);
            }
            
            // Verify piston moves between ax and bx
            const minPos = Math.min(...positions);
            const maxPos = Math.max(...positions);
            
            expect(minPos).toBeGreaterThanOrEqual(100); // At or near ax
            expect(maxPos).toBeLessThanOrEqual(150); // At or near bx
            expect(maxPos).toBeGreaterThan(minPos); // Piston actually moves
        });

        it('should cycle back to beat 0 after beat 3', () => {
            // Update through more than one full cycle
            offbeatPiston.update(3.5, 0);
            
            // Should be back near beat 0 position
            const phase = (offbeatPiston.time % offbeatPiston.offbeatCycle) / offbeatPiston.offbeatCycle;
            const beat = Math.floor(phase * 4);
            // 3.5s % 3.0s = 0.5s, which is 0.5/3.0 = 0.166... phase
            // 0.166 * 4 = 0.666, floor = 0
            expect(beat).toBe(0); // Should be in beat 0 of second cycle
        });

        it('should have safe window during beat 3 to beat 0 transition', () => {
            // Safe window is at beat 3 (2.4s - 2.7s in the cycle)
            offbeatPiston.time = 2.5; // Middle of safe window
            offbeatPiston.update(0.016, 2.5);
            
            const phase = (offbeatPiston.time % offbeatPiston.offbeatCycle) / offbeatPiston.offbeatCycle;
            const beat = Math.floor(phase * 4);
            expect(beat).toBe(3); // Should be in beat 3 (safe window)
            
            // Position should be closer to open (safe) than closed
            expect(offbeatPiston.x).toBeLessThan(125);
        });
    });

    describe('Task 10.3: Audio sync', () => {
        it('should track beat changes for audio sync', () => {
            const initialBeat = offbeatPiston._prevOffbeatBeat;
            
            // Update to next beat
            offbeatPiston.update(0.75, 0);
            
            // Beat should have changed
            const phase = (offbeatPiston.time % offbeatPiston.offbeatCycle) / offbeatPiston.offbeatCycle;
            const currentBeat = Math.floor(phase * 4);
            expect(currentBeat).not.toBe(initialBeat);
            expect(offbeatPiston._prevOffbeatBeat).toBe(currentBeat);
        });

        it('should maintain beat tracking across multiple updates', () => {
            const beats = [];
            
            // Track beats over multiple updates
            for (let i = 0; i < 8; i++) {
                offbeatPiston.update(0.4, i * 0.4);
                const phase = (offbeatPiston.time % offbeatPiston.offbeatCycle) / offbeatPiston.offbeatCycle;
                const beat = Math.floor(phase * 4);
                beats.push(beat);
            }
            
            // Should cycle through beats 0, 1, 2, 3, 0, 1, 2, 3
            expect(beats).toContain(0);
            expect(beats).toContain(1);
            expect(beats).toContain(2);
            expect(beats).toContain(3);
        });
    });

    describe('Standard piston comparison', () => {
        it('should behave differently from standard piston', () => {
            const standardPiston = new AutonomousObstacle({
                type: AUTO.PISTON,
                id: 'test_standard_piston',
                isOffbeat: false,
                ax: 100, ay: 100,
                bx: 150, by: 100,
                w: 16, h: 8,
                speed: 2.0,
                initialTime: 0
            });

            // Update both pistons
            offbeatPiston.update(0.5, 0);
            standardPiston.update(0.5, 0);

            // They should be at different positions
            // (standard uses sine wave, offbeat uses 4-beat cycle)
            expect(offbeatPiston.x).not.toBeCloseTo(standardPiston.x, 0);
        });
    });
});
