/*
 * accessibilitySystem.js
 * Accessibility options system for Game Retention & Engagement System
 * 
 * Features (Requirements 13.1-13.4, 13.8):
 * - Colorblind mode with alternative color palette
 * - Reduce motion option (disables screen shake and particles)
 * - Adjustable text size (1x, 2x, 3x scale)
 * - High contrast mode with increased border thickness
 * - Settings persistence via save system
 */

import { COLORS } from './constants.js';
import { saveSystem } from './saveSystem.js';

/**
 * Alternative color palette for colorblind mode (Requirement 13.1, 13.2)
 * Replaces problematic red/green combinations with high-contrast alternatives
 */
const COLORBLIND_PALETTE = {
    // Keep most colors the same
    BACKGROUND:  '#1C1209',
    TILE_DARK:   '#2E1C0E',
    TILE_MID:    '#4A2E14',
    TILE_LIGHT:  '#6B4423',
    METAL_DARK:  '#3D3328',
    METAL_MID:   '#7A6040',
    METAL_LIGHT: '#C9A84C',
    IVORY:       '#F5E8C0',

    GLOW_WARM:   '#FFD080',
    SPARK_1:     '#FFE840',
    SPARK_2:     '#FF9020',

    UI_BG:       '#0D0905',
    UI_BORDER_L: '#9A7840',
    UI_BORDER_D: '#3A2810',
    UI_TEXT:     '#F5E8C0',
    UI_MUTED:    '#8A7060',
    GAUGE_FULL:  '#C9A84C',
    
    // Replace red gauge low with high-contrast blue
    GAUGE_LOW:   '#4080FF',
    GAUGE_BG:    '#2A1C0A',

    MIRA_SKIN:   '#F5E0C0',
    MIRA_DRESS:  '#5A3820',
    MIRA_KEY:    '#C9A84C',
    MIRA_EYE:    '#2A1810',

    // Replace red danger zone with blue
    DANGER_ZONE: 'rgba(64,128,255,0.25)',
    DEATH_FLASH: 'rgba(64,128,255,0.5)',
    
    TOKEN_GOLD:  '#FFE080',
    LOCKED_DOOR: '#3D3328',

    // Replace green color betrayal with distinct yellow
    COLOR_BETRAYAL: '#C9A840',

    GHOST_TINT:  'rgba(122,96,64,0.3)',
};

/**
 * High contrast color palette (Requirement 13.8)
 * Increases contrast for better visibility
 */
const HIGH_CONTRAST_PALETTE = {
    BACKGROUND:  '#000000',
    TILE_DARK:   '#1A0A00',
    TILE_MID:    '#3A1A00',
    TILE_LIGHT:  '#5A2A00',
    METAL_DARK:  '#2A1A10',
    METAL_MID:   '#6A4020',
    METAL_LIGHT: '#DAB85C',
    IVORY:       '#FFFFFF',

    GLOW_WARM:   '#FFE090',
    SPARK_1:     '#FFF850',
    SPARK_2:     '#FF9030',

    UI_BG:       '#000000',
    UI_BORDER_L: '#FFFFFF',
    UI_BORDER_D: '#000000',
    UI_TEXT:     '#FFFFFF',
    UI_MUTED:    '#AAAAAA',
    GAUGE_FULL:  '#FFD000',
    GAUGE_LOW:   '#FF0000',
    GAUGE_BG:    '#1A0A00',

    MIRA_SKIN:   '#FFFFFF',
    MIRA_DRESS:  '#4A2810',
    MIRA_KEY:    '#FFD000',
    MIRA_EYE:    '#000000',

    DANGER_ZONE: 'rgba(255,0,0,0.4)',
    DEATH_FLASH: 'rgba(255,0,0,0.7)',
    TOKEN_GOLD:  '#FFF090',
    LOCKED_DOOR: '#2A1A10',

    COLOR_BETRAYAL: '#5A7B20',

    GHOST_TINT:  'rgba(150,120,80,0.4)',
};

/**
 * AccessibilitySystem class manages all accessibility options
 */
export class AccessibilitySystem {
    constructor() {
        this.settings = {
            colorblindMode: false,
            reduceMotion: false,
            textScale: 1,
            highContrast: false,
            remappedControls: {}
        };
        
        this.originalColors = { ...COLORS };
        this.initialized = false;
        
        console.log('[AccessibilitySystem] Initialized');
    }
    
    /**
     * Initialize accessibility system and load settings from save system
     */
    init() {
        try {
            const saveData = saveSystem.load();
            
            if (saveData && saveData.settings && saveData.settings.accessibility) {
                this.settings = { ...this.settings, ...saveData.settings.accessibility };
                console.log('[AccessibilitySystem] Loaded settings from save:', this.settings);
            }
            
            // Apply loaded settings
            this.applyColorblindMode(this.settings.colorblindMode);
            this.applyHighContrast(this.settings.highContrast);
            
            this.initialized = true;
            console.log('[AccessibilitySystem] Initialization complete');
            
        } catch (error) {
            console.error('[AccessibilitySystem] Initialization failed:', error);
            this.initialized = false;
        }
    }
    
    /**
     * Enable or disable colorblind mode (Requirement 13.1, 13.2)
     */
    setColorblindMode(enabled) {
        this.settings.colorblindMode = enabled;
        this.applyColorblindMode(enabled);
        this.saveSettings();
        
        console.log('[AccessibilitySystem] Colorblind mode:', enabled ? 'enabled' : 'disabled');
    }
    
    /**
     * Apply colorblind color palette
     */
    applyColorblindMode(enabled) {
        if (enabled) {
            // Replace problematic colors with colorblind-friendly alternatives
            Object.assign(COLORS, COLORBLIND_PALETTE);
        } else if (!this.settings.highContrast) {
            // Restore original colors only if high contrast is not enabled
            Object.assign(COLORS, this.originalColors);
        }
    }
    
    /**
     * Enable or disable reduce motion (Requirement 13.3)
     */
    setReduceMotion(enabled) {
        this.settings.reduceMotion = enabled;
        this.saveSettings();
        
        console.log('[AccessibilitySystem] Reduce motion:', enabled ? 'enabled' : 'disabled');
    }
    
    /**
     * Check if reduce motion is enabled
     */
    isReduceMotionEnabled() {
        return this.settings.reduceMotion;
    }
    
    /**
     * Set text scale (Requirement 13.4)
     * @param {number} scale - 1, 2, or 3
     */
    setTextScale(scale) {
        if (scale < 1 || scale > 3) {
            console.warn('[AccessibilitySystem] Invalid text scale:', scale);
            return;
        }
        
        this.settings.textScale = scale;
        this.saveSettings();
        
        console.log('[AccessibilitySystem] Text scale set to:', scale);
    }
    
    /**
     * Get current text scale
     */
    getTextScale() {
        return this.settings.textScale;
    }
    
    /**
     * Enable or disable high contrast mode (Requirement 13.8)
     */
    setHighContrast(enabled) {
        this.settings.highContrast = enabled;
        this.applyHighContrast(enabled);
        this.saveSettings();
        
        console.log('[AccessibilitySystem] High contrast mode:', enabled ? 'enabled' : 'disabled');
    }
    
    /**
     * Apply high contrast color palette
     */
    applyHighContrast(enabled) {
        if (enabled) {
            // Apply high contrast palette
            Object.assign(COLORS, HIGH_CONTRAST_PALETTE);
        } else if (!this.settings.colorblindMode) {
            // Restore original colors only if colorblind mode is not enabled
            Object.assign(COLORS, this.originalColors);
        } else {
            // Restore colorblind palette
            Object.assign(COLORS, COLORBLIND_PALETTE);
        }
    }
    
    /**
     * Get border thickness based on high contrast setting (Requirement 13.8)
     */
    getBorderThickness() {
        return this.settings.highContrast ? 2 : 1;
    }
    
    /**
     * Check if high contrast mode is enabled
     */
    isHighContrastEnabled() {
        return this.settings.highContrast;
    }
    
    /**
     * Set remapped control for an action (Requirement 13.5)
     * @param {string} action - Action name (e.g., 'JUMP', 'WIND', 'LEFT', 'RIGHT')
     * @param {string} key - Key to map to action
     */
    setRemappedControl(action, key) {
        this.settings.remappedControls[action] = key;
        this.saveSettings();
        
        console.log(`[AccessibilitySystem] Remapped ${action} to ${key}`);
    }
    
    /**
     * Get remapped control for an action
     */
    getRemappedControl(action) {
        return this.settings.remappedControls[action] || null;
    }
    
    /**
     * Get all remapped controls
     */
    getAllRemappedControls() {
        return { ...this.settings.remappedControls };
    }
    
    /**
     * Clear remapped control for an action
     */
    clearRemappedControl(action) {
        delete this.settings.remappedControls[action];
        this.saveSettings();
        
        console.log(`[AccessibilitySystem] Cleared remapping for ${action}`);
    }
    
    /**
     * Reset all remapped controls to defaults
     */
    resetRemappedControls() {
        this.settings.remappedControls = {};
        this.saveSettings();
        
        console.log('[AccessibilitySystem] Reset all control remappings');
    }
    
    /**
     * Get all accessibility settings
     */
    getSettings() {
        return { ...this.settings };
    }
    
    /**
     * Reset all accessibility settings to defaults
     */
    resetToDefaults() {
        this.settings = {
            colorblindMode: false,
            reduceMotion: false,
            textScale: 1,
            highContrast: false,
            remappedControls: {}
        };
        
        // Restore original colors
        Object.assign(COLORS, this.originalColors);
        
        this.saveSettings();
        
        console.log('[AccessibilitySystem] Reset to default settings');
    }
    
    /**
     * Save accessibility settings to save system
     */
    saveSettings() {
        try {
            saveSystem.onSettingsChange({
                accessibility: this.settings
            });
            
            console.log('[AccessibilitySystem] Settings saved');
            
        } catch (error) {
            console.error('[AccessibilitySystem] Failed to save settings:', error);
        }
    }
    
    /**
     * Get system status for debugging
     */
    getStatus() {
        return {
            initialized: this.initialized,
            settings: this.settings,
            colorblindMode: this.settings.colorblindMode,
            reduceMotion: this.settings.reduceMotion,
            textScale: this.settings.textScale,
            highContrast: this.settings.highContrast,
            remappedControlsCount: Object.keys(this.settings.remappedControls).length
        };
    }
}

// Export singleton instance
export const accessibilitySystem = new AccessibilitySystem();
