/**
 * Property-Based Tests for PhaseShiftObstacle
 * Feature: troll-level-redesign
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PhaseShiftObstacle } from './PhaseShiftObstacle.js';

/**
 * Property 9: Phase Shift Speed Calculation
 * **Validates: Requirements 7.1, 19.1, 19.2**
 * 
 * For any death count, phase shift obstacles SHALL have speed multiplier
 * equal to 1 + floor(deathCount / 3) * 0.1.
 */
describe('Feature: troll-level-redesign, Property 9: Phase Shift Speed Calculation', () => {
  it('should calculate speed multiplier as 1 + floor(deathCount / 3) * 0.1', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary base speed
        fc.float({ min: Math.fround(0.5), max: Math.fround(10.0), noNaN: true }),
        // Generate arbitrary death count
        fc.integer({ min: 0, max: 100 }),
        // Generate arbitrary obstacle configuration
        fc.record({
          type: fc.constantFrom('PISTON', 'PENDULUM', 'BOUNCING_BALL', 'ORBIT_SPHERE', 'GEAR_SPINNER'),
          x: fc.integer({ min: 0, max: 500 }),
          y: fc.integer({ min: 0, max: 500 }),
        }),
        (baseSpeed, deathCount, obstacleConfig) => {
          // Create phase shift obstacle with base speed
          const obstacle = new PhaseShiftObstacle({
            ...obstacleConfig,
            speed: baseSpeed,
          });
          
          // Verify initial state
          expect(obstacle.baseSpeed).toBe(baseSpeed);
          expect(obstacle.speed).toBe(baseSpeed);
          expect(obstacle.phaseShiftEnabled).toBe(true);
          
          // Update phase shift based on death count
          obstacle.updatePhaseShift(deathCount);
          
          // Calculate expected speed multiplier
          const expectedMultiplier = 1 + Math.floor(deathCount / 3) * 0.1;
          const expectedSpeed = baseSpeed * expectedMultiplier;
          
          // Property: speed should equal baseSpeed * (1 + floor(deathCount / 3) * 0.1)
          // Allow small floating point tolerance
          const tolerance = 0.0001;
          const actualSpeed = obstacle.speed;
          
          return Math.abs(actualSpeed - expectedSpeed) < tolerance;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should increase speed by 10% every 3 deaths', () => {
    const baseSpeed = 2.0;
    const obstacle = new PhaseShiftObstacle({
      type: 'PISTON',
      x: 100,
      y: 100,
      speed: baseSpeed,
    });
    
    // Deaths 0-2: 1.0x speed
    obstacle.updatePhaseShift(0);
    expect(obstacle.speed).toBeCloseTo(baseSpeed * 1.0, 5);
    
    obstacle.updatePhaseShift(1);
    expect(obstacle.speed).toBeCloseTo(baseSpeed * 1.0, 5);
    
    obstacle.updatePhaseShift(2);
    expect(obstacle.speed).toBeCloseTo(baseSpeed * 1.0, 5);
    
    // Deaths 3-5: 1.1x speed
    obstacle.updatePhaseShift(3);
    expect(obstacle.speed).toBeCloseTo(baseSpeed * 1.1, 5);
    
    obstacle.updatePhaseShift(4);
    expect(obstacle.speed).toBeCloseTo(baseSpeed * 1.1, 5);
    
    obstacle.updatePhaseShift(5);
    expect(obstacle.speed).toBeCloseTo(baseSpeed * 1.1, 5);
    
    // Deaths 6-8: 1.2x speed
    obstacle.updatePhaseShift(6);
    expect(obstacle.speed).toBeCloseTo(baseSpeed * 1.2, 5);
    
    obstacle.updatePhaseShift(7);
    expect(obstacle.speed).toBeCloseTo(baseSpeed * 1.2, 5);
    
    obstacle.updatePhaseShift(8);
    expect(obstacle.speed).toBeCloseTo(baseSpeed * 1.2, 5);
    
    // Deaths 9-11: 1.3x speed
    obstacle.updatePhaseShift(9);
    expect(obstacle.speed).toBeCloseTo(baseSpeed * 1.3, 5);
    
    // Deaths 30-32: 2.0x speed
    obstacle.updatePhaseShift(30);
    expect(obstacle.speed).toBeCloseTo(baseSpeed * 2.0, 5);
  });

  it('should handle edge cases correctly', () => {
    const baseSpeed = 1.5;
    const obstacle = new PhaseShiftObstacle({
      type: 'PENDULUM',
      x: 200,
      y: 200,
      speed: baseSpeed,
    });
    
    // Death count 0: no multiplier
    obstacle.updatePhaseShift(0);
    expect(obstacle.speed).toBe(baseSpeed);
    
    // Large death count
    obstacle.updatePhaseShift(99);
    const expectedMultiplier = 1 + Math.floor(99 / 3) * 0.1;
    expect(obstacle.speed).toBeCloseTo(baseSpeed * expectedMultiplier, 5);
  });

  it('should preserve baseSpeed across multiple updates', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.5), max: Math.fround(10.0), noNaN: true }),
        fc.array(fc.integer({ min: 0, max: 50 }), { minLength: 1, maxLength: 10 }),
        (baseSpeed, deathCounts) => {
          const obstacle = new PhaseShiftObstacle({
            type: 'PISTON',
            x: 100,
            y: 100,
            speed: baseSpeed,
          });
          
          // Apply multiple death count updates
          for (const deathCount of deathCounts) {
            obstacle.updatePhaseShift(deathCount);
            
            // baseSpeed should never change
            expect(obstacle.baseSpeed).toBe(baseSpeed);
            
            // speed should be calculated from baseSpeed
            const expectedMultiplier = 1 + Math.floor(deathCount / 3) * 0.1;
            const expectedSpeed = baseSpeed * expectedMultiplier;
            expect(obstacle.speed).toBeCloseTo(expectedSpeed, 5);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 10: Phase Shift Reset
 * **Validates: Requirements 7.2, 19.3**
 * 
 * For any phase shift obstacle with modified speed, resetting SHALL
 * restore the speed to its base value.
 */
describe('Feature: troll-level-redesign, Property 10: Phase Shift Reset', () => {
  it('should restore speed to base value when reset is called', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary base speed
        fc.float({ min: Math.fround(0.5), max: Math.fround(10.0), noNaN: true }),
        // Generate arbitrary death count (to modify speed)
        fc.integer({ min: 1, max: 100 }),
        // Generate arbitrary obstacle configuration
        fc.record({
          type: fc.constantFrom('PISTON', 'PENDULUM', 'BOUNCING_BALL', 'ORBIT_SPHERE', 'GEAR_SPINNER'),
          x: fc.integer({ min: 0, max: 500 }),
          y: fc.integer({ min: 0, max: 500 }),
        }),
        (baseSpeed, deathCount, obstacleConfig) => {
          // Create phase shift obstacle
          const obstacle = new PhaseShiftObstacle({
            ...obstacleConfig,
            speed: baseSpeed,
          });
          
          // Modify speed via phase shift
          obstacle.updatePhaseShift(deathCount);
          
          // Speed should be different from base (unless deathCount < 3)
          const modifiedSpeed = obstacle.speed;
          
          // Reset the obstacle
          obstacle.reset();
          
          // Property: speed should be restored to baseSpeed
          const tolerance = 0.0001;
          return Math.abs(obstacle.speed - baseSpeed) < tolerance;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reset speed to base value after multiple phase shifts', () => {
    const baseSpeed = 3.0;
    const obstacle = new PhaseShiftObstacle({
      type: 'BOUNCING_BALL',
      x: 150,
      y: 150,
      speed: baseSpeed,
    });
    
    // Apply multiple phase shifts
    obstacle.updatePhaseShift(5);
    expect(obstacle.speed).toBeCloseTo(baseSpeed * 1.1, 5);
    
    obstacle.updatePhaseShift(10);
    expect(obstacle.speed).toBeCloseTo(baseSpeed * 1.3, 5);
    
    obstacle.updatePhaseShift(20);
    expect(obstacle.speed).toBeCloseTo(baseSpeed * 1.6, 5);
    
    // Reset
    obstacle.reset();
    expect(obstacle.speed).toBe(baseSpeed);
    
    // Verify baseSpeed is unchanged
    expect(obstacle.baseSpeed).toBe(baseSpeed);
  });

  it('should allow phase shift to be reapplied after reset', () => {
    const baseSpeed = 2.5;
    const obstacle = new PhaseShiftObstacle({
      type: 'ORBIT_SPHERE',
      x: 250,
      y: 250,
      speed: baseSpeed,
    });
    
    // First phase shift cycle
    obstacle.updatePhaseShift(6);
    expect(obstacle.speed).toBeCloseTo(baseSpeed * 1.2, 5);
    
    // Reset
    obstacle.reset();
    expect(obstacle.speed).toBe(baseSpeed);
    
    // Second phase shift cycle
    obstacle.updatePhaseShift(9);
    expect(obstacle.speed).toBeCloseTo(baseSpeed * 1.3, 5);
    
    // Reset again
    obstacle.reset();
    expect(obstacle.speed).toBe(baseSpeed);
  });

  it('should reset even when speed was not modified', () => {
    const baseSpeed = 1.8;
    const obstacle = new PhaseShiftObstacle({
      type: 'GEAR_SPINNER',
      x: 300,
      y: 300,
      speed: baseSpeed,
    });
    
    // No phase shift applied (death count 0)
    obstacle.updatePhaseShift(0);
    expect(obstacle.speed).toBe(baseSpeed);
    
    // Reset should still work
    obstacle.reset();
    expect(obstacle.speed).toBe(baseSpeed);
    expect(obstacle.baseSpeed).toBe(baseSpeed);
  });

  it('should preserve all other obstacle properties during reset', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.constantFrom('PISTON', 'PENDULUM'),
          x: fc.integer({ min: 0, max: 500 }),
          y: fc.integer({ min: 0, max: 500 }),
          speed: fc.float({ min: Math.fround(0.5), max: Math.fround(10.0), noNaN: true }),
          w: fc.integer({ min: 5, max: 50 }),
          h: fc.integer({ min: 5, max: 50 }),
        }),
        fc.integer({ min: 3, max: 30 }),
        (config, deathCount) => {
          const obstacle = new PhaseShiftObstacle(config);
          
          // Store original properties
          const originalX = obstacle.x;
          const originalY = obstacle.y;
          const originalType = obstacle.type;
          const originalW = obstacle.w;
          const originalH = obstacle.h;
          
          // Apply phase shift
          obstacle.updatePhaseShift(deathCount);
          
          // Reset
          obstacle.reset();
          
          // Verify all properties except speed are unchanged
          expect(obstacle.x).toBe(originalX);
          expect(obstacle.y).toBe(originalY);
          expect(obstacle.type).toBe(originalType);
          expect(obstacle.w).toBe(originalW);
          expect(obstacle.h).toBe(originalH);
          expect(obstacle.baseSpeed).toBe(config.speed);
          expect(obstacle.speed).toBe(config.speed);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
