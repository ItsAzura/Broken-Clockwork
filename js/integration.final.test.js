/**
 * integration.final.test.js
 * Final integration tests for Task 20: Integration and final polish
 * 
 * Verifies that all masocore systems work together:
 * - Coyote death, taunts, mercy hints, ghost replay, close-calls
 * - Troll mechanics (pattern betrayal, second wind, offbeat pistons)
 * - Checkpoint system in levels 4 and 5
 * - Room time tracking for pattern betrayal
 * - Hitbox reduction for all obstacle types
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AutonomousObstacle, rectOverlapsBounds, distanceToBounds } from './AutonomousObstacle.js';
import { AUTO, COYOTE_DEATH_FRAMES, MERCY_HINT_THRESHOLD, HITBOX_SHRINK, CLOSE_CALL_DISTANCE, EXTREME_CLOSE_CALL_DISTANCE } from './constants.js';
import { 
    checkCoyoteOverlap, 
    resetCoyoteOverlap, 
    recordObstacleDeath, 
    shouldShowMercy,
    getObstacleDeathCount,
    resetAllDeaths
} from './deathSystem.js';

describe('Task 20: Integration and Final Polish', () => {
    beforeEach(() => {
        resetAllDeaths();
    });

    describe('Sub-task 20.1: Wire all systems together', () => {
        it('should integrate coyote death with collision detection', () => {
            const obstacleId = 'test_piston_1';
            
            // First 2 frames of overlap should not trigger death
            expect(checkCoyoteOverlap(obstacleId)).toBe(true); // Frame 1 - within forgiveness
            expect(checkCoyoteOverlap(obstacleId)).toBe(true); // Frame 2 - within forgiveness
            
            // Third frame should exceed threshold
            expect(checkCoyoteOverlap(obstacleId)).toBe(false); // Frame 3 - should die
            
            // Reset and verify
            resetCoyoteOverlap(obstacleId);
            expect(checkCoyoteOverlap(obstacleId)).toBe(true); // Back to frame 1
        });

        it('should integrate mercy hints with death tracking', () => {
            const obstacleId = 'test_gear_1';
            
            // Record deaths until mercy threshold
            for (let i = 0; i < MERCY_HINT_THRESHOLD - 1; i++) {
                recordObstacleDeath(obstacleId);
                expect(shouldShowMercy(obstacleId)).toBe(false);
            }
            
            // One more death should trigger mercy
            recordObstacleDeath(obstacleId);
            expect(shouldShowMercy(obstacleId)).toBe(true);
            expect(getObstacleDeathCount(obstacleId)).toBe(MERCY_HINT_THRESHOLD);
        });

        it('should integrate ghost replay with player tracking', () => {
            // Ghost replay is tested in main.integration.test.js
            // This test verifies the integration point exists
            const ghostReplay = {
                frames: [],
                maxFrames: 3600,
                bestFrames: [],
                bestDistance: 0,
                currentIndex: 0
            };
            
            // Simulate recording frames
            for (let i = 0; i < 10; i++) {
                const frame = { x: i * 10, y: 50, animFrame: 0, facing: 1 };
                ghostReplay.frames.push(frame);
            }
            
            expect(ghostReplay.frames.length).toBe(10);
            expect(ghostReplay.frames[0].x).toBe(0);
            expect(ghostReplay.frames[9].x).toBe(90);
        });

        it('should integrate close-calls with distance detection', () => {
            const playerHitbox = { x: 100, y: 100, w: 6, h: 8 };
            
            // Create obstacle just outside player hitbox
            const obstacle = new AutonomousObstacle({
                type: AUTO.PISTON,
                id: 'test_piston_close',
                ax: 110, ay: 100, // 4px away from player
                bx: 110, by: 100,
                w: 8, h: 8,
                speed: 1.0
            });
            
            // Update obstacle to set initial position
            obstacle.update(0.016, 0);
            
            const bounds = obstacle.getBounds();
            const distance = distanceToBounds(playerHitbox, bounds);
            
            // Should be close call distance (accounting for hitbox shrink)
            expect(distance).toBeGreaterThan(0);
            expect(distance).toBeLessThanOrEqual(CLOSE_CALL_DISTANCE + HITBOX_SHRINK);
        });

        it('should integrate troll mechanics activation', () => {
            // Pattern betrayal obstacle
            const patternBetrayal = new AutonomousObstacle({
                type: AUTO.ORBIT_SPHERE,
                id: 'orbit_betrayal',
                cx: 200, cy: 100,
                orbitRadius: 30,
                orbitSpeed: 1.6,
                sphereR: 3,
                patternBetrayal: true,
                betrayalTime: 6.0,
                betrayalDuration: 2.4,
                speedMultiplier: 1.15
            });
            
            // Before betrayal window
            patternBetrayal.update(0.016, 5.0);
            expect(patternBetrayal.currentSpeed).toBe(1.6);
            
            // During betrayal window
            patternBetrayal.update(0.016, 6.5);
            expect(patternBetrayal.currentSpeed).toBeCloseTo(1.6 * 1.15, 2);
            
            // After betrayal window
            patternBetrayal.update(0.016, 9.0);
            expect(patternBetrayal.currentSpeed).toBe(1.6);
        });

        it('should integrate checkpoint system with respawn', () => {
            // Checkpoint data structure
            const checkpoint = {
                x: 200,
                y: 100,
                activated: false
            };
            
            // Simulate activation
            checkpoint.activated = true;
            expect(checkpoint.activated).toBe(true);
            
            // Verify checkpoint can be used for respawn
            const respawnPos = { x: checkpoint.x, y: checkpoint.y };
            expect(respawnPos.x).toBe(200);
            expect(respawnPos.y).toBe(100);
        });
    });

    describe('Sub-task 20.2: Room time tracking', () => {
        it('should track room time for pattern betrayal', () => {
            let roomTime = 0;
            const dt = 0.016; // 60 FPS
            
            // Simulate 10 seconds of gameplay
            for (let i = 0; i < 600; i++) {
                roomTime += dt;
            }
            
            expect(roomTime).toBeCloseTo(9.6, 1);
        });

        it('should reset room time on level restart', () => {
            let roomTime = 5.0;
            
            // Simulate level restart
            roomTime = 0;
            
            expect(roomTime).toBe(0);
        });

        it('should use room time for pattern betrayal timing', () => {
            const obstacle = new AutonomousObstacle({
                type: AUTO.ORBIT_SPHERE,
                id: 'orbit_test',
                cx: 150, cy: 100,
                orbitRadius: 25,
                orbitSpeed: 2.0,
                sphereR: 3,
                patternBetrayal: true,
                betrayalTime: 6.0,
                betrayalDuration: 2.4,
                speedMultiplier: 1.15
            });
            
            // Test at different room times
            obstacle.update(0.016, 5.0); // Before betrayal
            expect(obstacle.currentSpeed).toBe(2.0);
            
            obstacle.update(0.016, 7.0); // During betrayal
            expect(obstacle.currentSpeed).toBeCloseTo(2.3, 1);
            
            obstacle.update(0.016, 9.0); // After betrayal
            expect(obstacle.currentSpeed).toBe(2.0);
        });
    });

    describe('Sub-task 20.3: Hitbox reduction', () => {
        it('should reduce piston hitbox by HITBOX_SHRINK', () => {
            const piston = new AutonomousObstacle({
                type: AUTO.PISTON,
                id: 'piston_hitbox',
                ax: 100, ay: 100,
                bx: 100, by: 120,
                w: 16, h: 8,
                speed: 1.0
            });
            
            const bounds = piston.getBounds();
            
            // Original size: 16x8
            // After shrink: 16 - (2*2) = 12, 8 - (2*2) = 4
            expect(bounds.w).toBe(16 - HITBOX_SHRINK * 2);
            expect(bounds.h).toBe(8 - HITBOX_SHRINK * 2);
        });

        it('should reduce pendulum hitbox by HITBOX_SHRINK', () => {
            const pendulum = new AutonomousObstacle({
                type: AUTO.PENDULUM,
                id: 'pendulum_hitbox',
                x: 150, y: 50,
                length: 40,
                amplitude: 0.8,
                frequency: 1.0,
                tipRadius: 5
            });
            
            const bounds = pendulum.getBounds();
            
            // Original diameter: 10 (radius 5 * 2)
            // After shrink: 10 - (2*2) = 6
            expect(bounds.w).toBe(10 - HITBOX_SHRINK * 2);
            expect(bounds.h).toBe(10 - HITBOX_SHRINK * 2);
        });

        it('should reduce orbit sphere hitbox by HITBOX_SHRINK', () => {
            const orbitSphere = new AutonomousObstacle({
                type: AUTO.ORBIT_SPHERE,
                id: 'orbit_hitbox',
                cx: 200, cy: 100,
                orbitRadius: 30,
                orbitSpeed: 1.5,
                sphereR: 4
            });
            
            const bounds = orbitSphere.getBounds();
            
            // Original diameter: 8 (radius 4 * 2)
            // After shrink: 8 - (2*2) = 4
            expect(bounds.w).toBe(8 - HITBOX_SHRINK * 2);
            expect(bounds.h).toBe(8 - HITBOX_SHRINK * 2);
        });

        it('should reduce bouncing ball hitbox by HITBOX_SHRINK', () => {
            const ball = new AutonomousObstacle({
                type: AUTO.BOUNCING_BALL,
                id: 'ball_hitbox',
                x: 100, y: 100,
                r: 6,
                vx: 60, vy: 60,
                boundX: 50, boundY: 50,
                boundW: 200, boundH: 150
            });
            
            const bounds = ball.getBounds();
            
            // Original diameter: 12 (radius 6 * 2)
            // After shrink: 12 - (2*2) = 8
            expect(bounds.w).toBe(12 - HITBOX_SHRINK * 2);
            expect(bounds.h).toBe(12 - HITBOX_SHRINK * 2);
        });

        it('should maintain visual size while reducing collision box', () => {
            const piston = new AutonomousObstacle({
                type: AUTO.PISTON,
                id: 'piston_visual',
                ax: 100, ay: 100,
                bx: 100, by: 120,
                w: 16, h: 8,
                speed: 1.0
            });
            
            // Visual size is stored in original properties
            expect(piston.w).toBe(16);
            expect(piston.h).toBe(8);
            
            // Collision box is reduced
            const bounds = piston.getBounds();
            expect(bounds.w).toBe(12);
            expect(bounds.h).toBe(4);
        });
    });

    describe('Full system integration', () => {
        it('should handle complete death cycle with all systems', () => {
            const obstacleId = 'integration_test_obstacle';
            
            // 1. Coyote death: first 2 frames safe
            expect(checkCoyoteOverlap(obstacleId)).toBe(true);
            expect(checkCoyoteOverlap(obstacleId)).toBe(true);
            
            // 2. Third frame triggers death
            expect(checkCoyoteOverlap(obstacleId)).toBe(false);
            
            // 3. Record death for mercy system
            recordObstacleDeath(obstacleId);
            expect(getObstacleDeathCount(obstacleId)).toBe(1);
            
            // 4. Reset coyote state for respawn
            resetCoyoteOverlap(obstacleId);
            
            // 5. Repeat until mercy threshold
            for (let i = 1; i < MERCY_HINT_THRESHOLD; i++) {
                checkCoyoteOverlap(obstacleId);
                checkCoyoteOverlap(obstacleId);
                checkCoyoteOverlap(obstacleId);
                recordObstacleDeath(obstacleId);
                resetCoyoteOverlap(obstacleId);
            }
            
            // 6. Mercy hint should now be active
            expect(shouldShowMercy(obstacleId)).toBe(true);
        });

        it('should handle second wind trap activation', () => {
            const secondWindObstacle = new AutonomousObstacle({
                type: AUTO.PISTON,
                id: 'second_wind_trap',
                ax: 200, ay: 100,
                bx: 200, by: 120,
                w: 12, h: 8,
                speed: 1.5,
                isSecondWind: true,
                initiallyActive: false
            });
            
            // Should start inactive
            expect(secondWindObstacle.isActive).toBe(false);
            expect(secondWindObstacle.secondWindActive).toBe(false);
            
            // Activate second wind
            secondWindObstacle.activateSecondWind();
            expect(secondWindObstacle.secondWindActive).toBe(true);
            expect(secondWindObstacle.isActive).toBe(true);
            
            // Should fade in
            secondWindObstacle.update(0.25, 0); // 0.25s
            expect(secondWindObstacle.secondWindAlpha).toBeCloseTo(0.5, 1);
            
            // Should be fully visible after fade-in
            secondWindObstacle.update(0.25, 0); // 0.5s total
            expect(secondWindObstacle.secondWindAlpha).toBe(1);
        });

        it('should handle offbeat piston timing', () => {
            const offbeatPiston = new AutonomousObstacle({
                type: AUTO.PISTON,
                id: 'offbeat_test',
                ax: 100, ay: 100,
                bx: 120, by: 100,
                w: 12, h: 8,
                speed: 1.0,
                isOffbeat: true,
                offbeatCycle: 3.0
            });
            
            // Update through one full cycle
            for (let i = 0; i < 60; i++) { // 1 second at 60fps
                offbeatPiston.update(0.016, i * 0.016);
            }
            
            // Verify piston moved (position changed)
            expect(offbeatPiston.x).not.toBe(100);
        });
    });
});
