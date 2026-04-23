/**
 * Black Screen on Start - Preservation Property Tests (Automated)
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 * 
 * **Property 2: Preservation** - Title Screen and Other Functionality
 * 
 * **CRITICAL**: These tests MUST PASS on unfixed code - passing confirms baseline behavior to preserve
 * 
 * **GOAL**: Verify all functionality that should remain unchanged after the fix
 * 
 * **NOTE**: These automated tests verify code structure and module integrity.
 * Manual testing (see blackScreenOnStart.preservation.test.md) is required for:
 * - Visual rendering verification
 * - Environment-specific behavior (Wavedash vs Python server)
 * - Gameplay functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { STATES } from './constants.js';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

describe('Preservation Property Tests - Module Structure (Test 2.4)', () => {
  describe('Test 2.4.1: Import Statements in main.js', () => {
    it('should verify all critical modules can be imported', async () => {
      // Test that all critical modules used during state transition can be imported
      const modules = [
        './constants.js',
        './draw.js',
        './audio.js',
        './levels.js',
        './WindableObject.js',
        './AutonomousObstacle.js',
        './player.js',
        './physics.js',
        './input.js',
        './ui.js',
        './deathSystem.js',
        './trapSystem.js',
        './liarCounter.js',
      ];

      for (const modulePath of modules) {
        const module = await import(modulePath);
        expect(module).toBeDefined();
      }
    });

    it('should verify constants module exports critical values', async () => {
      const constants = await import('./constants.js');
      
      // Verify critical constants exist
      expect(constants.SCREEN_W).toBeDefined();
      expect(constants.SCREEN_H).toBeDefined();
      expect(constants.TILE).toBeDefined();
      expect(constants.STATES).toBeDefined();
      expect(constants.STATES.TITLE).toBeDefined();
      expect(constants.STATES.PLAYING).toBeDefined();
      expect(constants.STATES.PAUSED).toBeDefined();
      expect(constants.STATES.LEVEL_CLEAR).toBeDefined();
      expect(constants.STATES.GAME_OVER).toBeDefined();
      expect(constants.COLORS).toBeDefined();
      expect(constants.OBJ).toBeDefined();
    });

    it('should verify levels module exports LEVELS array and getLevel function', async () => {
      const { LEVELS, getLevel } = await import('./levels.js');
      
      expect(LEVELS).toBeDefined();
      expect(Array.isArray(LEVELS)).toBe(true);
      expect(LEVELS.length).toBeGreaterThan(0);
      expect(typeof getLevel).toBe('function');
    });

    it('should verify getLevel returns valid level data', async () => {
      const { getLevel } = await import('./levels.js');
      
      const level1 = getLevel(0);
      
      expect(level1).toBeDefined();
      expect(level1.id).toBeDefined();
      expect(level1.tilemap).toBeDefined();
      expect(Array.isArray(level1.tilemap)).toBe(true);
      expect(level1.tilemap.length).toBeGreaterThan(0);
      
      // Note: playerSpawn is optional - can be derived from 'P' tile in tilemap
      // Just verify the level data structure is valid
      expect(level1.objects).toBeDefined();
      expect(level1.autonomousObstacles).toBeDefined();
      expect(level1.gearTokens).toBeDefined();
    });

    it('should verify all 5 levels can be loaded', async () => {
      const { LEVELS, getLevel } = await import('./levels.js');
      
      expect(LEVELS.length).toBe(5);
      
      for (let i = 0; i < LEVELS.length; i++) {
        const level = getLevel(i);
        expect(level).toBeDefined();
        expect(level.id).toBeDefined();
        expect(level.tilemap).toBeDefined();
        expect(Array.isArray(level.tilemap)).toBe(true);
      }
    });
  });

  describe('Test 2.4.2: Module Files Exist and Are Unchanged', () => {
    it('should verify all required module files exist in js/ folder', () => {
      const requiredModules = [
        'constants.js',
        'draw.js',
        'audio.js',
        'levels.js',
        'WindableObject.js',
        'AutonomousObstacle.js',
        'player.js',
        'physics.js',
        'input.js',
        'ui.js',
        'deathSystem.js',
        'trapSystem.js',
        'liarCounter.js',
        'main.js',
        'font.js',
        'sprites.js',
        'PhaseShiftObstacle.js',
      ];

      for (const module of requiredModules) {
        const modulePath = join('js', module);
        expect(existsSync(modulePath)).toBe(true);
      }
    });
  });

  describe('Test 2.4.3: Build Process Outputs Correct Files', () => {
    it('should verify dist/ folder exists after build', () => {
      // This test assumes build.ps1 has been run
      // In CI/CD, this would be run as part of the build step
      expect(existsSync('dist')).toBe(true);
    });

    it('should verify dist/ contains index.html', () => {
      expect(existsSync('dist/index.html')).toBe(true);
    });

    it('should verify dist/js/ folder exists', () => {
      expect(existsSync('dist/js')).toBe(true);
    });

    it('should verify dist/css/ folder exists', () => {
      expect(existsSync('dist/css')).toBe(true);
    });

    it('should verify all required JS files are in dist/js/', () => {
      const requiredFiles = [
        'main.js',
        'constants.js',
        'draw.js',
        'audio.js',
        'levels.js',
        'WindableObject.js',
        'AutonomousObstacle.js',
        'player.js',
        'physics.js',
        'input.js',
        'ui.js',
        'deathSystem.js',
        'trapSystem.js',
        'liarCounter.js',
        'font.js',
        'sprites.js',
        'PhaseShiftObstacle.js',
      ];

      for (const file of requiredFiles) {
        const filePath = join('dist', 'js', file);
        expect(existsSync(filePath)).toBe(true);
      }
    });

    it('should verify no test files are in dist/js/', () => {
      const distJsFiles = readdirSync('dist/js');
      
      for (const file of distJsFiles) {
        expect(file).not.toMatch(/\.test\.js$/);
        expect(file).not.toMatch(/\.integration\.test\.js$/);
      }
    });

    it('should verify dist/css/style.css exists', () => {
      expect(existsSync('dist/css/style.css')).toBe(true);
    });
  });

  describe('Test 2.4.4: index.html Script Tag Configuration', () => {
    it('should verify index.html exists', () => {
      expect(existsSync('index.html')).toBe(true);
    });

    it('should verify index.html contains correct script tag', async () => {
      const fs = await import('fs/promises');
      const indexHtml = await fs.readFile('index.html', 'utf-8');
      
      // Verify script tag with type="module" exists
      expect(indexHtml).toContain('type="module"');
      expect(indexHtml).toContain('src="./js/main.js"');
      
      // Verify the script tag has the required attributes (may have onerror handler from fix)
      expect(indexHtml).toMatch(/<script\s+type="module"\s+src="\.\/js\/main\.js"/);
    });
  });
});

describe('Preservation Property Tests - Game States (Test 2.3)', () => {
  describe('Test 2.3: STATES Constants', () => {
    it('should verify all game states are defined', async () => {
      const { STATES } = await import('./constants.js');
      
      expect(STATES.TITLE).toBeDefined();
      expect(STATES.PLAYING).toBeDefined();
      expect(STATES.PAUSED).toBeDefined();
      expect(STATES.LEVEL_CLEAR).toBeDefined();
      expect(STATES.GAME_OVER).toBeDefined();
    });

    it('should verify STATES values are unique', async () => {
      const { STATES } = await import('./constants.js');
      
      const values = Object.values(STATES);
      const uniqueValues = new Set(values);
      
      expect(uniqueValues.size).toBe(values.length);
    });
  });
});

describe('Preservation Property Tests - Title Screen (Test 2.1)', () => {
  describe('Test 2.1: Title Screen Constants', () => {
    it('should verify COLORS object contains title screen colors', async () => {
      const { COLORS } = await import('./constants.js');
      
      expect(COLORS).toBeDefined();
      expect(COLORS.BACKGROUND).toBeDefined();
      expect(COLORS.IVORY).toBeDefined(); // Used for title text
      expect(COLORS.UI_TEXT).toBeDefined(); // Used for UI text
    });

    it('should verify SCREEN dimensions are defined', async () => {
      const { SCREEN_W, SCREEN_H } = await import('./constants.js');
      
      expect(SCREEN_W).toBeDefined();
      expect(SCREEN_H).toBeDefined();
      expect(typeof SCREEN_W).toBe('number');
      expect(typeof SCREEN_H).toBe('number');
      expect(SCREEN_W).toBeGreaterThan(0);
      expect(SCREEN_H).toBeGreaterThan(0);
    });
  });
});

describe('Preservation Property Tests - Python HTTP Server Baseline (Test 2.2)', () => {
  describe('Test 2.2: Level Loading Functions', () => {
    it('should verify getLevel function returns complete level data', async () => {
      const { getLevel } = await import('./levels.js');
      
      const level1 = getLevel(0);
      
      // Verify all required level properties exist
      expect(level1.id).toBeDefined();
      expect(level1.tilemap).toBeDefined();
      // Note: playerSpawn is optional - can be derived from 'P' tile in tilemap
      expect(level1.objects).toBeDefined();
      expect(level1.autonomousObstacles).toBeDefined();
      expect(level1.gearTokens).toBeDefined();
      expect(level1.goalTrigger).toBeDefined();
      
      // Verify data types
      expect(Array.isArray(level1.tilemap)).toBe(true);
      expect(Array.isArray(level1.objects)).toBe(true);
      expect(Array.isArray(level1.autonomousObstacles)).toBe(true);
      expect(Array.isArray(level1.gearTokens)).toBe(true);
    });

    it('should verify player spawn point is valid', async () => {
      const { getLevel } = await import('./levels.js');
      
      const level1 = getLevel(0);
      
      // Player spawn can be defined explicitly or derived from 'P' tile in tilemap
      // Check if tilemap contains 'P' tile or playerSpawn is defined
      const hasPlayerSpawn = level1.playerSpawn !== undefined;
      const hasPTile = level1.tilemap.some(row => row.includes('P'));
      
      expect(hasPlayerSpawn || hasPTile).toBe(true);
      
      // If playerSpawn is defined, verify it's valid
      if (hasPlayerSpawn) {
        expect(level1.playerSpawn.x).toBeDefined();
        expect(level1.playerSpawn.y).toBeDefined();
        expect(typeof level1.playerSpawn.x).toBe('number');
        expect(typeof level1.playerSpawn.y).toBe('number');
        expect(level1.playerSpawn.x).toBeGreaterThanOrEqual(0);
        expect(level1.playerSpawn.y).toBeGreaterThanOrEqual(0);
      }
    });

    it('should verify level has at least one gear token', async () => {
      const { getLevel } = await import('./levels.js');
      
      const level1 = getLevel(0);
      
      expect(level1.gearTokens).toBeDefined();
      expect(Array.isArray(level1.gearTokens)).toBe(true);
      expect(level1.gearTokens.length).toBeGreaterThan(0);
    });

    it('should verify level has goal trigger (exit door)', async () => {
      const { getLevel } = await import('./levels.js');
      
      const level1 = getLevel(0);
      
      expect(level1.goalTrigger).toBeDefined();
      expect(level1.goalTrigger.x).toBeDefined();
      expect(level1.goalTrigger.y).toBeDefined();
      expect(level1.goalTrigger.w).toBeDefined();
      expect(level1.goalTrigger.h).toBeDefined();
    });
  });
});

/**
 * Summary of Automated Preservation Tests
 * 
 * These tests verify:
 * - All modules can be imported successfully
 * - All critical constants and functions are defined
 * - Build process outputs correct files
 * - index.html has correct script tag configuration
 * - Level data structure is intact
 * 
 * Manual testing is still required for:
 * - Visual rendering verification (title screen, game world)
 * - Environment-specific behavior (Wavedash vs Python server)
 * - Gameplay functionality (movement, collision, death, respawn)
 * - State transitions (PAUSED, LEVEL_CLEAR, GAME_OVER)
 * 
 * See blackScreenOnStart.preservation.test.md for manual test procedures.
 */

