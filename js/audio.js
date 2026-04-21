/*
 * audio.js
 * Procedural audio via Web Audio API. No samples, no files.
 * Exposes oneshot SFX and a music-box ambient sequencer.
 */

let audioCtx = null;
let masterGain = null;
let musicTimer = null;
let musicStep = 0;
let musicEnabled = false;

const NOTE_FREQS = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
const noteUnlocks = [false, false, false, false, false, false, false, false];

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

export function playTriggerActivate() {
    tone(300, 200, 0.08, 'square', 0.12);
}

export function playFakeExitBuzz() {
    tone(440, 220, 0.4, 'sawtooth', 0.18);
    setTimeout(() => tone(220, 110, 0.3, 'sawtooth', 0.15), 200);
}

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
    musicTimer = setInterval(playMusicNote, 600);
}

export function stopMusic() {
    musicEnabled = false;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (humGain) humGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
}
