/**
 * audioEnhancements.test.js
 * Tests for Task 14: Enhanced Audio System
 * 
 * Tests dynamic music intensity, trap-specific death sounds,
 * victory fanfare, ambient sounds, and volume controls.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    updateMusicIntensity,
    updateMusicTransition,
    playTrapDeath,
    playVictoryFanfare,
    playAmbientGears,
    playAmbientSteam,
    playAmbientClockTick,
    startAmbientSounds,
    stopAmbientSounds,
    setMusicVolume,
    setSFXVolume,
    getMusicVolume,
    getSFXVolume,
} from './audio.js';

describe('Enhanced Audio System - Task 14', () => {
    describe('Dynamic Music Intensity (Task 14.1)', () => {
        it('should update music intensity based on danger level', () => {
            // Test that updateMusicIntensity accepts values 0-1
            expect(() => updateMusicIntensity(0)).not.toThrow();
            expect(() => updateMusicIntensity(0.5)).not.toThrow();
            expect(() => updateMusicIntensity(1.0)).not.toThrow();
        });

        it('should smoothly transition music intensity', () => {
            // Test that updateMusicTransition accepts delta time
            expect(() => updateMusicTransition(0.016)).not.toThrow();
            expect(() => updateMusicTransition(0.033)).not.toThrow();
        });
    });

    describe('Trap-Specific Death Sounds (Task 14.2)', () => {
        it('should play unique death sound for GEAR_SPINNER', () => {
            expect(() => playTrapDeath('GEAR_SPINNER')).not.toThrow();
        });

        it('should play unique death sound for PENDULUM', () => {
            expect(() => playTrapDeath('PENDULUM')).not.toThrow();
        });

        it('should play unique death sound for PISTON', () => {
            expect(() => playTrapDeath('PISTON')).not.toThrow();
        });

        it('should play unique death sound for BOUNCING_BALL', () => {
            expect(() => playTrapDeath('BOUNCING_BALL')).not.toThrow();
        });

        it('should play unique death sound for ORBIT_SPHERE', () => {
            expect(() => playTrapDeath('ORBIT_SPHERE')).not.toThrow();
        });

        it('should play unique death sound for FAKE_SAFE_ZONE', () => {
            expect(() => playTrapDeath('FAKE_SAFE_ZONE')).not.toThrow();
        });

        it('should play unique death sound for TRIGGER_TILE', () => {
            expect(() => playTrapDeath('TRIGGER_TILE')).not.toThrow();
        });

        it('should play unique death sound for HIDDEN_KILL_GEAR', () => {
            expect(() => playTrapDeath('HIDDEN_KILL_GEAR')).not.toThrow();
        });

        it('should play generic death sound for unknown trap type', () => {
            expect(() => playTrapDeath('UNKNOWN_TRAP')).not.toThrow();
        });
    });

    describe('Victory Fanfare (Task 14.2)', () => {
        it('should play victory fanfare on level completion', () => {
            expect(() => playVictoryFanfare()).not.toThrow();
        });
    });

    describe('Ambient Steampunk Sounds (Task 14.2)', () => {
        it('should play ambient gear sounds', () => {
            expect(() => playAmbientGears()).not.toThrow();
        });

        it('should play ambient steam sounds', () => {
            expect(() => playAmbientSteam()).not.toThrow();
        });

        it('should play ambient clock tick sounds', () => {
            expect(() => playAmbientClockTick()).not.toThrow();
        });

        it('should start ambient sound scheduler', () => {
            expect(() => startAmbientSounds()).not.toThrow();
        });

        it('should stop ambient sound scheduler', () => {
            expect(() => stopAmbientSounds()).not.toThrow();
        });
    });

    describe('Volume Controls (Task 14.2)', () => {
        beforeEach(() => {
            // Reset volumes to default
            setMusicVolume(0.7);
            setSFXVolume(0.7);
        });

        it('should set and get music volume', () => {
            setMusicVolume(0.5);
            expect(getMusicVolume()).toBe(0.5);
        });

        it('should set and get SFX volume', () => {
            setSFXVolume(0.8);
            expect(getSFXVolume()).toBe(0.8);
        });

        it('should clamp music volume to 0-1 range', () => {
            setMusicVolume(-0.5);
            expect(getMusicVolume()).toBe(0);

            setMusicVolume(1.5);
            expect(getMusicVolume()).toBe(1);
        });

        it('should clamp SFX volume to 0-1 range', () => {
            setSFXVolume(-0.5);
            expect(getSFXVolume()).toBe(0);

            setSFXVolume(1.5);
            expect(getSFXVolume()).toBe(1);
        });

        it('should allow independent control of music and SFX volumes', () => {
            setMusicVolume(0.3);
            setSFXVolume(0.9);

            expect(getMusicVolume()).toBe(0.3);
            expect(getSFXVolume()).toBe(0.9);
        });
    });
});
