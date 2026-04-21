/**
 * Integration Tests for BaitPath Level Loading
 * Feature: troll-level-redesign
 * 
 * Tests that BaitPath components are correctly loaded and validated
 * during level initialization.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaitPath } from './trapSystem.js';
import { getLevel } from './levels.js';

describe('BaitPath Level Integration', () => {
  it('should load bait paths from level data', () => {
    // Create mock level data with bait paths
    const mockLevelData = {
      id: 1,
      name: 'TEST LEVEL',
      baitPaths: [
        {
          x: 100,
          y: 100,
          w: 50,
          h: 50,
          obstacleIds: ['obs1', 'obs2', 'obs3'],
          narrowPathObstacleIds: ['obs4', 'obs5'],
        },
        {
          x: 200,
          y: 200,
          w: 60,
          h: 40,
          obstacleIds: ['obs6', 'obs7', 'obs8', 'obs9'],
          narrowPathObstacleIds: ['obs10'],
        },
      ],
    };

    // Simulate level loading
    const baitPaths = (mockLevelData.baitPaths || []).map(b => new BaitPath(b));

    // Verify bait paths are loaded
    expect(baitPaths).toHaveLength(2);
    
    // Verify first bait path
    expect(baitPaths[0].x).toBe(100);
    expect(baitPaths[0].y).toBe(100);
    expect(baitPaths[0].w).toBe(50);
    expect(baitPaths[0].h).toBe(50);
    expect(baitPaths[0].obstacleIds).toHaveLength(3);
    expect(baitPaths[0].narrowPathObstacleIds).toHaveLength(2);
    
    // Verify second bait path
    expect(baitPaths[1].x).toBe(200);
    expect(baitPaths[1].y).toBe(200);
    expect(baitPaths[1].w).toBe(60);
    expect(baitPaths[1].h).toBe(40);
    expect(baitPaths[1].obstacleIds).toHaveLength(4);
    expect(baitPaths[1].narrowPathObstacleIds).toHaveLength(1);
  });

  it('should validate obstacle density during level load', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Valid configuration
    const validBaitPath = new BaitPath({
      x: 100,
      y: 100,
      w: 50,
      h: 50,
      obstacleIds: ['obs1', 'obs2', 'obs3'],
      narrowPathObstacleIds: ['obs4'],
    });

    expect(warnSpy).not.toHaveBeenCalled();

    // Invalid configuration
    const invalidBaitPath = new BaitPath({
      x: 200,
      y: 200,
      w: 50,
      h: 50,
      obstacleIds: ['obs1'],
      narrowPathObstacleIds: ['obs2', 'obs3'],
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('BaitPath validation failed')
    );

    warnSpy.mockRestore();
  });

  it('should handle missing baitPaths array in level data', () => {
    const mockLevelData = {
      id: 1,
      name: 'TEST LEVEL',
      // No baitPaths property
    };

    // Simulate level loading with fallback
    const baitPaths = (mockLevelData.baitPaths || []).map(b => new BaitPath(b));

    // Should create empty array
    expect(baitPaths).toHaveLength(0);
  });

  it('should handle empty baitPaths array in level data', () => {
    const mockLevelData = {
      id: 1,
      name: 'TEST LEVEL',
      baitPaths: [],
    };

    // Simulate level loading
    const baitPaths = (mockLevelData.baitPaths || []).map(b => new BaitPath(b));

    // Should create empty array
    expect(baitPaths).toHaveLength(0);
  });

  it('should verify all existing levels have baitPaths property', () => {
    // Get all levels from levels.js
    for (let i = 0; i < 5; i++) {
      const level = getLevel(i);
      
      // Verify baitPaths property exists (even if empty)
      expect(level).toHaveProperty('baitPaths');
      expect(Array.isArray(level.baitPaths)).toBe(true);
    }
  });

  it('should correctly detect player position in bait path', () => {
    const baitPath = new BaitPath({
      x: 100,
      y: 100,
      w: 50,
      h: 50,
      obstacleIds: ['obs1', 'obs2'],
      narrowPathObstacleIds: ['obs3'],
    });

    // Player inside bait path
    expect(baitPath.isPlayerInPath({ x: 120, y: 120 })).toBe(true);
    expect(baitPath.isPlayerInPath({ x: 100, y: 100 })).toBe(true);
    expect(baitPath.isPlayerInPath({ x: 150, y: 150 })).toBe(true);

    // Player outside bait path
    expect(baitPath.isPlayerInPath({ x: 50, y: 50 })).toBe(false);
    expect(baitPath.isPlayerInPath({ x: 200, y: 200 })).toBe(false);
    expect(baitPath.isPlayerInPath({ x: 151, y: 120 })).toBe(false);
  });
});
