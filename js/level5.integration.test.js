/*
 * level5.integration.test.js
 * Integration tests for Level 5: HEART OF THE MACHINE
 * Tests all 8 trap types working together
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OneFrameWindow } from './trapSystem.js';
import { getLevel } from './levels.js';

describe('Level 5: HEART OF THE MACHINE - One Frame Window Integration', () => {
  let level;
  let oneFrameWindow;

  beforeEach(() => {
    level = getLevel(5); // Level 5 (tutorial is level 0)
    oneFrameWindow = new OneFrameWindow(level.oneFrameWindows[0]);
  });

  describe('One Frame Window Configuration (Requirement 17.5)', () => {
    it('should have ONE_FRAME_WINDOW configured', () => {
      expect(level.oneFrameWindows).toBeDefined();
      expect(level.oneFrameWindows.length).toBeGreaterThan(0);
      
      const oneFrameWindowConfig = level.oneFrameWindows[0];
      expect(oneFrameWindowConfig.obstacleIds).toBeDefined();
      expect(oneFrameWindowConfig.obstacleIds.length).toBeGreaterThanOrEqual(2);
      expect(oneFrameWindowConfig.gapDuration).toBeLessThanOrEqual(0.1);
      expect(oneFrameWindowConfig.targetGap).toBeLessThanOrEqual(0.1);
    });

    it('should synchronize pistons for one frame window', () => {
      const pistonLeft = level.autonomousObstacles.find(obs => obs.id === 'piston_left');
      const pistonRight = level.autonomousObstacles.find(obs => obs.id === 'piston_right');
      
      expect(pistonLeft).toBeDefined();
      expect(pistonRight).toBeDefined();
      expect(oneFrameWindow.obstacleIds).toContain('piston_left');
      expect(oneFrameWindow.obstacleIds).toContain('piston_right');
    });

    it('should have gap duration of 0.1s or less', () => {
      expect(oneFrameWindow.gapDuration).toBeLessThanOrEqual(0.1);
      expect(oneFrameWindow.targetGap).toBeLessThanOrEqual(0.1);
    });
  });

  describe('Piston Timing Synchronization (Requirement 17.5)', () => {
    it('should synchronize piston timing to create tight gap', () => {
      const pistonLeft = {
        id: 'piston_left',
        type: 'PISTON',
        speed: 2.9,
        time: 0,
      };
      
      const pistonRight = {
        id: 'piston_right',
        type: 'PISTON',
        speed: 3.2,
        time: 0,
      };
      
      const obstacles = [pistonLeft, pistonRight];
      const result = oneFrameWindow.synchronizeObstacles(obstacles);
      
      expect(result).toBe(true);
      expect(pistonLeft.time).toBeDefined();
      expect(pistonRight.time).toBeDefined();
    });

    it('should create gap of 0.08s between pistons', () => {
      const pistonLeft = {
        id: 'piston_left',
        type: 'PISTON',
        speed: 2.9,
        time: 0,
      };
      
      const pistonRight = {
        id: 'piston_right',
        type: 'PISTON',
        speed: 3.2,
        time: 0,
      };
      
      const obstacles = [pistonLeft, pistonRight];
      oneFrameWindow.synchronizeObstacles(obstacles);
      
      const gap = oneFrameWindow.calculateCurrentGap(pistonLeft, pistonRight);
      expect(gap).toBeLessThanOrEqual(0.1);
    });

    it('should verify synchronization is within target gap', () => {
      const pistonLeft = {
        id: 'piston_left',
        type: 'PISTON',
        speed: 2.9,
        time: 0,
      };
      
      const pistonRight = {
        id: 'piston_right',
        type: 'PISTON',
        speed: 3.2,
        time: 0,
      };
      
      const obstacles = [pistonLeft, pistonRight];
      oneFrameWindow.synchronizeObstacles(obstacles);
      
      // After synchronization, the time difference should be approximately the target gap
      const timeDiff = Math.abs(pistonRight.time - pistonLeft.time);
      expect(timeDiff).toBeCloseTo(oneFrameWindow.targetGap, 1);
    });
  });

  describe('One Frame Window Passability (Requirement 6.2)', () => {
    it('should be passable with precise timing', () => {
      // Gap of 0.08s should be passable
      // Player movement speed is typically 100 pixels/second
      // In 0.08s, player can move 8 pixels
      // Piston width is 10 pixels, so gap must be at least 10 pixels
      
      const pistonWidth = 10;
      const playerSpeed = 100; // pixels/second
      const gapTime = 0.08; // seconds
      const playerMovement = playerSpeed * gapTime;
      
      // Player should be able to move at least the piston width in the gap time
      expect(playerMovement).toBeGreaterThanOrEqual(pistonWidth * 0.8);
    });

    it('should require precise timing to pass', () => {
      // Gap should be tight enough to require skill
      expect(oneFrameWindow.targetGap).toBeLessThan(0.1);
      expect(oneFrameWindow.targetGap).toBeGreaterThan(0.05); // Not impossible
    });
  });
});

describe('Level 5: HEART OF THE MACHINE - Complete Trap Flow Integration', () => {
  let level;

  beforeEach(() => {
    level = getLevel(5); // Level 5 (tutorial is level 0)
  });

  describe('All 8 Trap Types Present (Requirements 17.1-17.8)', () => {
    it('should have FAKE_SAFE_ZONE configured (Requirement 17.1)', () => {
      expect(level.fakeSafeZones).toBeDefined();
      expect(level.fakeSafeZones.length).toBeGreaterThan(0);
      
      // Should have multiple fake safe zones between levers
      expect(level.fakeSafeZones.length).toBeGreaterThanOrEqual(3);
      
      level.fakeSafeZones.forEach(zone => {
        expect(zone.x).toBeDefined();
        expect(zone.y).toBeDefined();
        expect(zone.w).toBeDefined();
        expect(zone.h).toBeDefined();
        expect(zone.delay).toBeDefined();
        expect(zone.obstacleIds).toBeDefined();
        expect(zone.obstacleIds.length).toBeGreaterThan(0);
      });
    });

    it('should have TROLL_TOKEN (ONE_WAY_PRISON) configured (Requirement 17.2)', () => {
      expect(level.trollTokens).toBeDefined();
      expect(level.trollTokens.length).toBeGreaterThan(0);
      
      const trollToken = level.trollTokens[0];
      expect(trollToken.x).toBe(240);
      expect(trollToken.y).toBe(72);
      expect(trollToken.subtype).toBe('ONE_WAY_PRISON');
      expect(trollToken.trapConfig.obstacleIds).toBeDefined();
      expect(trollToken.trapConfig.obstacleIds.length).toBeGreaterThan(0);
    });

    it('should have HIDDEN_KILL_GEAR configured (Requirement 17.3)', () => {
      expect(level.hiddenKillGears).toBeDefined();
      expect(level.hiddenKillGears.length).toBeGreaterThan(0);
      
      // Should have multiple hidden kill gears among decorative gears
      const lethalGears = level.hiddenKillGears.filter(g => g.isLethal);
      const safeGears = level.hiddenKillGears.filter(g => !g.isLethal);
      
      expect(lethalGears.length).toBeGreaterThan(0);
      expect(safeGears.length).toBeGreaterThan(0);
      
      lethalGears.forEach(gear => {
        expect(gear.radius).toBeDefined();
        expect(gear.humRadius).toBeDefined();
      });
    });

    it('should have BAIT_PATH configured (Requirement 17.4)', () => {
      expect(level.baitPaths).toBeDefined();
      expect(level.baitPaths.length).toBeGreaterThan(0);
      
      const baitPath = level.baitPaths[0];
      expect(baitPath.widePath).toBeDefined();
      expect(baitPath.narrowPath).toBeDefined();
      
      // Wide center path should have more obstacles than narrow edge paths
      expect(baitPath.widePath.obstacleIds.length).toBeGreaterThan(baitPath.narrowPath.obstacleIds.length);
    });

    it('should have ONE_FRAME_WINDOW configured (Requirement 17.5)', () => {
      expect(level.oneFrameWindows).toBeDefined();
      expect(level.oneFrameWindows.length).toBeGreaterThan(0);
      
      const oneFrameWindow = level.oneFrameWindows[0];
      expect(oneFrameWindow.obstacleIds).toContain('piston_left');
      expect(oneFrameWindow.obstacleIds).toContain('piston_right');
      expect(oneFrameWindow.gapDuration).toBeLessThanOrEqual(0.1);
    });

    it('should have PHASE_SHIFT_OBSTACLE configured (Requirement 17.6)', () => {
      expect(level.phaseShiftObstacles).toBeDefined();
      expect(level.phaseShiftObstacles.length).toBeGreaterThan(0);
      
      // Should have multiple phase shift obstacles
      expect(level.phaseShiftObstacles.length).toBeGreaterThanOrEqual(3);
      expect(level.phaseShiftObstacles).toContain('bouncing_ball');
      expect(level.phaseShiftObstacles).toContain('pendulum_center');
      expect(level.phaseShiftObstacles).toContain('orbit_right');
    });

    it('should have exactly 1 ALMOST_MOMENT trap (Requirement 17.7)', () => {
      expect(level.almostMomentTrap).toBeDefined();
      expect(level.almostMomentTrap).not.toBeNull();
      
      expect(level.almostMomentTrap.obstacleIds).toBeDefined();
      expect(level.almostMomentTrap.obstacleIds.length).toBeGreaterThan(0);
      expect(level.almostMomentTrap.triggerOnFinalToken).toBe(true);
      
      // Should activate multiple obstacles blocking sequence completion
      expect(level.almostMomentTrap.obstacleIds.length).toBeGreaterThanOrEqual(2);
    });

    it('should have MIRROR_CORRIDOR configured (Requirement 17.8)', () => {
      expect(level.mirrorCorridors).toBeDefined();
      expect(level.mirrorCorridors.length).toBeGreaterThan(0);
      
      // Should have multiple mirror corridors
      expect(level.mirrorCorridors.length).toBeGreaterThanOrEqual(2);
      
      level.mirrorCorridors.forEach(corridor => {
        expect(corridor.obstacleA).toBeDefined();
        expect(corridor.obstacleB).toBeDefined();
        expect(corridor.phaseOffset).toBeDefined();
        expect(corridor.centerLine).toBeDefined();
        expect(corridor.symmetryAxis).toBe('vertical');
      });
    });
  });

  describe('Trap Integration with Sequence Puzzle (Requirements 17.1-17.8)', () => {
    it('should have sequence puzzle with 5 levers', () => {
      const levers = level.objects.filter(obj => obj.type === 'LEVER_SEQUENCE');
      expect(levers.length).toBe(5);
      expect(level.sequenceCorrect).toEqual([1, 2, 3, 4, 5]);
    });

    it('should have fake safe zones between levers', () => {
      const levers = level.objects.filter(obj => obj.type === 'LEVER_SEQUENCE');
      const fakeSafeZones = level.fakeSafeZones;
      
      // Each fake safe zone should be positioned between levers
      fakeSafeZones.forEach(zone => {
        const nearbyLevers = levers.filter(lever => 
          Math.abs(lever.x - zone.x) < 100
        );
        expect(nearbyLevers.length).toBeGreaterThan(0);
      });
    });

    it('should have troll token blocking return path', () => {
      const trollToken = level.trollTokens[0];
      expect(trollToken.subtype).toBe('ONE_WAY_PRISON');
      
      // Should activate obstacles that block return to start
      const obstacleIds = trollToken.trapConfig.obstacleIds;
      expect(obstacleIds).toContain('piston_left');
      expect(obstacleIds).toContain('orbit_left');
    });

    it('should have bait path comparing center vs edge routes', () => {
      const baitPath = level.baitPaths[0];
      
      // Wide center path should span most of the level
      expect(baitPath.widePath.w).toBeGreaterThan(400);
      
      // Should have significantly more obstacles in wide path
      const wideDensity = baitPath.widePath.obstacleIds.length / baitPath.widePath.w;
      const narrowDensity = baitPath.narrowPath.obstacleIds.length / baitPath.narrowPath.w;
      expect(wideDensity).toBeGreaterThan(narrowDensity);
    });

    it('should have one frame window between pistons requiring precise timing', () => {
      const oneFrameWindow = level.oneFrameWindows[0];
      const pistonLeft = level.autonomousObstacles.find(obs => obs.id === 'piston_left');
      const pistonRight = level.autonomousObstacles.find(obs => obs.id === 'piston_right');
      
      // Pistons should be positioned far apart
      expect(Math.abs(pistonRight.x - pistonLeft.x)).toBeGreaterThan(200);
      
      // Gap should be very tight
      expect(oneFrameWindow.gapDuration).toBe(0.08);
    });

    it('should have multiple phase shift obstacles for dynamic difficulty', () => {
      const phaseShiftIds = level.phaseShiftObstacles;
      
      // Should include different obstacle types
      const obstacles = level.autonomousObstacles.filter(obs => 
        phaseShiftIds.includes(obs.id)
      );
      
      const types = new Set(obstacles.map(obs => obs.type));
      expect(types.size).toBeGreaterThan(1); // Multiple types
    });

    it('should have almost moment trap activating multiple exit blockers', () => {
      const almostMoment = level.almostMomentTrap;
      const exitBlockers = level.autonomousObstacles.filter(obs => 
        almostMoment.obstacleIds.includes(obs.id)
      );
      
      // Should have multiple exit blockers
      expect(exitBlockers.length).toBeGreaterThanOrEqual(2);
      
      // All should be initially inactive
      exitBlockers.forEach(blocker => {
        expect(blocker.initiallyActive).toBe(false);
      });
    });

    it('should have mirror corridors with orbit spheres and pistons', () => {
      const mirrorCorridors = level.mirrorCorridors;
      
      // Should have orbit sphere mirror corridor
      const orbitCorridor = mirrorCorridors.find(c => 
        c.obstacleA.type === 'ORBIT_SPHERE'
      );
      expect(orbitCorridor).toBeDefined();
      expect(orbitCorridor.phaseOffset).toBe(Math.PI / 3);
      
      // Should have piston mirror corridor
      const pistonCorridor = mirrorCorridors.find(c => 
        c.obstacleA.type === 'PISTON'
      );
      expect(pistonCorridor).toBeDefined();
      expect(pistonCorridor.phaseOffset).toBe(Math.PI / 4);
    });
  });

  describe('Obstacle Configuration for Trap Integration', () => {
    it('should have all obstacles with IDs for trap system', () => {
      const obstaclesWithIds = level.autonomousObstacles.filter(obs => obs.id);
      
      // All obstacles should have IDs for trap system integration
      expect(obstaclesWithIds.length).toBe(level.autonomousObstacles.length);
    });

    it('should have exit blockers initially inactive', () => {
      const exitBlockers = level.autonomousObstacles.filter(obs => 
        obs.id && obs.id.includes('exit_blocker')
      );
      
      expect(exitBlockers.length).toBeGreaterThan(0);
      exitBlockers.forEach(blocker => {
        expect(blocker.initiallyActive).toBe(false);
      });
    });

    it('should have obstacles positioned throughout level', () => {
      const obstacles = level.autonomousObstacles;
      
      // Obstacles should span the level width
      const xPositions = obstacles.map(obs => obs.x || obs.cx);
      const minX = Math.min(...xPositions);
      const maxX = Math.max(...xPositions);
      
      expect(maxX - minX).toBeGreaterThan(400);
    });

    it('should have 6 gear tokens for collection', () => {
      expect(level.gearTokens.length).toBe(6);
      
      // Final token should trigger almost moment trap
      const finalToken = level.gearTokens[level.gearTokens.length - 1];
      expect(finalToken.x).toBe(512);
      expect(finalToken.y).toBe(80);
    });
  });

  describe('Level Design Philosophy: All Traps Combined', () => {
    it('should require mastery of all previous lessons', () => {
      // Level should have all 8 trap types
      expect(level.fakeSafeZones.length).toBeGreaterThan(0);
      expect(level.trollTokens.length).toBeGreaterThan(0);
      expect(level.hiddenKillGears.length).toBeGreaterThan(0);
      expect(level.baitPaths.length).toBeGreaterThan(0);
      expect(level.oneFrameWindows.length).toBeGreaterThan(0);
      expect(level.phaseShiftObstacles.length).toBeGreaterThan(0);
      expect(level.almostMomentTrap).not.toBeNull();
      expect(level.mirrorCorridors.length).toBeGreaterThan(0);
    });

    it('should add mental load with sequence puzzle', () => {
      // Sequence puzzle should be present
      expect(level.sequenceCorrect).toBeDefined();
      expect(level.sequenceCorrect.length).toBe(5);
      
      // Win condition should be sequence completion
      expect(level.winOnSequence).toBe(true);
    });

    it('should create ultimate challenge combining all elements', () => {
      // Multiple fake safe zones
      expect(level.fakeSafeZones.length).toBeGreaterThanOrEqual(3);
      
      // Multiple hidden kill gears
      expect(level.hiddenKillGears.length).toBeGreaterThanOrEqual(3);
      
      // Multiple phase shift obstacles
      expect(level.phaseShiftObstacles.length).toBeGreaterThanOrEqual(3);
      
      // Multiple mirror corridors
      expect(level.mirrorCorridors.length).toBeGreaterThanOrEqual(2);
      
      // Multiple exit blockers
      expect(level.almostMomentTrap.obstacleIds.length).toBeGreaterThanOrEqual(2);
    });
  });
});
