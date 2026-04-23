/*
 * levelClearJudge.test.js
 * Tests for level clear judge system
 */

import { describe, test, expect } from 'vitest';
import { getLevelClearJudge } from './deathSystem.js';
import { LEVEL_CLEAR_JUDGE } from './constants.js';

describe('Level Clear Judge System', () => {
    test('should return appropriate message for 0-5 deaths (excellent)', () => {
        expect(getLevelClearJudge(0)).toBe("THAT WAS ALMOST GRACEFUL. ALMOST.");
        expect(getLevelClearJudge(3)).toBe("THAT WAS ALMOST GRACEFUL. ALMOST.");
        expect(getLevelClearJudge(5)).toBe("THAT WAS ALMOST GRACEFUL. ALMOST.");
    });

    test('should return appropriate message for 6-15 deaths (good)', () => {
        expect(getLevelClearJudge(6)).toBe("THE MACHINE ACKNOWLEDGES YOUR EXISTENCE.");
        expect(getLevelClearJudge(10)).toBe("THE MACHINE ACKNOWLEDGES YOUR EXISTENCE.");
        expect(getLevelClearJudge(15)).toBe("THE MACHINE ACKNOWLEDGES YOUR EXISTENCE.");
    });

    test('should return appropriate message for 16-30 deaths (average)', () => {
        expect(getLevelClearJudge(16)).toBe("PERSISTENCE NOTED. GRACE: OPTIONAL.");
        expect(getLevelClearJudge(25)).toBe("PERSISTENCE NOTED. GRACE: OPTIONAL.");
        expect(getLevelClearJudge(30)).toBe("PERSISTENCE NOTED. GRACE: OPTIONAL.");
    });

    test('should return appropriate message for 31-50 deaths (struggling)', () => {
        expect(getLevelClearJudge(31)).toBe("YOU EARNED THIS. UNFORTUNATELY.");
        expect(getLevelClearJudge(40)).toBe("YOU EARNED THIS. UNFORTUNATELY.");
        expect(getLevelClearJudge(50)).toBe("YOU EARNED THIS. UNFORTUNATELY.");
    });

    test('should return appropriate message for 51-99 deaths (many deaths)', () => {
        expect(getLevelClearJudge(51)).toBe("THE MACHINE HAS LOST COUNT. YOU HAVEN'T.");
        expect(getLevelClearJudge(75)).toBe("THE MACHINE HAS LOST COUNT. YOU HAVEN'T.");
        expect(getLevelClearJudge(99)).toBe("THE MACHINE HAS LOST COUNT. YOU HAVEN'T.");
    });

    test('should return appropriate message for 100+ deaths (extreme)', () => {
        expect(getLevelClearJudge(100)).toBe("WE DO NOT SPEAK OF THIS.");
        expect(getLevelClearJudge(200)).toBe("WE DO NOT SPEAK OF THIS.");
        expect(getLevelClearJudge(999)).toBe("WE DO NOT SPEAK OF THIS.");
    });

    test('should handle edge cases correctly', () => {
        // Boundary testing
        expect(getLevelClearJudge(5)).toBe("THAT WAS ALMOST GRACEFUL. ALMOST.");
        expect(getLevelClearJudge(6)).toBe("THE MACHINE ACKNOWLEDGES YOUR EXISTENCE.");
        
        expect(getLevelClearJudge(15)).toBe("THE MACHINE ACKNOWLEDGES YOUR EXISTENCE.");
        expect(getLevelClearJudge(16)).toBe("PERSISTENCE NOTED. GRACE: OPTIONAL.");
        
        expect(getLevelClearJudge(30)).toBe("PERSISTENCE NOTED. GRACE: OPTIONAL.");
        expect(getLevelClearJudge(31)).toBe("YOU EARNED THIS. UNFORTUNATELY.");
        
        expect(getLevelClearJudge(50)).toBe("YOU EARNED THIS. UNFORTUNATELY.");
        expect(getLevelClearJudge(51)).toBe("THE MACHINE HAS LOST COUNT. YOU HAVEN'T.");
        
        expect(getLevelClearJudge(99)).toBe("THE MACHINE HAS LOST COUNT. YOU HAVEN'T.");
        expect(getLevelClearJudge(100)).toBe("WE DO NOT SPEAK OF THIS.");
    });

    test('should always return a valid message', () => {
        // Test random death counts
        for (let i = 0; i < 100; i++) {
            const deaths = Math.floor(Math.random() * 200);
            const message = getLevelClearJudge(deaths);
            expect(message).toBeTruthy();
            expect(typeof message).toBe('string');
            expect(message.length).toBeGreaterThan(0);
        }
    });

    test('LEVEL_CLEAR_JUDGE constant should be properly structured', () => {
        expect(LEVEL_CLEAR_JUDGE).toBeDefined();
        expect(Array.isArray(LEVEL_CLEAR_JUDGE)).toBe(true);
        expect(LEVEL_CLEAR_JUDGE.length).toBeGreaterThan(0);
        
        // Each entry should have max and msg
        for (const entry of LEVEL_CLEAR_JUDGE) {
            expect(entry).toHaveProperty('max');
            expect(entry).toHaveProperty('msg');
            expect(typeof entry.max).toBe('number');
            expect(typeof entry.msg).toBe('string');
        }
        
        // Last entry should have Infinity as max
        const lastEntry = LEVEL_CLEAR_JUDGE[LEVEL_CLEAR_JUDGE.length - 1];
        expect(lastEntry.max).toBe(Infinity);
    });

    test('should return messages in ascending severity order', () => {
        const msg0 = getLevelClearJudge(0);
        const msg10 = getLevelClearJudge(10);
        const msg25 = getLevelClearJudge(25);
        const msg40 = getLevelClearJudge(40);
        const msg75 = getLevelClearJudge(75);
        const msg150 = getLevelClearJudge(150);
        
        // All messages should be different (increasing severity)
        const messages = [msg0, msg10, msg25, msg40, msg75, msg150];
        const uniqueMessages = new Set(messages);
        expect(uniqueMessages.size).toBe(6);
    });
});
