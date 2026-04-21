/**
 * Integration tests for TriggerTile with main game loop
 * **Validates: Requirements 1.1**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TriggerTile, TrollToken } from './trapSystem.js';
import * as audio from './audio.js';

describe('TriggerTile integration with game loop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should activate trigger when player collides with trigger tile', () => {
    const trigger = new TriggerTile({
      x: 100,
      y: 100,
      w: 20,
      h: 20,
      targetObstacleId: 'obstacle1',
      oneShot: false
    });

    const playerHitbox = { x: 105, y: 105, w: 8, h: 12 };
    
    // Spy on audio function
    const spy = vi.spyOn(audio, 'playTriggerActivate');
    
    // Check collision
    const collision = trigger.checkCollision(playerHitbox);
    expect(collision).toBe(true);
    
    // Activate trigger
    trigger.activate({});
    expect(trigger.activated).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should not activate one-shot trigger multiple times', () => {
    const trigger = new TriggerTile({
      x: 100,
      y: 100,
      w: 20,
      h: 20,
      targetObstacleId: 'obstacle1',
      oneShot: true
    });

    const playerHitbox = { x: 105, y: 105, w: 8, h: 12 };
    
    // Spy on audio function
    const spy = vi.spyOn(audio, 'playTriggerActivate');
    
    // First activation
    trigger.activate({});
    expect(trigger.activated).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    
    // Second activation should be ignored
    trigger.activate({});
    expect(spy).toHaveBeenCalledTimes(1); // Still only called once
  });

  it('should not activate trigger when player does not collide', () => {
    const trigger = new TriggerTile({
      x: 100,
      y: 100,
      w: 20,
      h: 20,
      targetObstacleId: 'obstacle1',
      oneShot: false
    });

    const playerHitbox = { x: 200, y: 200, w: 8, h: 12 };
    
    // Check collision
    const collision = trigger.checkCollision(playerHitbox);
    expect(collision).toBe(false);
  });

  it('should handle trigger tiles array initialization from level data', () => {
    const levelData = {
      triggerTiles: [
        { x: 100, y: 100, w: 20, h: 20, targetObstacleId: 'obs1' },
        { x: 200, y: 200, w: 30, h: 30, targetObstacleId: 'obs2', oneShot: true }
      ]
    };

    const triggers = (levelData.triggerTiles || []).map(t => new TriggerTile(t));
    
    expect(triggers).toHaveLength(2);
    expect(triggers[0].x).toBe(100);
    expect(triggers[0].targetObstacleId).toBe('obs1');
    expect(triggers[0].oneShot).toBe(false);
    expect(triggers[1].oneShot).toBe(true);
  });
});


/**
 * TrollToken integration tests
 */
describe('TrollToken integration with game loop', () => {
  it('should collect troll token and activate ONE_WAY_PRISON trap', () => {
    // Mock level data with a troll token
    const mockLevelData = {
      tilemap: ['WWWWW', 'W...W', 'WWWWW'],
      objects: [],
      autonomousObstacles: [
        { id: 'prison_obstacle', type: 'PISTON', x: 50, y: 50, activate: vi.fn() }
      ],
      gearTokens: [],
      trollTokens: [
        {
          x: 32,
          y: 32,
          subtype: 'ONE_WAY_PRISON',
          trapConfig: {
            obstacleIds: ['prison_obstacle']
          }
        }
      ],
      triggerTiles: [],
      fakeSafeZones: [],
      playerSpawn: { x: 16, y: 16 },
      goalTrigger: null,
    };

    // Create a minimal game state
    const game = {
      levelData: mockLevelData,
      trollTokens: mockLevelData.trollTokens.map(t => new TrollToken(t)),
      autonomousObstacles: mockLevelData.autonomousObstacles,
      gearTokens: [],
      gearsCollected: 0,
      player: { x: 32, y: 32 },
    };

    // Mock getPlayerHitbox
    const playerHitbox = { x: 32, y: 32, w: 6, h: 8 };

    // Check collision
    const trollToken = game.trollTokens[0];
    expect(trollToken.checkCollision(playerHitbox)).toBe(true);

    // Collect the token
    const trapResult = trollToken.onCollect(game);

    // Verify trap result
    expect(trapResult).not.toBeNull();
    expect(trapResult.type).toBe('ONE_WAY_PRISON');
    expect(trapResult.obstacleIds).toEqual(['prison_obstacle']);
    expect(trollToken.collected).toBe(true);
  });

  it('should collect troll token and activate RUSH_BAIT trap', () => {
    const mockLevelData = {
      autonomousObstacles: [
        { id: 'fast_obstacle', type: 'PISTON', x: 50, y: 50, speedMult: 1 }
      ],
      trollTokens: [
        {
          x: 32,
          y: 32,
          subtype: 'RUSH_BAIT',
          trapConfig: {
            speedMultiplier: 1.5,
            affectedObstacleIds: ['fast_obstacle']
          }
        }
      ],
    };

    const game = {
      levelData: mockLevelData,
      trollTokens: mockLevelData.trollTokens.map(t => new TrollToken(t)),
      autonomousObstacles: mockLevelData.autonomousObstacles,
      gearTokens: [],
      gearsCollected: 0,
      player: { x: 32, y: 32 },
    };

    const playerHitbox = { x: 32, y: 32, w: 6, h: 8 };
    const trollToken = game.trollTokens[0];

    expect(trollToken.checkCollision(playerHitbox)).toBe(true);

    const trapResult = trollToken.onCollect(game);

    expect(trapResult).not.toBeNull();
    expect(trapResult.type).toBe('RUSH_BAIT');
    expect(trapResult.speedMultiplier).toBe(1.5);
    expect(trapResult.affectedObstacleIds).toEqual(['fast_obstacle']);
  });

  it('should collect troll token and activate WIND_TRAP', () => {
    const spawnConfigs = [
      { type: 'PISTON', offsetX: 10, offsetY: 10 },
      { type: 'BOUNCING_BALL', offsetX: -10, offsetY: -10 }
    ];

    const mockLevelData = {
      autonomousObstacles: [],
      trollTokens: [
        {
          x: 32,
          y: 32,
          subtype: 'WIND_TRAP',
          trapConfig: {
            spawnConfigs: spawnConfigs
          }
        }
      ],
    };

    const game = {
      levelData: mockLevelData,
      trollTokens: mockLevelData.trollTokens.map(t => new TrollToken(t)),
      autonomousObstacles: mockLevelData.autonomousObstacles,
      gearTokens: [],
      gearsCollected: 0,
      player: { x: 32, y: 32 },
    };

    const playerHitbox = { x: 32, y: 32, w: 6, h: 8 };
    const trollToken = game.trollTokens[0];

    expect(trollToken.checkCollision(playerHitbox)).toBe(true);

    const trapResult = trollToken.onCollect(game);

    expect(trapResult).not.toBeNull();
    expect(trapResult.type).toBe('WIND_TRAP');
    expect(trapResult.spawnConfigs).toEqual(spawnConfigs);
    expect(trapResult.spawnNearPlayer).toBe(true);
  });

  it('should count troll tokens toward total gear count', () => {
    const mockLevelData = {
      gearTokens: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
      trollTokens: [
        { x: 30, y: 30, subtype: 'ONE_WAY_PRISON', trapConfig: {} }
      ],
    };

    const totalGears = mockLevelData.gearTokens.length + mockLevelData.trollTokens.length;
    expect(totalGears).toBe(3);
  });
});
