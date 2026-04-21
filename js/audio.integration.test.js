/**
 * Integration Tests for Audio System with Trap Events
 * Feature: troll-level-redesign
 * 
 * These tests verify that audio functions are called correctly
 * when trap events occur.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AutonomousObstacle } from './AutonomousObstacle.js';
import { TriggerTile, AlmostMomentTrap, HiddenKillGear } from './trapSystem.js';
import * as audio from './audio.js';

describe('Audio Integration Tests', () => {
  let audioSpies;

  beforeEach(() => {
    // Mock all audio functions
    audioSpies = {
      playPistonClunk: vi.spyOn(audio, 'playPistonClunk').mockImplementation(() => {}),
      playTriggerActivate: vi.spyOn(audio, 'playTriggerActivate').mockImplementation(() => {}),
      playFakeExitBuzz: vi.spyOn(audio, 'playFakeExitBuzz').mockImplementation(() => {}),
      setHumVolume: vi.spyOn(audio, 'setHumVolume').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    // Restore all mocks
    Object.values(audioSpies).forEach(spy => spy.mockRestore());
  });

  describe('Piston Clunk Audio', () => {
    it('should call playPistonClunk when piston changes direction', () => {
      const piston = new AutonomousObstacle({
        type: 'PISTON',
        ax: 0,
        ay: 0,
        bx: 100,
        by: 0,
        w: 10,
        h: 10,
        speed: 2,
      });

      // Initialize piston
      piston._wasNear = true;
      piston.update(0.01);

      // Update piston through a full cycle to trigger direction change
      // A full cycle is 2π / speed seconds
      const fullCycle = (2 * Math.PI) / piston.speed;
      const halfCycle = fullCycle / 2;

      // Clear any initial calls
      audioSpies.playPistonClunk.mockClear();

      // Update to half cycle (should trigger direction change)
      piston.update(halfCycle);

      // Verify playPistonClunk was called
      expect(audioSpies.playPistonClunk).toHaveBeenCalled();
    });

    it('should not call playPistonClunk on first update', () => {
      const piston = new AutonomousObstacle({
        type: 'PISTON',
        ax: 0,
        ay: 0,
        bx: 100,
        by: 0,
        w: 10,
        h: 10,
        speed: 2,
      });

      // First update should not trigger sound (no previous state)
      piston.update(0.01);

      expect(audioSpies.playPistonClunk).not.toHaveBeenCalled();
    });

    it('should call playPistonClunk multiple times during multiple direction changes', () => {
      const piston = new AutonomousObstacle({
        type: 'PISTON',
        ax: 0,
        ay: 0,
        bx: 100,
        by: 0,
        w: 10,
        h: 10,
        speed: 2,
      });

      // Initialize
      piston._wasNear = true;
      piston.update(0.01);
      audioSpies.playPistonClunk.mockClear();

      const fullCycle = (2 * Math.PI) / piston.speed;
      const halfCycle = fullCycle / 2;

      // First direction change
      piston.update(halfCycle);
      expect(audioSpies.playPistonClunk).toHaveBeenCalledTimes(1);

      // Second direction change
      piston.update(halfCycle);
      expect(audioSpies.playPistonClunk).toHaveBeenCalledTimes(2);
    });
  });

  describe('Trigger Activate Audio', () => {
    it('should call playTriggerActivate when trigger is activated', () => {
      const trigger = new TriggerTile({
        x: 100,
        y: 100,
        w: 20,
        h: 20,
        targetObstacleId: 'obstacle1',
        oneShot: false,
      });

      const mockGame = {
        autonomousObstacles: [],
      };

      trigger.activate(mockGame);

      expect(audioSpies.playTriggerActivate).toHaveBeenCalledTimes(1);
    });

    it('should call playTriggerActivate only once for one-shot triggers', () => {
      const trigger = new TriggerTile({
        x: 100,
        y: 100,
        w: 20,
        h: 20,
        targetObstacleId: 'obstacle1',
        oneShot: true,
      });

      const mockGame = {
        autonomousObstacles: [],
      };

      // First activation
      trigger.activate(mockGame);
      expect(audioSpies.playTriggerActivate).toHaveBeenCalledTimes(1);

      // Second activation should not trigger sound
      trigger.activate(mockGame);
      expect(audioSpies.playTriggerActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fake Exit Buzz Audio', () => {
    it('should call playFakeExitBuzz when almost moment trap activates', () => {
      const trap = new AlmostMomentTrap({
        obstacleIds: ['obstacle1', 'obstacle2'],
      });

      const mockGame = {
        autonomousObstacles: [
          { id: 'obstacle1', activate: vi.fn() },
          { id: 'obstacle2', activate: vi.fn() },
        ],
        flash: 0,
        shake: 0,
      };

      trap.activate(mockGame);

      expect(audioSpies.playFakeExitBuzz).toHaveBeenCalledTimes(1);
    });

    it('should not call playFakeExitBuzz if trap already activated', () => {
      const trap = new AlmostMomentTrap({
        obstacleIds: ['obstacle1'],
      });

      const mockGame = {
        autonomousObstacles: [
          { id: 'obstacle1', activate: vi.fn() },
        ],
        flash: 0,
        shake: 0,
      };

      // First activation
      trap.activate(mockGame);
      expect(audioSpies.playFakeExitBuzz).toHaveBeenCalledTimes(1);

      // Second activation should not trigger sound
      trap.activate(mockGame);
      expect(audioSpies.playFakeExitBuzz).toHaveBeenCalledTimes(1);
    });
  });

  describe('Hidden Gear Hum Audio', () => {
    it('should calculate correct volume based on distance', () => {
      const gear = new HiddenKillGear({
        x: 100,
        y: 100,
        radius: 8,
        humRadius: 40,
      });

      // Test at various distances
      const testCases = [
        { playerPos: { x: 100, y: 100 }, expectedVolume: 1.0 }, // At gear position
        { playerPos: { x: 120, y: 100 }, expectedVolume: 0.5 }, // 20 units away (half of humRadius)
        { playerPos: { x: 140, y: 100 }, expectedVolume: 0.0 }, // At humRadius boundary
        { playerPos: { x: 150, y: 100 }, expectedVolume: 0.0 }, // Beyond humRadius
      ];

      for (const testCase of testCases) {
        const volume = gear.getHumVolume(testCase.playerPos);
        expect(volume).toBeCloseTo(testCase.expectedVolume, 2);
      }
    });

    it('should return 0 volume when player is beyond humRadius', () => {
      const gear = new HiddenKillGear({
        x: 100,
        y: 100,
        radius: 8,
        humRadius: 40,
      });

      const playerPos = { x: 200, y: 100 }; // 100 units away
      const volume = gear.getHumVolume(playerPos);

      expect(volume).toBe(0);
    });

    it('should return maximum volume when player is at gear position', () => {
      const gear = new HiddenKillGear({
        x: 100,
        y: 100,
        radius: 8,
        humRadius: 40,
      });

      const playerPos = { x: 100, y: 100 };
      const volume = gear.getHumVolume(playerPos);

      expect(volume).toBe(1.0);
    });

    it('should calculate volume using Euclidean distance', () => {
      const gear = new HiddenKillGear({
        x: 100,
        y: 100,
        radius: 8,
        humRadius: 40,
      });

      // Player at diagonal position (30, 40) from gear
      // Distance = sqrt(30^2 + 40^2) = 50
      const playerPos = { x: 130, y: 140 };
      const volume = gear.getHumVolume(playerPos);

      // Volume should be 0 since distance (50) > humRadius (40)
      expect(volume).toBe(0);
    });

    it('should handle volume calculation with different humRadius values', () => {
      const gear1 = new HiddenKillGear({
        x: 100,
        y: 100,
        radius: 8,
        humRadius: 20,
      });

      const gear2 = new HiddenKillGear({
        x: 100,
        y: 100,
        radius: 8,
        humRadius: 60,
      });

      const playerPos = { x: 120, y: 100 }; // 20 units away

      const volume1 = gear1.getHumVolume(playerPos);
      const volume2 = gear2.getHumVolume(playerPos);

      // gear1: distance (20) = humRadius (20), so volume = 0
      expect(volume1).toBeCloseTo(0, 2);

      // gear2: distance (20) < humRadius (60), so volume = 1 - 20/60 = 0.667
      expect(volume2).toBeCloseTo(0.667, 2);
    });
  });

  describe('Audio Integration with Mocked Context', () => {
    it('should handle audio calls when audio context is unavailable', () => {
      // All audio functions should fail gracefully when mocked
      // This is already handled by our beforeEach mock setup

      const trigger = new TriggerTile({
        x: 100,
        y: 100,
        w: 20,
        h: 20,
        targetObstacleId: 'obstacle1',
      });

      const mockGame = { autonomousObstacles: [] };

      // Should not throw error even if audio context is unavailable
      expect(() => trigger.activate(mockGame)).not.toThrow();
      expect(audioSpies.playTriggerActivate).toHaveBeenCalled();
    });

    it('should handle volume parameter correctly for hidden gear hum', () => {
      const gear = new HiddenKillGear({
        x: 100,
        y: 100,
        radius: 8,
        humRadius: 40,
      });

      const playerPos = { x: 110, y: 100 }; // 10 units away
      const volume = gear.getHumVolume(playerPos);

      // Volume should be 1 - 10/40 = 0.75
      expect(volume).toBeCloseTo(0.75, 2);

      // Verify volume is in valid range [0, 1]
      expect(volume).toBeGreaterThanOrEqual(0);
      expect(volume).toBeLessThanOrEqual(1);
    });
  });
});
