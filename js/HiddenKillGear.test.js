/**
 * Property-Based Tests for HiddenKillGear Component
 * Feature: troll-level-redesign
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { HiddenKillGear } from './trapSystem.js';

/**
 * Property 5: Hidden Kill Gear Collision and Death
 * **Validates: Requirements 4.1**
 * 
 * For any hidden kill gear position and player hitbox, collision SHALL
 * trigger death with killSource "hidden_gear" when hitboxes overlap.
 */
describe('Feature: troll-level-redesign, Property 5: Hidden Kill Gear Collision and Death', () => {
  it('should detect collision when player hitbox overlaps with gear', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary hidden kill gear configuration
        fc.record({
          x: fc.integer({ min: -500, max: 500 }),
          y: fc.integer({ min: -500, max: 500 }),
          radius: fc.integer({ min: 4, max: 20 }),
        }),
        // Generate arbitrary player hitbox
        fc.record({
          x: fc.integer({ min: -500, max: 500 }),
          y: fc.integer({ min: -500, max: 500 }),
          w: fc.integer({ min: 4, max: 12 }),
          h: fc.integer({ min: 6, max: 16 }),
        }),
        (gearConfig, playerHitbox) => {
          // Create hidden kill gear
          const gear = new HiddenKillGear(gearConfig);
          
          // Check collision using the implementation
          const actualCollision = gear.checkCollision(playerHitbox);
          
          // Calculate expected collision using circle-rectangle collision
          const gearCenterX = gearConfig.x;
          const gearCenterY = gearConfig.y;
          const playerCenterX = playerHitbox.x + playerHitbox.w / 2;
          const playerCenterY = playerHitbox.y + playerHitbox.h / 2;
          
          const dx = playerCenterX - gearCenterX;
          const dy = playerCenterY - gearCenterY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          const playerRadius = Math.min(playerHitbox.w, playerHitbox.h) / 2;
          const expectedCollision = distance < gearConfig.radius + playerRadius;
          
          // Property: collision detection returns true if and only if hitboxes overlap
          return actualCollision === expectedCollision;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should always be lethal', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 500 }),
          y: fc.integer({ min: 0, max: 500 }),
          radius: fc.integer({ min: 4, max: 20 }),
        }),
        (config) => {
          const gear = new HiddenKillGear(config);
          
          // Property: hidden kill gears are always lethal
          return gear.isLethal === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use default radius when not specified', () => {
    const gear = new HiddenKillGear({ x: 100, y: 100 });
    
    expect(gear.radius).toBe(8);
    expect(gear.isLethal).toBe(true);
  });

  it('should use configured radius when specified', () => {
    const gear = new HiddenKillGear({ x: 100, y: 100, radius: 12 });
    
    expect(gear.radius).toBe(12);
  });
});

/**
 * Property 6: Distance-Based Volume Calculation
 * **Validates: Requirements 4.4**
 * 
 * For any distance between player and hidden kill gear, the hum volume
 * SHALL be calculated as max(0, 1 - distance / humRadius).
 */
describe('Feature: troll-level-redesign, Property 6: Distance-Based Volume Calculation', () => {
  it('should calculate volume as max(0, 1 - distance / humRadius)', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary hidden kill gear configuration
        fc.record({
          x: fc.integer({ min: -500, max: 500 }),
          y: fc.integer({ min: -500, max: 500 }),
          humRadius: fc.integer({ min: 10, max: 100 }),
        }),
        // Generate arbitrary player position
        fc.record({
          x: fc.integer({ min: -500, max: 500 }),
          y: fc.integer({ min: -500, max: 500 }),
        }),
        (gearConfig, playerPos) => {
          // Create hidden kill gear
          const gear = new HiddenKillGear(gearConfig);
          
          // Get volume from implementation
          const actualVolume = gear.getHumVolume(playerPos);
          
          // Calculate expected volume
          const dx = playerPos.x - gearConfig.x;
          const dy = playerPos.y - gearConfig.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const expectedVolume = Math.max(0, 1 - distance / gearConfig.humRadius);
          
          // Property: volume calculation matches formula
          // Use small epsilon for floating point comparison
          const epsilon = 0.0001;
          return Math.abs(actualVolume - expectedVolume) < epsilon;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return volume 1.0 when player is at gear center', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: -500, max: 500 }),
          y: fc.integer({ min: -500, max: 500 }),
          humRadius: fc.integer({ min: 10, max: 100 }),
        }),
        (config) => {
          const gear = new HiddenKillGear(config);
          
          // Player at exact gear position
          const volume = gear.getHumVolume({ x: config.x, y: config.y });
          
          // Property: volume is 1.0 at distance 0
          return Math.abs(volume - 1.0) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return volume 0.0 when player is at or beyond humRadius', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 500 }),
          y: fc.integer({ min: 0, max: 500 }),
          humRadius: fc.integer({ min: 10, max: 100 }),
        }),
        (config) => {
          const gear = new HiddenKillGear(config);
          
          // Player at exactly humRadius distance (to the right)
          const playerAtRadius = { x: config.x + config.humRadius, y: config.y };
          const volumeAtRadius = gear.getHumVolume(playerAtRadius);
          
          // Player beyond humRadius
          const playerBeyond = { x: config.x + config.humRadius + 10, y: config.y };
          const volumeBeyond = gear.getHumVolume(playerBeyond);
          
          // Property: volume is 0 at or beyond humRadius
          return volumeAtRadius <= 0.0001 && volumeBeyond === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return volume between 0 and 1 for distances within humRadius', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 500 }),
          y: fc.integer({ min: 0, max: 500 }),
          humRadius: fc.integer({ min: 20, max: 100 }),
        }),
        fc.integer({ min: 1, max: 19 }), // distance less than humRadius
        (config, distanceOffset) => {
          const gear = new HiddenKillGear(config);
          
          // Player at some distance less than humRadius
          const playerPos = { x: config.x + distanceOffset, y: config.y };
          const volume = gear.getHumVolume(playerPos);
          
          // Property: volume is between 0 and 1 (exclusive of 0, inclusive of 1)
          return volume > 0 && volume <= 1.0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use default humRadius when not specified', () => {
    const gear = new HiddenKillGear({ x: 100, y: 100 });
    
    expect(gear.humRadius).toBe(40);
  });

  it('should use configured humRadius when specified', () => {
    const gear = new HiddenKillGear({ x: 100, y: 100, humRadius: 60 });
    
    expect(gear.humRadius).toBe(60);
  });

  it('should decrease volume linearly with distance', () => {
    const gear = new HiddenKillGear({ x: 100, y: 100, humRadius: 40 });
    
    // Test at various distances
    const volume0 = gear.getHumVolume({ x: 100, y: 100 }); // distance 0
    const volume10 = gear.getHumVolume({ x: 110, y: 100 }); // distance 10
    const volume20 = gear.getHumVolume({ x: 120, y: 100 }); // distance 20
    const volume30 = gear.getHumVolume({ x: 130, y: 100 }); // distance 30
    const volume40 = gear.getHumVolume({ x: 140, y: 100 }); // distance 40
    
    // Verify linear decrease
    expect(volume0).toBeCloseTo(1.0, 4);
    expect(volume10).toBeCloseTo(0.75, 4);
    expect(volume20).toBeCloseTo(0.5, 4);
    expect(volume30).toBeCloseTo(0.25, 4);
    expect(volume40).toBeCloseTo(0.0, 4);
    
    // Verify monotonic decrease
    expect(volume0).toBeGreaterThan(volume10);
    expect(volume10).toBeGreaterThan(volume20);
    expect(volume20).toBeGreaterThan(volume30);
    expect(volume30).toBeGreaterThan(volume40);
  });
});
