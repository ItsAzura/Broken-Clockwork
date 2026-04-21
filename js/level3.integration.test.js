/*
 * level3.integration.test.js
 * Integration tests for Level 3: THE SENTINEL
 * Tests phase shift obstacle behavior with death count
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PhaseShiftObstacle } from './PhaseShiftObstacle.js';
import { getLevel } from './levels.js';

describe('Level 3: THE SENTINEL - Phase Shift Integration', () => {
  let level;
  let phaseShiftObstacle;

  beforeEach(() => {
    level = getLevel(2); // Level 3 is at index 2
    
    // Create a phase shift obstacle based on level config
    const pendulumConfig = level.autonomousObstacles.find(obs => obs.id === 'pendulum_right');
    phaseShiftObstacle = new PhaseShiftObstacle({
      ...pendulumConfig,
      speed: pendulumConfig.frequency || 2.3,
    });
  });

  describe('Death count → speed increase (every 3 deaths, 10% increase)', () => {
    it('should have base speed at 0 deaths', () => {
      phaseShiftObstacle.updatePhaseShift(0);
      expect(phaseShiftObstacle.speed).toBe(phaseShiftObstacle.baseSpeed);
    });

    it('should have base speed at 1-2 deaths', () => {
      phaseShiftObstacle.updatePhaseShift(1);
      expect(phaseShiftObstacle.speed).toBe(phaseShiftObstacle.baseSpeed);
      
      phaseShiftObstacle.updatePhaseShift(2);
      expect(phaseShiftObstacle.speed).toBe(phaseShiftObstacle.baseSpeed);
    });

    it('should increase speed by 10% at 3 deaths', () => {
      phaseShiftObstacle.updatePhaseShift(3);
      const expectedSpeed = phaseShiftObstacle.baseSpeed * 1.1;
      expect(phaseShiftObstacle.speed).toBeCloseTo(expectedSpeed, 5);
    });

    it('should increase speed by 10% at 4-5 deaths', () => {
      phaseShiftObstacle.updatePhaseShift(4);
      const expectedSpeed = phaseShiftObstacle.baseSpeed * 1.1;
      expect(phaseShiftObstacle.speed).toBeCloseTo(expectedSpeed, 5);
      
      phaseShiftObstacle.updatePhaseShift(5);
      expect(phaseShiftObstacle.speed).toBeCloseTo(expectedSpeed, 5);
    });

    it('should increase speed by 20% at 6 deaths', () => {
      phaseShiftObstacle.updatePhaseShift(6);
      const expectedSpeed = phaseShiftObstacle.baseSpeed * 1.2;
      expect(phaseShiftObstacle.speed).toBeCloseTo(expectedSpeed, 5);
    });

    it('should increase speed by 30% at 9 deaths', () => {
      phaseShiftObstacle.updatePhaseShift(9);
      const expectedSpeed = phaseShiftObstacle.baseSpeed * 1.3;
      expect(phaseShiftObstacle.speed).toBeCloseTo(expectedSpeed, 5);
    });

    it('should handle large death counts correctly', () => {
      phaseShiftObstacle.updatePhaseShift(30);
      const expectedSpeed = phaseShiftObstacle.baseSpeed * 2.0; // 1 + floor(30/3) * 0.1 = 1 + 10 * 0.1 = 2.0
      expect(phaseShiftObstacle.speed).toBeCloseTo(expectedSpeed, 5);
    });
  });

  describe('Level reload → speed reset', () => {
    it('should reset speed to base after modification', () => {
      // Increase speed through deaths
      phaseShiftObstacle.updatePhaseShift(6);
      expect(phaseShiftObstacle.speed).toBeGreaterThan(phaseShiftObstacle.baseSpeed);
      
      // Reset (simulating level reload)
      phaseShiftObstacle.reset();
      expect(phaseShiftObstacle.speed).toBe(phaseShiftObstacle.baseSpeed);
    });

    it('should reset speed to base after multiple increases', () => {
      // Increase speed multiple times
      phaseShiftObstacle.updatePhaseShift(3);
      phaseShiftObstacle.updatePhaseShift(6);
      phaseShiftObstacle.updatePhaseShift(9);
      expect(phaseShiftObstacle.speed).toBeCloseTo(phaseShiftObstacle.baseSpeed * 1.3, 5);
      
      // Reset
      phaseShiftObstacle.reset();
      expect(phaseShiftObstacle.speed).toBe(phaseShiftObstacle.baseSpeed);
    });

    it('should allow speed to increase again after reset', () => {
      // First cycle
      phaseShiftObstacle.updatePhaseShift(6);
      expect(phaseShiftObstacle.speed).toBeCloseTo(phaseShiftObstacle.baseSpeed * 1.2, 5);
      
      // Reset
      phaseShiftObstacle.reset();
      expect(phaseShiftObstacle.speed).toBe(phaseShiftObstacle.baseSpeed);
      
      // Second cycle
      phaseShiftObstacle.updatePhaseShift(3);
      expect(phaseShiftObstacle.speed).toBeCloseTo(phaseShiftObstacle.baseSpeed * 1.1, 5);
    });
  });

  describe('Level 3 configuration validation', () => {
    it('should have pendulum_right in phaseShiftObstacles array', () => {
      expect(level.phaseShiftObstacles).toContain('pendulum_right');
    });

    it('should have pendulum_right obstacle with id', () => {
      const pendulum = level.autonomousObstacles.find(obs => obs.id === 'pendulum_right');
      expect(pendulum).toBeDefined();
      expect(pendulum.id).toBe('pendulum_right');
    });

    it('should have all required trap types from Level 2', () => {
      expect(level.fakeSafeZones).toBeDefined();
      expect(level.fakeSafeZones.length).toBeGreaterThan(0);
      
      expect(level.trollTokens).toBeDefined();
      expect(level.trollTokens.length).toBeGreaterThan(0);
      
      expect(level.hiddenKillGears).toBeDefined();
      expect(level.hiddenKillGears.length).toBeGreaterThan(0);
      
      expect(level.baitPaths).toBeDefined();
      expect(level.baitPaths.length).toBeGreaterThan(0);
      
      expect(level.almostMomentTrap).toBeDefined();
      expect(level.almostMomentTrap).not.toBeNull();
      
      expect(level.mirrorCorridors).toBeDefined();
      expect(level.mirrorCorridors.length).toBeGreaterThan(0);
    });

    it('should have phaseShiftObstacles array configured', () => {
      expect(level.phaseShiftObstacles).toBeDefined();
      expect(Array.isArray(level.phaseShiftObstacles)).toBe(true);
      expect(level.phaseShiftObstacles.length).toBeGreaterThan(0);
    });
  });
});
