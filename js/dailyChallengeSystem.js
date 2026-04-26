/*
 * dailyChallengeSystem.js
 * Daily Challenge System for Game Retention & Engagement System
 *
 * Features:
 * - Date-based deterministic challenge generation (same date = same modifier)
 * - Four modifiers: double_speed, one_life, reverse_controls, invisible_obstacles
 * - Challenge completion tracking and scoring (deaths = score, lower is better)
 * - Persistence via SaveSystem
 * - Modifier application hooks for game mechanics
 *
 * Requirements: 9.1–9.9
 */

import { saveSystem } from './saveSystem.js';

// ─── Modifier definitions (Requirement 9.2) ───
const MODIFIERS = {
    double_speed: {
        id: 'double_speed',
        name: 'Double Speed',
        description: 'All obstacles move at 2x speed',
        icon: '!!',
        rules: [
            'All autonomous obstacles move at 2x their normal speed.',
            'Timing windows are cut in half.',
            'Stay calm and react faster.',
        ],
    },
    one_life: {
        id: 'one_life',
        name: 'One Life',
        description: 'One death ends the challenge',
        icon: 'X',
        rules: [
            'You only get one life.',
            'Any death immediately fails the challenge.',
            'Play carefully. Every move counts.',
        ],
    },
    reverse_controls: {
        id: 'reverse_controls',
        name: 'Reverse Controls',
        description: 'Left and right are swapped',
        icon: '<>',
        rules: [
            'Left and right movement are inverted.',
            'Press right to go left, press left to go right.',
            'All other controls remain normal.',
        ],
    },
    invisible_obstacles: {
        id: 'invisible_obstacles',
        name: 'Invisible Obstacles',
        description: 'Obstacles are hidden but still deadly',
        icon: '??',
        rules: [
            'All autonomous obstacles are invisible.',
            'Their hitboxes remain active — they will still kill you.',
            'Listen for audio cues and memorize patterns.',
        ],
    },
};

const MODIFIER_IDS = Object.keys(MODIFIERS);

/**
 * DailyChallengeSystem manages daily challenges with date-based generation,
 * modifier application, and completion tracking.
 */
export class DailyChallengeSystem {
    constructor(saveSystemInstance) {
        this._saveSystem = saveSystemInstance || saveSystem;
        this._active = false;
        this._activeModifier = null;
        this._challengeDeaths = 0;

        // Original values stored for non-destructive modifier application
        this._originalValues = {};

        // Load persisted progress
        this.loadProgress();

        console.log('[DailyChallengeSystem] Initialized');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Challenge Generation (Requirements 9.1, 9.2)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get today's challenge (deterministic based on date).
     * @returns {{ date: string, modifier: string, modifierDef: object }}
     */
    getTodayChallenge() {
        const dateStr = this._getTodayDateString();
        return this.generateChallengeForDate(dateStr);
    }

    /**
     * Generate a challenge for a specific date string (YYYY-MM-DD).
     * Same date always produces the same modifier (Requirement 9.1).
     * @param {string} dateStr
     * @returns {{ date: string, modifier: string, modifierDef: object }}
     */
    generateChallengeForDate(dateStr) {
        const seed = this._hashDateString(dateStr);
        const modifierIndex = seed % MODIFIER_IDS.length;
        const modifierId = MODIFIER_IDS[modifierIndex];
        return {
            date: dateStr,
            modifier: modifierId,
            modifierDef: MODIFIERS[modifierId],
        };
    }

    /**
     * Get today's date as YYYY-MM-DD string.
     * @returns {string}
     */
    _getTodayDateString() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /**
     * Deterministic hash of a date string to a non-negative integer.
     * @param {string} str
     * @returns {number}
     */
    _hashDateString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash * 31 + str.charCodeAt(i)) >>> 0; // keep unsigned 32-bit
        }
        return hash;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Modifier Application (Requirements 9.3–9.6)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Apply active modifiers to the game context.
     * Called when a challenge starts (after loadLevel).
     * @param {object} gameContext - the `game` object from main.js
     */
    applyModifiers(gameContext) {
        if (!this._active || !this._activeModifier) return;

        switch (this._activeModifier) {
            case 'double_speed':
                this._applyDoubleSpeed(gameContext);
                break;
            case 'invisible_obstacles':
                this._applyInvisibleObstacles(gameContext);
                break;
            // one_life and reverse_controls are handled at event time,
            // not by mutating game state here.
            default:
                break;
        }
    }

    /**
     * Remove modifiers when challenge ends (restore original values).
     * @param {object} gameContext
     */
    removeModifiers(gameContext) {
        if (!gameContext) return;

        // Restore obstacle speeds if double_speed was applied
        if (this._originalValues.obstacleSpeedMult !== undefined) {
            if (gameContext.autonomousObstacles) {
                for (const obs of gameContext.autonomousObstacles) {
                    obs.speedMult = this._originalValues.obstacleSpeedMult;
                }
            }
            delete this._originalValues.obstacleSpeedMult;
        }

        // Restore obstacle visibility if invisible_obstacles was applied
        if (this._originalValues.invisibleObstacles) {
            if (gameContext.autonomousObstacles) {
                for (const obs of gameContext.autonomousObstacles) {
                    obs._dailyChallengeInvisible = false;
                }
            }
            delete this._originalValues.invisibleObstacles;
        }

        console.log('[DailyChallengeSystem] Modifiers removed');
    }

    /**
     * Apply double_speed modifier: multiply all obstacle speeds by 2.0 (Requirement 9.3).
     * @param {object} gameContext
     */
    _applyDoubleSpeed(gameContext) {
        if (!gameContext.autonomousObstacles) return;
        this._originalValues.obstacleSpeedMult = 1; // baseline
        for (const obs of gameContext.autonomousObstacles) {
            obs.speedMult = (obs.speedMult || 1) * 2.0;
        }
        console.log('[DailyChallengeSystem] double_speed applied: obstacles at 2x speed');
    }

    /**
     * Apply invisible_obstacles modifier: mark obstacles as invisible (Requirement 9.6).
     * Hitboxes remain active; only rendering is suppressed.
     * @param {object} gameContext
     */
    _applyInvisibleObstacles(gameContext) {
        if (!gameContext.autonomousObstacles) return;
        this._originalValues.invisibleObstacles = true;
        for (const obs of gameContext.autonomousObstacles) {
            obs._dailyChallengeInvisible = true;
        }
        console.log('[DailyChallengeSystem] invisible_obstacles applied');
    }

    /**
     * Returns true if the daily challenge mode is currently active.
     * @returns {boolean}
     */
    isActive() {
        return this._active;
    }

    /**
     * Returns the active modifier id, or null if not in challenge mode.
     * @returns {string|null}
     */
    getActiveModifier() {
        return this._active ? this._activeModifier : null;
    }

    /**
     * Returns the obstacle speed multiplier for the active modifier.
     * 2.0 when double_speed is active, 1.0 otherwise (Requirement 9.3).
     * @returns {number}
     */
    getObstacleSpeedMultiplier() {
        if (this._active && this._activeModifier === 'double_speed') return 2.0;
        return 1.0;
    }

    /**
     * Returns whether an obstacle should be rendered.
     * Returns false when invisible_obstacles modifier is active (Requirement 9.6).
     * @param {object} obstacle
     * @returns {boolean}
     */
    isObstacleVisible(obstacle) {
        if (this._active && this._activeModifier === 'invisible_obstacles') return false;
        return true;
    }

    /**
     * Returns true if left/right input should be inverted (Requirement 9.5).
     * @returns {boolean}
     */
    isReverseControls() {
        return this._active && this._activeModifier === 'reverse_controls';
    }

    /**
     * Returns true if the one_life modifier is active (Requirement 9.4).
     * @returns {boolean}
     */
    isOneLive() {
        return this._active && this._activeModifier === 'one_life';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Completion Tracking (Requirements 9.7, 9.8)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Begin a challenge attempt. Records start time and resets death counter.
     */
    startChallenge() {
        const challenge = this.getTodayChallenge();
        this._active = true;
        this._activeModifier = challenge.modifier;
        this._challengeDeaths = 0;

        // Record current attempt in save data
        const saveData = this._loadSaveData();
        saveData.dailyChallenge.currentAttempt = {
            date: challenge.date,
            modifier: challenge.modifier,
            startTime: Date.now(),
            deaths: 0,
        };
        this._saveSaveData(saveData);

        console.log('[DailyChallengeSystem] Challenge started:', challenge.modifier, 'on', challenge.date);
    }

    /**
     * Record a death during the challenge attempt.
     * Called from main.js death handling.
     */
    recordDeath() {
        if (!this._active) return;
        this._challengeDeaths++;

        // Update current attempt in save data
        const saveData = this._loadSaveData();
        if (saveData.dailyChallenge.currentAttempt) {
            saveData.dailyChallenge.currentAttempt.deaths = this._challengeDeaths;
        }
        this._saveSaveData(saveData);
    }

    /**
     * Record challenge completion with final score (deaths count).
     * Lower score is better (Requirement 9.7).
     * @param {number} score - number of deaths during the attempt
     */
    completeChallenge(score) {
        if (!this._active) return;

        const challenge = this.getTodayChallenge();
        const saveData = this._loadSaveData();
        const dc = saveData.dailyChallenge;

        // Find or create today's history entry
        let entry = dc.history.find(h => h.date === challenge.date);
        if (!entry) {
            entry = {
                date: challenge.date,
                modifier: challenge.modifier,
                completed: false,
                bestScore: null,
                attempts: 0,
            };
            dc.history.push(entry);
        }

        entry.attempts++;
        entry.completed = true;
        // Lower score is better; update best score
        if (entry.bestScore === null || score < entry.bestScore) {
            entry.bestScore = score;
        }

        // Clear current attempt
        dc.currentAttempt = null;

        this._saveSaveData(saveData);
        this._active = false;
        this._activeModifier = null;

        console.log('[DailyChallengeSystem] Challenge completed! Score (deaths):', score, 'Best:', entry.bestScore);
    }

    /**
     * Record challenge failure (one_life mode: first death ends challenge).
     * (Requirement 9.4)
     */
    failChallenge() {
        if (!this._active) return;

        const challenge = this.getTodayChallenge();
        const saveData = this._loadSaveData();
        const dc = saveData.dailyChallenge;

        // Find or create today's history entry
        let entry = dc.history.find(h => h.date === challenge.date);
        if (!entry) {
            entry = {
                date: challenge.date,
                modifier: challenge.modifier,
                completed: false,
                bestScore: null,
                attempts: 0,
            };
            dc.history.push(entry);
        }

        entry.attempts++;
        // Don't mark as completed; don't update bestScore on failure

        // Clear current attempt
        dc.currentAttempt = null;

        this._saveSaveData(saveData);
        this._active = false;
        this._activeModifier = null;

        console.log('[DailyChallengeSystem] Challenge failed (one_life)');
    }

    /**
     * Get today's challenge status.
     * @returns {{ completed: boolean, failed: boolean, bestScore: number|null, attempts: number }}
     */
    getTodayStatus() {
        const challenge = this.getTodayChallenge();
        const saveData = this._loadSaveData();
        const entry = saveData.dailyChallenge.history.find(h => h.date === challenge.date);

        if (!entry) {
            return { completed: false, failed: false, bestScore: null, attempts: 0 };
        }

        return {
            completed: entry.completed === true,
            failed: !entry.completed && entry.attempts > 0,
            bestScore: entry.bestScore,
            attempts: entry.attempts,
        };
    }

    /**
     * Get the full challenge history array.
     * @returns {Array}
     */
    getChallengeHistory() {
        const saveData = this._loadSaveData();
        return saveData.dailyChallenge.history || [];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Persistence (Requirement 9.8)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Save daily challenge progress to SaveSystem.
     */
    saveProgress() {
        // Progress is saved inline in startChallenge/completeChallenge/failChallenge.
        // This method is provided for explicit saves if needed.
        console.log('[DailyChallengeSystem] Progress saved');
    }

    /**
     * Load daily challenge progress from SaveSystem.
     */
    loadProgress() {
        const saveData = this._loadSaveData();
        const dc = saveData.dailyChallenge;

        // Restore in-progress attempt if it matches today
        if (dc.currentAttempt) {
            const todayStr = this._getTodayDateString();
            if (dc.currentAttempt.date === todayStr) {
                // There was an in-progress attempt today — treat as abandoned (not active)
                this._challengeDeaths = dc.currentAttempt.deaths || 0;
            }
        }

        console.log('[DailyChallengeSystem] Progress loaded');
    }

    /**
     * Load save data, ensuring dailyChallenge section exists.
     * @returns {object}
     */
    _loadSaveData() {
        const saveData = this._saveSystem.load();
        if (!saveData.dailyChallenge) {
            saveData.dailyChallenge = {
                history: [],
                currentAttempt: null,
            };
        }
        return saveData;
    }

    /**
     * Save data back to SaveSystem.
     * @param {object} saveData
     */
    _saveSaveData(saveData) {
        this._saveSystem.save(saveData);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Utility
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get modifier definition by id.
     * @param {string} modifierId
     * @returns {object|null}
     */
    getModifierDef(modifierId) {
        return MODIFIERS[modifierId] || null;
    }

    /**
     * Get all modifier definitions.
     * @returns {object}
     */
    getAllModifiers() {
        return { ...MODIFIERS };
    }
}

// Export singleton instance
export const dailyChallengeSystem = new DailyChallengeSystem(saveSystem);

// Export modifier definitions for UI use
export { MODIFIERS };
