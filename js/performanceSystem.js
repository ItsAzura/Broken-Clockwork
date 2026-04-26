/*
 * performanceSystem.js
 * Performance monitoring system for Game Retention & Engagement System
 * 
 * Features:
 * - Frame time tracking with warnings when exceeding 16.67ms (60 FPS threshold)
 * - F3 toggle for performance overlay (FPS, frame time, active particles, memory)
 * - Requirements: 16.7, 16.8
 */

import { COLORS } from './constants.js';
import { drawPixelRect, drawPixelBorder, drawPixelText } from './draw.js';

/**
 * PerformanceMonitor tracks frame times and renders a debug overlay.
 * Toggle with F3 key.
 */
export class PerformanceMonitor {
    constructor() {
        this.showOverlay = false;
        this.frameTimes = [];
        this.maxFrameSamples = 60;
        this.frameDropCount = 0;
    }

    /**
     * Record a frame time measurement.
     * Logs a warning when frame time exceeds 16.67ms (Requirement 16.7).
     * @param {number} frameTime - Frame time in milliseconds
     */
    recordFrame(frameTime) {
        this.frameTimes.push(frameTime);
        if (this.frameTimes.length > this.maxFrameSamples) {
            this.frameTimes.shift();
        }
        // Requirement 16.7: Log warning when frame time exceeds 16.67ms
        if (frameTime > 16.67) {
            this.frameDropCount++;
            if (this.frameDropCount % 10 === 1) {
                console.warn('[Performance] Frame time exceeded 16.67ms: ' + frameTime.toFixed(2) + 'ms');
            }
        } else {
            this.frameDropCount = 0;
        }
    }

    /**
     * Get average FPS over the last maxFrameSamples frames.
     * @returns {number} Average FPS
     */
    getAverageFPS() {
        if (this.frameTimes.length === 0) return 60;
        const avgFrameTime = this.frameTimes.reduce(function(a, b) { return a + b; }, 0) / this.frameTimes.length;
        return avgFrameTime > 0 ? Math.round(1000 / avgFrameTime) : 60;
    }

    /**
     * Get average frame time over the last maxFrameSamples frames.
     * @returns {number} Average frame time in milliseconds
     */
    getAverageFrameTime() {
        if (this.frameTimes.length === 0) return 0;
        return this.frameTimes.reduce(function(a, b) { return a + b; }, 0) / this.frameTimes.length;
    }

    /**
     * Get current memory usage in MB (Chrome only).
     * @returns {string|null} Memory usage in MB, or null if unavailable
     */
    getMemoryUsageMB() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1);
        }
        return null;
    }

    /**
     * Render the performance overlay on the canvas (Requirement 16.8).
     * Uses consistent pixel font and COLORS palette (Requirements 17.1, 17.2).
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} activeParticles - Current active particle count
     */
    renderOverlay(ctx, activeParticles) {
        if (!this.showOverlay) return;
        const fps = this.getAverageFPS();
        const frameTime = this.getAverageFrameTime();
        const memMB = this.getMemoryUsageMB();

        const x = 4;
        let y = 4;
        const lineH = 9;
        const bgW = 100;
        const lines = memMB !== null ? 4 : 3;
        const bgH = lines * lineH + 4;

        // Background panel using consistent border style (Requirement 17.3)
        drawPixelBorder(ctx, x - 2, y - 2, bgW, bgH,
            COLORS.UI_BORDER_D, COLORS.UI_BG, COLORS.UI_BG, 1);

        // FPS (color-coded: warm = good, low = bad)
        const fpsColor = fps >= 55 ? COLORS.GLOW_WARM : fps >= 45 ? COLORS.SPARK_2 : COLORS.GAUGE_LOW;
        drawPixelText(ctx, 'FPS: ' + fps, x, y, fpsColor, 1);
        y += lineH;

        // Frame time
        const ftColor = frameTime <= 16.67 ? COLORS.GLOW_WARM : COLORS.GAUGE_LOW;
        drawPixelText(ctx, 'FRAME: ' + frameTime.toFixed(1) + 'MS', x, y, ftColor, 1);
        y += lineH;

        // Particles
        drawPixelText(ctx, 'PARTS: ' + activeParticles + '/100', x, y, COLORS.UI_TEXT, 1);
        y += lineH;

        // Memory (if available)
        if (memMB !== null) {
            drawPixelText(ctx, 'MEM: ' + memMB + 'MB', x, y, COLORS.UI_MUTED, 1);
        }
    }
}

export const performanceMonitor = new PerformanceMonitor();
