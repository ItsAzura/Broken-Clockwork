/*
 * tutorialSystem.js
 * Tutorial System for Level 0 - Progressive mechanic introduction
 * 
 * Implements incremental teaching of game mechanics:
 * 1. Movement (WASD/arrows)
 * 2. Jumping (Space/Up)
 * 3. Wind system (E key + gauge)
 * 4. Trap introduction (single Fake Safe Zone)
 * 5. Completion (gear collection + exit)
 */

import { COLORS, TILE, OBJ, AUTO } from './constants.js';
import { drawPixelText, measurePixelText } from './draw.js';

export class TutorialSystem {
    constructor() {
        this.currentSection = 0;
        this.sections = [
            {
                id: 'movement',
                name: 'Movement',
                instruction: 'Use WASD or Arrow Keys to move',
                completed: false,
                checkCompletion: (game) => {
                    // Complete when player moves 32 pixels from spawn
                    const distance = Math.abs(game.player.x - game.lastSpawn.x) + 
                                   Math.abs(game.player.y - game.lastSpawn.y);
                    return distance > 32;
                }
            },
            {
                id: 'jumping',
                name: 'Jumping',
                instruction: 'Press SPACE or UP to jump',
                completed: false,
                checkCompletion: (game) => {
                    // Complete when player has jumped (not on ground for 10+ frames)
                    return game.player.airTime > 10;
                }
            },
            {
                id: 'wind',
                name: 'Wind System',
                instruction: 'Hold E near objects to wind them up',
                completed: false,
                checkCompletion: (game) => {
                    // Complete when player has used wind system (any object activated)
                    return game.objects.some(obj => obj.activated || obj.isWound);
                }
            },
            {
                id: 'trap',
                name: 'Trap Awareness',
                instruction: 'Beware! Some safe zones are fake...',
                completed: false,
                checkCompletion: (game) => {
                    // Complete when player survives the fake safe zone activation
                    return game.fakeSafeZones.length > 0 && game.fakeSafeZones[0].activated;
                }
            },
            {
                id: 'completion',
                name: 'Level Completion',
                instruction: 'Collect all gears and reach the exit',
                completed: false,
                checkCompletion: (game) => {
                    // Complete when all gears collected
                    return game.gearsCollected === game.gearTokens.length;
                }
            }
        ];
        this.instructionTimer = 0;
        this.showInstructions = true;
    }

    /**
     * Create Level 0 tutorial data
     * Progressive layout with sections for each mechanic
     */
    createTutorialLevel() {
        return {
            id: 0,
            name: 'TUTORIAL - FIRST STEPS',
            tilemap: [
                'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
                'W................................................W',
                'W................................................W',
                'W..P.............................................W',
                'W................................................W',
                'W................................................W',
                'WFFFF.......FFFF.......FFFF.......FFFF.......FFFW',
                '..................................................',
                '..................................................',
                '..................................................',
                '..................................................',
                '..................................................',
                '..................................................',
                '..................................................',
                '..................................................',
                '..................................................',
                '..................................................',
            ],
            objects: [
                // Movement section - no objects needed
                
                // Jumping section - platform to jump onto
                { type: OBJ.PLATFORM_SLIDE, x: 128, y: 96, w: 32, h: 4, duration: 0, ax: 128, bx: 128 },
                
                // Wind section - clock station and lever
                { type: OBJ.CLOCK_STATION, x: 192, y: 80 },
                { type: OBJ.LEVER, x: 224, y: 80 },
                
                // Trap section - fake safe zone trigger
                { type: OBJ.PLATFORM_SLIDE, x: 320, y: 96, w: 24, h: 4, duration: 0, ax: 320, bx: 320 },
                
                // Completion section - exit platform
                { type: OBJ.PLATFORM_SLIDE, x: 416, y: 96, w: 32, h: 4, duration: 0, ax: 416, bx: 416 }
            ],
            autonomousObstacles: [
                // Trap section - single piston for fake safe zone
                { 
                    type: AUTO.PISTON, 
                    id: 'tutorial_piston', 
                    x: 288, y: 80,
                    ax: 288, ay: 80, bx: 288, by: 96,
                    w: 8, h: 8, 
                    speed: Math.PI, 
                    initiallyActive: false 
                }
            ],
            gearTokens: [
                { x: 72, y: 64 },   // Movement section
                { x: 144, y: 64 },  // Jumping section  
                { x: 240, y: 64 },  // Wind section
                { x: 336, y: 64 },  // Trap section
                { x: 432, y: 64 }   // Completion section
            ],
            goalTrigger: { x: 448, y: 80, w: 16, h: 16 },
            playerSpawn: { x: 32, y: 80 },
            lethalZones: [
                { x: 0, y: 112, w: 1600, h: 1000 }
            ],
            // Tutorial-specific trap system
            triggerTiles: [],
            fakeSafeZones: [
                { 
                    x: 304, y: 96, w: 24, h: 16, 
                    delay: 1.0, 
                    obstacleIds: ['tutorial_piston'] 
                }
            ],
            trollTokens: [],
            hiddenKillGears: [],
            baitPaths: [],
            oneFrameWindows: [],
            phaseShiftObstacles: [],
            almostMomentTrap: null,
            mirrorCorridors: [],
            colorBetrayalZones: [],
            
            // Tutorial flags
            isTutorial: true,
            tutorialSections: this.sections.map(s => ({ ...s }))
        };
    }

    /**
     * Get current active tutorial section
     */
    getCurrentSection() {
        return this.sections[this.currentSection] || null;
    }

    /**
     * Advance to next tutorial section
     */
    advanceSection() {
        if (this.currentSection < this.sections.length - 1) {
            this.sections[this.currentSection].completed = true;
            this.currentSection++;
            this.instructionTimer = 5.0; // Show new instruction for 5 seconds
            return true;
        } else if (this.currentSection === this.sections.length - 1) {
            // Mark the last section as completed
            this.sections[this.currentSection].completed = true;
            return false; // Can't advance further
        }
        return false;
    }

    /**
     * Update tutorial system - check section completion and advance
     */
    update(dt, game) {
        // Update instruction timer
        if (this.instructionTimer > 0) {
            this.instructionTimer -= dt;
        }

        // Check if current section is completed
        const currentSection = this.getCurrentSection();
        if (currentSection && !currentSection.completed) {
            if (currentSection.checkCompletion(game)) {
                this.advanceSection();
                
                // Play completion sound/effect
                if (game.particles && game.player) {
                    // Spawn celebration particles
                    for (let i = 0; i < 8; i++) {
                        game.particles.push({
                            x: game.player.x + Math.random() * 8,
                            y: game.player.y + Math.random() * 8,
                            vx: (Math.random() - 0.5) * 60,
                            vy: (Math.random() - 0.5) * 60,
                            life: 1.0,
                            maxLife: 1.0,
                            color: COLORS.GLOW_WARM
                        });
                    }
                }
            }
        }
    }

    /**
     * Check if tutorial is complete
     */
    isTutorialComplete() {
        return this.sections.every(section => section.completed);
    }

    /**
     * Mark specific section as complete (for external triggers)
     */
    markSectionComplete(sectionId) {
        const section = this.sections.find(s => s.id === sectionId);
        if (section) {
            section.completed = true;
            // Advance if this is the current section
            if (this.sections[this.currentSection]?.id === sectionId) {
                this.advanceSection();
            }
        }
    }

    /**
     * Show tutorial instructions on screen
     */
    showInstructions(sectionId) {
        const section = this.sections.find(s => s.id === sectionId);
        if (section) {
            this.instructionTimer = 3.0;
            return section.instruction;
        }
        return null;
    }

    /**
     * Hide current instructions
     */
    hideInstructions() {
        this.instructionTimer = 0;
        this.showInstructions = false;
    }

    /**
     * Draw tutorial UI elements
     */
    drawTutorialUI(ctx, game) {
        const currentSection = this.getCurrentSection();
        if (!currentSection || this.instructionTimer <= 0) return;

        // Draw instruction text at top of screen
        const text = currentSection.instruction;
        const textWidth = measurePixelText(text);
        const x = (320 - textWidth) / 2; // Center horizontally
        const y = 20;

        // Draw background box
        ctx.fillStyle = COLORS.UI_BG;
        ctx.fillRect(x - 4, y - 2, textWidth + 8, 12);
        
        // Draw border
        ctx.fillStyle = COLORS.TILE_LIGHT;
        ctx.fillRect(x - 5, y - 3, textWidth + 10, 1);
        ctx.fillRect(x - 5, y + 9, textWidth + 10, 1);
        ctx.fillRect(x - 5, y - 3, 1, 13);
        ctx.fillRect(x + textWidth + 4, y - 3, 1, 13);

        // Draw instruction text
        drawPixelText(ctx, text, x, y, COLORS.TEXT_LIGHT);

        // Draw progress indicator
        const progressY = y + 16;
        const progressWidth = 100;
        const progressX = (320 - progressWidth) / 2;
        
        // Progress background
        ctx.fillStyle = COLORS.UI_BG;
        ctx.fillRect(progressX, progressY, progressWidth, 4);
        
        // Progress fill
        const progress = (this.currentSection + 1) / this.sections.length;
        ctx.fillStyle = COLORS.GLOW_WARM;
        ctx.fillRect(progressX, progressY, progressWidth * progress, 4);

        // Section indicators
        for (let i = 0; i < this.sections.length; i++) {
            const sectionX = progressX + (i / (this.sections.length - 1)) * (progressWidth - 4);
            const color = this.sections[i].completed ? COLORS.GLOW_WARM : 
                         i === this.currentSection ? COLORS.TEXT_LIGHT : COLORS.UI_BG;
            ctx.fillStyle = color;
            ctx.fillRect(sectionX, progressY - 2, 4, 8);
        }
    }

    /**
     * Reset tutorial progress
     */
    reset() {
        this.currentSection = 0;
        this.instructionTimer = 5.0; // Show first instruction
        this.showInstructions = true;
        
        for (const section of this.sections) {
            section.completed = false;
        }
    }

    /**
     * Get tutorial completion percentage
     */
    getCompletionPercentage() {
        const completedSections = this.sections.filter(s => s.completed).length;
        return (completedSections / this.sections.length) * 100;
    }

    /**
     * Skip to specific section (for testing/debugging)
     */
    skipToSection(sectionIndex) {
        if (sectionIndex >= 0 && sectionIndex < this.sections.length) {
            // Mark all previous sections as completed
            for (let i = 0; i < sectionIndex; i++) {
                this.sections[i].completed = true;
            }
            this.currentSection = sectionIndex;
            this.instructionTimer = 3.0;
        }
    }
}

// Export singleton instance
export const tutorialSystem = new TutorialSystem();