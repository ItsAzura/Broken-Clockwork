/*
 * settingsMenu.js
 * Comprehensive Settings Menu for Game Retention & Engagement System
 * 
 * Features (Requirements 18.1-18.8):
 * - Tabbed interface: Gameplay, Audio, Video, Accessibility, Controls
 * - Integrates all settings from existing systems
 * - Keyboard navigation (Tab, Arrow keys, Enter, Escape)
 * - Immediate settings application
 * - Reset to defaults with confirmation
 * - Settings persistence via SaveSystem
 * - Import/export for backup/restore
 */

import { COLORS, SCREEN_W, SCREEN_H } from './constants.js';
import { drawPixelRect, drawPixelBorder, drawPixelText, measurePixelText } from './draw.js';
import { saveSystem } from './saveSystem.js';
import { difficultySystem } from './difficultySystem.js';
import { accessibilitySystem } from './accessibilitySystem.js';
import { getMusicVolume, getSFXVolume, setMusicVolume, setSFXVolume } from './audio.js';
import { getDefaultKeyForAction } from './input.js';

/**
 * Settings menu tabs
 */
const TABS = {
    GAMEPLAY: 'Gameplay',
    AUDIO: 'Audio',
    VIDEO: 'Video',
    ACCESSIBILITY: 'Accessibility',
    CONTROLS: 'Controls'
};

// Tooltip definitions for each tab's options (Requirement 17.7)
const TOOLTIPS = {
    [TABS.GAMEPLAY]: [
        'Casual: slower obstacles, more forgiveness. Normal: default. Hardcore: faster obstacles.',
    ],
    [TABS.AUDIO]: [
        'Adjust background music volume (0-100%).',
        'Adjust sound effects volume (0-100%).',
    ],
    [TABS.VIDEO]: [
        'Toggle screen shake on death and impacts.',
        'Toggle particle effects (sparks, dust, trails).',
    ],
    [TABS.ACCESSIBILITY]: [
        'Replace low-contrast colors with colorblind-friendly alternatives.',
        'Disable screen shake and particle effects for reduced motion.',
        'Scale all UI text: 1x (default), 2x, or 3x.',
        'Increase border thickness for better visibility.',
    ],
    [TABS.CONTROLS]: [
        'Remap the Jump key (default: Space/Up).',
        'Remap the Wind key (default: E).',
        'Remap the Move Left key (default: A/Left).',
        'Remap the Move Right key (default: D/Right).',
        'Remap the Reset key (default: R).',
    ],
};

/**
 * SettingsMenu class manages the comprehensive settings interface
 */
export class SettingsMenu {
    constructor() {
        this.active = false;
        this.currentTab = TABS.GAMEPLAY;
        this.selectedOption = 0;
        this.showConfirmReset = false;
        this.confirmResetSelection = 0; // 0 = Cancel, 1 = Confirm
        
        // Settings state (loaded from systems)
        this.settings = this.loadAllSettings();
        
        // Tab order for keyboard navigation
        this.tabOrder = Object.values(TABS);
        this.currentTabIndex = 0;
        
        console.log('[SettingsMenu] Initialized');
    }
    
    /**
     * Load all settings from existing systems
     */
    loadAllSettings() {
        return {
            // Gameplay settings
            difficulty: difficultySystem.getDifficulty(),
            
            // Audio settings
            musicVolume: getMusicVolume(),
            sfxVolume: getSFXVolume(),
            
            // Video settings (placeholder for future features)
            screenShake: true,
            particles: true,
            
            // Accessibility settings
            colorblindMode: accessibilitySystem.settings.colorblindMode,
            reduceMotion: accessibilitySystem.settings.reduceMotion,
            textScale: accessibilitySystem.settings.textScale,
            highContrast: accessibilitySystem.settings.highContrast,
            
            // Controls (remapped controls from accessibility system)
            remappedControls: accessibilitySystem.getAllRemappedControls()
        };
    }
    
    /**
     * Open the settings menu
     */
    open() {
        this.active = true;
        this.settings = this.loadAllSettings();
        this.selectedOption = 0;
        this.showConfirmReset = false;
        console.log('[SettingsMenu] Opened');
    }
    
    /**
     * Close the settings menu
     */
    close() {
        this.active = false;
        console.log('[SettingsMenu] Closed');
    }
    
    /**
     * Check if settings menu is active
     */
    isActive() {
        return this.active;
    }
    
    /**
     * Handle keyboard input (Requirement 18.8)
     */
    handleInput(keys) {
        if (!this.active) return;
        
        // Handle reset confirmation dialog
        if (this.showConfirmReset) {
            this.handleConfirmResetInput(keys);
            return;
        }
        
        // Tab navigation (switch between tabs)
        if (keys.Tab && !keys.prevTab) {
            keys.prevTab = true;
            this.currentTabIndex = (this.currentTabIndex + 1) % this.tabOrder.length;
            this.currentTab = this.tabOrder[this.currentTabIndex];
            this.selectedOption = 0;
            return;
        }
        
        // Arrow key navigation
        if (keys.ArrowUp && !keys.prevArrowUp) {
            keys.prevArrowUp = true;
            this.selectedOption = Math.max(0, this.selectedOption - 1);
        }
        
        if (keys.ArrowDown && !keys.prevArrowDown) {
            keys.prevArrowDown = true;
            const maxOptions = this.getMaxOptionsForCurrentTab();
            this.selectedOption = Math.min(maxOptions - 1, this.selectedOption + 1);
        }
        
        // Left/Right arrows to adjust values
        if (keys.ArrowLeft && !keys.prevArrowLeft) {
            keys.prevArrowLeft = true;
            this.adjustSelectedOption(-1);
        }
        
        if (keys.ArrowRight && !keys.prevArrowRight) {
            keys.prevArrowRight = true;
            this.adjustSelectedOption(1);
        }
        
        // Enter to toggle/confirm
        if (keys.Enter && !keys.prevEnter) {
            keys.prevEnter = true;
            this.toggleSelectedOption();
        }
        
        // Escape to close
        if (keys.Escape && !keys.prevEscape) {
            keys.prevEscape = true;
            this.close();
        }
        
        // R key for reset to defaults
        if (keys.KeyR && !keys.prevKeyR) {
            keys.prevKeyR = true;
            this.showConfirmReset = true;
            this.confirmResetSelection = 0;
        }
    }
    
    /**
     * Handle pointer/touch interaction (Requirement 3 in Analysis)
     */
    handleClick(x, y) {
        if (!this.active) return;
        
        const cardW = 280;
        const cardH = 160;
        const cardX = (SCREEN_W - cardW) / 2 | 0;
        const cardY = (SCREEN_H - cardH) / 2 | 0;
        
        if (this.showConfirmReset) {
            // Check buttons in confirmation dialog
            const dialogW = 200;
            const dialogH = 60;
            const dialogX = (SCREEN_W - dialogW) / 2 | 0;
            const dialogY = (SCREEN_H - dialogH) / 2 | 0;
            const buttonY = dialogY + 38;
            const buttonW = 70;
            const buttonStartX = (SCREEN_W - (buttonW * 2 + 10)) / 2 | 0;
            
            if (y >= buttonY && y <= buttonY + 14) {
                if (x >= buttonStartX && x <= buttonStartX + buttonW) {
                    this.showConfirmReset = false; // Cancel
                } else if (x >= buttonStartX + buttonW + 10 && x <= buttonStartX + buttonW * 2 + 10) {
                    this.resetToDefaults();
                    this.showConfirmReset = false;
                }
            }
            return;
        }

        // Check tabs
        const tabListW = 70;
        if (x >= cardX + 5 && x <= cardX + 5 + tabListW) {
            this.tabOrder.forEach((tab, i) => {
                const tabY = cardY + 35 + i * 20;
                if (y >= tabY - 2 && y <= tabY + 14) {
                    this.currentTab = tab;
                    this.currentTabIndex = i;
                    this.selectedOption = 0;
                }
            });
            return;
        }

        // Check options
        const contentX = cardX + tabListW + 10;
        const contentW = cardW - tabListW - 20;
        if (x >= contentX && x <= contentX + contentW) {
            const maxOptions = this.getMaxOptionsForCurrentTab();
            for (let i = 0; i < maxOptions; i++) {
                let optOffset = i * 15;
                if (this.currentTab === TABS.AUDIO) optOffset = i * 30;
                else if (this.currentTab === TABS.VIDEO) optOffset = i * 20;
                else if (this.currentTab === TABS.CONTROLS) optOffset = i * 14;
                
                const optY = cardY + 35 + optOffset;
                if (y >= optY && y <= optY + 14) {
                    this.selectedOption = i;
                    
                    // Check if clicked on the left or right side for adjustment
                    const valueW = 40; // Approximate width for value adjustment
                    if (x >= contentX + contentW - valueW) {
                        this.adjustSelectedOption(1);
                    } else if (x >= contentX + contentW - valueW * 2) {
                        this.adjustSelectedOption(-1);
                    } else {
                        this.toggleSelectedOption();
                    }
                    return;
                }
            }
        }
    }
    
    /**
     * Handle input for reset confirmation dialog
     */
    handleConfirmResetInput(keys) {
        // Arrow keys to select Cancel/Confirm
        if (keys.ArrowLeft && !keys.prevArrowLeft) {
            keys.prevArrowLeft = true;
            this.confirmResetSelection = 0; // Cancel
        }
        
        if (keys.ArrowRight && !keys.prevArrowRight) {
            keys.prevArrowRight = true;
            this.confirmResetSelection = 1; // Confirm
        }
        
        // Enter to confirm selection
        if (keys.Enter && !keys.prevEnter) {
            keys.prevEnter = true;
            if (this.confirmResetSelection === 1) {
                this.resetToDefaults();
            }
            this.showConfirmReset = false;
        }
        
        // Escape to cancel
        if (keys.Escape && !keys.prevEscape) {
            keys.prevEscape = true;
            this.showConfirmReset = false;
        }
    }
    
    /**
     * Get maximum number of options for current tab
     */
    getMaxOptionsForCurrentTab() {
        switch (this.currentTab) {
            case TABS.GAMEPLAY:
                return 1; // Difficulty
            case TABS.AUDIO:
                return 2; // Music volume, SFX volume
            case TABS.VIDEO:
                return 2; // Screen shake, Particles
            case TABS.ACCESSIBILITY:
                return 4; // Colorblind, Reduce motion, Text scale, High contrast
            case TABS.CONTROLS:
                return 5; // Jump, Wind, Left, Right, Reset
            default:
                return 1;
        }
    }
    
    /**
     * Adjust the selected option value (Requirement 18.4)
     */
    adjustSelectedOption(direction) {
        switch (this.currentTab) {
            case TABS.GAMEPLAY:
                this.adjustGameplayOption(direction);
                break;
            case TABS.AUDIO:
                this.adjustAudioOption(direction);
                break;
            case TABS.VIDEO:
                this.adjustVideoOption(direction);
                break;
            case TABS.ACCESSIBILITY:
                this.adjustAccessibilityOption(direction);
                break;
            case TABS.CONTROLS:
                // Controls are handled differently (key remapping)
                break;
        }
    }
    
    /**
     * Toggle the selected option (for boolean settings)
     */
    toggleSelectedOption() {
        switch (this.currentTab) {
            case TABS.VIDEO:
                this.toggleVideoOption();
                break;
            case TABS.ACCESSIBILITY:
                this.toggleAccessibilityOption();
                break;
            case TABS.CONTROLS:
                this.startKeyRemapping();
                break;
        }
    }
    
    /**
     * Adjust gameplay settings
     */
    adjustGameplayOption(direction) {
        if (this.selectedOption === 0) {
            // Difficulty
            const difficulties = ['Casual', 'Normal', 'Hardcore'];
            const currentIndex = difficulties.indexOf(this.settings.difficulty);
            let newIndex = currentIndex + direction;
            if (newIndex < 0) newIndex = difficulties.length - 1;
            if (newIndex >= difficulties.length) newIndex = 0;
            
            this.settings.difficulty = difficulties[newIndex];
            difficultySystem.setDifficulty(this.settings.difficulty);
        }
    }
    
    /**
     * Adjust audio settings
     */
    adjustAudioOption(direction) {
        const step = 0.1;
        
        if (this.selectedOption === 0) {
            // Music volume
            this.settings.musicVolume = Math.max(0, Math.min(1, this.settings.musicVolume + direction * step));
            setMusicVolume(this.settings.musicVolume);
        } else if (this.selectedOption === 1) {
            // SFX volume
            this.settings.sfxVolume = Math.max(0, Math.min(1, this.settings.sfxVolume + direction * step));
            setSFXVolume(this.settings.sfxVolume);
        }
    }
    
    /**
     * Adjust video settings
     */
    adjustVideoOption(direction) {
        // Video settings are boolean toggles, handled by toggleVideoOption
    }
    
    /**
     * Toggle video settings
     */
    toggleVideoOption() {
        if (this.selectedOption === 0) {
            // Screen shake
            this.settings.screenShake = !this.settings.screenShake;
        } else if (this.selectedOption === 1) {
            // Particles
            this.settings.particles = !this.settings.particles;
        }
    }
    
    /**
     * Adjust accessibility settings
     */
    adjustAccessibilityOption(direction) {
        if (this.selectedOption === 2) {
            // Text scale (1, 2, 3)
            this.settings.textScale = Math.max(1, Math.min(3, this.settings.textScale + direction));
            accessibilitySystem.setTextScale(this.settings.textScale);
        }
    }
    
    /**
     * Toggle accessibility settings
     */
    toggleAccessibilityOption() {
        if (this.selectedOption === 0) {
            // Colorblind mode
            this.settings.colorblindMode = !this.settings.colorblindMode;
            accessibilitySystem.setColorblindMode(this.settings.colorblindMode);
        } else if (this.selectedOption === 1) {
            // Reduce motion
            this.settings.reduceMotion = !this.settings.reduceMotion;
            accessibilitySystem.setReduceMotion(this.settings.reduceMotion);
        } else if (this.selectedOption === 3) {
            // High contrast
            this.settings.highContrast = !this.settings.highContrast;
            accessibilitySystem.setHighContrast(this.settings.highContrast);
        }
    }
    
    /**
     * Start key remapping for controls
     */
    startKeyRemapping() {
        // TODO: Implement key remapping UI
        // This would require capturing the next key press and assigning it to the selected action
        console.log('[SettingsMenu] Key remapping not yet implemented');
    }
    
    /**
     * Reset all settings to defaults (Requirement 18.5, 18.7)
     */
    resetToDefaults() {
        // Reset difficulty
        difficultySystem.resetToDefault();
        
        // Reset audio
        setMusicVolume(0.7);
        setSFXVolume(0.7);
        
        // Reset accessibility
        accessibilitySystem.resetToDefaults();
        
        // Reload settings
        this.settings = this.loadAllSettings();
        
        console.log('[SettingsMenu] Reset to defaults');
    }
    
    /**
     * Export settings as JSON string (Requirement 18.8)
     */
    exportSettings() {
        try {
            return saveSystem.exportData();
        } catch (error) {
            console.error('[SettingsMenu] Export failed:', error);
            return null;
        }
    }
    
    /**
     * Import settings from JSON string (Requirement 18.8)
     */
    importSettings(jsonString) {
        try {
            saveSystem.importData(jsonString);
            this.settings = this.loadAllSettings();
            console.log('[SettingsMenu] Settings imported successfully');
            return true;
        } catch (error) {
            console.error('[SettingsMenu] Import failed:', error);
            return false;
        }
    }
    
    /**
     * Get remapped key for a display action name
     */
    getRemappedKey(displayAction) {
        const actionMap = {
            'Jump': 'UP',
            'Wind': 'WIND',
            'Left': 'LEFT',
            'Right': 'RIGHT',
            'Reset': 'RETRY'
        };
        
        const internalAction = actionMap[displayAction] || displayAction.toUpperCase();
        
        // Check remapped controls from accessibility system
        const remapped = this.settings.remappedControls[internalAction];
        if (remapped) return remapped.toUpperCase();
        
        // Otherwise return default key from input system
        const defaultKey = getDefaultKeyForAction(internalAction);
        if (defaultKey) {
            // Simplify common keys for display
            if (defaultKey === 'ArrowUp') return 'UP';
            if (defaultKey === 'ArrowLeft') return 'LEFT';
            if (defaultKey === 'ArrowRight') return 'RIGHT';
            if (defaultKey === 'ArrowDown') return 'DOWN';
            if (defaultKey === ' ') return 'SPACE';
            return defaultKey.toUpperCase();
        }
        
        return 'DEF';
    }

    /**
     * Draw the settings menu (Requirement 18.1, 18.2)
     */
    draw(ctx, tick) {
        if (!this.active) return;
        
        // 1. Clean Backdrop
        ctx.fillStyle = 'rgba(10, 7, 5, 0.9)';
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
        
        // 2. Main Center Card
        const cardW = 280;
        const cardH = 160;
        const cardX = (SCREEN_W - cardW) / 2 | 0;
        const cardY = (SCREEN_H - cardH) / 2 | 0;
        
        drawPixelBorder(ctx, cardX, cardY, cardW, cardH,
            'rgba(255, 208, 128, 0.4)', 'rgba(0,0,0,0.6)', 'rgba(15, 10, 5, 1)', 1);
        
        // 3. Header
        const title = 'SETTINGS';
        const tw = measurePixelText(title, 1.5);
        drawPixelText(ctx, title, ((SCREEN_W - tw) / 2) | 0, cardY + 8, COLORS.GLOW_WARM, 1.5);
        
        // 4. Split Layout: Tabs on Left, Content on Right
        const tabListW = 70;
        const contentW = cardW - tabListW - 20;
        const contentX = cardX + tabListW + 10;
        
        // Draw Vertical Tabs (Easier to read)
        this.tabOrder.forEach((tab, i) => {
            const isActive = tab === this.currentTab;
            const tabY = cardY + 35 + i * 20;
            const label = this.getTabLabel(tab);
            
            if (isActive) {
                drawPixelRect(ctx, cardX + 5, tabY - 2, tabListW, 16, 'rgba(255, 208, 128, 0.15)');
                drawPixelRect(ctx, cardX + 5, tabY - 2, 2, 16, COLORS.GLOW_WARM);
                drawPixelText(ctx, label, cardX + 12, tabY + 2, COLORS.GLOW_WARM, 1);
            } else {
                drawPixelText(ctx, label, cardX + 10, tabY + 2, COLORS.UI_MUTED, 1);
            }
        });

        // Vertical divider
        drawPixelRect(ctx, cardX + tabListW + 5, cardY + 30, 1, cardH - 50, COLORS.UI_BORDER_D);
        
        // 5. Active Tab Content
        const contentY = cardY + 35;
        switch (this.currentTab) {
            case TABS.GAMEPLAY:
                this.drawGameplayTab(ctx, contentX, contentY, contentW);
                break;
            case TABS.AUDIO:
                this.drawAudioTab(ctx, contentX, contentY, contentW);
                break;
            case TABS.VIDEO:
                this.drawVideoTab(ctx, contentX, contentY, contentW);
                break;
            case TABS.ACCESSIBILITY:
                this.drawAccessibilityTab(ctx, contentX, contentY, contentW);
                break;
            case TABS.CONTROLS:
                this.drawControlsTab(ctx, contentX, contentY, contentW);
                break;
        }
        
        // 6. Tooltip and Hints
        const tooltip = TOOLTIPS[this.currentTab][this.selectedOption];
        if (tooltip) {
            const wrapped = this.wrapText(tooltip, cardW - 20);
            drawPixelText(ctx, wrapped[0], cardX + 10, cardY + cardH - 25, COLORS.UI_MUTED, 0.5);
        }

        const hints = 'TAB: SWITCH CATEGORY   ↑↓: NAVIGATE   ←→: ADJUST';
        const hw = measurePixelText(hints, 0.5);
        drawPixelText(ctx, hints, ((SCREEN_W - hw) / 2) | 0, cardY + cardH - 12, COLORS.UI_MUTED, 0.5);
    }
    
    getTabLabel(tab) {
        switch (tab) {
            case TABS.GAMEPLAY: return 'GAME';
            case TABS.AUDIO: return 'AUDIO';
            case TABS.VIDEO: return 'VIDEO';
            case TABS.ACCESSIBILITY: return 'ACCESS';
            case TABS.CONTROLS: return 'KEYS';
            default: return tab.toUpperCase();
        }
    }
    
    drawGameplayTab(ctx, x, y, width) {
        this.drawOption(ctx, x, y, width, 'DIFFICULTY', this.settings.difficulty, 
            this.selectedOption === 0, true);
        
        const desc = difficultySystem.getDifficultyDescription();
        const lines = this.wrapText(desc, width);
        lines.forEach((l, i) => {
            drawPixelText(ctx, l, x, y + 25 + i * 10, COLORS.UI_MUTED, 1);
        });
    }
    
    drawAudioTab(ctx, x, y, width) {
        const musicP = Math.round(this.settings.musicVolume * 100) + '%';
        this.drawOption(ctx, x, y, width, 'MUSIC', musicP, this.selectedOption === 0, true);
        this.drawSimpleBar(ctx, x, y + 12, width, 6, this.settings.musicVolume);
        
        const sfxP = Math.round(this.settings.sfxVolume * 100) + '%';
        this.drawOption(ctx, x, y + 30, width, 'SFX', sfxP, this.selectedOption === 1, true);
        this.drawSimpleBar(ctx, x, y + 42, width, 6, this.settings.sfxVolume);
    }
    
    drawVideoTab(ctx, x, y, width) {
        this.drawOption(ctx, x, y, width, 'SHAKE', this.settings.screenShake ? 'ON' : 'OFF', 
            this.selectedOption === 0, false);
        this.drawOption(ctx, x, y + 20, width, 'EFFECTS', this.settings.particles ? 'ON' : 'OFF', 
            this.selectedOption === 1, false);
    }
    
    drawAccessibilityTab(ctx, x, y, width) {
        this.drawOption(ctx, x, y, width, 'COLORBLIND', this.settings.colorblindMode ? 'ON' : 'OFF', 
            this.selectedOption === 0, false);
        this.drawOption(ctx, x, y + 15, width, 'REDUCE MOTION', this.settings.reduceMotion ? 'ON' : 'OFF', 
            this.selectedOption === 1, false);
        this.drawOption(ctx, x, y + 30, width, 'TEXT SCALE', this.settings.textScale + 'X', 
            this.selectedOption === 2, true);
        this.drawOption(ctx, x, y + 45, width, 'CONTRAST', this.settings.highContrast ? 'ON' : 'OFF', 
            this.selectedOption === 3, false);
    }
    
    drawControlsTab(ctx, x, y, width) {
        const actions = ['Jump', 'Wind', 'Left', 'Right', 'Reset'];
        actions.forEach((act, i) => {
            const key = this.getRemappedKey(act) || 'DEF';
            this.drawOption(ctx, x, y + i * 14, width, act, key, this.selectedOption === i, false);
        });
    }
    
    drawOption(ctx, x, y, width, label, value, isSelected, showArrows) {
        const color = isSelected ? COLORS.GLOW_WARM : COLORS.UI_TEXT;
        drawPixelText(ctx, label.toUpperCase(), x, y, color, 1);
        
        const valText = showArrows && isSelected ? `< ${value} >` : value;
        const valW = measurePixelText(valText, 1);
        drawPixelText(ctx, valText, x + width - valW, y, isSelected ? COLORS.GLOW_WARM : COLORS.UI_MUTED, 1);
    }
    
    drawSimpleBar(ctx, x, y, width, height, vol) {
        drawPixelRect(ctx, x, y, width, height, COLORS.GAUGE_BG);
        drawPixelRect(ctx, x, y, width * vol, height, COLORS.GAUGE_FULL);
        // Segments
        for(let i=1; i<10; i++) {
            drawPixelRect(ctx, x + (width/10)*i, y, 1, height, COLORS.UI_BG);
        }
    }
    
    /**
     * Draw reset confirmation dialog (Requirement 18.7)
     */
    drawConfirmResetDialog(ctx, tick) {
        // Dialog dimensions
        const dialogW = 200;
        const dialogH = 60;
        const dialogX = (SCREEN_W - dialogW) / 2 | 0;
        const dialogY = (SCREEN_H - dialogH) / 2 | 0;
        
        // Darker overlay
        drawPixelRect(ctx, 0, 0, SCREEN_W, SCREEN_H, 'rgba(0,0,0,0.5)');
        
        // Dialog panel
        drawPixelBorder(ctx, dialogX, dialogY, dialogW, dialogH,
            COLORS.UI_BORDER_L, COLORS.UI_BORDER_D, COLORS.UI_BG, 2);
        
        // Title
        const title = 'RESET TO DEFAULTS?';
        const titleW = measurePixelText(title, 1);
        drawPixelText(ctx, title, (SCREEN_W - titleW) / 2 | 0, dialogY + 8, COLORS.GAUGE_LOW, 1);
        
        // Warning message
        const warning = 'This will reset all settings.';
        const warningW = measurePixelText(warning, 1);
        drawPixelText(ctx, warning, (SCREEN_W - warningW) / 2 | 0, dialogY + 22, COLORS.UI_MUTED, 1);
        
        // Buttons
        const buttonY = dialogY + 38;
        const buttonW = 70;
        const buttonH = 14;
        const buttonSpacing = 10;
        const totalButtonW = buttonW * 2 + buttonSpacing;
        const buttonStartX = (SCREEN_W - totalButtonW) / 2 | 0;
        
        // Cancel button
        const cancelSelected = this.confirmResetSelection === 0;
        const cancelX = buttonStartX;
        this.drawButton(ctx, cancelX, buttonY, buttonW, buttonH, 'CANCEL', cancelSelected);
        
        // Confirm button
        const confirmSelected = this.confirmResetSelection === 1;
        const confirmX = buttonStartX + buttonW + buttonSpacing;
        this.drawButton(ctx, confirmX, buttonY, buttonW, buttonH, 'CONFIRM', confirmSelected);
    }
    
    /**
     * Draw a button
     */
    drawButton(ctx, x, y, width, height, label, isSelected) {
        // Background
        const bgColor = isSelected ? COLORS.UI_BORDER_D : COLORS.UI_BG;
        drawPixelRect(ctx, x, y, width, height, bgColor);
        
        // Border
        const borderColor = isSelected ? COLORS.GLOW_WARM : COLORS.UI_BORDER_D;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(x, y, width, height);
        
        // Label
        const labelColor = isSelected ? COLORS.GLOW_WARM : COLORS.UI_TEXT;
        const labelW = measurePixelText(label, 1);
        const labelX = x + (width - labelW) / 2 | 0;
        const labelY = y + (height - 8) / 2 | 0;
        drawPixelText(ctx, label, labelX, labelY, labelColor, 1);
    }
    
    /**
     * Wrap text to fit within a given width
     */
    wrapText(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const testWidth = measurePixelText(testLine, 1);
            
            if (testWidth <= maxWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        }
        
        if (currentLine) lines.push(currentLine);
        return lines;
    }
}

// Export singleton instance
export const settingsMenu = new SettingsMenu();
