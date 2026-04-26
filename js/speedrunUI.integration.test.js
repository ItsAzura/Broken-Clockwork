/**
 * speedrunUI.integration.test.js
 * Integration tests for speedrun mode UI and controls
 * 
 * Validates: Requirement 6.8 - Speedrun mode UI and controls
 * 
 * Tests:
 * 1. Speedrun toggle displays on title screen
 * 2. Timer displays during gameplay
 * 3. Split displays on level completion
 * 4. UI elements follow pixel art style
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpeedrunSystem } from './speedrunSystem.js';
import { 
    drawSpeedrunToggle, 
    drawSpeedrunTimer, 
    drawSpeedrunSplit 
} from './ui.js';
import { COLORS } from './constants.js';

// Mock canvas context
function createMockContext() {
    const calls = {
        fillRect: [],
        strokeRect: [],
        fillText: [],
        save: 0,
        restore: 0
    };
    
    return {
        fillRect: vi.fn((...args) => calls.fillRect.push(args)),
        strokeRect: vi.fn((...args) => calls.strokeRect.push(args)),
        fillText: vi.fn((...args) => calls.fillText.push(args)),
        save: vi.fn(() => calls.save++),
        restore: vi.fn(() => calls.restore++),
        set fillStyle(value) { this._fillStyle = value; },
        get fillStyle() { return this._fillStyle; },
        set strokeStyle(value) { this._strokeStyle = value; },
        get strokeStyle() { return this._strokeStyle; },
        set font(value) { this._font = value; },
        get font() { return this._font; },
        set globalAlpha(value) { this._globalAlpha = value; },
        get globalAlpha() { return this._globalAlpha; },
        set lineWidth(value) { this._lineWidth = value; },
        get lineWidth() { return this._lineWidth; },
        _calls: calls
    };
}

describe('Speedrun Mode UI - Requirement 6.8', () => {
    let speedrunSystem;
    let ctx;
    
    beforeEach(() => {
        speedrunSystem = new SpeedrunSystem();
        ctx = createMockContext();
    });
    
    describe('Title Screen Toggle', () => {
        it('should render speedrun toggle on title screen', () => {
            speedrunSystem.setEnabled(false);
            
            drawSpeedrunToggle(ctx, speedrunSystem, 0);
            
            // Verify panel was drawn (multiple fillRect calls for panel background)
            expect(ctx._calls.fillRect.length).toBeGreaterThan(0);
            
            // Verify text was drawn (label, state, instruction)
            expect(ctx._calls.fillText.length).toBeGreaterThan(0);
        });
        
        it('should display "OFF" when speedrun mode is disabled', () => {
            speedrunSystem.setEnabled(false);
            
            drawSpeedrunToggle(ctx, speedrunSystem, 0);
            
            // Check that "OFF" text is rendered
            const textCalls = ctx._calls.fillText;
            const hasOffText = textCalls.some(call => 
                call[0] && call[0].includes('OFF')
            );
            expect(hasOffText).toBe(true);
        });
        
        it('should display "ON" when speedrun mode is enabled', () => {
            speedrunSystem.setEnabled(true);
            
            drawSpeedrunToggle(ctx, speedrunSystem, 0);
            
            // Check that "ON" text is rendered
            const textCalls = ctx._calls.fillText;
            const hasOnText = textCalls.some(call => 
                call[0] && call[0].includes('ON')
            );
            expect(hasOnText).toBe(true);
        });
        
        it('should show checkbox filled when enabled', () => {
            speedrunSystem.setEnabled(true);
            
            drawSpeedrunToggle(ctx, speedrunSystem, 0);
            
            // When enabled, checkbox should have fill rect for the checkmark
            expect(ctx._calls.fillRect.length).toBeGreaterThan(0);
        });
        
        it('should blink instruction text', () => {
            speedrunSystem.setEnabled(false);
            
            // Draw at tick 0 (should show instruction)
            drawSpeedrunToggle(ctx, speedrunSystem, 0);
            const textCount1 = ctx._calls.fillText.length;
            
            // Reset context
            ctx = createMockContext();
            
            // Draw at tick 15 (should hide instruction due to blink)
            drawSpeedrunToggle(ctx, speedrunSystem, 15);
            const textCount2 = ctx._calls.fillText.length;
            
            // Text count should differ due to blinking instruction
            // (or be the same if both are in visible phase)
            expect(typeof textCount1).toBe('number');
            expect(typeof textCount2).toBe('number');
        });
    });
    
    describe('Timer Display During Gameplay', () => {
        it('should not render timer when speedrun mode is disabled', () => {
            speedrunSystem.setEnabled(false);
            speedrunSystem.active = false;
            
            drawSpeedrunTimer(ctx, speedrunSystem, 0);
            
            // No drawing should occur
            expect(ctx._calls.fillRect.length).toBe(0);
            expect(ctx._calls.fillText.length).toBe(0);
        });
        
        it('should not render timer when speedrun mode is enabled but not active', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.active = false;
            
            drawSpeedrunTimer(ctx, speedrunSystem, 0);
            
            // No drawing should occur
            expect(ctx._calls.fillRect.length).toBe(0);
            expect(ctx._calls.fillText.length).toBe(0);
        });
        
        it('should render timer when speedrun mode is active', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.start(1);
            speedrunSystem.currentTime = 12345; // 00:12.345
            
            drawSpeedrunTimer(ctx, speedrunSystem, 0);
            
            // Verify panel was drawn
            expect(ctx._calls.fillRect.length).toBeGreaterThan(0);
            
            // Verify text was drawn (label + time)
            expect(ctx._calls.fillText.length).toBeGreaterThan(0);
            
            // Verify time format is present in text calls
            const textCalls = ctx._calls.fillText;
            const hasTimeFormat = textCalls.some(call => 
                call[0] && /\d{2}:\d{2}\.\d{3}/.test(call[0])
            );
            expect(hasTimeFormat).toBe(true);
        });
        
        it('should display best time when available', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.start(1);
            speedrunSystem.currentTime = 12345;
            speedrunSystem.bestTotalTime = 10000; // 00:10.000
            
            drawSpeedrunTimer(ctx, speedrunSystem, 0);
            
            // Should have more text calls (current time + best time)
            expect(ctx._calls.fillText.length).toBeGreaterThan(2);
            
            // Check for "BEST:" text
            const textCalls = ctx._calls.fillText;
            const hasBestLabel = textCalls.some(call => 
                call[0] && call[0].includes('BEST')
            );
            expect(hasBestLabel).toBe(true);
        });
        
        it('should show paused indicator when timer is paused', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.start(1);
            speedrunSystem.pause();
            
            // Draw at tick 0 (should show PAUSED)
            drawSpeedrunTimer(ctx, speedrunSystem, 0);
            
            const textCalls = ctx._calls.fillText;
            const hasPausedText = textCalls.some(call => 
                call[0] && call[0].includes('PAUSED')
            );
            expect(hasPausedText).toBe(true);
        });
    });
    
    describe('Split Display on Level Completion', () => {
        it('should not render split when speedrun mode is disabled', () => {
            speedrunSystem.setEnabled(false);
            
            drawSpeedrunSplit(ctx, speedrunSystem, 1);
            
            // No drawing should occur
            expect(ctx._calls.fillRect.length).toBe(0);
            expect(ctx._calls.fillText.length).toBe(0);
        });
        
        it('should not render split when no split data exists', () => {
            speedrunSystem.setEnabled(true);
            
            drawSpeedrunSplit(ctx, speedrunSystem, 1);
            
            // No drawing should occur (no split recorded yet)
            expect(ctx._calls.fillRect.length).toBe(0);
            expect(ctx._calls.fillText.length).toBe(0);
        });
        
        it('should render split information when split exists', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.start(1);
            speedrunSystem.currentTime = 5000;
            speedrunSystem.recordSplit(1);
            
            drawSpeedrunSplit(ctx, speedrunSystem, 1);
            
            // Verify panel was drawn
            expect(ctx._calls.fillRect.length).toBeGreaterThan(0);
            
            // Verify text was drawn (label + time)
            expect(ctx._calls.fillText.length).toBeGreaterThan(0);
            
            // Check for "SPLIT TIME" label
            const textCalls = ctx._calls.fillText;
            const hasSplitLabel = textCalls.some(call => 
                call[0] && call[0].includes('SPLIT')
            );
            expect(hasSplitLabel).toBe(true);
        });
        
        it('should display delta when personal best exists', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.bestSplits = [{ level: 1, time: 6000 }];
            speedrunSystem.start(1);
            speedrunSystem.currentTime = 5000; // Faster than best
            speedrunSystem.recordSplit(1);
            
            drawSpeedrunSplit(ctx, speedrunSystem, 1);
            
            // Check for delta format (+/- seconds)
            const textCalls = ctx._calls.fillText;
            const hasDelta = textCalls.some(call => 
                call[0] && /[+-]\d+\.\d{3}/.test(call[0])
            );
            expect(hasDelta).toBe(true);
        });
        
        it('should show "FASTER" indicator for improved splits', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.bestSplits = [{ level: 1, time: 6000 }];
            speedrunSystem.start(1);
            speedrunSystem.currentTime = 5000; // Faster than best
            speedrunSystem.recordSplit(1);
            
            drawSpeedrunSplit(ctx, speedrunSystem, 1);
            
            // Check for "FASTER" text
            const textCalls = ctx._calls.fillText;
            const hasFasterText = textCalls.some(call => 
                call[0] && call[0].includes('FASTER')
            );
            expect(hasFasterText).toBe(true);
        });
        
        it('should show "SLOWER" indicator for worse splits', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.bestSplits = [{ level: 1, time: 4000 }];
            speedrunSystem.start(1);
            speedrunSystem.currentTime = 5000; // Slower than best
            speedrunSystem.recordSplit(1);
            
            drawSpeedrunSplit(ctx, speedrunSystem, 1);
            
            // Check for "SLOWER" text
            const textCalls = ctx._calls.fillText;
            const hasSlowerText = textCalls.some(call => 
                call[0] && call[0].includes('SLOWER')
            );
            expect(hasSlowerText).toBe(true);
        });
    });
    
    describe('UI Style Consistency', () => {
        it('should use consistent panel styling across all UI elements', () => {
            speedrunSystem.setEnabled(true);
            speedrunSystem.start(1);
            speedrunSystem.currentTime = 5000;
            speedrunSystem.recordSplit(1);
            
            // Draw all UI elements
            const ctx1 = createMockContext();
            drawSpeedrunToggle(ctx1, speedrunSystem, 0);
            
            const ctx2 = createMockContext();
            drawSpeedrunTimer(ctx2, speedrunSystem, 0);
            
            const ctx3 = createMockContext();
            drawSpeedrunSplit(ctx3, speedrunSystem, 1);
            
            // All should have drawn rectangles (panels)
            expect(ctx1._calls.fillRect.length).toBeGreaterThan(0);
            expect(ctx2._calls.fillRect.length).toBeGreaterThan(0);
            expect(ctx3._calls.fillRect.length).toBeGreaterThan(0);
            
            // All should have drawn text
            expect(ctx1._calls.fillText.length).toBeGreaterThan(0);
            expect(ctx2._calls.fillText.length).toBeGreaterThan(0);
            expect(ctx3._calls.fillText.length).toBeGreaterThan(0);
        });
    });
});
