/**
 * Integration Tests for AlmostMoment Trap
 * Feature: troll-level-redesign
 * 
 * Tests the complete integration of AlmostMomentTrap with the game system:
 * - Token collection triggers trap
 * - Obstacles are activated
 * - Audio and visual feedback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlmostMomentTrap } from './trapSystem.js';
import * as audio from './audio.js';

describe('AlmostMoment Trap Integration', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('should activate trap when all tokens are collected', () => {
    // Setup: Create trap with obstacle IDs
    const trap = new AlmostMomentTrap({
      obstacleIds: ['exit_blocker_1', 'exit_blocker_2'],
    });

    // Mock obstacles with activate methods
    const obstacle1 = {
      id: 'exit_blocker_1',
      activate: vi.fn(),
      x: 100,
      y: 100,
    };

    const obstacle2 = {
      id: 'exit_blocker_2',
      activate: vi.fn(),
      x: 150,
      y: 100,
    };

    // Mock game state
    const game = {
      autonomousObstacles: [obstacle1, obstacle2],
      gearTokens: [
        { x: 50, y: 50, collected: true },
        { x: 100, y: 50, collected: true },
      ],
      trollTokens: [
        { x: 150, y: 50, collected: true },
      ],
      gearsCollected: 3,
      flash: 0,
      shake: 0,
    };

    // Spy on audio function
    const audioSpy = vi.spyOn(audio, 'playFakeExitBuzz');

    // Check if trap should trigger
    const totalGears = game.gearTokens.length + game.trollTokens.length;
    const shouldTrigger = trap.checkTrigger(game.gearsCollected, totalGears);
    expect(shouldTrigger).toBe(true);

    // Activate trap
    trap.activate(game);

    // Verify obstacles were activated
    expect(obstacle1.activate).toHaveBeenCalledTimes(1);
    expect(obstacle2.activate).toHaveBeenCalledTimes(1);

    // Verify audio was played
    expect(audioSpy).toHaveBeenCalledTimes(1);

    // Verify visual feedback
    expect(game.flash).toBeGreaterThan(0);
    expect(game.shake).toBeGreaterThan(0);

    // Verify trap is marked as activated
    expect(trap.activated).toBe(true);

    audioSpy.mockRestore();
  });

  it('should not activate trap when not all tokens are collected', () => {
    const trap = new AlmostMomentTrap({
      obstacleIds: ['exit_blocker_1'],
    });

    const obstacle = {
      id: 'exit_blocker_1',
      activate: vi.fn(),
    };

    const game = {
      autonomousObstacles: [obstacle],
      gearTokens: [
        { x: 50, y: 50, collected: true },
        { x: 100, y: 50, collected: false }, // Not collected
      ],
      trollTokens: [],
      gearsCollected: 1,
      flash: 0,
      shake: 0,
    };

    // Check if trap should trigger
    const totalGears = game.gearTokens.length + game.trollTokens.length;
    const shouldTrigger = trap.checkTrigger(game.gearsCollected, totalGears);
    expect(shouldTrigger).toBe(false);

    // Trap should not be activated
    expect(trap.activated).toBe(false);
    expect(obstacle.activate).not.toHaveBeenCalled();
  });

  it('should handle token collection flow correctly', () => {
    const trap = new AlmostMomentTrap({
      obstacleIds: ['exit_blocker'],
    });

    const obstacle = {
      id: 'exit_blocker',
      activate: vi.fn(),
    };

    const game = {
      autonomousObstacles: [obstacle],
      gearTokens: [
        { x: 50, y: 50, collected: false },
        { x: 100, y: 50, collected: false },
      ],
      trollTokens: [],
      gearsCollected: 0,
      flash: 0,
      shake: 0,
    };

    const totalGears = game.gearTokens.length + game.trollTokens.length;

    // Collect first token
    game.gearTokens[0].collected = true;
    game.gearsCollected = 1;

    // Check trap - should not trigger yet
    let shouldTrigger = trap.checkTrigger(game.gearsCollected, totalGears);
    expect(shouldTrigger).toBe(false);

    // Collect second token
    game.gearTokens[1].collected = true;
    game.gearsCollected = 2;

    // Check trap - should trigger now
    shouldTrigger = trap.checkTrigger(game.gearsCollected, totalGears);
    expect(shouldTrigger).toBe(true);

    // Activate trap
    trap.activate(game);

    // Verify obstacle was activated
    expect(obstacle.activate).toHaveBeenCalledTimes(1);
    expect(trap.activated).toBe(true);
  });

  it('should work with both regular and troll tokens', () => {
    const trap = new AlmostMomentTrap({
      obstacleIds: ['exit_blocker'],
    });

    const obstacle = {
      id: 'exit_blocker',
      activate: vi.fn(),
    };

    const game = {
      autonomousObstacles: [obstacle],
      gearTokens: [
        { x: 50, y: 50, collected: true },
      ],
      trollTokens: [
        { x: 100, y: 50, collected: true },
        { x: 150, y: 50, collected: true },
      ],
      gearsCollected: 3,
      flash: 0,
      shake: 0,
    };

    const totalGears = game.gearTokens.length + game.trollTokens.length;

    // All tokens collected (1 regular + 2 troll = 3 total)
    const shouldTrigger = trap.checkTrigger(game.gearsCollected, totalGears);
    expect(shouldTrigger).toBe(true);

    trap.activate(game);
    expect(obstacle.activate).toHaveBeenCalledTimes(1);
  });

  it('should handle level with no almostMomentTrap gracefully', () => {
    // Simulate game state where almostMomentTrap is null
    const game = {
      almostMomentTrap: null,
      gearTokens: [{ x: 50, y: 50, collected: true }],
      trollTokens: [],
      gearsCollected: 1,
    };

    // This should not throw an error
    expect(() => {
      if (game.almostMomentTrap && !game.almostMomentTrap.activated) {
        const totalGears = game.gearTokens.length + game.trollTokens.length;
        if (game.almostMomentTrap.checkTrigger(game.gearsCollected, totalGears)) {
          game.almostMomentTrap.activate(game);
        }
      }
    }).not.toThrow();
  });

  it('should reset trap state correctly', () => {
    const trap = new AlmostMomentTrap({
      obstacleIds: ['exit_blocker'],
    });

    const obstacle = {
      id: 'exit_blocker',
      activate: vi.fn(),
    };

    const game = {
      autonomousObstacles: [obstacle],
      flash: 0,
      shake: 0,
    };

    // Activate trap
    trap.activate(game);
    expect(trap.activated).toBe(true);
    expect(obstacle.activate).toHaveBeenCalledTimes(1);

    // Reset trap
    trap.reset();
    expect(trap.activated).toBe(false);

    // Should be able to activate again after reset
    trap.activate(game);
    expect(trap.activated).toBe(true);
    expect(obstacle.activate).toHaveBeenCalledTimes(2);
  });

  it('should provide visual and audio feedback on activation', () => {
    const trap = new AlmostMomentTrap({
      obstacleIds: [],
    });

    const game = {
      autonomousObstacles: [],
      flash: 0,
      shake: 0,
    };

    const audioSpy = vi.spyOn(audio, 'playFakeExitBuzz');

    trap.activate(game);

    // Verify visual feedback
    expect(game.flash).toBe(0.5);
    expect(game.shake).toBe(10);

    // Verify audio feedback
    expect(audioSpy).toHaveBeenCalledTimes(1);

    audioSpy.mockRestore();
  });

  it('should handle multiple obstacles with mixed activate support', () => {
    const trap = new AlmostMomentTrap({
      obstacleIds: ['obs1', 'obs2', 'obs3', 'obs4'],
    });

    const obs1 = { id: 'obs1', activate: vi.fn() };
    const obs2 = { id: 'obs2' }; // No activate method
    const obs3 = { id: 'obs3', activate: vi.fn() };
    // obs4 doesn't exist in the array

    const game = {
      autonomousObstacles: [obs1, obs2, obs3],
      flash: 0,
      shake: 0,
    };

    // Should not throw error
    expect(() => trap.activate(game)).not.toThrow();

    // Only obstacles with activate method should be called
    expect(obs1.activate).toHaveBeenCalledTimes(1);
    expect(obs3.activate).toHaveBeenCalledTimes(1);

    expect(trap.activated).toBe(true);
  });
});
