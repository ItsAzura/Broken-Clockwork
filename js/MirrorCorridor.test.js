/*
 * MirrorCorridor.test.js
 * Property-based tests for MirrorCorridor component
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { MirrorCorridor } from './trapSystem.js';

describe('MirrorCorridor', () => {
  /**
   * Feature: troll-level-redesign, Property 12: Mirror Corridor Symmetry
   * 
   * For any mirror corridor configuration, the two obstacles SHALL have 
   * symmetrical positions relative to the corridor center line.
   * 
   * Validates: Requirements 9.1
   */
  describe('Property 12: Mirror Corridor Symmetry', () => {
    it('should create symmetrical ORBIT_SPHERE obstacles across vertical axis', () => {
      fc.assert(
        fc.property(
          fc.record({
            centerLine: fc.integer({ min: 100, max: 400 }),
            cy: fc.integer({ min: 50, max: 150 }),
            offset: fc.integer({ min: 10, max: 100 }),
            orbitRadius: fc.integer({ min: 20, max: 50 }),
            orbitSpeed: fc.float({ min: 1.0, max: 3.0 }),
            phaseOffset: fc.float({ min: 0, max: Math.fround(2 * Math.PI) }),
          }),
          ({ centerLine, cy, offset, orbitRadius, orbitSpeed, phaseOffset }) => {
            // Create mirror corridor with orbit spheres
            const corridor = new MirrorCorridor({
              obstacleA: {
                type: 'ORBIT_SPHERE',
                cx: centerLine - offset,
                cy: cy,
                orbitRadius: orbitRadius,
                orbitSpeed: orbitSpeed,
                sphereR: 3,
                startAngle: 0,
              },
              obstacleB: {
                type: 'ORBIT_SPHERE',
                cx: centerLine + offset, // Will be mirrored
                cy: cy,
                orbitRadius: orbitRadius,
                orbitSpeed: orbitSpeed,
                sphereR: 3,
                startAngle: 0,
              },
              centerLine: centerLine,
              symmetryAxis: 'vertical',
              phaseOffset: phaseOffset,
            });

            const { obstacleA, obstacleB } = corridor.createObstacles();

            // Verify symmetry: both obstacles should be equidistant from center line
            const distanceA = Math.abs(obstacleA.cx - centerLine);
            const distanceB = Math.abs(obstacleB.cx - centerLine);
            
            expect(Math.abs(distanceA - distanceB)).toBeLessThan(0.01);
            
            // Verify same y-coordinate (horizontal symmetry)
            expect(Math.abs(obstacleA.cy - obstacleB.cy)).toBeLessThan(0.01);
            
            // Verify same orbit radius
            expect(obstacleA.orbitRadius).toBe(obstacleB.orbitRadius);
            
            // Verify symmetry using built-in method
            expect(corridor.verifySymmetry(obstacleA, obstacleB)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create symmetrical PENDULUM obstacles across vertical axis', () => {
      fc.assert(
        fc.property(
          fc.record({
            centerLine: fc.integer({ min: 100, max: 400 }),
            y: fc.integer({ min: 16, max: 50 }),
            offset: fc.integer({ min: 30, max: 100 }),
            length: fc.integer({ min: 50, max: 100 }),
            amplitude: fc.float({ min: Math.fround(Math.PI / 4), max: Math.fround(Math.PI / 2) }),
            frequency: fc.float({ min: 1.0, max: 3.0 }),
            phaseOffset: fc.float({ min: 0, max: Math.fround(2 * Math.PI) }),
          }),
          ({ centerLine, y, offset, length, amplitude, frequency, phaseOffset }) => {
            const corridor = new MirrorCorridor({
              obstacleA: {
                type: 'PENDULUM',
                x: centerLine - offset,
                y: y,
                length: length,
                amplitude: amplitude,
                frequency: frequency,
                tipRadius: 5,
              },
              obstacleB: {
                type: 'PENDULUM',
                x: centerLine + offset, // Will be mirrored
                y: y,
                length: length,
                amplitude: amplitude,
                frequency: frequency,
                tipRadius: 5,
              },
              centerLine: centerLine,
              symmetryAxis: 'vertical',
              phaseOffset: phaseOffset,
            });

            const { obstacleA, obstacleB } = corridor.createObstacles();

            // Verify symmetry
            const distanceA = Math.abs(obstacleA.x - centerLine);
            const distanceB = Math.abs(obstacleB.x - centerLine);
            
            expect(Math.abs(distanceA - distanceB)).toBeLessThan(0.01);
            expect(Math.abs(obstacleA.y - obstacleB.y)).toBeLessThan(0.01);
            expect(obstacleA.length).toBe(obstacleB.length);
            expect(obstacleA.amplitude).toBe(obstacleB.amplitude);
            expect(corridor.verifySymmetry(obstacleA, obstacleB)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create symmetrical PISTON obstacles across vertical axis', () => {
      fc.assert(
        fc.property(
          fc.record({
            centerLine: fc.integer({ min: 100, max: 400 }),
            ay: fc.integer({ min: 30, max: 50 }),
            by: fc.integer({ min: 70, max: 100 }),
            offset: fc.integer({ min: 20, max: 80 }),
            w: fc.integer({ min: 8, max: 12 }),
            h: fc.integer({ min: 8, max: 12 }),
            speed: fc.float({ min: 2.0, max: 4.0 }),
            phaseOffset: fc.float({ min: 0, max: Math.fround(2 * Math.PI) }),
          }),
          ({ centerLine, ay, by, offset, w, h, speed, phaseOffset }) => {
            const corridor = new MirrorCorridor({
              obstacleA: {
                type: 'PISTON',
                ax: centerLine - offset,
                ay: ay,
                bx: centerLine - offset,
                by: by,
                w: w,
                h: h,
                speed: speed,
              },
              obstacleB: {
                type: 'PISTON',
                ax: centerLine + offset, // Will be mirrored
                ay: ay,
                bx: centerLine + offset,
                by: by,
                w: w,
                h: h,
                speed: speed,
              },
              centerLine: centerLine,
              symmetryAxis: 'vertical',
              phaseOffset: phaseOffset,
            });

            const { obstacleA, obstacleB } = corridor.createObstacles();

            // Verify symmetry
            const distanceAax = Math.abs(obstacleA.ax - centerLine);
            const distanceBax = Math.abs(obstacleB.ax - centerLine);
            const distanceAbx = Math.abs(obstacleA.bx - centerLine);
            const distanceBbx = Math.abs(obstacleB.bx - centerLine);
            
            expect(Math.abs(distanceAax - distanceBax)).toBeLessThan(0.01);
            expect(Math.abs(distanceAbx - distanceBbx)).toBeLessThan(0.01);
            expect(Math.abs(obstacleA.ay - obstacleB.ay)).toBeLessThan(0.01);
            expect(Math.abs(obstacleA.by - obstacleB.by)).toBeLessThan(0.01);
            expect(obstacleA.w).toBe(obstacleB.w);
            expect(obstacleA.h).toBe(obstacleB.h);
            expect(corridor.verifySymmetry(obstacleA, obstacleB)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create symmetrical obstacles across horizontal axis', () => {
      fc.assert(
        fc.property(
          fc.record({
            centerLine: fc.integer({ min: 50, max: 150 }),
            cx: fc.integer({ min: 100, max: 300 }),
            offset: fc.integer({ min: 10, max: 50 }),
            orbitRadius: fc.integer({ min: 20, max: 40 }),
            orbitSpeed: fc.float({ min: 1.0, max: 3.0 }),
          }),
          ({ centerLine, cx, offset, orbitRadius, orbitSpeed }) => {
            const corridor = new MirrorCorridor({
              obstacleA: {
                type: 'ORBIT_SPHERE',
                cx: cx,
                cy: centerLine - offset,
                orbitRadius: orbitRadius,
                orbitSpeed: orbitSpeed,
                sphereR: 3,
                startAngle: 0,
              },
              obstacleB: {
                type: 'ORBIT_SPHERE',
                cx: cx,
                cy: centerLine + offset, // Will be mirrored
                orbitRadius: orbitRadius,
                orbitSpeed: orbitSpeed,
                sphereR: 3,
                startAngle: 0,
              },
              centerLine: centerLine,
              symmetryAxis: 'horizontal',
              phaseOffset: Math.PI / 3,
            });

            const { obstacleA, obstacleB } = corridor.createObstacles();

            // Verify horizontal symmetry
            const distanceA = Math.abs(obstacleA.cy - centerLine);
            const distanceB = Math.abs(obstacleB.cy - centerLine);
            
            expect(Math.abs(distanceA - distanceB)).toBeLessThan(0.01);
            expect(Math.abs(obstacleA.cx - obstacleB.cx)).toBeLessThan(0.01);
            expect(corridor.verifySymmetry(obstacleA, obstacleB)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: troll-level-redesign, Property 13: Mirror Corridor Phase Offset
   * 
   * For any mirror corridor with configured phase offset, the second obstacle's 
   * timing SHALL differ from the first by exactly the specified offset.
   * 
   * Validates: Requirements 9.2
   */
  describe('Property 13: Mirror Corridor Phase Offset', () => {
    it('should apply phase offset to ORBIT_SPHERE startAngle', () => {
      fc.assert(
        fc.property(
          fc.record({
            centerLine: fc.integer({ min: 100, max: 400 }),
            cy: fc.integer({ min: 50, max: 150 }),
            offset: fc.integer({ min: 10, max: 100 }),
            orbitRadius: fc.integer({ min: 20, max: 50 }),
            orbitSpeed: fc.float({ min: 1.0, max: 3.0 }),
            phaseOffset: fc.float({ min: 0, max: Math.fround(2 * Math.PI), noNaN: true }),
            startAngleA: fc.float({ min: 0, max: Math.fround(2 * Math.PI), noNaN: true }),
          }),
          ({ centerLine, cy, offset, orbitRadius, orbitSpeed, phaseOffset, startAngleA }) => {
            const corridor = new MirrorCorridor({
              obstacleA: {
                type: 'ORBIT_SPHERE',
                cx: centerLine - offset,
                cy: cy,
                orbitRadius: orbitRadius,
                orbitSpeed: orbitSpeed,
                sphereR: 3,
                startAngle: startAngleA,
              },
              obstacleB: {
                type: 'ORBIT_SPHERE',
                cx: centerLine + offset,
                cy: cy,
                orbitRadius: orbitRadius,
                orbitSpeed: orbitSpeed,
                sphereR: 3,
                startAngle: startAngleA, // Will have phase offset applied
              },
              centerLine: centerLine,
              symmetryAxis: 'vertical',
              phaseOffset: phaseOffset,
            });

            const { obstacleA, obstacleB } = corridor.createObstacles();

            // Calculate expected phase offset
            const expectedAngleB = startAngleA + phaseOffset;
            
            // Normalize angles to [0, 2π) for comparison
            const normalizeAngle = (angle) => {
              let normalized = angle % (2 * Math.PI);
              if (normalized < 0) normalized += 2 * Math.PI;
              return normalized;
            };
            
            const actualAngleB = normalizeAngle(obstacleB.startAngle);
            const expectedNormalized = normalizeAngle(expectedAngleB);
            
            // Allow small floating point error
            const angleDiff = Math.abs(actualAngleB - expectedNormalized);
            const wrappedDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
            
            expect(wrappedDiff).toBeLessThan(0.01);
            
            // Verify using built-in method
            const calculatedOffset = corridor.calculatePhaseOffset(obstacleA, obstacleB);
            const normalizedCalculated = normalizeAngle(calculatedOffset);
            const normalizedExpected = normalizeAngle(phaseOffset);
            const offsetDiff = Math.abs(normalizedCalculated - normalizedExpected);
            const wrappedOffsetDiff = Math.min(offsetDiff, 2 * Math.PI - offsetDiff);
            
            expect(wrappedOffsetDiff).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should apply phase offset to PENDULUM timing', () => {
      fc.assert(
        fc.property(
          fc.record({
            centerLine: fc.integer({ min: 100, max: 400 }),
            y: fc.integer({ min: 16, max: 50 }),
            offset: fc.integer({ min: 30, max: 100 }),
            length: fc.integer({ min: 50, max: 100 }),
            amplitude: fc.float({ min: Math.fround(Math.PI / 4), max: Math.fround(Math.PI / 2), noNaN: true }),
            frequency: fc.float({ min: 1.0, max: 3.0, noNaN: true }),
            phaseOffset: fc.float({ min: 0, max: Math.fround(2 * Math.PI), noNaN: true }),
          }),
          ({ centerLine, y, offset, length, amplitude, frequency, phaseOffset }) => {
            const corridor = new MirrorCorridor({
              obstacleA: {
                type: 'PENDULUM',
                x: centerLine - offset,
                y: y,
                length: length,
                amplitude: amplitude,
                frequency: frequency,
                tipRadius: 5,
                initialTime: 0,
              },
              obstacleB: {
                type: 'PENDULUM',
                x: centerLine + offset,
                y: y,
                length: length,
                amplitude: amplitude,
                frequency: frequency,
                tipRadius: 5,
                initialTime: 0,
              },
              centerLine: centerLine,
              symmetryAxis: 'vertical',
              phaseOffset: phaseOffset,
            });

            const { obstacleA, obstacleB } = corridor.createObstacles();

            // Phase offset should be applied as time offset
            const expectedTimeOffset = phaseOffset / frequency;
            const actualTimeOffset = (obstacleB.initialTime || 0) - (obstacleA.initialTime || 0);
            
            expect(Math.abs(actualTimeOffset - expectedTimeOffset)).toBeLessThan(0.01);
            
            // Verify using built-in method
            const calculatedOffset = corridor.calculatePhaseOffset(obstacleA, obstacleB);
            expect(Math.abs(calculatedOffset - phaseOffset)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should apply phase offset to PISTON timing', () => {
      fc.assert(
        fc.property(
          fc.record({
            centerLine: fc.integer({ min: 100, max: 400 }),
            ay: fc.integer({ min: 30, max: 50 }),
            by: fc.integer({ min: 70, max: 100 }),
            offset: fc.integer({ min: 20, max: 80 }),
            w: fc.integer({ min: 8, max: 12 }),
            h: fc.integer({ min: 8, max: 12 }),
            speed: fc.float({ min: 2.0, max: 4.0, noNaN: true }),
            phaseOffset: fc.float({ min: 0, max: Math.fround(2 * Math.PI), noNaN: true }),
          }),
          ({ centerLine, ay, by, offset, w, h, speed, phaseOffset }) => {
            const corridor = new MirrorCorridor({
              obstacleA: {
                type: 'PISTON',
                ax: centerLine - offset,
                ay: ay,
                bx: centerLine - offset,
                by: by,
                w: w,
                h: h,
                speed: speed,
                initialTime: 0,
              },
              obstacleB: {
                type: 'PISTON',
                ax: centerLine + offset,
                ay: ay,
                bx: centerLine + offset,
                by: by,
                w: w,
                h: h,
                speed: speed,
                initialTime: 0,
              },
              centerLine: centerLine,
              symmetryAxis: 'vertical',
              phaseOffset: phaseOffset,
            });

            const { obstacleA, obstacleB } = corridor.createObstacles();

            // Phase offset should be applied as time offset
            const expectedTimeOffset = phaseOffset / speed;
            const actualTimeOffset = (obstacleB.initialTime || 0) - (obstacleA.initialTime || 0);
            
            expect(Math.abs(actualTimeOffset - expectedTimeOffset)).toBeLessThan(0.01);
            
            // Verify using built-in method
            const calculatedOffset = corridor.calculatePhaseOffset(obstacleA, obstacleB);
            expect(Math.abs(calculatedOffset - phaseOffset)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve phase offset across different obstacle types', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: Math.fround(2 * Math.PI), noNaN: true }),
          (phaseOffset) => {
            // Test with orbit spheres
            const orbitCorridor = new MirrorCorridor({
              obstacleA: {
                type: 'ORBIT_SPHERE',
                cx: 100,
                cy: 88,
                orbitRadius: 30,
                orbitSpeed: 2.0,
                sphereR: 3,
                startAngle: 0,
              },
              obstacleB: {
                type: 'ORBIT_SPHERE',
                cx: 200,
                cy: 88,
                orbitRadius: 30,
                orbitSpeed: 2.0,
                sphereR: 3,
                startAngle: 0,
              },
              phaseOffset: phaseOffset,
            });

            const orbitResult = orbitCorridor.createObstacles();
            const orbitCalculated = orbitCorridor.calculatePhaseOffset(
              orbitResult.obstacleA,
              orbitResult.obstacleB
            );

            // Normalize to [0, 2π)
            const normalizeAngle = (angle) => {
              let normalized = angle % (2 * Math.PI);
              if (normalized < 0) normalized += 2 * Math.PI;
              return normalized;
            };

            const normalizedCalculated = normalizeAngle(orbitCalculated);
            const normalizedExpected = normalizeAngle(phaseOffset);
            const diff = Math.abs(normalizedCalculated - normalizedExpected);
            const wrappedDiff = Math.min(diff, 2 * Math.PI - diff);

            expect(wrappedDiff).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
