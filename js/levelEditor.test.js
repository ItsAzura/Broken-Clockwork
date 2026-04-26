/*
 * levelEditor.test.js
 * Unit tests for Level Editor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LevelEditor } from './levelEditor.js';

describe('LevelEditor', () => {
    let editor;
    
    beforeEach(() => {
        editor = new LevelEditor();
    });
    
    describe('Initialization', () => {
        it('should initialize with empty tilemap', () => {
            expect(editor.tilemap).toBeDefined();
            expect(editor.tilemap.length).toBe(11); // gridHeight
            expect(editor.tilemap[0].length).toBe(20); // gridWidth
        });
        
        it('should initialize with air tiles', () => {
            for (const row of editor.tilemap) {
                for (const tile of row) {
                    expect(tile).toBe('.');
                }
            }
        });
        
        it('should initialize with empty obstacles array', () => {
            expect(editor.obstacles).toEqual([]);
        });
        
        it('should initialize with empty gear tokens array', () => {
            expect(editor.gearTokens).toEqual([]);
        });
        
        it('should initialize with null goal trigger', () => {
            expect(editor.goalTrigger).toBeNull();
        });
        
        it('should initialize with null player spawn', () => {
            expect(editor.playerSpawn).toBeNull();
        });
    });
    
    describe('Tile Placement', () => {
        it('should place wall tile', () => {
            editor.setTile(5, 5, 'W');
            expect(editor.getTile(5, 5)).toBe('W');
        });
        
        it('should place floor tile', () => {
            editor.setTile(5, 5, 'F');
            expect(editor.getTile(5, 5)).toBe('F');
        });
        
        it('should place door tile', () => {
            editor.setTile(5, 5, 'D');
            expect(editor.getTile(5, 5)).toBe('D');
        });
        
        it('should place air tile', () => {
            editor.setTile(5, 5, 'W');
            editor.setTile(5, 5, '.');
            expect(editor.getTile(5, 5)).toBe('.');
        });
        
        it('should handle out of bounds gracefully', () => {
            editor.setTile(-1, -1, 'W');
            editor.setTile(100, 100, 'W');
            // Should not throw
        });
    });
    
    describe('Obstacle Placement', () => {
        it('should place piston obstacle', () => {
            const obs = editor.placeObstacle(100, 100, 'PISTON');
            expect(obs).toBeDefined();
            expect(obs.type).toBe('PISTON');
            expect(editor.obstacles.length).toBe(1);
        });
        
        it('should place orbit sphere obstacle', () => {
            const obs = editor.placeObstacle(100, 100, 'ORBIT_SPHERE');
            expect(obs).toBeDefined();
            expect(obs.type).toBe('ORBIT_SPHERE');
        });
        
        it('should assign unique IDs to obstacles', () => {
            const obs1 = editor.placeObstacle(100, 100, 'PISTON');
            const obs2 = editor.placeObstacle(150, 150, 'PISTON');
            expect(obs1.id).not.toBe(obs2.id);
        });
    });
    
    describe('Gear Token Placement', () => {
        it('should place gear token', () => {
            editor.placeGearToken(100, 100);
            expect(editor.gearTokens.length).toBe(1);
            expect(editor.gearTokens[0].x).toBe(100);
            expect(editor.gearTokens[0].y).toBe(100);
        });
        
        it('should place multiple gear tokens', () => {
            editor.placeGearToken(100, 100);
            editor.placeGearToken(150, 150);
            expect(editor.gearTokens.length).toBe(2);
        });
    });
    
    describe('Goal Trigger Placement', () => {
        it('should place goal trigger', () => {
            editor.placeGoalTrigger(100, 100);
            expect(editor.goalTrigger).toBeDefined();
            expect(editor.goalTrigger.x).toBe(100);
            expect(editor.goalTrigger.y).toBe(100);
        });
        
        it('should replace existing goal trigger', () => {
            editor.placeGoalTrigger(100, 100);
            editor.placeGoalTrigger(150, 150);
            expect(editor.goalTrigger.x).toBe(150);
            expect(editor.goalTrigger.y).toBe(150);
        });
    });
    
    describe('Player Spawn Placement', () => {
        it('should set player spawn', () => {
            editor.setPlayerSpawn(100, 100);
            expect(editor.playerSpawn).toBeDefined();
            expect(editor.playerSpawn.x).toBe(100);
            expect(editor.playerSpawn.y).toBe(100);
        });
        
        it('should replace existing player spawn', () => {
            editor.setPlayerSpawn(100, 100);
            editor.setPlayerSpawn(150, 150);
            expect(editor.playerSpawn.x).toBe(150);
            expect(editor.playerSpawn.y).toBe(150);
        });
    });
    
    describe('Level Validation', () => {
        it('should fail validation without gear tokens', () => {
            editor.placeGoalTrigger(100, 100);
            editor.setPlayerSpawn(50, 50);
            const errors = editor.validateLevel();
            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some(e => e.includes('gear token'))).toBe(true);
        });
        
        it('should fail validation without goal trigger', () => {
            editor.placeGearToken(100, 100);
            editor.setPlayerSpawn(50, 50);
            const errors = editor.validateLevel();
            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some(e => e.includes('goal trigger'))).toBe(true);
        });
        
        it('should fail validation without player spawn', () => {
            editor.placeGearToken(100, 100);
            editor.placeGoalTrigger(150, 150);
            const errors = editor.validateLevel();
            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some(e => e.includes('spawn'))).toBe(true);
        });
        
        it('should pass validation with all required elements', () => {
            editor.placeGearToken(100, 100);
            editor.placeGoalTrigger(150, 150);
            editor.setPlayerSpawn(50, 50);
            const errors = editor.validateLevel();
            expect(errors.length).toBe(0);
        });
    });
    
    describe('Export/Import', () => {
        it('should export valid level as JSON', () => {
            editor.placeGearToken(100, 100);
            editor.placeGoalTrigger(150, 150);
            editor.setPlayerSpawn(50, 50);
            editor.setTile(5, 5, 'W');
            
            const json = editor.exportLevel();
            expect(json).toBeDefined();
            expect(json).toContain('tilemap');
            expect(json).toContain('gearTokens');
            expect(json).toContain('goalTrigger');
        });
        
        it('should not export invalid level', () => {
            const json = editor.exportLevel();
            expect(json).toBeNull();
            expect(editor.validationErrors.length).toBeGreaterThan(0);
        });
        
        it('should import valid level JSON', () => {
            const levelData = {
                tilemap: editor.tilemap,
                autonomousObstacles: [],
                gearTokens: [{ x: 100, y: 100 }],
                goalTrigger: { x: 150, y: 150, w: 16, h: 16 },
                playerSpawn: { x: 50, y: 50 }
            };
            
            const success = editor.importLevel(JSON.stringify(levelData));
            expect(success).toBe(true);
            expect(editor.gearTokens.length).toBe(1);
            expect(editor.goalTrigger).toBeDefined();
            expect(editor.playerSpawn).toBeDefined();
        });
        
        it('should reject invalid JSON', () => {
            const success = editor.importLevel('invalid json');
            expect(success).toBe(false);
            expect(editor.validationErrors.length).toBeGreaterThan(0);
        });
    });
    
    describe('Clear Level', () => {
        it('should clear all level data', () => {
            editor.placeGearToken(100, 100);
            editor.placeGoalTrigger(150, 150);
            editor.setPlayerSpawn(50, 50);
            editor.setTile(5, 5, 'W');
            editor.placeObstacle(100, 100, 'PISTON');
            
            editor.clearLevel();
            
            expect(editor.gearTokens.length).toBe(0);
            expect(editor.obstacles.length).toBe(0);
            expect(editor.goalTrigger).toBeNull();
            expect(editor.playerSpawn).toBeNull();
            expect(editor.getTile(5, 5)).toBe('.');
        });
    });
});
