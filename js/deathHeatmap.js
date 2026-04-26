/*
 * deathHeatmap.js
 * Death position tracking, aggregation, hotspot detection, and persistence.
 *
 * Requirements: 8.1, 8.6, 8.8
 *
 * Tracks all death positions (x, y) during a level attempt, aggregates them
 * into frequency buckets, detects hotspot zones, and persists data per level
 * using the save system.
 */

import { saveSystem } from './saveSystem.js';

// Radius for grouping nearby deaths into the same "zone" (px)
const ZONE_RADIUS = 32;

// Bucket size for position snapping (groups deaths within a grid cell)
const BUCKET_SIZE = 8;

/**
 * DeathHeatmap class — tracks and aggregates death positions for one level.
 */
export class DeathHeatmap {
    constructor() {
        // Current level's death positions: array of { x, y }
        this.currentDeaths = [];
        // Aggregated data loaded from save: { [levelId]: [{ x, y, count }] }
        this.persistedData = {};
        // Current level id being tracked
        this.currentLevelId = null;
    }

    /**
     * Start tracking deaths for a new level attempt.
     * Loads any previously persisted data for this level.
     * @param {number} levelId
     */
    startLevel(levelId) {
        this.currentLevelId = levelId;
        this.currentDeaths = [];
        // Load persisted heatmap data from save system
        this._loadFromSave();
    }

    /**
     * Record a death at the given position.
     * Called every time the player dies (Requirement 8.1).
     * @param {number} x
     * @param {number} y
     */
    recordDeath(x, y) {
        if (this.currentLevelId === null) return;
        this.currentDeaths.push({ x: Math.round(x), y: Math.round(y) });
    }

    /**
     * Get the total number of deaths recorded this attempt.
     * @returns {number}
     */
    getCurrentDeathCount() {
        return this.currentDeaths.length;
    }

    /**
     * Aggregate current attempt deaths into bucketed frequency data.
     * Snaps positions to BUCKET_SIZE grid for grouping nearby deaths.
     * @returns {Array<{x: number, y: number, count: number}>}
     */
    aggregateCurrentDeaths() {
        const buckets = new Map();
        for (const { x, y } of this.currentDeaths) {
            const bx = Math.round(x / BUCKET_SIZE) * BUCKET_SIZE;
            const by = Math.round(y / BUCKET_SIZE) * BUCKET_SIZE;
            const key = `${bx},${by}`;
            if (buckets.has(key)) {
                buckets.get(key).count++;
            } else {
                buckets.set(key, { x: bx, y: by, count: 1 });
            }
        }
        return Array.from(buckets.values());
    }

    /**
     * Merge current attempt data with persisted data for this level.
     * Returns the merged array sorted by count descending.
     * @returns {Array<{x: number, y: number, count: number}>}
     */
    getMergedData() {
        const levelId = this.currentLevelId;
        if (levelId === null) return [];

        const current = this.aggregateCurrentDeaths();
        const persisted = (this.persistedData[levelId] || []).slice();

        // Merge: add current counts into persisted
        const merged = new Map();
        for (const entry of persisted) {
            const key = `${entry.x},${entry.y}`;
            merged.set(key, { x: entry.x, y: entry.y, count: entry.count });
        }
        for (const entry of current) {
            const key = `${entry.x},${entry.y}`;
            if (merged.has(key)) {
                merged.get(key).count += entry.count;
            } else {
                merged.set(key, { x: entry.x, y: entry.y, count: entry.count });
            }
        }

        return Array.from(merged.values()).sort((a, b) => b.count - a.count);
    }

    /**
     * Detect hotspot zones by grouping nearby death positions.
     * Groups entries within ZONE_RADIUS of each other into a single zone.
     * Returns zones sorted by total deaths descending.
     * @param {Array<{x, y, count}>} entries - aggregated death data
     * @returns {Array<{x: number, y: number, totalDeaths: number, entries: Array}>}
     */
    detectHotspots(entries) {
        if (!entries || entries.length === 0) return [];

        const zones = [];
        const assigned = new Set();

        for (let i = 0; i < entries.length; i++) {
            if (assigned.has(i)) continue;
            const zone = {
                x: entries[i].x,
                y: entries[i].y,
                totalDeaths: entries[i].count,
                entries: [entries[i]],
            };
            assigned.add(i);

            for (let j = i + 1; j < entries.length; j++) {
                if (assigned.has(j)) continue;
                const dx = entries[j].x - entries[i].x;
                const dy = entries[j].y - entries[i].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= ZONE_RADIUS) {
                    zone.totalDeaths += entries[j].count;
                    zone.entries.push(entries[j]);
                    assigned.add(j);
                }
            }

            zones.push(zone);
        }

        return zones.sort((a, b) => b.totalDeaths - a.totalDeaths);
    }

    /**
     * Get the most deadly zone for the current level.
     * @returns {{x: number, y: number, totalDeaths: number} | null}
     */
    getMostDeadlyZone() {
        const merged = this.getMergedData();
        const hotspots = this.detectHotspots(merged);
        return hotspots.length > 0 ? hotspots[0] : null;
    }

    /**
     * Get total deaths across all sessions for the current level.
     * @returns {number}
     */
    getTotalDeaths() {
        const merged = this.getMergedData();
        return merged.reduce((sum, e) => sum + e.count, 0);
    }

    /**
     * Persist current attempt data merged with existing data to save system.
     * Called on level completion (Requirement 8.8).
     */
    persist() {
        const levelId = this.currentLevelId;
        if (levelId === null) return;

        try {
            const merged = this.getMergedData();
            // Update in-memory persisted data
            this.persistedData[levelId] = merged;

            // Save to save system
            const saveData = saveSystem.load();
            if (!saveData.analytics) {
                saveData.analytics = { deathLocations: {}, trapDeaths: {}, sessionLengths: [], returnDates: [] };
            }
            if (!saveData.analytics.deathLocations) {
                saveData.analytics.deathLocations = {};
            }
            saveData.analytics.deathLocations[String(levelId)] = merged;
            saveSystem.save(saveData);
            console.log(`[DeathHeatmap] Persisted ${merged.length} death buckets for level ${levelId}`);
        } catch (error) {
            console.error('[DeathHeatmap] Failed to persist heatmap data:', error);
        }
    }

    /**
     * Load persisted heatmap data from save system.
     * @private
     */
    _loadFromSave() {
        try {
            const saveData = saveSystem.load();
            const locations = saveData.analytics && saveData.analytics.deathLocations;
            if (locations) {
                // Convert all stored level data into our format
                for (const [levelId, entries] of Object.entries(locations)) {
                    if (Array.isArray(entries)) {
                        this.persistedData[levelId] = entries;
                    }
                }
            }
        } catch (error) {
            console.error('[DeathHeatmap] Failed to load heatmap data:', error);
        }
    }

    /**
     * Get heatmap data for a specific level (for display purposes).
     * Returns merged current + persisted data.
     * @param {number} levelId
     * @returns {Array<{x: number, y: number, count: number}>}
     */
    getDataForLevel(levelId) {
        if (levelId === this.currentLevelId) {
            return this.getMergedData();
        }
        return (this.persistedData[String(levelId)] || []).slice();
    }
}

// Export singleton instance
export const deathHeatmap = new DeathHeatmap();
