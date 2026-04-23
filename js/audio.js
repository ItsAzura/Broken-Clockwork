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
    tone(440, 220, 0.05, 'square', 0.2);
}

export function playWindUp(pitch = 1.0) {
    tone(200, 600 * pitch, 0.3, 'sawtooth', 0.18, 0.01, 0.1);
}

export function playFreeze() {
    tone(400, 100, 0.15, 'square', 0.15);
}

export function playGaugeLow() {
    tone(330, 330, 0.08, 'square', 0.18);
    setTimeout(() => tone(330, 330, 0.08, 'square', 0.18), 100);
}

export function playRefill() {
    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((f, i) => setTimeout(() => tone(f, f, 0.08, 'triangle', 0.2), i * 80));
}

export function playLevelClear() {
    const notes = [392, 440, 494, 784];
    notes.forEach((f, i) => {
        setTimeout(() => {
            tone(f, f, 0.18, 'triangle', 0.22);
            setTimeout(() => tone(f, f, 0.14, 'triangle', 0.08), 150);
        }, i * 130);
    });
}

export function playGameOver() {
    tone(220, 80, 0.6, 'sawtooth', 0.22, 0.01, 0.3);
}

export function playJump() {
    tone(330, 520, 0.08, 'square', 0.12);
}

export function playLand() {
    tone(180, 120, 0.06, 'square', 0.12);
}

export function playPistonClunk() {
    tone(120, 80, 0.12, 'square', 0.15);
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
            tone(100, 90, 0.1, 'square', 0.15);
            break;
        case 1:
            // Mid drum hit
            tone(140, 120, 0.1, 'square', 0.15);
            break;
        case 2:
            // High drum hit (closed)
            tone(180, 150, 0.1, 'square', 0.15);
            break;
        case 3:
            // Safe window chime (distinct sound)
            tone(220, 220, 0.12, 'triangle', 0.18);
            setTimeout(() => tone(330, 330, 0.08, 'triangle', 0.12), 60);
            break;
        default:
            playPistonClunk();
    }
}

export function playTriggerActivate() {
    tone(300, 200, 0.08, 'square', 0.12);
}

export function playFakeExitBuzz() {
    tone(440, 220, 0.4, 'sawtooth', 0.18);
    setTimeout(() => tone(220, 110, 0.3, 'sawtooth', 0.15), 200);
}

// ═══════ MASOCORE AUDIO ADDITIONS ═══════

/**
 * Close-call celebration: ascending two-note C5→G5
 * Players feel skilled, not scared.
 */
export function playCloseCall() {
    // C5 = 523.25, G5 = 783.99
    tone(523.25, 523.25, 0.08, 'triangle', 0.15);
    setTimeout(() => tone(783.99, 783.99, 0.08, 'triangle', 0.15), 80);
}

/**
 * Extreme close-call: same but louder and with harmonic
 */
export function playExtremeCloseCall() {
    // C5 = 523.25, G5 = 783.99 — louder + longer
    tone(523.25, 523.25, 0.1, 'triangle', 0.22);
    setTimeout(() => tone(783.99, 783.99, 0.12, 'triangle', 0.22), 70);
    // Add a subtle harmonic shimmer
    setTimeout(() => tone(1046.5, 1046.5, 0.06, 'sine', 0.08), 140);
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
    g.gain.setValueAtTime(0.25, now);
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
    notes.forEach((f, i) => setTimeout(() => tone(f, f, 0.06, 'triangle', 0.18), i * 50));
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

export function playMusicNote() {
    if (!musicEnabled || !audioCtx) return;
    const f = NOTE_FREQS[musicStep];
    if (noteUnlocks[musicStep]) {
        tone(f, f, 0.2, 'triangle', 0.08, 0.01, 0.1);
    }
    musicStep = (musicStep + 1) % NOTE_FREQS.length;
}

export function startMusic() {
    if (musicTimer) return;
    musicEnabled = true;
    musicStep = 0;
    offbeatSynced = false;
    musicTimer = setInterval(playMusicNote, musicInterval);
}

export function stopMusic() {
    musicEnabled = false;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (humGain && audioCtx) humGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
    offbeatMode = false;
    offbeatSynced = false;
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
