/**
 * Integration tests for Second Wind Trap (Victory Troll)
 * 
 * Tests the complete second wind trap flow:
 * - Activation when all tokens collected
 * - Obstacle spawning with fade-in
 * - Removal after 8 seconds
 * - One-time activation per level
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AutonomousObstacle } from './AutonomousObstacle.js';
import { AUTO } from './constants.js';

describe('Second Wind Trap Integration', () => {
    let secondWindObstacle;

    beforeEach(() => {
        // Create a second wind obstacle
        secondWindObstacle = new AutonomousObstacle({
            type: AUTO.PISTON,
            id: 'second_wind_piston',
            ax: 100, ay: 100,
            bx: 100, by: 150,
            w: 16, h: 8,
            speed: 1.5,
            isSecondWind: true,
            initiallyActive: false,
        });
    });

    it('should start inactive and invisible', () => {
        expect(secondWindObstacle.isActive).toBe(false);
        expect(secondWindObstacle.secondWindActive).toBe(false);
        expect(secondWindObstacle.secondWindAlpha).toBe(0);
        expect(secondWindObstacle.secondWindExpired).toBe(false);
    });

    it('should activate and start fade-in when activateSecondWind is called', () => {
        secondWindObstacle.activateSecondWind();

        expect(secondWindObstacle.isActive).toBe(true);
        expect(secondWindObstacle.secondWindActive).toBe(true);
        expect(secondWindObstacle.secondWindAlpha).toBe(0);
        expect(secondWindObstacle.secondWindTimer).toBe(8); // SECOND_WIND_DURATION
    });

    it('should fade in over 0.5 seconds', () => {
        secondWindObstacle.activateSecondWind();

        // Simulate 0.25 seconds (halfway through fade-in)
        secondWindObstacle.update(0.25, 0);
        expect(secondWindObstacle.secondWindAlpha).toBeCloseTo(0.5, 1);

        // Simulate another 0.25 seconds (complete fade-in)
        secondWindObstacle.update(0.25, 0);
        expect(secondWindObstacle.secondWindAlpha).toBeCloseTo(1.0, 1);

        // Alpha should not exceed 1.0
        secondWindObstacle.update(0.5, 0);
        expect(secondWindObstacle.secondWindAlpha).toBe(1.0);
    });

    it('should remain active for 8 seconds', () => {
        secondWindObstacle.activateSecondWind();

        // Simulate 7.9 seconds
        for (let i = 0; i < 79; i++) {
            secondWindObstacle.update(0.1, 0);
        }

        expect(secondWindObstacle.isActive).toBe(true);
        expect(secondWindObstacle.secondWindActive).toBe(true);
    });

    it('should expire and become inactive after 8 seconds', () => {
        secondWindObstacle.activateSecondWind();

        // Simulate 8.1 seconds
        for (let i = 0; i < 81; i++) {
            secondWindObstacle.update(0.1, 0);
        }

        expect(secondWindObstacle.isActive).toBe(false);
        expect(secondWindObstacle.secondWindActive).toBe(false);
        expect(secondWindObstacle.secondWindExpired).toBe(true);
        expect(secondWindObstacle.secondWindAlpha).toBe(0);
    });

    it('should not reactivate after expiring', () => {
        secondWindObstacle.activateSecondWind();

        // Simulate 8.1 seconds to expire
        for (let i = 0; i < 81; i++) {
            secondWindObstacle.update(0.1, 0);
        }

        expect(secondWindObstacle.secondWindExpired).toBe(true);

        // Try to reactivate
        secondWindObstacle.activateSecondWind();

        // Should remain expired and inactive
        expect(secondWindObstacle.isActive).toBe(false);
        expect(secondWindObstacle.secondWindActive).toBe(false);
        expect(secondWindObstacle.secondWindExpired).toBe(true);
    });

    it('should provide collision bounds when active', () => {
        secondWindObstacle.activateSecondWind();
        secondWindObstacle.update(0.5, 0); // Fade in

        const bounds = secondWindObstacle.getBounds();
        expect(bounds).not.toBeNull();
        expect(bounds.x).toBeDefined();
        expect(bounds.y).toBeDefined();
        expect(bounds.w).toBeDefined();
        expect(bounds.h).toBeDefined();
    });

    it('should not provide collision bounds when inactive', () => {
        const bounds = secondWindObstacle.getBounds();
        expect(bounds).toBeNull();
    });

    it('should not provide collision bounds after expiring', () => {
        secondWindObstacle.activateSecondWind();

        // Simulate 8.1 seconds to expire
        for (let i = 0; i < 81; i++) {
            secondWindObstacle.update(0.1, 0);
        }

        const bounds = secondWindObstacle.getBounds();
        expect(bounds).toBeNull();
    });
});

describe('Second Wind Trap - Multiple Obstacles', () => {
    it('should handle multiple second wind obstacles independently', () => {
        const obstacle1 = new AutonomousObstacle({
            type: AUTO.PISTON,
            id: 'sw_piston_1',
            ax: 100, ay: 100, bx: 100, by: 150,
            w: 16, h: 8, speed: 1.5,
            isSecondWind: true,
            initiallyActive: false,
        });

        const obstacle2 = new AutonomousObstacle({
            type: AUTO.BOUNCING_BALL,
            id: 'sw_ball_1',
            x: 200, y: 100, r: 6,
            vx: 60, vy: 60,
            boundX: 180, boundY: 80, boundW: 80, boundH: 80,
            isSecondWind: true,
            initiallyActive: false,
        });

        // Activate both
        obstacle1.activateSecondWind();
        obstacle2.activateSecondWind();

        expect(obstacle1.isActive).toBe(true);
        expect(obstacle2.isActive).toBe(true);

        // Update both for 4 seconds
        for (let i = 0; i < 40; i++) {
            obstacle1.update(0.1, 0);
            obstacle2.update(0.1, 0);
        }

        // Both should still be active
        expect(obstacle1.isActive).toBe(true);
        expect(obstacle2.isActive).toBe(true);

        // Update both for another 4.1 seconds (total 8.1s)
        for (let i = 0; i < 41; i++) {
            obstacle1.update(0.1, 0);
            obstacle2.update(0.1, 0);
        }

        // Both should be expired
        expect(obstacle1.isActive).toBe(false);
        expect(obstacle2.isActive).toBe(false);
        expect(obstacle1.secondWindExpired).toBe(true);
        expect(obstacle2.secondWindExpired).toBe(true);
    });
});
