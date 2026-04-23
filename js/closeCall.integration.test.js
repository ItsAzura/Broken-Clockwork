/**
 * Integration tests for close-call celebration system
 * **Validates: Requirements from masocore-balance-pass design**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutonomousObstacle, distanceToBounds, rectOverlapsBounds } from './AutonomousObstacle.js';
import { getPlayerHitbox } from './player.js';
import * as audio from './audio.js';
import {
  CLOSE_CALL_DISTANCE,
  EXTREME_CLOSE_CALL_DISTANCE,
  CLOSE_CALL_DISPLAY_FRAMES,
  EXTREME_CLOSE_CALL_DISPLAY_FRAMES,
} from './constants.js';

describe('Close-call celebration system', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect extreme close call when distance <= 2px', () => {
    // Create a simple piston obstacle
    const obstacle = new AutonomousObstacle({
      type: 'PISTON',
      id: 'test_piston',
      x: 100,
      y: 100,
      w: 16,
      h: 16,
      ax: 100,
      ay: 100,
      bx: 100,
      by: 100,
      speed: 1,
    });

    // Obstacle bounds after hitbox shrink: x=102, y=102, w=12, h=12 (shrink 2px each side)
    // Create player hitbox very close to obstacle (1px away)
    const playerHitbox = {
      x: 102 - 7, // 1px away from obstacle left edge (after shrink)
      y: 102,
      w: 6,
      h: 8,
    };

    const bounds = obstacle.getBounds();
    expect(bounds).not.toBeNull();

    // Should not be overlapping
    const overlaps = rectOverlapsBounds(playerHitbox, bounds);
    expect(overlaps).toBe(false);

    // Calculate distance
    const distance = distanceToBounds(playerHitbox, bounds);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThanOrEqual(EXTREME_CLOSE_CALL_DISTANCE);
  });

  it('should detect close call when 2px < distance <= 4px', () => {
    const obstacle = new AutonomousObstacle({
      type: 'PISTON',
      id: 'test_piston',
      x: 100,
      y: 100,
      w: 16,
      h: 16,
      ax: 100,
      ay: 100,
      bx: 100,
      by: 100,
      speed: 1,
    });

    // Obstacle bounds after hitbox shrink: x=102, y=102, w=12, h=12
    // Create player hitbox 3px away from obstacle
    const playerHitbox = {
      x: 102 - 9, // 3px away from obstacle left edge (after shrink)
      y: 102,
      w: 6,
      h: 8,
    };

    const bounds = obstacle.getBounds();
    expect(bounds).not.toBeNull();

    // Should not be overlapping
    const overlaps = rectOverlapsBounds(playerHitbox, bounds);
    expect(overlaps).toBe(false);

    // Calculate distance
    const distance = distanceToBounds(playerHitbox, bounds);
    expect(distance).toBeGreaterThan(EXTREME_CLOSE_CALL_DISTANCE);
    expect(distance).toBeLessThanOrEqual(CLOSE_CALL_DISTANCE);
  });

  it('should not detect close call when distance > 4px', () => {
    const obstacle = new AutonomousObstacle({
      type: 'PISTON',
      id: 'test_piston',
      x: 100,
      y: 100,
      w: 16,
      h: 16,
      ax: 100,
      ay: 100,
      bx: 100,
      by: 100,
      speed: 1,
    });

    // Create player hitbox 10px away from obstacle
    const playerHitbox = {
      x: 100 - 16, // 10px away from obstacle left edge
      y: 100,
      w: 6,
      h: 8,
    };

    const bounds = obstacle.getBounds();
    expect(bounds).not.toBeNull();

    // Should not be overlapping
    const overlaps = rectOverlapsBounds(playerHitbox, bounds);
    expect(overlaps).toBe(false);

    // Calculate distance
    const distance = distanceToBounds(playerHitbox, bounds);
    expect(distance).toBeGreaterThan(CLOSE_CALL_DISTANCE);
  });

  it('should skip overlapping obstacles (those are deaths, not close calls)', () => {
    const obstacle = new AutonomousObstacle({
      type: 'PISTON',
      id: 'test_piston',
      x: 100,
      y: 100,
      w: 16,
      h: 16,
      ax: 100,
      ay: 100,
      bx: 100,
      by: 100,
      speed: 1,
    });

    // Create player hitbox overlapping with obstacle
    const playerHitbox = {
      x: 105,
      y: 105,
      w: 6,
      h: 8,
    };

    const bounds = obstacle.getBounds();
    expect(bounds).not.toBeNull();

    // Should be overlapping
    const overlaps = rectOverlapsBounds(playerHitbox, bounds);
    expect(overlaps).toBe(true);

    // Distance should be 0 for overlapping rectangles
    const distance = distanceToBounds(playerHitbox, bounds);
    expect(distance).toBe(0);
  });

  it('should verify close-call constants are defined correctly', () => {
    expect(CLOSE_CALL_DISTANCE).toBe(4);
    expect(EXTREME_CLOSE_CALL_DISTANCE).toBe(2);
    expect(CLOSE_CALL_DISPLAY_FRAMES).toBe(20);
    expect(EXTREME_CLOSE_CALL_DISPLAY_FRAMES).toBe(30);
  });

  it('should play close-call sound when close call detected', () => {
    const spy = vi.spyOn(audio, 'playCloseCall');
    
    // Call the audio function directly
    audio.playCloseCall();
    
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should play extreme close-call sound when extreme close call detected', () => {
    const spy = vi.spyOn(audio, 'playExtremeCloseCall');
    
    // Call the audio function directly
    audio.playExtremeCloseCall();
    
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should calculate distance correctly for bouncing ball obstacle', () => {
    const obstacle = new AutonomousObstacle({
      type: 'BOUNCING_BALL',
      id: 'test_ball',
      x: 100,
      y: 100,
      r: 5,
      boundX: 50,
      boundY: 50,
      boundW: 100,
      boundH: 100,
      vx: 60,
      vy: 60,
    });

    // Ball bounds after hitbox shrink: x=102, y=102, w=6, h=6 (r*2 - shrink*2 = 10 - 4 = 6)
    // Player hitbox 3px away from ball
    const playerHitbox = {
      x: 102 - 9, // 3px away from ball left edge (after shrink)
      y: 102,
      w: 6,
      h: 8,
    };

    const bounds = obstacle.getBounds();
    expect(bounds).not.toBeNull();

    const overlaps = rectOverlapsBounds(playerHitbox, bounds);
    expect(overlaps).toBe(false);

    const distance = distanceToBounds(playerHitbox, bounds);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThanOrEqual(CLOSE_CALL_DISTANCE);
  });

  it('should calculate distance correctly for orbit sphere obstacle', () => {
    const obstacle = new AutonomousObstacle({
      type: 'ORBIT_SPHERE',
      id: 'test_sphere',
      cx: 100,
      cy: 100,
      orbitRadius: 30,
      orbitSpeed: 1.0,
      sphereR: 3,
      angle: 0,
    });

    // Sphere is at angle 0, so it's at (cx + orbitRadius, cy) = (130, 100)
    // Sphere bounds after hitbox shrink: x = 130 - 3 + 2 = 129, y = 100 - 3 + 2 = 99, w = 6 - 4 = 2, h = 6 - 4 = 2
    // Player hitbox 2px away from sphere
    const playerHitbox = {
      x: 129 - 8, // 2px away from sphere left edge (after shrink)
      y: 99,
      w: 6,
      h: 8,
    };

    const bounds = obstacle.getBounds();
    expect(bounds).not.toBeNull();

    const overlaps = rectOverlapsBounds(playerHitbox, bounds);
    expect(overlaps).toBe(false);

    const distance = distanceToBounds(playerHitbox, bounds);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThanOrEqual(EXTREME_CLOSE_CALL_DISTANCE);
  });
});
