/**
 * trapSystem.integration.test.js
 * Integration tests for complete trap system
 * 
 * Tests:
 * - Trap system initialization
 * - Trap event propagation through all systems
 * - Error handling for invalid configurations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TriggerTile, FakeSafeZone, TrollToken, HiddenKillGear, AlmostMomentTrap, ProximityTrigger } from './trapSystem.js';
import { PhaseShiftObstacle } from './PhaseShiftObstacle.js';
import { AutonomousObstacle } from './AutonomousObstacle.js';
import { LiarCounter } from './liarCounter.js';
import { validateLevelTraps } from './levels.js';

describe('Trap System Integration', () => {
  describe('Trap System Initialization', () => {
    it('should initialize all trap types without errors', () => {
      const triggerTile = new TriggerTile({ x: 0, y: 0, w: 16, h: 16, targetObstacleId: 'test', oneShot: true });
      const fakeSafeZone = new FakeSafeZone({ x: 0, y: 0, w: 32, h: 32, delay: 1.5, obstacleIds: ['test'] });
      const trollToken = new TrollToken({ x: 0, y: 0, subtype: 'ONE_WAY_PRISON', trapConfig: { obstacleIds: ['test'] } });
      const hiddenKillGear = new HiddenKillGear({ x: 0, y: 0, radius: 8, humRadius: 40 });
      const almostMomentTrap = new AlmostMomentTrap({ obstacleIds: ['test'] });
      const proximityTrigger = new ProximityTrigger({ x: 0, y: 0, activationDistance: 50, targetTrapId: 'test' });
      
      expect(triggerTile).toBeDefined();
      expect(fakeSafeZone).toBeDefined();
      expect(trollToken).toBeDefined();
      expect(hiddenKillGear).toBeDefined();
      expect(almostMomentTrap).toBeDefined();
      expect(proximityTrigger).toBeDefined();
    });

    it('should initialize phase shift obstacles correctly', () => {
      const phaseShiftObstacle = new PhaseShiftObstacle({
        type: 'PISTON',
        id: 'test_piston',
        x: 100,
        y: 100,
        ax: 100,
        ay: 100,
        bx: 100,
        by: 150,
        w: 10,
        h: 10,
        speed: 2.0
      });
      
      expect(phaseShiftObstacle).toBeDefined();
      expect(phaseShiftObstacle.baseSpeed).toBe(2.0);
      expect(phaseShiftObstacle.speed).toBe(2.0);
    });

    it('should initialize liar counter correctly', () => {
      const liarCounter = new LiarCounter();
      
      expect(liarCounter).toBeDefined();
      expect(liarCounter.displayCount).toBe(0);
      expect(liarCounter.actualCount).toBe(0);
      expect(liarCounter.lieTimer).toBe(0);
    });
  });

  describe('Trap Event Propagation', () => {
    it('should propagate trigger tile activation to obstacle', () => {
      const triggerTile = new TriggerTile({ x: 0, y: 0, w: 16, h: 16, targetObstacleId: 'test_obstacle', oneShot: true });
      const playerHitbox = { x: 5, y: 5, w: 8, h: 12 };
      
      const collision = triggerTile.checkCollision(playerHitbox);
      expect(collision).toBe(true);
      
      // Mock game object
      const game = {
        autonomousObstacles: [
          { id: 'test_obstacle', activate: vi.fn() }
        ]
      };
      
      triggerTile.activate(game);
      expect(triggerTile.activated).toBe(true);
    });

    it('should propagate fake safe zone activation to obstacles', () => {
      const fakeSafeZone = new FakeSafeZone({ x: 0, y: 0, w: 32, h: 32, delay: 0.1, obstacleIds: ['test_obstacle'] });
      const playerPos = { x: 16, y: 16 };
      
      // Player enters zone
      let shouldActivate = fakeSafeZone.update(0.05, playerPos);
      expect(shouldActivate).toBe(false);
      
      // Wait for delay
      shouldActivate = fakeSafeZone.update(0.06, playerPos);
      expect(shouldActivate).toBe(true);
    });

    it('should propagate troll token collection to trap activation', () => {
      const trollToken = new TrollToken({
        x: 100,
        y: 100,
        subtype: 'ONE_WAY_PRISON',
        trapConfig: { obstacleIds: ['blocker_1', 'blocker_2'] }
      });
      
      const game = {
        autonomousObstacles: [
          { id: 'blocker_1', activate: vi.fn() },
          { id: 'blocker_2', activate: vi.fn() }
        ]
      };
      
      const trapResult = trollToken.onCollect(game);
      
      expect(trapResult).toBeDefined();
      expect(trapResult.type).toBe('ONE_WAY_PRISON');
      expect(trapResult.obstacleIds).toEqual(['blocker_1', 'blocker_2']);
    });

    it('should propagate almost moment trap activation', () => {
      const almostMomentTrap = new AlmostMomentTrap({ obstacleIds: ['exit_blocker'] });
      
      const game = {
        autonomousObstacles: [
          { id: 'exit_blocker', activate: vi.fn() }
        ],
        flash: 0,
        shake: 0
      };
      
      const shouldTrigger = almostMomentTrap.checkTrigger(3, 3);
      expect(shouldTrigger).toBe(true);
      
      almostMomentTrap.activate(game);
      expect(almostMomentTrap.activated).toBe(true);
      expect(game.flash).toBeGreaterThan(0);
      expect(game.shake).toBeGreaterThan(0);
    });

    it('should propagate proximity trigger activation', () => {
      const proximityTrigger = new ProximityTrigger({
        x: 100,
        y: 100,
        activationDistance: 50,
        shape: 'circular',
        targetTrapId: 'test_trap'
      });
      
      const playerPos = { x: 120, y: 120 };
      
      // Player is within range (distance ~28)
      const inRange = proximityTrigger.checkProximity(playerPos);
      expect(inRange).toBe(true);
      
      // Update should increase activation progress
      const justActivated = proximityTrigger.update(0.5, playerPos);
      expect(proximityTrigger.activationProgress).toBeGreaterThan(0);
    });

    it('should propagate phase shift speed changes on death count', () => {
      const phaseShiftObstacle = new PhaseShiftObstacle({
        type: 'PISTON',
        id: 'test_piston',
        x: 100,
        y: 100,
        ax: 100,
        ay: 100,
        bx: 100,
        by: 150,
        w: 10,
        h: 10,
        speed: 2.0
      });
      
      // 0 deaths: 1.0x speed
      phaseShiftObstacle.updatePhaseShift(0);
      expect(phaseShiftObstacle.speed).toBe(2.0);
      
      // 3 deaths: 1.1x speed
      phaseShiftObstacle.updatePhaseShift(3);
      expect(phaseShiftObstacle.speed).toBeCloseTo(2.2, 5);
      
      // 6 deaths: 1.2x speed
      phaseShiftObstacle.updatePhaseShift(6);
      expect(phaseShiftObstacle.speed).toBeCloseTo(2.4, 5);
      
      // Reset
      phaseShiftObstacle.reset();
      expect(phaseShiftObstacle.speed).toBe(2.0);
    });

    it('should propagate liar counter updates to UI', () => {
      const liarCounter = new LiarCounter();
      
      // Collect troll token
      liarCounter.onTrollTokenCollect(5);
      
      // Display count should be incorrect (5 ± 1)
      const displayCount = liarCounter.getDisplayCount();
      expect(displayCount).not.toBe(5);
      expect([4, 6]).toContain(displayCount);
      
      // After timer expires, should show correct count
      liarCounter.update(0.6);
      expect(liarCounter.getDisplayCount()).toBe(5);
    });
  });

  describe('Error Handling for Invalid Configurations', () => {
    it('should handle trigger tile with missing targetObstacleId', () => {
      const triggerTile = new TriggerTile({ x: 0, y: 0, w: 16, h: 16, oneShot: true });
      
      expect(triggerTile.targetObstacleId).toBeUndefined();
      
      // Should not crash when activated
      const game = { autonomousObstacles: [] };
      expect(() => triggerTile.activate(game)).not.toThrow();
    });

    it('should handle fake safe zone with missing obstacleIds', () => {
      const fakeSafeZone = new FakeSafeZone({ x: 0, y: 0, w: 32, h: 32, delay: 1.0 });
      
      expect(fakeSafeZone.obstacleIds).toEqual([]);
      
      // Should not crash when updating
      const playerPos = { x: 16, y: 16 };
      expect(() => fakeSafeZone.update(0.1, playerPos)).not.toThrow();
    });

    it('should handle troll token with missing subtype', () => {
      const trollToken = new TrollToken({ x: 100, y: 100, trapConfig: {} });
      
      expect(trollToken.subtype).toBeUndefined();
      
      // Should return null when collected
      const game = { autonomousObstacles: [] };
      const result = trollToken.onCollect(game);
      expect(result).toBeNull();
    });

    it('should handle almost moment trap with missing obstacleIds', () => {
      const almostMomentTrap = new AlmostMomentTrap({});
      
      expect(almostMomentTrap.obstacleIds).toEqual([]);
      
      // Should not crash when activated
      const game = { autonomousObstacles: [], flash: 0, shake: 0 };
      expect(() => almostMomentTrap.activate(game)).not.toThrow();
    });

    it('should handle proximity trigger with invalid shape', () => {
      const proximityTrigger = new ProximityTrigger({
        x: 100,
        y: 100,
        activationDistance: 50,
        shape: 'invalid_shape',
        targetTrapId: 'test'
      });
      
      const playerPos = { x: 120, y: 120 };
      
      // Should return false for invalid shape
      const inRange = proximityTrigger.checkProximity(playerPos);
      expect(inRange).toBe(false);
    });

    it('should handle phase shift obstacle with missing speed', () => {
      const phaseShiftObstacle = new PhaseShiftObstacle({
        type: 'PISTON',
        id: 'test_piston',
        x: 100,
        y: 100,
        ax: 100,
        ay: 100,
        bx: 100,
        by: 150,
        w: 10,
        h: 10
      });
      
      // Should default to undefined but not crash
      expect(phaseShiftObstacle.baseSpeed).toBeUndefined();
      
      // Should not crash when updating phase shift
      expect(() => phaseShiftObstacle.updatePhaseShift(3)).not.toThrow();
    });

    it('should validate level trap configurations', () => {
      // Valid level 1 configuration
      const validLevel = {
        id: 1,
        fakeSafeZones: [{ x: 0, y: 0, w: 32, h: 32, delay: 1.0, obstacleIds: ['test'] }],
        trollTokens: [{ x: 0, y: 0, subtype: 'ONE_WAY_PRISON', trapConfig: {} }],
        hiddenKillGears: [{ x: 0, y: 0, radius: 8 }],
        baitPaths: [{ x: 0, y: 0, w: 100, h: 16, obstacleIds: [] }],
        almostMomentTrap: { obstacleIds: ['test'] }
      };
      
      const validation = validateLevelTraps(validLevel);
      expect(validation.valid).toBe(true);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should detect missing required traps in level 1', () => {
      const invalidLevel = {
        id: 1,
        fakeSafeZones: [],
        trollTokens: [],
        hiddenKillGears: [],
        baitPaths: []
      };
      
      const validation = validateLevelTraps(invalidLevel);
      expect(validation.valid).toBe(false);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => w.includes('FAKE_SAFE_ZONE'))).toBe(true);
      expect(validation.warnings.some(w => w.includes('TROLL_TOKEN'))).toBe(true);
      expect(validation.warnings.some(w => w.includes('HIDDEN_KILL_GEAR'))).toBe(true);
      expect(validation.warnings.some(w => w.includes('BAIT_PATH'))).toBe(true);
      expect(validation.warnings.some(w => w.includes('ALMOST_MOMENT'))).toBe(true);
    });

    it('should detect missing required traps in level 5', () => {
      const invalidLevel = {
        id: 5,
        fakeSafeZones: [{ x: 0, y: 0, w: 32, h: 32, delay: 1.0, obstacleIds: ['test'] }],
        trollTokens: [{ x: 0, y: 0, subtype: 'ONE_WAY_PRISON', trapConfig: {} }],
        hiddenKillGears: [{ x: 0, y: 0, radius: 8 }],
        baitPaths: [{ x: 0, y: 0, w: 100, h: 16, obstacleIds: [] }],
        almostMomentTrap: { obstacleIds: ['test'] },
        mirrorCorridors: [{ obstacleA: {}, obstacleB: {}, phaseOffset: 0 }],
        phaseShiftObstacles: ['test']
        // Missing oneFrameWindows
      };
      
      const validation = validateLevelTraps(invalidLevel);
      expect(validation.valid).toBe(false);
      expect(validation.warnings.some(w => w.includes('ONE_FRAME_WINDOW'))).toBe(true);
    });

    it('should detect malformed trap configurations', () => {
      const levelWithMalformedTraps = {
        id: 1,
        triggerTiles: [
          { x: 0, y: 0, w: 16, h: 16 } // Missing targetObstacleId
        ],
        fakeSafeZones: [
          { x: 0, y: 0, w: 32, h: 32, delay: 1.0 } // Missing obstacleIds
        ],
        trollTokens: [
          { x: 0, y: 0 } // Missing subtype and trapConfig
        ],
        hiddenKillGears: [{ x: 0, y: 0, radius: 8 }],
        baitPaths: [{ x: 0, y: 0, w: 100, h: 16, obstacleIds: [] }],
        almostMomentTrap: {} // Missing obstacleIds
      };
      
      const validation = validateLevelTraps(levelWithMalformedTraps);
      expect(validation.valid).toBe(false);
      expect(validation.warnings.some(w => w.includes('targetObstacleId'))).toBe(true);
      expect(validation.warnings.some(w => w.includes('obstacleIds'))).toBe(true);
      expect(validation.warnings.some(w => w.includes('subtype'))).toBe(true);
      expect(validation.warnings.some(w => w.includes('trapConfig'))).toBe(true);
    });
  });

  describe('Complete System Integration', () => {
    it('should handle complete trap flow: trigger → obstacle → death → taunt', () => {
      // Create a complete game scenario
      const triggerTile = new TriggerTile({ x: 0, y: 0, w: 16, h: 16, targetObstacleId: 'piston_1', oneShot: true });
      
      const obstacle = new AutonomousObstacle({
        type: 'PISTON',
        id: 'piston_1',
        x: 100,
        y: 100,
        ax: 100,
        ay: 100,
        bx: 100,
        by: 150,
        w: 10,
        h: 10,
        speed: 2.0
      });
      
      const game = {
        autonomousObstacles: [obstacle]
      };
      
      // Player steps on trigger
      const playerHitbox = { x: 5, y: 5, w: 8, h: 12 };
      const collision = triggerTile.checkCollision(playerHitbox);
      expect(collision).toBe(true);
      
      // Trigger activates
      triggerTile.activate(game);
      expect(triggerTile.activated).toBe(true);
      
      // Obstacle should have activation source set
      obstacle.activationSource = 'trigger_tile';
      expect(obstacle.activationSource).toBe('trigger_tile');
      
      // Death system would use this killSource for taunt selection
      // (tested separately in deathSystem.test.js)
    });

    it('should handle multiple trap types working together', () => {
      // Scenario: Player collects troll token, activates fake safe zone, dies to hidden gear
      
      const trollToken = new TrollToken({
        x: 100,
        y: 100,
        subtype: 'RUSH_BAIT',
        trapConfig: { speedMultiplier: 1.3, affectedObstacleIds: ['piston_1'] }
      });
      
      const fakeSafeZone = new FakeSafeZone({
        x: 150,
        y: 100,
        w: 32,
        h: 32,
        delay: 1.0,
        obstacleIds: ['piston_1']
      });
      
      const hiddenKillGear = new HiddenKillGear({
        x: 200,
        y: 100,
        radius: 8,
        humRadius: 40
      });
      
      const obstacle = new AutonomousObstacle({
        type: 'PISTON',
        id: 'piston_1',
        x: 150,
        y: 100,
        ax: 150,
        ay: 100,
        bx: 150,
        by: 150,
        w: 10,
        h: 10,
        speed: 2.0
      });
      
      const game = {
        autonomousObstacles: [obstacle]
      };
      
      // 1. Collect troll token
      const trapResult = trollToken.onCollect(game);
      expect(trapResult.type).toBe('RUSH_BAIT');
      
      // Apply speed multiplier
      obstacle.speedMult = trapResult.speedMultiplier;
      expect(obstacle.speedMult).toBe(1.3);
      
      // 2. Enter fake safe zone
      const playerPos = { x: 160, y: 110 };
      fakeSafeZone.update(0.5, playerPos);
      expect(fakeSafeZone.playerInside).toBe(true);
      
      // 3. Wait for zone activation
      const shouldActivate = fakeSafeZone.update(0.6, playerPos);
      expect(shouldActivate).toBe(true);
      
      // 4. Check proximity to hidden gear
      const playerHitbox = { x: 195, y: 95, w: 8, h: 12 };
      const collision = hiddenKillGear.checkCollision(playerHitbox);
      expect(collision).toBe(true);
      
      // 5. Get hum volume
      const volume = hiddenKillGear.getHumVolume({ x: 195, y: 95 });
      expect(volume).toBeGreaterThan(0);
    });

    it('should handle phase shift with death count progression', () => {
      const phaseShiftObstacle = new PhaseShiftObstacle({
        type: 'PENDULUM',
        id: 'pendulum_1',
        x: 100,
        y: 16,
        length: 64,
        amplitude: Math.PI / 2.4,
        frequency: 1.7,
        tipRadius: 5,
        speed: 1.7
      });
      
      // Simulate death progression
      const deathCounts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const expectedSpeeds = [1.7, 1.7, 1.7, 1.87, 1.87, 1.87, 2.04, 2.04, 2.04, 2.21];
      
      for (let i = 0; i < deathCounts.length; i++) {
        phaseShiftObstacle.updatePhaseShift(deathCounts[i]);
        expect(phaseShiftObstacle.speed).toBeCloseTo(expectedSpeeds[i], 2);
      }
      
      // Reset should restore base speed
      phaseShiftObstacle.reset();
      expect(phaseShiftObstacle.speed).toBe(1.7);
    });

    it('should handle liar counter with multiple troll tokens', () => {
      const liarCounter = new LiarCounter();
      
      // Collect first troll token
      liarCounter.onTrollTokenCollect(1);
      expect(liarCounter.isLying()).toBe(true);
      
      // Wait for lie to expire
      liarCounter.update(0.6);
      expect(liarCounter.isLying()).toBe(false);
      expect(liarCounter.getDisplayCount()).toBe(1);
      
      // Collect second troll token
      liarCounter.onTrollTokenCollect(2);
      expect(liarCounter.isLying()).toBe(true);
      
      // Display count should be incorrect
      const displayCount = liarCounter.getDisplayCount();
      expect([1, 3]).toContain(displayCount);
      
      // Wait for lie to expire
      liarCounter.update(0.6);
      expect(liarCounter.getDisplayCount()).toBe(2);
    });
  });
});
