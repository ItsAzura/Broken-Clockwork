/*
 * level2.integration.test.js
 * Integration tests for Level 2: THE CAROUSEL
 * Tests mirror corridor trap integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LEVELS } from './levels.js';
import { MirrorCorridor } from './trapSystem.js';

describe('Level 2: THE CAROUSEL - Mirror Corridor Integration', () => {
  let level2;
  let mirrorCorridor;

  beforeEach(() => {
    level2 = LEVELS[1]; // Level 2 is at index 1
    expect(level2.id).toBe(2);
    expect(level2.name).toBe('THE CAROUSEL');
    
    // Get mirror corridor configuration
    expect(level2.mirrorCorridors).toBeDefined();
    expect(level2.mirrorCorridors.length).toBeGreaterThan(0);
    
    const corridorConfig = level2.mirrorCorridors[0];
    mirrorCorridor = new MirrorCorridor(corridorConfig);
  });

  /**
   * Test symmetrical obstacle positioning
   * Validates: Requirements 14.6 (Mirror Corridor)
   */
  it('should create symmetrical orbit sphere obstacles', () => {
    const { obstacleA, obstacleB } = mirrorCorridor.createObstacles();

    // Both should be ORBIT_SPHERE type
    expect(obstacleA.type).toBe('ORBIT_SPHERE');
    expect(obstacleB.type).toBe('ORBIT_SPHERE');

    // Verify symmetry across vertical axis
    const centerLine = mirrorCorridor.centerLine;
    expect(centerLine).toBeDefined();

    const distanceA = Math.abs(obstacleA.cx - centerLine);
    const distanceB = Math.abs(obstacleB.cx - centerLine);

    // Both obstacles should be equidistant from center line
    expect(Math.abs(distanceA - distanceB)).toBeLessThan(1);

    // Both should have same y-coordinate (horizontal symmetry)
    expect(obstacleA.cy).toBe(obstacleB.cy);

    // Both should have same orbit radius for visual symmetry
    expect(obstacleA.orbitRadius).toBe(obstacleB.orbitRadius);

    // Both should have same sphere radius
    expect(obstacleA.sphereR).toBe(obstacleB.sphereR);

    // Verify using built-in symmetry check
    expect(mirrorCorridor.verifySymmetry(obstacleA, obstacleB)).toBe(true);
  });

  /**
   * Test phase offset timing
   * Validates: Requirements 14.6 (Mirror Corridor phase offset)
   */
  it('should apply phase offset to mirror corridor obstacles', () => {
    const { obstacleA, obstacleB } = mirrorCorridor.createObstacles();

    // Get expected phase offset from configuration
    const expectedPhaseOffset = mirrorCorridor.phaseOffset;
    expect(expectedPhaseOffset).toBeDefined();

    // For orbit spheres, phase offset is applied to startAngle
    const angleA = obstacleA.startAngle || 0;
    const angleB = obstacleB.startAngle || 0;

    // Calculate actual phase difference
    let phaseDiff = angleB - angleA;
    
    // Normalize to [0, 2π)
    while (phaseDiff < 0) phaseDiff += 2 * Math.PI;
    while (phaseDiff >= 2 * Math.PI) phaseDiff -= 2 * Math.PI;

    // Allow small floating point error
    const tolerance = 0.01;
    expect(Math.abs(phaseDiff - expectedPhaseOffset)).toBeLessThan(tolerance);

    // Verify using built-in phase offset calculation
    const calculatedOffset = mirrorCorridor.calculatePhaseOffset(obstacleA, obstacleB);
    
    // Normalize calculated offset
    let normalizedCalculated = calculatedOffset % (2 * Math.PI);
    if (normalizedCalculated < 0) normalizedCalculated += 2 * Math.PI;
    
    let normalizedExpected = expectedPhaseOffset % (2 * Math.PI);
    if (normalizedExpected < 0) normalizedExpected += 2 * Math.PI;
    
    const offsetDiff = Math.abs(normalizedCalculated - normalizedExpected);
    const wrappedDiff = Math.min(offsetDiff, 2 * Math.PI - offsetDiff);
    
    expect(wrappedDiff).toBeLessThan(tolerance);
  });

  /**
   * Test that mirror corridor obstacles match level configuration
   * Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
   */
  it('should match orbit sphere positions in level configuration', () => {
    // Find the orbit spheres in level configuration
    const orbitLeft = level2.autonomousObstacles.find(obs => obs.id === 'orbit_left');
    const orbitRight = level2.autonomousObstacles.find(obs => obs.id === 'orbit_right');

    expect(orbitLeft).toBeDefined();
    expect(orbitRight).toBeDefined();

    // Verify they match the mirror corridor configuration
    const corridorConfig = level2.mirrorCorridors[0];
    
    expect(corridorConfig.obstacleA.cx).toBe(orbitLeft.cx);
    expect(corridorConfig.obstacleA.cy).toBe(orbitLeft.cy);
    expect(corridorConfig.obstacleB.cx).toBe(orbitRight.cx);
    expect(corridorConfig.obstacleB.cy).toBe(orbitRight.cy);

    // Verify phase offset is π/3
    expect(corridorConfig.phaseOffset).toBeCloseTo(Math.PI / 3, 2);
  });

  /**
   * Test that Level 2 contains all required trap types
   * Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
   */
  it('should contain all required trap types from Level 1 plus mirror corridor', () => {
    // FAKE_SAFE_ZONE (Requirement 14.1)
    expect(level2.fakeSafeZones).toBeDefined();
    expect(level2.fakeSafeZones.length).toBeGreaterThan(0);

    // TROLL_TOKEN (Requirement 14.2)
    expect(level2.trollTokens).toBeDefined();
    expect(level2.trollTokens.length).toBeGreaterThan(0);

    // HIDDEN_KILL_GEAR (Requirement 14.3)
    expect(level2.hiddenKillGears).toBeDefined();
    expect(level2.hiddenKillGears.length).toBeGreaterThan(0);

    // BAIT_PATH (Requirement 14.4)
    expect(level2.baitPaths).toBeDefined();
    expect(level2.baitPaths.length).toBeGreaterThan(0);

    // ALMOST_MOMENT (Requirement 14.5)
    expect(level2.almostMomentTrap).toBeDefined();
    expect(level2.almostMomentTrap).not.toBeNull();

    // MIRROR_CORRIDOR (Requirement 14.6)
    expect(level2.mirrorCorridors).toBeDefined();
    expect(level2.mirrorCorridors.length).toBeGreaterThan(0);
  });

  /**
   * Test fake safe zone configuration
   * Validates: Requirement 14.1
   */
  it('should have fake safe zone at center area', () => {
    const fakeSafeZone = level2.fakeSafeZones[0];
    
    expect(fakeSafeZone.x).toBe(240);
    expect(fakeSafeZone.y).toBe(88);
    expect(fakeSafeZone.w).toBe(40);
    expect(fakeSafeZone.h).toBe(40);
    expect(fakeSafeZone.delay).toBe(2.0);
    expect(fakeSafeZone.obstacleIds).toContain('orbit_center');
  });

  /**
   * Test troll token configuration
   * Validates: Requirement 14.2
   */
  it('should have ONE_WAY_PRISON troll token', () => {
    const trollToken = level2.trollTokens[0];
    
    expect(trollToken.x).toBe(128);
    expect(trollToken.y).toBe(84);
    expect(trollToken.subtype).toBe('ONE_WAY_PRISON');
    expect(trollToken.trapConfig.obstacleIds).toContain('orbit_left');
  });

  /**
   * Test hidden kill gear configuration
   * Validates: Requirement 14.3
   */
  it('should have hidden kill gear among decorative gears', () => {
    expect(level2.hiddenKillGears.length).toBe(3);
    
    // Find the lethal gear
    const lethalGear = level2.hiddenKillGears.find(gear => gear.isLethal);
    expect(lethalGear).toBeDefined();
    expect(lethalGear.x).toBe(180);
    expect(lethalGear.y).toBe(60);
    
    // Verify there are safe decorative gears
    const safeGears = level2.hiddenKillGears.filter(gear => !gear.isLethal);
    expect(safeGears.length).toBe(2);
  });

  /**
   * Test bait path configuration
   * Validates: Requirement 14.4
   */
  it('should have bait path with more obstacles on wide path', () => {
    const baitPath = level2.baitPaths[0];
    
    expect(baitPath.widePath).toBeDefined();
    expect(baitPath.narrowPath).toBeDefined();
    
    // Wide path should have more obstacles than narrow path
    const widePathObstacles = baitPath.widePath.obstacleIds.length;
    const narrowPathObstacles = baitPath.narrowPath.obstacleIds.length;
    
    expect(widePathObstacles).toBeGreaterThan(narrowPathObstacles);
  });

  /**
   * Test almost moment trap configuration
   * Validates: Requirement 14.5
   */
  it('should have almost moment trap that activates exit blocker', () => {
    const almostMoment = level2.almostMomentTrap;
    
    expect(almostMoment.obstacleIds).toContain('exit_blocker');
    expect(almostMoment.triggerOnFinalToken).toBe(true);
    
    // Verify exit blocker exists and is initially inactive
    const exitBlocker = level2.autonomousObstacles.find(obs => obs.id === 'exit_blocker');
    expect(exitBlocker).toBeDefined();
    expect(exitBlocker.initiallyActive).toBe(false);
  });
});
