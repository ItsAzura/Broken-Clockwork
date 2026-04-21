/*
 * deathSystem.test.js
 * Property-based tests for death system with killSource tracking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { triggerDeath, deathState, resetAllDeaths } from './deathSystem.js';

describe('Death System - killSource tracking', () => {
    beforeEach(() => {
        resetAllDeaths();
        deathState.isDying = false;
        deathState.tauntMsg = '';
        deathState.lastRespawnTime = 0;
    });

    // Feature: troll-level-redesign, Property 14: Trap-Specific Taunt Selection
    // For any killSource value corresponding to a trap type, the death system SHALL select
    // a taunt message from the category matching that trap type.
    // Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 20.3
    it('Property 14: Trap-Specific Taunt Selection', () => {
        const trapTypes = [
            'fake_safe_zone',
            'troll_token',
            'hidden_gear',
            'bait_path',
            'almost_moment',
            'trigger_tile',
            'one_frame_window',
            'phase_shift',
            'mirror_corridor'
        ];

        const trapTaunts = {
            fake_safe_zone: [
                "THAT WASN'T SAFE.",
                "NOWHERE IS SAFE.",
                "YOU THOUGHT YOU WERE CLEVER.",
                "THE SAFE ZONE LIED."
            ],
            troll_token: [
                "GREED KILLS.",
                "SHOULD'VE LEFT IT.",
                "THE GEAR WANTED YOU DEAD.",
                "THAT WAS A TRAP. OBVIOUSLY."
            ],
            hidden_gear: [
                "THAT ONE WAS REAL.",
                "NOT ALL GEARS ARE DECORATIVE.",
                "YOU HEARD THE HUM.",
                "TRUST NOTHING."
            ],
            bait_path: [
                "THE EASY PATH IS NEVER EASY.",
                "WIDE ROADS, NARROW CHANCES.",
                "YOU CHOSE POORLY.",
                "SHORTCUTS ARE TRAPS."
            ],
            almost_moment: [
                "SO CLOSE.",
                "VICTORY WAS RIGHT THERE.",
                "THE MACHINE LAUGHS.",
                "ALMOST DOESN'T COUNT."
            ],
            trigger_tile: [
                "YOU TRIGGERED THAT.",
                "WATCH YOUR STEP.",
                "THE FLOOR BETRAYED YOU.",
                "INVISIBLE DOESN'T MEAN SAFE."
            ],
            one_frame_window: [
                "TOO SLOW.",
                "TIMING IS EVERYTHING.",
                "YOU MISSED THE WINDOW.",
                "PRECISION REQUIRED."
            ],
            phase_shift: [
                "IT'S FASTER NOW.",
                "DID YOU NOTICE THE CHANGE?",
                "DEATH MAKES IT STRONGER.",
                "THE MACHINE ADAPTS."
            ],
            mirror_corridor: [
                "NOT AS SYMMETRICAL AS IT LOOKED.",
                "PATTERNS LIE.",
                "THE MIRROR IS BROKEN.",
                "TIMING, NOT SYMMETRY."
            ]
        };

        fc.assert(
            fc.property(
                fc.constantFrom(...trapTypes),
                fc.record({
                    x: fc.integer({ min: 0, max: 500 }),
                    y: fc.integer({ min: 0, max: 500 })
                }),
                fc.double({ min: 0, max: 1000 }),
                (killSource, playerPos, gameTime) => {
                    // Reset state for each test
                    resetAllDeaths();
                    deathState.isDying = false;
                    deathState.lastRespawnTime = 0;

                    const player = { x: playerPos.x, y: playerPos.y };
                    const particles = [];
                    const context = {};

                    // Trigger death with specific killSource
                    triggerDeath(player, particles, context, gameTime, killSource);

                    // Verify taunt message is from the correct trap category
                    const tauntMsg = deathState.tauntMsg;
                    const expectedTaunts = trapTaunts[killSource];

                    return expectedTaunts.includes(tauntMsg);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should use generic taunts when killSource is null', () => {
        fc.assert(
            fc.property(
                fc.record({
                    x: fc.integer({ min: 0, max: 500 }),
                    y: fc.integer({ min: 0, max: 500 })
                }),
                fc.double({ min: 1, max: 1000 }),
                (playerPos, gameTime) => {
                    resetAllDeaths();
                    deathState.isDying = false;
                    deathState.lastRespawnTime = 0;

                    const player = { x: playerPos.x, y: playerPos.y };
                    const particles = [];
                    const context = {};

                    // Trigger death without killSource
                    triggerDeath(player, particles, context, gameTime, null);

                    // Verify taunt message exists
                    return deathState.tauntMsg.length > 0;
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should use generic taunts when killSource is undefined', () => {
        fc.assert(
            fc.property(
                fc.record({
                    x: fc.integer({ min: 0, max: 500 }),
                    y: fc.integer({ min: 0, max: 500 })
                }),
                fc.double({ min: 1, max: 1000 }),
                (playerPos, gameTime) => {
                    resetAllDeaths();
                    deathState.isDying = false;
                    deathState.lastRespawnTime = 0;

                    const player = { x: playerPos.x, y: playerPos.y };
                    const particles = [];
                    const context = {};

                    // Trigger death without killSource parameter
                    triggerDeath(player, particles, context, gameTime);

                    // Verify taunt message exists
                    return deathState.tauntMsg.length > 0;
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should increment death count regardless of killSource', () => {
        fc.assert(
            fc.property(
                fc.option(fc.constantFrom(
                    'fake_safe_zone',
                    'troll_token',
                    'hidden_gear',
                    'bait_path',
                    'almost_moment'
                ), { nil: null }),
                fc.record({
                    x: fc.integer({ min: 0, max: 500 }),
                    y: fc.integer({ min: 0, max: 500 })
                }),
                fc.double({ min: 0, max: 1000 }),
                (killSource, playerPos, gameTime) => {
                    resetAllDeaths();
                    deathState.isDying = false;

                    const initialCount = deathState.totalCount;
                    const player = { x: playerPos.x, y: playerPos.y };
                    const particles = [];
                    const context = {};

                    triggerDeath(player, particles, context, gameTime, killSource);

                    return deathState.totalCount === initialCount + 1;
                }
            ),
            { numRuns: 100 }
        );
    });
});
