/*
 * audio.js
 * Procedural audio via Web Audio API. No samples, no files.
 * Exposes oneshot SFX and a music-box ambient sequencer.
 *
 * Masocore additions:
 *   - Close-call celebration sounds (C5→G5 ascending)
 *   - Second Wind warning (220Hz triangle, 0.5s decay)
 *   - Offbeat music system (600ms vs 650ms drift)
 *   - Mercy sync (when levelDeaths > 8 on offbeat levels)
 */

let audioCtx = null;
let masterGain = null;
let musicTimer = null;
let musicStep = 0;
let musicEnabled = false;
let musicInterval = 600; // Default: 100 BPM = 600ms

const NOTE_FREQS = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
const noteUnlocks = [false, false, false, false, false, false, false, false];

// Offbeat tracking
let offbeatMode = false;
let offbeatSynced = false;

export function initAudio() {
    if (audioCtx) return;
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioCtx = new Ctx();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.7;
        masterGain.connect(audioCtx.destination);
    } catch (e) {
        console.warn('Audio init failed', e);
    }
}

export function resumeAudio() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function tone(freqStart, freqEnd, duration, type = 'square', gain = 0.2, attack = 0.005, release = 0.05) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.linearRampToValueAtTime(freqEnd, now + duration);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + attack);
    g.gain.setValueAtTime(gain, now + Math.max(attack, duration - release));
    g.gain.linearRampToValueAtTime(0, now + duration);
    osc.connect(g).connect(masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
}

export function playTick() {
    tone(440, 220, 0.05, 'square', 0.2 * sfxVolume);
}

export function playWindUp(pitch = 1.0) {
    tone(200, 600 * pitch, 0.3, 'sawtooth', 0.18 * sfxVolume, 0.01, 0.1);
}

export function playFreeze() {
    tone(400, 100, 0.15, 'square', 0.15 * sfxVolume);
}

export function playGaugeLow() {
    tone(330, 330, 0.08, 'square', 0.18 * sfxVolume);
    setTimeout(() => tone(330, 330, 0.08, 'square', 0.18 * sfxVolume), 100);
}

export function playRefill() {
    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((f, i) => setTimeout(() => tone(f, f, 0.08, 'triangle', 0.2 * sfxVolume), i * 80));
}

export function playLevelClear() {
    const notes = [392, 440, 494, 784];
    notes.forEach((f, i) => {
        setTimeout(() => {
            tone(f, f, 0.18, 'triangle', 0.22 * sfxVolume);
            setTimeout(() => tone(f, f, 0.14, 'triangle', 0.08 * sfxVolume), 150);
        }, i * 130);
    });
}

export function playGameOver() {
    tone(220, 80, 0.6, 'sawtooth', 0.22 * sfxVolume, 0.01, 0.3);
}

export function playJump() {
    tone(330, 520, 0.08, 'square', 0.12 * sfxVolume);
}

export function playLand() {
    tone(180, 120, 0.06, 'square', 0.12 * sfxVolume);
}

export function playPistonClunk() {
    tone(120, 80, 0.12, 'square', 0.15 * sfxVolume);
}

export function playOffbeatPistonBeat(beatNumber) {
    // 4-beat drum pattern for offbeat pistons
    // Beat 0: GAP OPEN (trap) - low tone
    // Beat 1: partial close - mid tone
    // Beat 2: fully CLOSED - high tone
    // Beat 3: partial open (SAFE WINDOW) - distinct chime
    switch (beatNumber) {
        case 0:
            // Low drum hit (trap beat)
            tone(100, 90, 0.1, 'square', 0.15 * sfxVolume);
            break;
        case 1:
            // Mid drum hit
            tone(140, 120, 0.1, 'square', 0.15 * sfxVolume);
            break;
        case 2:
            // High drum hit (closed)
            tone(180, 150, 0.1, 'square', 0.15 * sfxVolume);
            break;
        case 3:
            // Safe window chime (distinct sound)
            tone(220, 220, 0.12, 'triangle', 0.18 * sfxVolume);
            setTimeout(() => tone(330, 330, 0.08, 'triangle', 0.12 * sfxVolume), 60);
            break;
        default:
            playPistonClunk();
    }
}

export function playTriggerActivate() {
    tone(300, 200, 0.08, 'square', 0.12 * sfxVolume);
}

export function playFakeExitBuzz() {
    tone(440, 220, 0.4, 'sawtooth', 0.18 * sfxVolume);
    setTimeout(() => tone(220, 110, 0.3, 'sawtooth', 0.15 * sfxVolume), 200);
}

// ═══════ MASOCORE AUDIO ADDITIONS ═══════

/**
 * Close-call celebration: ascending two-note C5→G5
 * Players feel skilled, not scared.
 */
export function playCloseCall() {
    // C5 = 523.25, G5 = 783.99
    tone(523.25, 523.25, 0.08, 'triangle', 0.15 * sfxVolume);
    setTimeout(() => tone(783.99, 783.99, 0.08, 'triangle', 0.15 * sfxVolume), 80);
}

/**
 * Extreme close-call: same but louder and with harmonic
 */
export function playExtremeCloseCall() {
    // C5 = 523.25, G5 = 783.99 — louder + longer
    tone(523.25, 523.25, 0.1, 'triangle', 0.22 * sfxVolume);
    setTimeout(() => tone(783.99, 783.99, 0.12, 'triangle', 0.22 * sfxVolume), 70);
    // Add a subtle harmonic shimmer
    setTimeout(() => tone(1046.5, 1046.5, 0.06, 'sine', 0.08 * sfxVolume), 140);
}

/**
 * Second Wind warning: single triangle note 220Hz, 0.5s decay.
 * Players learn to fear this exact sound.
 */
export function playSecondWindWarning() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    g.gain.setValueAtTime(0.25 * sfxVolume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(g).connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.55);
}

/**
 * Checkpoint activation sound: bright ascending arpeggio
 */
export function playCheckpointActivate() {
    const notes = [392, 494, 587.33, 783.99]; // G4, B4, D5, G5
    notes.forEach((f, i) => setTimeout(() => tone(f, f, 0.06, 'triangle', 0.18 * sfxVolume), i * 50));
}

// ═══════ HUM SYSTEM ═══════

let humOsc = null;
let humGain = null;

function initHum() {
    if (humOsc || !audioCtx) return;
    humOsc = audioCtx.createOscillator();
    humGain = audioCtx.createGain();
    humOsc.type = 'sine';
    humOsc.frequency.value = 150;
    humGain.gain.value = 0;
    humOsc.connect(humGain).connect(masterGain);
    humOsc.start();
}

export function setHumVolume(volume) {
    if (!audioCtx) return;
    initHum();
    if (humGain) {
        humGain.gain.setTargetAtTime(volume * 0.1, audioCtx.currentTime, 0.05);
    }
}

// ═══════ MUSIC BOX SYSTEM ═══════

export function unlockNote(index) {
    if (index >= 0 && index < noteUnlocks.length) noteUnlocks[index] = true;
}

export function resetNotes() {
    for (let i = 0; i < noteUnlocks.length; i++) noteUnlocks[i] = false;
}

export function unlockAllNotes() {
    for (let i = 0; i < noteUnlocks.length; i++) noteUnlocks[i] = true;
}

// ═══════ DYNAMIC MUSIC INTENSITY SYSTEM (Requirement 11.1, 11.2, 11.3) ═══════

let musicIntensity = 0; // 0 = ambient, 1 = danger
let targetIntensity = 0;
let musicVolume = 0.7; // Separate volume control for music
let sfxVolume = 0.7; // Separate volume control for SFX

/**
 * Update music intensity based on danger level (proximity to obstacles)
 * @param {number} dangerLevel - 0 (safe) to 1 (danger)
 */
export function updateMusicIntensity(dangerLevel) {
    targetIntensity = Math.max(0, Math.min(1, dangerLevel));
}

/**
 * Smooth transition between music intensity levels
 * Call this every frame to smoothly interpolate intensity
 */
export function updateMusicTransition(dt) {
    if (!audioCtx) return;
    
    // Smooth interpolation (Requirement 11.3)
    const transitionSpeed = 2.0; // Takes ~0.5s to transition
    if (Math.abs(targetIntensity - musicIntensity) > 0.01) {
        if (targetIntensity > musicIntensity) {
            musicIntensity = Math.min(targetIntensity, musicIntensity + transitionSpeed * dt);
        } else {
            musicIntensity = Math.max(targetIntensity, musicIntensity - transitionSpeed * dt);
        }
    }
}

export function playMusicNote() {
    if (!musicEnabled || !audioCtx) return;
    const f = NOTE_FREQS[musicStep];
    if (noteUnlocks[musicStep]) {
        // Dynamic intensity affects volume and timbre (Requirement 11.1, 11.2)
        const baseVolume = 0.08 * musicVolume;
        const intensityVolume = baseVolume * (0.6 + 0.4 * musicIntensity); // 60-100% volume range
        
        // In danger mode, add slight harmonic for tension
        tone(f, f, 0.2, 'triangle', intensityVolume, 0.01, 0.1);
        
        if (musicIntensity > 0.5) {
            // Add subtle harmonic in danger mode
            setTimeout(() => {
                tone(f * 2, f * 2, 0.1, 'sine', intensityVolume * 0.3, 0.01, 0.05);
            }, 50);
        }
    }
    musicStep = (musicStep + 1) % NOTE_FREQS.length;
}

export function startMusic() {
    if (musicTimer) return;
    musicEnabled = true;
    musicStep = 0;
    musicIntensity = 0;
    targetIntensity = 0;
    offbeatSynced = false;
    musicTimer = setInterval(playMusicNote, musicInterval);
}

export function stopMusic() {
    musicEnabled = false;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (humGain && audioCtx) humGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
    offbeatMode = false;
    offbeatSynced = false;
    musicIntensity = 0;
    targetIntensity = 0;
}

/**
 * Enable offbeat mode: music stays at 600ms but obstacles drift at 650ms.
 * After mercy threshold deaths, sync music tempo to obstacle cycle.
 */
export function setOffbeatMode(enabled) {
    offbeatMode = enabled;
    offbeatSynced = false;
}

/**
 * Sync music to obstacle timing (mercy for offbeat levels)
 * Called when levelDeaths > OFFBEAT_MERCY_THRESHOLD
 */
export function syncMusicToObstacles() {
    if (!offbeatMode || offbeatSynced) return;
    offbeatSynced = true;
    // Restart music with obstacle cycle (650ms)
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    musicInterval = 650;
    musicTimer = setInterval(playMusicNote, musicInterval);
}

/**
 * Reset music interval back to default
 */
export function resetMusicInterval() {
    musicInterval = 600;
    offbeatMode = false;
    offbeatSynced = false;
}

// ═══════ VOLUME CONTROLS (Requirement 11.7, 11.8) ═══════

/**
 * Set music volume (0.0 - 1.0)
 */
export function setMusicVolume(volume) {
    musicVolume = Math.max(0, Math.min(1, volume));
}

/**
 * Set SFX volume (0.0 - 1.0)
 */
export function setSFXVolume(volume) {
    sfxVolume = Math.max(0, Math.min(1, volume));
}

/**
 * Get current music volume
 */
export function getMusicVolume() {
    return musicVolume;
}

/**
 * Get current SFX volume
 */
export function getSFXVolume() {
    return sfxVolume;
}

// ═══════ ENHANCED SOUND EFFECTS (Requirement 11.4, 11.5, 11.6) ═══════

/**
 * Play unique death sound for each trap type (Requirement 11.4)
 */
export function playTrapDeath(trapType) {
    if (!audioCtx) return;
    
    const volume = 0.22 * sfxVolume;
    
    switch (trapType) {
        case 'GEAR_SPINNER':
            // Metallic grinding death
            tone(180, 80, 0.4, 'sawtooth', volume, 0.01, 0.2);
            setTimeout(() => tone(120, 60, 0.3, 'square', volume * 0.8), 100);
            break;
            
        case 'PENDULUM':
            // Swinging impact death
            tone(150, 50, 0.5, 'triangle', volume, 0.01, 0.3);
            setTimeout(() => tone(80, 40, 0.3, 'sine', volume * 0.7), 150);
            break;
            
        case 'PISTON':
            // Crushing mechanical death
            tone(100, 40, 0.6, 'square', volume, 0.01, 0.4);
            setTimeout(() => tone(60, 30, 0.4, 'square', volume * 0.9), 200);
            break;
            
        case 'BOUNCING_BALL':
            // Bouncing impact death
            tone(200, 100, 0.3, 'sine', volume, 0.01, 0.15);
            setTimeout(() => tone(150, 75, 0.2, 'sine', volume * 0.8), 100);
            setTimeout(() => tone(100, 50, 0.15, 'sine', volume * 0.6), 180);
            break;
            
        case 'ORBIT_SPHERE':
            // Orbital collision death
            tone(250, 120, 0.4, 'triangle', volume, 0.01, 0.2);
            setTimeout(() => tone(180, 90, 0.3, 'triangle', volume * 0.7), 120);
            break;
            
        case 'FAKE_SAFE_ZONE':
            // Betrayal death - dissonant tones
            tone(440, 220, 0.5, 'sawtooth', volume, 0.01, 0.3);
            setTimeout(() => tone(330, 165, 0.4, 'sawtooth', volume * 0.8), 150);
            break;
            
        case 'TRIGGER_TILE':
            // Trap activation death
            tone(300, 100, 0.5, 'square', volume, 0.01, 0.3);
            setTimeout(() => tone(200, 80, 0.3, 'square', volume * 0.7), 100);
            break;
            
        case 'HIDDEN_KILL_GEAR':
            // Hidden gear death - surprise tone
            tone(400, 150, 0.4, 'sawtooth', volume, 0.01, 0.2);
            setTimeout(() => tone(250, 100, 0.3, 'sawtooth', volume * 0.8), 120);
            break;
            
        default:
            // Generic death sound (fallback)
            tone(220, 80, 0.6, 'sawtooth', volume, 0.01, 0.3);
            break;
    }
}

/**
 * Play victory fanfare for level completion (Requirement 11.5)
 */
export function playVictoryFanfare() {
    if (!audioCtx) return;
    
    const volume = 0.25 * sfxVolume;
    
    // Triumphant ascending arpeggio: C4 -> E4 -> G4 -> C5
    const fanfareNotes = [
        { freq: 261.63, delay: 0 },     // C4
        { freq: 329.63, delay: 150 },   // E4
        { freq: 392.0, delay: 300 },    // G4
        { freq: 523.25, delay: 450 },   // C5 (octave up)
    ];
    
    fanfareNotes.forEach(note => {
        setTimeout(() => {
            tone(note.freq, note.freq, 0.3, 'triangle', volume, 0.01, 0.15);
            // Add harmonic shimmer
            setTimeout(() => {
                tone(note.freq * 2, note.freq * 2, 0.15, 'sine', volume * 0.4, 0.01, 0.08);
            }, 80);
        }, note.delay);
    });
    
    // Final chord at 600ms
    setTimeout(() => {
        tone(523.25, 523.25, 0.5, 'triangle', volume * 0.8, 0.01, 0.3);
        tone(659.25, 659.25, 0.5, 'triangle', volume * 0.6, 0.01, 0.3);
        tone(783.99, 783.99, 0.5, 'triangle', volume * 0.5, 0.01, 0.3);
    }, 600);
}

/**
 * Play ambient steampunk sounds (Requirement 11.6)
 */
export function playAmbientGears() {
    if (!audioCtx) return;
    const volume = 0.12 * sfxVolume;
    // Mechanical gear clicking
    tone(180, 160, 0.08, 'square', volume, 0.01, 0.04);
    setTimeout(() => tone(160, 140, 0.06, 'square', volume * 0.8), 100);
}

export function playAmbientSteam() {
    if (!audioCtx) return;
    const volume = 0.08 * sfxVolume;
    // Steam hiss - white noise simulation with filtered tone
    tone(800, 400, 0.3, 'sawtooth', volume, 0.05, 0.15);
}

export function playAmbientClockTick() {
    if (!audioCtx) return;
    const volume = 0.15 * sfxVolume;
    // Clock tick - sharp percussive sound
    tone(1200, 800, 0.02, 'square', volume, 0.001, 0.01);
}

// Ambient sound scheduler
let ambientTimer = null;

export function startAmbientSounds() {
    if (ambientTimer) return;
    
    // Play ambient sounds at random intervals
    const scheduleNextAmbient = () => {
        const delay = 2000 + Math.random() * 4000; // 2-6 seconds
        ambientTimer = setTimeout(() => {
            const rand = Math.random();
            if (rand < 0.4) {
                playAmbientGears();
            } else if (rand < 0.7) {
                playAmbientClockTick();
            } else {
                playAmbientSteam();
            }
            scheduleNextAmbient();
        }, delay);
    };
    
    scheduleNextAmbient();
}

export function stopAmbientSounds() {
    if (ambientTimer) {
        clearTimeout(ambientTimer);
        ambientTimer = null;
    }
}

// Update existing sound effects to respect SFX volume
function applyVolume(baseVolume) {
    return baseVolume * sfxVolume;
}
