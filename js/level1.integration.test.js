/**
 * level1.integration.test.js
 * Integration tests for Level 1 trap flow
 * Tests: trigger tile → obstacle activation, fake safe zone → delayed obstacle entry,
 *        troll token → speed increase, almost moment → exit block
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getLevel } from './levels.js';
import { TriggerTile } from './trapSystem.js';
import { FakeSafeZone } from './trapSystem.js';
import { TrollToken } from './trapSystem.js';
import { AlmostMomentTrap } from './trapSystem.js';

describe('Level 1: FIRST TOCK - Trap Flow Integration', () => {
  let level;

  beforeEach(() => {
    level = getLevel(1); // Level 1 (tutorial is level 0)
  });

  describe('Trigger Tile → Obstacle Activation', () => {
    it('should activate piston_1 when player collides with trigger tile', () => {
      const triggerConfig = level.triggerTiles[0];
      expect(triggerConfig).toBeDefined();
      expect(triggerConfig.targetObstacleId).toBe('piston_1');

      const trigger = new TriggerTile(triggerConfig);
      
      // Mock player hitbox overlapping trigger
      const playerHitbox = {
        x: triggerConfig.x + 2,
        y: triggerConfig.y + 2,
        w: 8,
        h: 8,
      };

      const collision = trigger.checkCollision(playerHitbox);
      expect(collision).toBe(true);

      // Mock game state
      const mockGame = {
        autonomousObstacles: level.autonomousObstacles.map(obs => ({
          ...obs,
          active: obs.initiallyActive !== false,
        })),
      };

      trigger.activate(mockGame);
      expect(trigger.activated).toBe(true);
    });

    it('should be one-shot trigger (does not reactivate)', () => {
      const triggerConfig = level.triggerTiles[0];
      const trigger = new TriggerTile(triggerConfig);

      expect(trigger.oneShot).toBe(true);

      const mockGame = {
        autonomousObstacles: level.autonomousObstacles.map(obs => ({
          ...obs,
          active: obs.initiallyActive !== false,
        })),
      };

      trigger.activate(mockGame);
      expect(trigger.activated).toBe(true);

      // Second activation should not work
      const beforeState = trigger.activated;
      trigger.activate(mockGame);
      expect(trigger.activated).toBe(beforeState);
    });
  });

  describe('Fake Safe Zone → Delayed Obstacle Entry', () => {
    it('should delay obstacle entry by 1.5 seconds', () => {
      const fakeZoneConfig = level.fakeSafeZones[0];
      expect(fakeZoneConfig).toBeDefined();
      expect(fakeZoneConfig.delay).toBe(1.5);
      expect(fakeZoneConfig.obstacleIds).toContain('piston_1');

      const fakeZone = new FakeSafeZone(fakeZoneConfig);

      // Player enters zone
      const playerPos = {
        x: fakeZoneConfig.x + 10,
        y: fakeZoneConfig.y + 10,
      };

      // Update for 1.4 seconds (not yet triggered)
      fakeZone.update(1.4, playerPos);
      expect(fakeZone.timer).toBeGreaterThan(0);
      expect(fakeZone.playerInside).toBe(true);

      // Update for another 0.2 seconds (should trigger)
      const mockGame = {
        autonomousObstacles: level.autonomousObstacles.map(obs => ({
          ...obs,
          id: obs.id,
          active: obs.initiallyActive !== false,
        })),
      };

      fakeZone.update(0.2, playerPos, mockGame);
      expect(fakeZone.timer).toBeLessThanOrEqual(0);
    });

    it('should not reset timer when player leaves zone (timer persists)', () => {
      const fakeZoneConfig = level.fakeSafeZones[0];
      const fakeZone = new FakeSafeZone(fakeZoneConfig);

      // Player enters zone
      const playerPosInside = {
        x: fakeZoneConfig.x + 10,
        y: fakeZoneConfig.y + 10,
      };

      fakeZone.update(0.5, playerPosInside);
      expect(fakeZone.playerInside).toBe(true);
      const timerAfterEntry = fakeZone.timer;
      expect(timerAfterEntry).toBeGreaterThan(0);

      // Player leaves zone
      const playerPosOutside = {
        x: fakeZoneConfig.x - 50,
        y: fakeZoneConfig.y - 50,
      };

      fakeZone.update(0.1, playerPosOutside);
      expect(fakeZone.playerInside).toBe(false);
      // Timer persists (doesn't reset to 0 when player leaves)
      expect(fakeZone.timer).toBeGreaterThan(0);
    });
  });

  describe('Troll Token → Speed Increase', () => {
    it('should return trap activation data when RUSH_BAIT token collected', () => {
      const trollTokenConfig = level.trollTokens[0];
      expect(trollTokenConfig).toBeDefined();
      expect(trollTokenConfig.subtype).toBe('RUSH_BAIT');
      expect(trollTokenConfig.trapConfig.speedMultiplier).toBe(1.3);

      const trollToken = new TrollToken(trollTokenConfig);

      // Mock game state with obstacles
      const mockGame = {
        autonomousObstacles: level.autonomousObstacles.map(obs => ({
          ...obs,
          id: obs.id,
          speed: obs.speed,
          baseSpeed: obs.speed,
        })),
      };

      // onCollect returns trap activation data, doesn't modify game state directly
      const trapData = trollToken.onCollect(mockGame);

      expect(trapData).toBeDefined();
      expect(trapData.type).toBe('RUSH_BAIT');
      expect(trapData.speedMultiplier).toBe(1.3);
      expect(trapData.affectedObstacleIds).toBeDefined();
      expect(trollToken.collected).toBe(true);
    });

    it('should specify target obstacles in trap activation data', () => {
      const trollTokenConfig = level.trollTokens[0];
      const trollToken = new TrollToken(trollTokenConfig);

      const mockGame = {
        autonomousObstacles: level.autonomousObstacles.map(obs => ({
          ...obs,
          id: obs.id,
          speed: obs.speed,
          baseSpeed: obs.speed,
        })),
      };

      const trapData = trollToken.onCollect(mockGame);

      // Trap data should specify which obstacles to affect
      expect(trapData.affectedObstacleIds).toBeDefined();
      
      // The game loop will use this data to apply speed changes
      // exit_blocker should not be in the affected list
      if (trapData.affectedObstacleIds.length > 0) {
        expect(trapData.affectedObstacleIds).not.toContain('exit_blocker');
      }
    });
  });

  describe('Almost Moment → Exit Block', () => {
    it('should activate exit blocker when final token collected', () => {
      const almostMomentConfig = level.almostMomentTrap;
      expect(almostMomentConfig).toBeDefined();
      expect(almostMomentConfig.obstacleIds).toContain('exit_blocker');
      expect(almostMomentConfig.triggerOnFinalToken).toBe(true);

      const almostMoment = new AlmostMomentTrap(almostMomentConfig);

      // Mock game state with all tokens collected
      const mockGame = {
        gearTokens: level.gearTokens,
        gearsCollected: level.gearTokens.length, // All tokens collected
        autonomousObstacles: level.autonomousObstacles.map(obs => ({
          ...obs,
          id: obs.id,
          active: obs.initiallyActive !== false,
        })),
        flash: 0,
        shake: 0,
      };

      // checkTrigger takes gearsCollected and totalGears as separate parameters
      const shouldTrigger = almostMoment.checkTrigger(mockGame.gearsCollected, mockGame.gearTokens.length);
      expect(shouldTrigger).toBe(true);

      almostMoment.activate(mockGame);

      const exitBlocker = mockGame.autonomousObstacles.find(o => o.id === 'exit_blocker');
      expect(exitBlocker.activationSource).toBe('almost_moment');
      expect(almostMoment.activated).toBe(true);
    });

    it('should not activate when tokens remain uncollected', () => {
      const almostMomentConfig = level.almostMomentTrap;
      const almostMoment = new AlmostMomentTrap(almostMomentConfig);

      // Mock game state with only 1 token collected
      const mockGame = {
        gearTokens: level.gearTokens,
        gearsCollected: 1, // Not all tokens collected
        autonomousObstacles: level.autonomousObstacles.map(obs => ({
          ...obs,
          id: obs.id,
          active: obs.initiallyActive !== false,
        })),
      };

      // checkTrigger takes gearsCollected and totalGears as separate parameters
      const shouldTrigger = almostMoment.checkTrigger(mockGame.gearsCollected, mockGame.gearTokens.length);
      expect(shouldTrigger).toBe(false);
    });
  });

  describe('Level 1 Configuration Validation', () => {
    it('should have all required trap types', () => {
      expect(level.triggerTiles.length).toBeGreaterThan(0);
      expect(level.fakeSafeZones.length).toBeGreaterThan(0);
      expect(level.trollTokens.length).toBeGreaterThan(0);
      expect(level.hiddenKillGears.length).toBeGreaterThan(0);
      expect(level.baitPaths.length).toBeGreaterThan(0);
      expect(level.almostMomentTrap).not.toBeNull();
    });

    it('should have correct obstacle IDs referenced in traps', () => {
      const obstacleIds = level.autonomousObstacles
        .filter(obs => obs.id)
        .map(obs => obs.id);

      // Check trigger tile references valid obstacle
      level.triggerTiles.forEach(trigger => {
        expect(obstacleIds).toContain(trigger.targetObstacleId);
      });

      // Check fake safe zone references valid obstacles
      level.fakeSafeZones.forEach(zone => {
        zone.obstacleIds.forEach(id => {
          expect(obstacleIds).toContain(id);
        });
      });

      // Check almost moment references valid obstacles
      level.almostMomentTrap.obstacleIds.forEach(id => {
        expect(obstacleIds).toContain(id);
      });
    });

    it('should have bait path with correct obstacle density', () => {
      const baitPath = level.baitPaths[0];
      expect(baitPath).toBeDefined();
      expect(baitPath.widePath).toBeDefined();
      expect(baitPath.narrowPath).toBeDefined();

      // Wide path should have more obstacles than narrow path
      expect(baitPath.widePath.obstacleIds.length).toBeGreaterThan(
        baitPath.narrowPath.obstacleIds.length
      );
    });

    it('should have hidden kill gears with at least one lethal', () => {
      const lethalGears = level.hiddenKillGears.filter(gear => gear.isLethal);
      const safeGears = level.hiddenKillGears.filter(gear => !gear.isLethal);

      expect(lethalGears.length).toBeGreaterThan(0);
      expect(safeGears.length).toBeGreaterThan(0);
    });
  });
});
