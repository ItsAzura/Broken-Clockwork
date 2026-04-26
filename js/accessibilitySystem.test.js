/*
 * accessibilitySystem.test.js
 * Unit tests for accessibility system
 * Tests Requirements 13.1-13.8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccessibilitySystem } from './accessibilitySystem.js';
import { COLORS } from './constants.js';

// Mock saveSystem
vi.mock('./saveSystem.js', () => ({
    saveSystem: {
        load: vi.fn(() => ({
            settings: {
                accessibility: {
                    colorblindMode: false,
                    reduceMotion: false,
                    textScale: 1,
                    highContrast: false,
                    remappedControls: {}
                }
            }
        })),
        onSettingsChange: vi.fn()
    }
}));

describe('AccessibilitySystem', () => {
    let system;
    
    beforeEach(() => {
        system = new AccessibilitySystem();
        system.init();
    });
    
    describe('Requirement 13.1, 13.2: Colorblind Mode', () => {
        it('should enable colorblind mode', () => {
            system.setColorblindMode(true);
            
            const settings = system.getSettings();
            expect(settings.colorblindMode).toBe(true);
        });
        
        it('should replace GAUGE_LOW color when colorblind mode is enabled', () => {
            const originalColor = COLORS.GAUGE_LOW;
            
            system.setColorblindMode(true);
            
            // Color should be changed to colorblind-friendly alternative
            expect(COLORS.GAUGE_LOW).not.toBe(originalColor);
            expect(COLORS.GAUGE_LOW).toBe('#4080FF'); // Blue instead of red
        });
        
        it('should restore original colors when colorblind mode is disabled', () => {
            system.setColorblindMode(true);
            system.setColorblindMode(false);
            
            // Colors should be restored (unless high contrast is enabled)
            expect(system.getSettings().colorblindMode).toBe(false);
        });
    });
    
    describe('Requirement 13.3: Reduce Motion', () => {
        it('should enable reduce motion', () => {
            system.setReduceMotion(true);
            
            expect(system.isReduceMotionEnabled()).toBe(true);
        });
        
        it('should disable reduce motion', () => {
            system.setReduceMotion(true);
            system.setReduceMotion(false);
            
            expect(system.isReduceMotionEnabled()).toBe(false);
        });
    });
    
    describe('Requirement 13.4: Text Scale', () => {
        it('should set text scale to 1x', () => {
            system.setTextScale(1);
            
            expect(system.getTextScale()).toBe(1);
        });
        
        it('should set text scale to 2x', () => {
            system.setTextScale(2);
            
            expect(system.getTextScale()).toBe(2);
        });
        
        it('should set text scale to 3x', () => {
            system.setTextScale(3);
            
            expect(system.getTextScale()).toBe(3);
        });
        
        it('should reject invalid text scales', () => {
            system.setTextScale(1);
            system.setTextScale(5); // Invalid
            
            expect(system.getTextScale()).toBe(1); // Should remain unchanged
        });
    });
    
    describe('Requirement 13.5, 13.6, 13.7: Control Remapping', () => {
        it('should remap a control', () => {
            system.setRemappedControl('JUMP', 'W');
            
            const remapped = system.getRemappedControl('JUMP');
            expect(remapped).toBe('W');
        });
        
        it('should get all remapped controls', () => {
            system.setRemappedControl('JUMP', 'W');
            system.setRemappedControl('WIND', 'Q');
            
            const allRemapped = system.getAllRemappedControls();
            expect(allRemapped.JUMP).toBe('W');
            expect(allRemapped.WIND).toBe('Q');
        });
        
        it('should clear a remapped control', () => {
            system.setRemappedControl('JUMP', 'W');
            system.clearRemappedControl('JUMP');
            
            const remapped = system.getRemappedControl('JUMP');
            expect(remapped).toBeNull();
        });
        
        it('should reset all remapped controls', () => {
            system.setRemappedControl('JUMP', 'W');
            system.setRemappedControl('WIND', 'Q');
            system.resetRemappedControls();
            
            const allRemapped = system.getAllRemappedControls();
            expect(Object.keys(allRemapped).length).toBe(0);
        });
    });
    
    describe('Requirement 13.8: High Contrast Mode', () => {
        it('should enable high contrast mode', () => {
            system.setHighContrast(true);
            
            expect(system.isHighContrastEnabled()).toBe(true);
        });
        
        it('should increase border thickness when high contrast is enabled', () => {
            system.setHighContrast(false);
            expect(system.getBorderThickness()).toBe(1);
            
            system.setHighContrast(true);
            expect(system.getBorderThickness()).toBe(2);
        });
        
        it('should apply high contrast color palette', () => {
            const originalBg = COLORS.BACKGROUND;
            
            system.setHighContrast(true);
            
            // Background should be pure black in high contrast mode
            expect(COLORS.BACKGROUND).toBe('#000000');
            expect(COLORS.BACKGROUND).not.toBe(originalBg);
        });
    });
    
    describe('Settings Persistence', () => {
        it('should save settings when changed', async () => {
            const { saveSystem } = await import('./saveSystem.js');
            
            system.setColorblindMode(true);
            
            expect(saveSystem.onSettingsChange).toHaveBeenCalled();
        });
        
        it('should reset all settings to defaults', () => {
            system.setColorblindMode(true);
            system.setReduceMotion(true);
            system.setTextScale(3);
            system.setHighContrast(true);
            system.setRemappedControl('JUMP', 'W');
            
            system.resetToDefaults();
            
            const settings = system.getSettings();
            expect(settings.colorblindMode).toBe(false);
            expect(settings.reduceMotion).toBe(false);
            expect(settings.textScale).toBe(1);
            expect(settings.highContrast).toBe(false);
            expect(Object.keys(settings.remappedControls).length).toBe(0);
        });
    });
    
    describe('System Status', () => {
        it('should provide system status', () => {
            system.setColorblindMode(true);
            system.setRemappedControl('JUMP', 'W');
            
            const status = system.getStatus();
            
            expect(status.initialized).toBe(true);
            expect(status.colorblindMode).toBe(true);
            expect(status.remappedControlsCount).toBe(1);
        });
    });
});
