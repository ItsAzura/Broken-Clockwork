/*
 * saveSystem.test.js
 * Unit tests for SaveSystem class
 * 
 * Tests cover:
 * - LocalStorage availability detection
 * - Data serialization/deserialization
 * - Corruption recovery
 * - Import/export functionality
 * - Auto-save triggers
 * - Error handling and fallbacks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SaveSystem } from './saveSystem.js';

// Mock localStorage for testing
const createMockLocalStorage = () => {
    const store = new Map();
    return {
        getItem: vi.fn((key) => store.get(key) || null),
        setItem: vi.fn((key, value) => {
            if (typeof value !== 'string') {
                throw new Error('Value must be a string');
            }
            store.set(key, value);
        }),
        removeItem: vi.fn((key) => store.delete(key)),
        clear: vi.fn(() => store.clear()),
        get length() { return store.size; },
        key: vi.fn((index) => Array.from(store.keys())[index] || null)
    };
};

describe('SaveSystem', () => {
    let saveSystem;
    let mockLocalStorage;
    let originalLocalStorage;

    beforeEach(() => {
        // Mock localStorage
        mockLocalStorage = createMockLocalStorage();
        originalLocalStorage = global.localStorage;
        global.localStorage = mockLocalStorage;
        
        // Create fresh SaveSystem instance
        saveSystem = new SaveSystem();
    });

    afterEach(() => {
        // Restore original localStorage
        global.localStorage = originalLocalStorage;
        
        // Clear any test data
        if (saveSystem) {
            saveSystem.clearAllData();
        }
    });

    describe('LocalStorage Availability', () => {
        it('should detect LocalStorage availability', () => {
            expect(saveSystem.checkLocalStorageAvailability()).toBe(true);
        });

        it('should handle LocalStorage unavailability gracefully', () => {
            // Mock localStorage to throw error
            global.localStorage = {
                setItem: vi.fn(() => { throw new Error('LocalStorage disabled'); }),
                getItem: vi.fn(() => { throw new Error('LocalStorage disabled'); }),
                removeItem: vi.fn(() => { throw new Error('LocalStorage disabled'); })
            };

            const fallbackSaveSystem = new SaveSystem();
            expect(fallbackSaveSystem.isLocalStorageAvailable).toBe(false);
        });
    });

    describe('Default Save Data', () => {
        it('should create valid default save data structure', () => {
            const defaultData = saveSystem.createDefaultSaveData();
            
            expect(defaultData).toHaveProperty('version', '1.0');
            expect(defaultData).toHaveProperty('player');
            expect(defaultData).toHaveProperty('progression');
            expect(defaultData).toHaveProperty('settings');
            expect(defaultData).toHaveProperty('statistics');
            expect(defaultData).toHaveProperty('progressTracking');
            expect(defaultData).toHaveProperty('analytics');
            
            // Validate player data
            expect(defaultData.player.totalDeaths).toBe(0);
            expect(defaultData.player.currentLevel).toBe(1);
            expect(defaultData.player.tutorialCompleted).toBe(false);
            
            // Validate progression data
            expect(defaultData.progression.unlockedSkins).toEqual(['default']);
            expect(defaultData.progression.unlockedAchievements).toEqual([]);
            
            // Validate settings data
            expect(defaultData.settings.difficulty).toBe('Normal');
            expect(defaultData.settings.selectedSkin).toBe('default');
        });
    });

    describe('Data Validation', () => {
        it('should validate correct save data structure', () => {
            const validData = saveSystem.createDefaultSaveData();
            expect(saveSystem.validateData(validData)).toBe(true);
        });

        it('should reject invalid data structures', () => {
            expect(saveSystem.validateData(null)).toBe(false);
            expect(saveSystem.validateData({})).toBe(false);
            expect(saveSystem.validateData({ version: '1.0' })).toBe(false);
            
            const invalidData = {
                version: '1.0',
                player: null,
                progression: {},
                settings: {},
                statistics: {}
            };
            expect(saveSystem.validateData(invalidData)).toBe(false);
        });

        it('should validate player data requirements', () => {
            const invalidPlayerData = saveSystem.createDefaultSaveData();
            invalidPlayerData.player.totalDeaths = 'invalid';
            expect(saveSystem.validateData(invalidPlayerData)).toBe(false);
        });

        it('should validate progression data requirements', () => {
            const invalidProgressionData = saveSystem.createDefaultSaveData();
            invalidProgressionData.progression.unlockedSkins = 'invalid';
            expect(saveSystem.validateData(invalidProgressionData)).toBe(false);
        });
    });

    describe('Save and Load Operations', () => {
        it('should save and load data successfully', () => {
            const testData = saveSystem.createDefaultSaveData();
            testData.player.totalDeaths = 42;
            testData.player.currentLevel = 3;
            
            const saveResult = saveSystem.save(testData);
            expect(saveResult).toBe(true);
            
            const loadedData = saveSystem.load();
            expect(loadedData.player.totalDeaths).toBe(42);
            expect(loadedData.player.currentLevel).toBe(3);
        });

        it('should return default data when no save exists', () => {
            const loadedData = saveSystem.load();
            const defaultData = saveSystem.createDefaultSaveData();
            
            expect(loadedData.player.totalDeaths).toBe(defaultData.player.totalDeaths);
            expect(loadedData.player.currentLevel).toBe(defaultData.player.currentLevel);
        });

        it('should check save existence correctly', () => {
            expect(saveSystem.exists()).toBe(false);
            
            const testData = saveSystem.createDefaultSaveData();
            saveSystem.save(testData);
            
            expect(saveSystem.exists()).toBe(true);
        });

        it('should handle save data corruption gracefully', () => {
            // Manually corrupt localStorage data
            mockLocalStorage.setItem('broken_clockwork_save_data', 'invalid json');
            
            const loadedData = saveSystem.load();
            const defaultData = saveSystem.createDefaultSaveData();
            
            expect(loadedData.player.totalDeaths).toBe(defaultData.player.totalDeaths);
        });
    });

    describe('Export and Import', () => {
        it('should export save data as JSON string', () => {
            const testData = saveSystem.createDefaultSaveData();
            testData.player.totalDeaths = 100;
            saveSystem.save(testData);
            
            const exportedData = saveSystem.exportData();
            expect(typeof exportedData).toBe('string');
            
            const parsed = JSON.parse(exportedData);
            expect(parsed.player.totalDeaths).toBe(100);
        });

        it('should import save data from JSON string', () => {
            const testData = saveSystem.createDefaultSaveData();
            testData.player.totalDeaths = 200;
            testData.progression.unlockedSkins.push('golden');
            
            const jsonString = JSON.stringify(testData);
            const importedData = saveSystem.importData(jsonString);
            
            expect(importedData.player.totalDeaths).toBe(200);
            expect(importedData.progression.unlockedSkins).toContain('golden');
        });

        it('should reject invalid import data', () => {
            expect(() => {
                saveSystem.importData('invalid json');
            }).toThrow();
            
            expect(() => {
                saveSystem.importData('{"invalid": "structure"}');
            }).toThrow();
        });
    });

    describe('Auto-Save Triggers', () => {
        it('should auto-save on level completion', () => {
            const initialData = saveSystem.createDefaultSaveData();
            saveSystem.save(initialData);
            
            saveSystem.onLevelComplete(1, 15, 120000);
            
            const savedData = saveSystem.load();
            expect(savedData.player.levelsCompleted).toContain(1);
            expect(savedData.statistics.levelStats[1]).toBeDefined();
            expect(savedData.statistics.levelStats[1].completions).toBe(1);
            expect(savedData.statistics.levelStats[1].bestDeaths).toBe(15);
        });

        it('should auto-save on skin unlock', () => {
            const initialData = saveSystem.createDefaultSaveData();
            saveSystem.save(initialData);
            
            saveSystem.onUnlock('skin', 'golden');
            
            const savedData = saveSystem.load();
            expect(savedData.progression.unlockedSkins).toContain('golden');
        });

        it('should auto-save on achievement unlock', () => {
            const initialData = saveSystem.createDefaultSaveData();
            saveSystem.save(initialData);
            
            saveSystem.onUnlock('achievement', 'first_blood');
            
            const savedData = saveSystem.load();
            expect(savedData.progression.unlockedAchievements).toContain('first_blood');
            expect(savedData.statistics.achievements.first_blood).toBeDefined();
        });

        it('should auto-save on settings change', () => {
            const initialData = saveSystem.createDefaultSaveData();
            saveSystem.save(initialData);
            
            saveSystem.onSettingsChange({ difficulty: 'Hardcore', selectedSkin: 'ghost' });
            
            const savedData = saveSystem.load();
            expect(savedData.settings.difficulty).toBe('Hardcore');
            expect(savedData.settings.selectedSkin).toBe('ghost');
        });
    });

    describe('Progress Tracking', () => {
        it('should update personal best distances', () => {
            const initialData = saveSystem.createDefaultSaveData();
            saveSystem.save(initialData);
            
            const replayData = { frames: [{ x: 100, y: 200 }] };
            saveSystem.updateProgressTracking(1, 500, replayData);
            
            const savedData = saveSystem.load();
            expect(savedData.progressTracking.personalBests[1]).toBe(500);
            expect(savedData.progressTracking.ghostReplays[1]).toEqual(replayData);
        });

        it('should only update personal best when distance is greater', () => {
            const initialData = saveSystem.createDefaultSaveData();
            saveSystem.save(initialData);
            
            saveSystem.updateProgressTracking(1, 500);
            saveSystem.updateProgressTracking(1, 300); // Lower distance
            
            const savedData = saveSystem.load();
            expect(savedData.progressTracking.personalBests[1]).toBe(500);
        });
    });

    describe('Data Migration', () => {
        it('should handle current version data without migration', () => {
            const currentData = saveSystem.createDefaultSaveData();
            const migratedData = saveSystem.migrateSaveData(currentData);
            
            expect(migratedData).toEqual(currentData);
        });

        it('should migrate legacy data', () => {
            const legacyData = {
                totalDeaths: 50,
                currentLevel: 3
            };
            
            const migratedData = saveSystem.migrateFromLegacy(legacyData);
            
            expect(migratedData.version).toBe('1.0');
            expect(migratedData.player.totalDeaths).toBe(50);
            expect(migratedData.player.currentLevel).toBe(3);
        });

        it('should handle future version data gracefully', () => {
            const futureData = {
                version: '2.0',
                player: { totalDeaths: 100 },
                newFeature: { someData: 'test' }
            };
            
            const handledData = saveSystem.handleFutureVersion(futureData);
            
            expect(handledData.version).toBe('1.0');
            expect(handledData.player.totalDeaths).toBe(100);
        });
    });

    describe('Error Handling', () => {
        it('should handle LocalStorage quota exceeded error', () => {
            // Mock quota exceeded error
            mockLocalStorage.setItem.mockImplementation(() => {
                const error = new Error('QuotaExceededError');
                error.name = 'QuotaExceededError';
                throw error;
            });
            
            const testData = saveSystem.createDefaultSaveData();
            const result = saveSystem.save(testData);
            
            expect(result).toBe(false);
        });

        it('should fall back to in-memory storage on persistent errors', () => {
            // Mock persistent localStorage errors
            global.localStorage = {
                setItem: vi.fn(() => { throw new Error('Persistent error'); }),
                getItem: vi.fn(() => { throw new Error('Persistent error'); }),
                removeItem: vi.fn(() => { throw new Error('Persistent error'); })
            };
            
            const fallbackSaveSystem = new SaveSystem();
            const testData = fallbackSaveSystem.createDefaultSaveData();
            testData.player.totalDeaths = 42;
            
            // Should use fallback storage
            fallbackSaveSystem.save(testData);
            const loadedData = fallbackSaveSystem.load();
            
            expect(loadedData.player.totalDeaths).toBe(42);
        });
    });

    describe('Data Pruning', () => {
        it('should prune analytics data when size limit exceeded', () => {
            const testData = saveSystem.createDefaultSaveData();
            
            // Add large analytics data
            testData.analytics.sessionLengths = new Array(200).fill(60000);
            testData.analytics.deathLocations[1] = new Array(2000).fill({ x: 100, y: 200, count: 1 });
            
            saveSystem.pruneAnalyticsData(testData);
            
            expect(testData.analytics.sessionLengths.length).toBeLessThanOrEqual(100);
            expect(testData.analytics.deathLocations[1].length).toBeLessThanOrEqual(1000);
        });
    });

    describe('Utility Functions', () => {
        it('should clear all save data', () => {
            const testData = saveSystem.createDefaultSaveData();
            saveSystem.save(testData);
            
            expect(saveSystem.exists()).toBe(true);
            
            const result = saveSystem.clearAllData();
            expect(result).toBe(true);
            expect(saveSystem.exists()).toBe(false);
        });

        it('should create backup of save data', () => {
            const testData = saveSystem.createDefaultSaveData();
            saveSystem.save(testData);
            
            const result = saveSystem.createBackup();
            expect(result).toBe(true);
            
            // Verify backup exists
            const backupData = mockLocalStorage.getItem('broken_clockwork_save_data_backup');
            expect(backupData).toBeTruthy();
        });

        it('should provide system status', () => {
            const status = saveSystem.getStatus();
            
            expect(status).toHaveProperty('localStorageAvailable');
            expect(status).toHaveProperty('saveExists');
            expect(status).toHaveProperty('lastSaveTime');
            expect(status).toHaveProperty('autoSaveEnabled');
            expect(status).toHaveProperty('fallbackStorageSize');
        });
    });

    describe('Statistics Updates', () => {
        it('should update statistics data', () => {
            const initialData = saveSystem.createDefaultSaveData();
            saveSystem.save(initialData);
            
            const statsUpdate = {
                sessionCount: 5,
                totalPlayTime: 300000,
                closeCallCount: 25
            };
            
            saveSystem.updateStatistics(statsUpdate);
            
            const savedData = saveSystem.load();
            expect(savedData.statistics.sessionCount).toBe(5);
            expect(savedData.statistics.totalPlayTime).toBe(300000);
            expect(savedData.statistics.closeCallCount).toBe(25);
        });
    });
});