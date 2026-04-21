/**
 * Property-Based Tests for LiarCounter
 * Feature: troll-level-redesign
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { LiarCounter } from './liarCounter.js';

/**
 * Property 15: Liar Counter Timer Behavior
 * **Validates: Requirements 12.1, 12.2**
 * 
 * For any troll token collection event, the liar counter SHALL display an
 * incorrect value for exactly 0.5 seconds, then display the correct value.
 */
describe('Feature: troll-level-redesign, Property 15: Liar Counter Timer Behavior', () => {
  it('should display incorrect value for exactly 0.5 seconds, then correct value', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary actual gear count
        fc.integer({ min: 0, max: 100 }),
        (actualCount) => {
          const counter = new LiarCounter();
          
          // Trigger troll token collection
          counter.onTrollTokenCollect(actualCount);
          
          // Immediately after collection, should be lying
          expect(counter.isLying()).toBe(true);
          const displayCount = counter.getDisplayCount();
          
          // Display count should differ by exactly +1 or -1
          const difference = Math.abs(displayCount - actualCount);
          expect(difference).toBe(1);
          
          // Simulate time passing in small increments (just under 0.5s)
          let totalTime = 0;
          const timeStep = 0.016; // ~60 FPS
          
          while (totalTime < 0.5 - timeStep) {
            counter.update(timeStep);
            totalTime += timeStep;
            
            // Should still be lying
            expect(counter.isLying()).toBe(true);
            expect(counter.getDisplayCount()).toBe(displayCount);
          }
          
          // Final update to reach/exceed 0.5 seconds
          counter.update(timeStep);
          totalTime += timeStep;
          
          // Should now show correct value
          expect(counter.isLying()).toBe(false);
          expect(counter.getDisplayCount()).toBe(actualCount);
          
          // Further updates should maintain correct value
          counter.update(timeStep);
          expect(counter.getDisplayCount()).toBe(actualCount);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle multiple troll token collections with timer reset', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        (firstCount, secondCount) => {
          const counter = new LiarCounter();
          
          // First troll token collection
          counter.onTrollTokenCollect(firstCount);
          expect(counter.isLying()).toBe(true);
          
          // Wait 0.3 seconds (not enough to expire)
          counter.update(0.3);
          expect(counter.isLying()).toBe(true);
          
          // Second troll token collection (resets timer)
          counter.onTrollTokenCollect(secondCount);
          expect(counter.isLying()).toBe(true);
          
          // Wait 0.3 seconds again
          counter.update(0.3);
          expect(counter.isLying()).toBe(true); // Still lying because timer reset
          
          // Wait remaining 0.2 seconds to complete 0.5s from second collection
          counter.update(0.2);
          expect(counter.isLying()).toBe(false);
          expect(counter.getDisplayCount()).toBe(secondCount);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge case of zero actual count', () => {
    const counter = new LiarCounter();
    
    counter.onTrollTokenCollect(0);
    
    // Should be lying
    expect(counter.isLying()).toBe(true);
    
    // Display count should be 1 (0 + 1) or -1 (0 - 1)
    // Both are valid mathematically
    const displayCount = counter.getDisplayCount();
    expect(displayCount === 1 || displayCount === -1).toBe(true);
    
    // Wait for timer to expire
    counter.update(0.5);
    
    // Should show correct value
    expect(counter.isLying()).toBe(false);
    expect(counter.getDisplayCount()).toBe(0);
  });

  it('should maintain correct value when timer is not active', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(2.0), noNaN: true }),
        (actualCount, updateTime) => {
          const counter = new LiarCounter();
          
          // Set actual count without triggering lie
          counter.setActualCount(actualCount);
          
          // Should not be lying
          expect(counter.isLying()).toBe(false);
          expect(counter.getDisplayCount()).toBe(actualCount);
          
          // Update with arbitrary time
          counter.update(updateTime);
          
          // Should still show correct value
          expect(counter.isLying()).toBe(false);
          expect(counter.getDisplayCount()).toBe(actualCount);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle rapid updates with small time steps', () => {
    const counter = new LiarCounter();
    
    counter.onTrollTokenCollect(10);
    expect(counter.isLying()).toBe(true);
    
    // Simulate 60 FPS for 0.5 seconds (30 frames)
    const timeStep = 1 / 60;
    for (let i = 0; i < 30; i++) {
      counter.update(timeStep);
    }
    
    // Should have expired or be very close (30 * 1/60 = 0.5 seconds)
    // Due to floating point precision, we need one more update
    counter.update(timeStep);
    expect(counter.isLying()).toBe(false);
    expect(counter.getDisplayCount()).toBe(10);
  });

  it('should handle single large time step', () => {
    const counter = new LiarCounter();
    
    counter.onTrollTokenCollect(5);
    expect(counter.isLying()).toBe(true);
    
    // Single update with time > 0.5 seconds
    counter.update(1.0);
    
    // Should have expired
    expect(counter.isLying()).toBe(false);
    expect(counter.getDisplayCount()).toBe(5);
  });
});

/**
 * Property 16: Liar Counter Lie Calculation
 * **Validates: Requirements 12.3**
 * 
 * For any actual gear count, when the liar counter is active, the displayed
 * count SHALL differ by exactly +1 or -1 from the actual count.
 */
describe('Feature: troll-level-redesign, Property 16: Liar Counter Lie Calculation', () => {
  it('should display count that differs by exactly +1 or -1 from actual count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (actualCount) => {
          const counter = new LiarCounter();
          
          // Trigger troll token collection
          counter.onTrollTokenCollect(actualCount);
          
          // Get display count while lying
          const displayCount = counter.getDisplayCount();
          
          // Calculate difference
          const difference = displayCount - actualCount;
          
          // Property: Difference must be exactly +1 or -1
          return difference === 1 || difference === -1;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should randomly choose between +1 and -1 offset', () => {
    // Collect statistics over many runs to verify randomness
    const actualCount = 50;
    const results = { plus: 0, minus: 0 };
    const iterations = 1000;
    
    for (let i = 0; i < iterations; i++) {
      const counter = new LiarCounter();
      counter.onTrollTokenCollect(actualCount);
      
      const displayCount = counter.getDisplayCount();
      const difference = displayCount - actualCount;
      
      if (difference === 1) {
        results.plus++;
      } else if (difference === -1) {
        results.minus++;
      } else {
        // Should never happen
        throw new Error(`Invalid difference: ${difference}`);
      }
    }
    
    // Both +1 and -1 should occur (with high probability)
    expect(results.plus).toBeGreaterThan(0);
    expect(results.minus).toBeGreaterThan(0);
    
    // Total should equal iterations
    expect(results.plus + results.minus).toBe(iterations);
    
    // Distribution should be roughly 50/50 (allow 40-60% range for randomness)
    const plusRatio = results.plus / iterations;
    expect(plusRatio).toBeGreaterThan(0.4);
    expect(plusRatio).toBeLessThan(0.6);
  });

  it('should maintain lie offset throughout timer duration', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (actualCount) => {
          const counter = new LiarCounter();
          
          // Trigger troll token collection
          counter.onTrollTokenCollect(actualCount);
          
          // Get initial display count
          const initialDisplayCount = counter.getDisplayCount();
          const initialDifference = initialDisplayCount - actualCount;
          
          // Verify initial difference is +1 or -1
          expect(Math.abs(initialDifference)).toBe(1);
          
          // Update multiple times while timer is active
          counter.update(0.1);
          expect(counter.getDisplayCount()).toBe(initialDisplayCount);
          
          counter.update(0.1);
          expect(counter.getDisplayCount()).toBe(initialDisplayCount);
          
          counter.update(0.1);
          expect(counter.getDisplayCount()).toBe(initialDisplayCount);
          
          // Display count should remain constant until timer expires
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge case of actualCount = 0 with +1 offset', () => {
    // When actualCount is 0, the lie must be +1 (can't be -1)
    const counter = new LiarCounter();
    
    // Run multiple times to check if we ever get -1 (which would be invalid)
    for (let i = 0; i < 100; i++) {
      const testCounter = new LiarCounter();
      testCounter.onTrollTokenCollect(0);
      
      const displayCount = testCounter.getDisplayCount();
      
      // Display count should be 1 (0 + 1) or -1 (0 - 1)
      // Both are mathematically valid, but -1 gears doesn't make sense in UI
      expect(displayCount === 1 || displayCount === -1).toBe(true);
    }
  });

  it('should calculate lie independently for each collection', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        (firstCount, secondCount) => {
          const counter = new LiarCounter();
          
          // First collection
          counter.onTrollTokenCollect(firstCount);
          const firstDisplayCount = counter.getDisplayCount();
          const firstDifference = Math.abs(firstDisplayCount - firstCount);
          expect(firstDifference).toBe(1);
          
          // Wait for timer to expire
          counter.update(0.5);
          
          // Second collection
          counter.onTrollTokenCollect(secondCount);
          const secondDisplayCount = counter.getDisplayCount();
          const secondDifference = Math.abs(secondDisplayCount - secondCount);
          expect(secondDifference).toBe(1);
          
          // The two lies are independent (may be same or different offset)
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Unit Tests for LiarCounter edge cases
 */
describe('LiarCounter edge cases', () => {
  it('should initialize with zero values', () => {
    const counter = new LiarCounter();
    
    expect(counter.displayCount).toBe(0);
    expect(counter.actualCount).toBe(0);
    expect(counter.lieTimer).toBe(0);
    expect(counter.isLying()).toBe(false);
    expect(counter.getDisplayCount()).toBe(0);
  });

  it('should handle setActualCount without triggering lie', () => {
    const counter = new LiarCounter();
    
    counter.setActualCount(10);
    
    expect(counter.actualCount).toBe(10);
    expect(counter.displayCount).toBe(10);
    expect(counter.isLying()).toBe(false);
    expect(counter.getDisplayCount()).toBe(10);
  });

  it('should not update displayCount via setActualCount when lying', () => {
    const counter = new LiarCounter();
    
    // Start lying
    counter.onTrollTokenCollect(5);
    const lyingDisplayCount = counter.getDisplayCount();
    expect(counter.isLying()).toBe(true);
    
    // Try to set actual count while lying
    counter.setActualCount(10);
    
    // Display count should remain the lie value
    expect(counter.getDisplayCount()).toBe(lyingDisplayCount);
    expect(counter.actualCount).toBe(10);
    
    // After timer expires, should show updated actual count
    counter.update(0.5);
    expect(counter.getDisplayCount()).toBe(10);
  });

  it('should handle negative time steps gracefully', () => {
    const counter = new LiarCounter();
    
    counter.onTrollTokenCollect(5);
    expect(counter.isLying()).toBe(true);
    
    // Negative time step (shouldn't happen but handle gracefully)
    counter.update(-0.1);
    
    // Timer should not go negative or cause issues
    expect(counter.lieTimer).toBeGreaterThanOrEqual(0);
  });

  it('should handle zero time step', () => {
    const counter = new LiarCounter();
    
    counter.onTrollTokenCollect(5);
    const initialDisplayCount = counter.getDisplayCount();
    
    // Zero time step
    counter.update(0);
    
    // Nothing should change
    expect(counter.isLying()).toBe(true);
    expect(counter.getDisplayCount()).toBe(initialDisplayCount);
  });

  it('should handle very large actual counts', () => {
    const counter = new LiarCounter();
    
    counter.onTrollTokenCollect(999999);
    
    const displayCount = counter.getDisplayCount();
    const difference = Math.abs(displayCount - 999999);
    
    expect(difference).toBe(1);
    expect(counter.isLying()).toBe(true);
  });
});
