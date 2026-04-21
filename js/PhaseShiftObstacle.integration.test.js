/**
 * Integration Tests for PhaseShiftObstacle with Death System
 * Feature: troll-level-redesign
 * 
 * Tests the integration of PhaseShiftObstacle with the death system
 * to ensure speed updates occur on death count changes and resets
 * occur on level reload.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PhaseShiftObstacle } from './PhaseShiftObstacle.js';
import { AutonomousObstacle } from './AutonomousObstacle.js';

describe('PhaseShiftObstacle Integration with Death System', () => {
  let obstacles;
  let phaseShiftObstacle1;
  let phaseShiftObstacle2;
  let regularObstacle;

  beforeEach(() => {
    // Create a mix of phase shift and regular obstacles
    phaseShiftObstacle1 = new PhaseShiftObstacle({
      id: 'phase1',
      type: 'PISTON',
      x: 100,
      y: 100,
      speed: 2.0,
      ax: 100,
      ay: 100,
      bx: 100,
      by: 150,
      w: 10,
      h: 10,
    });

    phaseShiftObstacle2 = new PhaseShiftObstacle({
      id: 'phase2',
      type: 'PENDULUM',
      x: 200,
      y: 100,
      speed: 1.5,
      frequency: 2.0,
      amplitude: 1.0,
      length: 40,
    });

    regularObstacle = new AutonomousObstacle({
      id: 'regular1',
      type: 'BOUNCING_BALL',
      x: 300,
      y: 100,
      speed: 3.0,
      r: 5,
      vx: 60,
      vy: 60,
      boundX: 280,
      boundY: 80,
      boundW: 80,
      boundH: 80,
    });

    obstacles = [phaseShiftObstacle1, phaseShiftObstacle2, regularObstacle];
  });

  it('should update phase shift obstacle speeds on death count change', () => {
    // Simulate death count increasing
    const deathCount = 6;

    // Update all phase shift obstacles
    for (const obstacle of obstacles) {
      if (obstacle instanceof PhaseShiftObstacle) {
        obstacle.updatePhaseShift(deathCount);
      }
    }

    // Phase shift obstacles should have updated speeds
    expect(phaseShiftObstacle1.speed).toBeCloseTo(2.0 * 1.2, 5); // 6 deaths = 1.2x multiplier
    expect(phaseShiftObstacle2.speed).toBeCloseTo(1.5 * 1.2, 5);

    // Regular obstacle should be unchanged
    expect(regularObstacle.speed).toBe(3.0);
  });

  it('should reset phase shift obstacle speeds on level reload', () => {
    // Simulate death count increasing
    phaseShiftObstacle1.updatePhaseShift(9);
    phaseShiftObstacle2.updatePhaseShift(9);

    // Speeds should be modified
    expect(phaseShiftObstacle1.speed).toBeCloseTo(2.0 * 1.3, 5);
    expect(phaseShiftObstacle2.speed).toBeCloseTo(1.5 * 1.3, 5);

    // Simulate level reload - reset all phase shift obstacles
    for (const obstacle of obstacles) {
      if (obstacle instanceof PhaseShiftObstacle) {
        obstacle.reset();
      }
    }

    // Speeds should be back to base values
    expect(phaseShiftObstacle1.speed).toBe(2.0);
    expect(phaseShiftObstacle2.speed).toBe(1.5);
    expect(regularObstacle.speed).toBe(3.0);
  });

  it('should handle multiple death count updates correctly', () => {
    // Simulate progressive death count increases
    const deathCounts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    for (const deathCount of deathCounts) {
      for (const obstacle of obstacles) {
        if (obstacle instanceof PhaseShiftObstacle) {
          obstacle.updatePhaseShift(deathCount);
        }
      }

      // Verify speeds at each death count
      const expectedMultiplier = 1 + Math.floor(deathCount / 3) * 0.1;
      expect(phaseShiftObstacle1.speed).toBeCloseTo(2.0 * expectedMultiplier, 5);
      expect(phaseShiftObstacle2.speed).toBeCloseTo(1.5 * expectedMultiplier, 5);
    }
  });

  it('should maintain independent speeds for different phase shift obstacles', () => {
    const deathCount = 12;

    // Update both obstacles
    phaseShiftObstacle1.updatePhaseShift(deathCount);
    phaseShiftObstacle2.updatePhaseShift(deathCount);

    // Both should have same multiplier but different absolute speeds
    const expectedMultiplier = 1 + Math.floor(deathCount / 3) * 0.1; // 1.4x
    expect(phaseShiftObstacle1.speed).toBeCloseTo(2.0 * expectedMultiplier, 5);
    expect(phaseShiftObstacle2.speed).toBeCloseTo(1.5 * expectedMultiplier, 5);

    // Speeds should be different
    expect(phaseShiftObstacle1.speed).not.toBe(phaseShiftObstacle2.speed);
  });

  it('should handle death count reset cycle correctly', () => {
    // First cycle: deaths increase
    phaseShiftObstacle1.updatePhaseShift(6);
    expect(phaseShiftObstacle1.speed).toBeCloseTo(2.0 * 1.2, 5);

    // Level reload: reset
    phaseShiftObstacle1.reset();
    expect(phaseShiftObstacle1.speed).toBe(2.0);

    // Second cycle: deaths increase again
    phaseShiftObstacle1.updatePhaseShift(3);
    expect(phaseShiftObstacle1.speed).toBeCloseTo(2.0 * 1.1, 5);

    // Another reset
    phaseShiftObstacle1.reset();
    expect(phaseShiftObstacle1.speed).toBe(2.0);
  });

  it('should not affect regular obstacles during phase shift updates', () => {
    const initialSpeed = regularObstacle.speed;

    // Update phase shift obstacles multiple times
    for (let deathCount = 0; deathCount < 20; deathCount++) {
      for (const obstacle of obstacles) {
        if (obstacle instanceof PhaseShiftObstacle) {
          obstacle.updatePhaseShift(deathCount);
        }
      }
    }

    // Regular obstacle speed should remain unchanged
    expect(regularObstacle.speed).toBe(initialSpeed);
  });

  it('should correctly identify phase shift obstacles using instanceof', () => {
    // Verify instanceof checks work correctly
    expect(phaseShiftObstacle1 instanceof PhaseShiftObstacle).toBe(true);
    expect(phaseShiftObstacle2 instanceof PhaseShiftObstacle).toBe(true);
    expect(regularObstacle instanceof PhaseShiftObstacle).toBe(false);

    // PhaseShiftObstacle should also be an AutonomousObstacle
    expect(phaseShiftObstacle1 instanceof AutonomousObstacle).toBe(true);
    expect(phaseShiftObstacle2 instanceof AutonomousObstacle).toBe(true);
    expect(regularObstacle instanceof AutonomousObstacle).toBe(true);
  });

  it('should preserve phaseShiftEnabled flag', () => {
    expect(phaseShiftObstacle1.phaseShiftEnabled).toBe(true);
    expect(phaseShiftObstacle2.phaseShiftEnabled).toBe(true);

    // Flag should persist through updates and resets
    phaseShiftObstacle1.updatePhaseShift(6);
    expect(phaseShiftObstacle1.phaseShiftEnabled).toBe(true);

    phaseShiftObstacle1.reset();
    expect(phaseShiftObstacle1.phaseShiftEnabled).toBe(true);
  });
});

describe('PhaseShiftObstacle Level Loading Simulation', () => {
  it('should correctly instantiate phase shift obstacles from level data', () => {
    // Simulate level data
    const levelData = {
      autonomousObstacles: [
        { id: 'piston1', type: 'PISTON', x: 100, y: 100, speed: 2.0, ax: 100, ay: 100, bx: 100, by: 150, w: 10, h: 10 },
        { id: 'pendulum1', type: 'PENDULUM', x: 200, y: 100, speed: 1.5, frequency: 2.0, amplitude: 1.0, length: 40 },
        { id: 'ball1', type: 'BOUNCING_BALL', x: 300, y: 100, speed: 3.0, r: 5, vx: 60, vy: 60, boundX: 280, boundY: 80, boundW: 80, boundH: 80 },
      ],
      phaseShiftObstacles: ['piston1', 'pendulum1'], // Only these should be phase shift
    };

    // Simulate obstacle creation (as done in loadLevel)
    const phaseShiftIds = levelData.phaseShiftObstacles || [];
    const obstacles = levelData.autonomousObstacles.map(a => {
      if (phaseShiftIds.includes(a.id)) {
        return new PhaseShiftObstacle(a);
      }
      return new AutonomousObstacle(a);
    });

    // Verify correct types
    expect(obstacles[0] instanceof PhaseShiftObstacle).toBe(true);
    expect(obstacles[1] instanceof PhaseShiftObstacle).toBe(true);
    expect(obstacles[2] instanceof PhaseShiftObstacle).toBe(false);
    expect(obstacles[2] instanceof AutonomousObstacle).toBe(true);

    // Verify base speeds are set correctly
    expect(obstacles[0].baseSpeed).toBe(2.0);
    expect(obstacles[1].baseSpeed).toBe(1.5);
  });

  it('should handle empty phaseShiftObstacles array', () => {
    const levelData = {
      autonomousObstacles: [
        { id: 'piston1', type: 'PISTON', x: 100, y: 100, speed: 2.0, ax: 100, ay: 100, bx: 100, by: 150, w: 10, h: 10 },
      ],
      phaseShiftObstacles: [], // No phase shift obstacles
    };

    const phaseShiftIds = levelData.phaseShiftObstacles || [];
    const obstacles = levelData.autonomousObstacles.map(a => {
      if (phaseShiftIds.includes(a.id)) {
        return new PhaseShiftObstacle(a);
      }
      return new AutonomousObstacle(a);
    });

    // All should be regular obstacles
    expect(obstacles[0] instanceof PhaseShiftObstacle).toBe(false);
    expect(obstacles[0] instanceof AutonomousObstacle).toBe(true);
  });

  it('should handle missing phaseShiftObstacles property', () => {
    const levelData = {
      autonomousObstacles: [
        { id: 'piston1', type: 'PISTON', x: 100, y: 100, speed: 2.0, ax: 100, ay: 100, bx: 100, by: 150, w: 10, h: 10 },
      ],
      // phaseShiftObstacles property is missing
    };

    const phaseShiftIds = levelData.phaseShiftObstacles || [];
    const obstacles = levelData.autonomousObstacles.map(a => {
      if (phaseShiftIds.includes(a.id)) {
        return new PhaseShiftObstacle(a);
      }
      return new AutonomousObstacle(a);
    });

    // Should default to regular obstacles
    expect(obstacles[0] instanceof PhaseShiftObstacle).toBe(false);
    expect(obstacles[0] instanceof AutonomousObstacle).toBe(true);
  });
});
