/*
 * level4.integration.test.js
 * Integration tests for Level 4: THE CLOCK TOWER
 * Tests trap interactions with gravity and climbing mechanics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PhaseShiftObstacle } from './PhaseShiftObstacle.js';
import { getLevel } from './levels.js';

describe('Level 4: THE CLOCK TOWER - Vertical Trap Integration', () => {
  let level;

  beforeEach(() => {
    level = getLevel(3); // Level 4 is at index 3
  });

  describe('Trap configuration validation (Requirements 16.1-16.7)', () => {
    it('should have FAKE_SAFE_ZONE configured', () => {
      expect(level.fakeSafeZones).toBeDefined();
      expect(level.fakeSafeZones.length).toBeGreaterThan(0);
      
      const fakeSafeZone = level.fakeSafeZones[0];
      expect(fakeSafeZone.x).toBe(72);
      expect(fakeSafeZone.y).toBe(304);
      expect(fakeSafeZone.w).toBe(24);
      expect(fakeSafeZone.h).toBe(6);
      expect(fakeSafeZone.delay).toBe(1.0);
      expect(fakeSafeZone.obstacleIds).toContain('gear_lower');
    });

    it('should have TROLL_TOKEN (RUSH_BAIT) configured', () => {
      expect(level.trollTokens).toBeDefined();
      expect(level.trollTokens.length).toBeGreaterThan(0);
      
      const trollToken = level.trollTokens[0];
      expect(trollToken.x).toBe(144);
      expect(trollToken.y).toBe(268);
      expect(trollToken.subtype).toBe('RUSH_BAIT');
      expect(trollToken.trapConfig.speedMultiplier).toBe(1.4);
      expect(trollToken.trapConfig.affectedObstacleIds).toContain('gear_lower');
      expect(trollToken.trapConfig.affectedObstacleIds).toContain('gear_upper');
      expect(trollToken.trapConfig.affectedObstacleIds).toContain('bouncing_ball');
    });

    it('should have HIDDEN_KILL_GEAR configured', () => {
      expect(level.hiddenKillGears).toBeDefined();
      expect(level.hiddenKillGears.length).toBe(3);
      
      const lethalGear = level.hiddenKillGears.find(g => g.isLethal);
      expect(lethalGear).toBeDefined();
      expect(lethalGear.x).toBe(96);
      expect(lethalGear.y).toBe(320);
      expect(lethalGear.radius).toBe(8);
      expect(lethalGear.humRadius).toBe(40);
      
      const safeGears = level.hiddenKillGears.filter(g => !g.isLethal);
      expect(safeGears.length).toBe(2);
    });

    it('should have BAIT_PATH configured for vertical climbing', () => {
      expect(level.baitPaths).toBeDefined();
      expect(level.baitPaths.length).toBeGreaterThan(0);
      
      const baitPath = level.baitPaths[0];
      expect(baitPath.widePath).toBeDefined();
      expect(baitPath.narrowPath).toBeDefined();
      
      // Wide path (elevator) should have more obstacles
      expect(baitPath.widePath.obstacleIds.length).toBeGreaterThan(baitPath.narrowPath.obstacleIds.length);
      expect(baitPath.widePath.obstacleIds).toContain('gear_lower');
      expect(baitPath.widePath.obstacleIds).toContain('bouncing_ball');
      expect(baitPath.widePath.obstacleIds).toContain('exit_blocker');
      
      // Narrow path (fan) should have fewer obstacles
      expect(baitPath.narrowPath.obstacleIds).toContain('gear_upper');
    });

    it('should have PHASE_SHIFT_OBSTACLE configured', () => {
      expect(level.phaseShiftObstacles).toBeDefined();
      expect(level.phaseShiftObstacles.length).toBeGreaterThan(0);
      expect(level.phaseShiftObstacles).toContain('bouncing_ball');
    });

    it('should have MIRROR_CORRIDOR configured', () => {
      expect(level.mirrorCorridors).toBeDefined();
      expect(level.mirrorCorridors.length).toBeGreaterThan(0);
      
      const mirrorCorridor = level.mirrorCorridors[0];
      expect(mirrorCorridor.obstacleA).toBeDefined();
      expect(mirrorCorridor.obstacleB).toBeDefined();
      expect(mirrorCorridor.phaseOffset).toBe(Math.PI / 4);
      expect(mirrorCorridor.centerLine).toBe(96);
      expect(mirrorCorridor.symmetryAxis).toBe('vertical');
    });

    it('should have ALMOST_MOMENT trap configured', () => {
      expect(level.almostMomentTrap).toBeDefined();
      expect(level.almostMomentTrap).not.toBeNull();
      expect(level.almostMomentTrap.obstacleIds).toContain('exit_blocker');
      expect(level.almostMomentTrap.triggerOnFinalToken).toBe(true);
    });
  });

  describe('Vertical trap placement validation', () => {
    it('should have traps positioned at different vertical heights', () => {
      // FAKE_SAFE_ZONE at y=304 (mid-level)
      expect(level.fakeSafeZones[0].y).toBe(304);
      
      // TROLL_TOKEN at y=268 (mid-level)
      expect(level.trollTokens[0].y).toBe(268);
      
      // HIDDEN_KILL_GEAR at y=320 (lower-mid level)
      expect(level.hiddenKillGears[0].y).toBe(320);
      
      // Exit blocker at y=80 (upper level)
      const exitBlocker = level.autonomousObstacles.find(obs => obs.id === 'exit_blocker');
      expect(exitBlocker.y).toBe(80);
    });

    it('should have obstacles with IDs for trap system integration', () => {
      const obstacleIds = level.autonomousObstacles
        .filter(obs => obs.id)
        .map(obs => obs.id);
      
      expect(obstacleIds).toContain('gear_lower');
      expect(obstacleIds).toContain('gear_upper');
      expect(obstacleIds).toContain('bouncing_ball');
      expect(obstacleIds).toContain('exit_blocker');
    });

    it('should have exit blocker initially inactive', () => {
      const exitBlocker = level.autonomousObstacles.find(obs => obs.id === 'exit_blocker');
      expect(exitBlocker.initiallyActive).toBe(false);
    });
  });

  describe('Phase shift obstacle behavior in vertical level', () => {
    let phaseShiftObstacle;

    beforeEach(() => {
      const bouncingBallConfig = level.autonomousObstacles.find(obs => obs.id === 'bouncing_ball');
      phaseShiftObstacle = new PhaseShiftObstacle({
        ...bouncingBallConfig,
        speed: Math.sqrt(bouncingBallConfig.vx ** 2 + bouncingBallConfig.vy ** 2),
      });
    });

    it('should increase speed by 10% every 3 deaths', () => {
      phaseShiftObstacle.updatePhaseShift(0);
      const baseSpeed = phaseShiftObstacle.speed;
      
      phaseShiftObstacle.updatePhaseShift(3);
      expect(phaseShiftObstacle.speed).toBeCloseTo(baseSpeed * 1.1, 5);
      
      phaseShiftObstacle.updatePhaseShift(6);
      expect(phaseShiftObstacle.speed).toBeCloseTo(baseSpeed * 1.2, 5);
    });

    it('should reset speed on level reload', () => {
      phaseShiftObstacle.updatePhaseShift(6);
      expect(phaseShiftObstacle.speed).toBeGreaterThan(phaseShiftObstacle.baseSpeed);
      
      phaseShiftObstacle.reset();
      expect(phaseShiftObstacle.speed).toBe(phaseShiftObstacle.baseSpeed);
    });
  });

  describe('Trap interactions with vertical climbing mechanics', () => {
    it('should have FAKE_SAFE_ZONE on elevator platform', () => {
      const fakeSafeZone = level.fakeSafeZones[0];
      const elevator = level.objects.find(obj => obj.type === 'ELEVATOR');
      
      // Fake safe zone should be positioned on elevator path
      expect(fakeSafeZone.x).toBe(elevator.x);
      expect(fakeSafeZone.y).toBeLessThan(elevator.y1);
      expect(fakeSafeZone.y).toBeGreaterThan(elevator.y2);
    });

    it('should have TROLL_TOKEN positioned near fan path', () => {
      const trollToken = level.trollTokens[0];
      const fans = level.objects.filter(obj => obj.type === 'FAN_UP');
      
      // Token should be accessible via fan path
      expect(trollToken.x).toBeGreaterThan(fans[0].x);
      expect(trollToken.y).toBeLessThan(fans[1].y);
    });

    it('should have BAIT_PATH comparing elevator vs fan routes', () => {
      const baitPath = level.baitPaths[0];
      const elevator = level.objects.find(obj => obj.type === 'ELEVATOR');
      const fans = level.objects.filter(obj => obj.type === 'FAN_UP');
      
      // Wide path should be elevator route (more obstacles)
      expect(baitPath.widePath.x).toBe(elevator.x);
      expect(baitPath.widePath.obstacleIds.length).toBe(3);
      
      // Narrow path should be fan route (fewer obstacles)
      expect(baitPath.narrowPath.x).toBe(fans[1].x);
      expect(baitPath.narrowPath.obstacleIds.length).toBe(1);
    });

    it('should have ALMOST_MOMENT trap blocking exit at top', () => {
      const almostMoment = level.almostMomentTrap;
      const exitBlocker = level.autonomousObstacles.find(obs => obs.id === 'exit_blocker');
      const goalTrigger = level.goalTrigger;
      
      // Exit blocker should be near goal at top of level
      expect(exitBlocker.y).toBeLessThan(goalTrigger.y + 100);
      expect(almostMoment.obstacleIds).toContain('exit_blocker');
    });
  });

  describe('Gravity and climbing trap considerations', () => {
    it('should have HIDDEN_KILL_GEAR positioned where player might rest', () => {
      const hiddenKillGear = level.hiddenKillGears.find(g => g.isLethal);
      
      // Should be at a vertical position where player might pause
      expect(hiddenKillGear.y).toBeGreaterThan(200);
      expect(hiddenKillGear.y).toBeLessThan(400);
    });

    it('should have PHASE_SHIFT_OBSTACLE (bouncing ball) in vertical bounds', () => {
      const bouncingBall = level.autonomousObstacles.find(obs => obs.id === 'bouncing_ball');
      
      // Ball should bounce in vertical space
      expect(bouncingBall.boundY).toBeDefined();
      expect(bouncingBall.boundH).toBeDefined();
      expect(bouncingBall.vy).toBeDefined();
      expect(bouncingBall.vy).not.toBe(0); // Should have vertical velocity
    });

    it('should have MIRROR_CORRIDOR with vertically separated gears', () => {
      const mirrorCorridor = level.mirrorCorridors[0];
      
      // Gears should be at different vertical heights
      expect(mirrorCorridor.obstacleA.y).not.toBe(mirrorCorridor.obstacleB.y);
      expect(Math.abs(mirrorCorridor.obstacleA.y - mirrorCorridor.obstacleB.y)).toBeGreaterThan(100);
    });
  });

  describe('All trap types from Level 3 present', () => {
    it('should have all 7 trap types configured', () => {
      // FAKE_SAFE_ZONE
      expect(level.fakeSafeZones.length).toBeGreaterThan(0);
      
      // TROLL_TOKEN
      expect(level.trollTokens.length).toBeGreaterThan(0);
      
      // HIDDEN_KILL_GEAR
      expect(level.hiddenKillGears.length).toBeGreaterThan(0);
      
      // BAIT_PATH
      expect(level.baitPaths.length).toBeGreaterThan(0);
      
      // PHASE_SHIFT_OBSTACLE
      expect(level.phaseShiftObstacles.length).toBeGreaterThan(0);
      
      // MIRROR_CORRIDOR
      expect(level.mirrorCorridors.length).toBeGreaterThan(0);
      
      // ALMOST_MOMENT
      expect(level.almostMomentTrap).not.toBeNull();
    });
  });
});
