/*
 * levels.js
 * Rage-mode level data. Each level now has:
 *   tilemap           - static geometry (WFD.PG still valid)
 *   objects           - WindableObject tools (platforms, levers, fans, clock stations)
 *   autonomousObstacles - AutonomousObstacle configs (the killers)
 *   gearTokens        - { x, y } collectibles (all required to exit)
 *   goalTrigger       - { x, y, w, h } exit door zone
 *   playerSpawn       - { x, y }  (optional; else derived from 'P' tile)
 *
 * Tile key: W=wall, F=floor, D=door (solid until lever),
 *           .=air, P=player spawn, G=decorative gear (legacy only).
 *
 * lethalZones (optional): [{ x, y, w, h }] rectangles that kill on contact —
 * used to turn enclosed tile-pits into bottomless-pit death traps.
 */

import { OBJ, AUTO } from './constants.js';

export const LEVELS = [

    // ─── LEVEL 1 ─── FIRST TOCK
    {
        id: 1,
        name: 'FIRST TOCK',
        tilemap: [
            'WWWWWWWWWWWWWWWWWWWW',
            'W..................W',
            'W..................W',
            'W..P...............W',
            'W..................W',
            'W..................W',
            'WFFFF.........FFFFFW',
            'WWWWW.........WWWWWW',
            'WWWWW.........WWWWWW',
            'WWWWW.........WWWWWW',
            'WWWWWWWWWWWWWWWWWWWW',
        ],
        objects: [
            { type: OBJ.PLATFORM_SLIDE, x: 72, y: 96, w: 24, h: 4, duration: 6, ax: 72, bx: 208 },
            { type: OBJ.CLOCK_STATION, x: 32, y: 80 },
        ],
        autonomousObstacles: [
            { type: AUTO.PISTON, x: 112, y: 32,
              ax: 112, ay: 32, bx: 112, by: 80,
              w: 10, h: 10, speed: 2.2 },
            { type: AUTO.PISTON, x: 176, y: 80,
              ax: 176, ay: 32, bx: 176, by: 80,
              w: 10, h: 10, speed: 2.6 },
        ],
        gearTokens: [
            { x: 104, y: 56 },
            { x: 144, y: 72 },
            { x: 200, y: 56 },
        ],
        lethalZones: [
            { x: 80, y: 124, w: 144, h: 80 },
        ],
        goalTrigger: { x: 272, y: 80, w: 16, h: 16 },
    },

    // ─── LEVEL 2 ─── THE CAROUSEL
    {
        id: 2,
        name: 'THE CAROUSEL',
        tilemap: [
            'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
            'W............................W',
            'W............................W',
            'W..P.........................W',
            'W............................W',
            'W............................W',
            'WFFFF.....................FFFW',
            'WWWWW.....................WWWW',
            'WWWWW.....................WWWW',
            'WWWWW.....................WWWW',
            'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
        ],
        objects: [
            { type: OBJ.PLATFORM_SLIDE, x: 80,  y: 112, w: 24, h: 4, duration: 6, ax: 80,  bx: 148 },
            { type: OBJ.PLATFORM_SLIDE, x: 220, y: 112, w: 24, h: 4, duration: 6, ax: 220, bx: 300 },
            { type: OBJ.PLATFORM_SLIDE, x: 340, y: 112, w: 24, h: 4, duration: 6, ax: 340, bx: 410 },
            { type: OBJ.CLOCK_STATION, x: 32, y: 80 },
        ],
        autonomousObstacles: [
            { type: AUTO.ORBIT_SPHERE, cx: 128, cy: 88, orbitRadius: 28, orbitSpeed: 2.2, sphereR: 3, startAngle: 0 },
            { type: AUTO.ORBIT_SPHERE, cx: 240, cy: 88, orbitRadius: 34, orbitSpeed: 1.6, sphereR: 3, startAngle: 1.2 },
            { type: AUTO.ORBIT_SPHERE, cx: 356, cy: 88, orbitRadius: 30, orbitSpeed: -2.0, sphereR: 3, startAngle: 2.4 },
        ],
        gearTokens: [
            { x: 92,  y: 48 },
            { x: 128, y: 84 },
            { x: 240, y: 84 },
            { x: 432, y: 72 },
        ],
        lethalZones: [
            { x: 80, y: 124, w: 336, h: 80 },
        ],
        goalTrigger: { x: 448, y: 80, w: 16, h: 16 },
    },

    // ─── LEVEL 3 ─── THE SENTINEL
    {
        id: 3,
        name: 'THE SENTINEL',
        tilemap: [
            'WWWWWWWWWWWWWWWWWWWWWWWWW',
            'W.......................W',
            'W.......................W',
            'W..P....................W',
            'W.......................W',
            'W.......................W',
            'WFFFFFFFFFFFFFFFFFFFFFFFW',
            'WWWWWWWWWWWWWWWWWWWWWWWWW',
            'WWWWWWWWWWWWWWWWWWWWWWWWW',
            'WWWWWWWWWWWWWWWWWWWWWWWWW',
            'WWWWWWWWWWWWWWWWWWWWWWWWW',
        ],
        objects: [
            { type: OBJ.ENEMY_PATROL, x: 48, y: 80, w: 12, h: 12, duration: 6, ax: 48, bx: 120 },
            { type: OBJ.CLOCK_STATION, x: 16, y: 80 },
        ],
        autonomousObstacles: [
            { type: AUTO.PENDULUM, x: 140, y: 16, length: 64, amplitude: Math.PI / 2.4, frequency: 1.7, tipRadius: 5 },
            { type: AUTO.PENDULUM, x: 260, y: 16, length: 68, amplitude: Math.PI / 2.2, frequency: 2.3, tipRadius: 5 },
            { type: AUTO.PISTON,   x: 320, y: 50,
              ax: 320, ay: 50, bx: 320, by: 86,
              w: 12, h: 10, speed: 2.8 },
        ],
        gearTokens: [
            { x: 88,  y: 80 },
            { x: 160, y: 80 },
            { x: 220, y: 80 },
            { x: 288, y: 80 },
            { x: 352, y: 80 },
        ],
        goalTrigger: { x: 376, y: 80, w: 16, h: 16 },
    },

    // ─── LEVEL 4 ─── THE CLOCK TOWER
    {
        id: 4,
        name: 'THE CLOCK TOWER',
        tilemap: [
            'WWWWWWWWWWWW',
            'W..........W',
            'W..........W',
            'W..........W',
            'W.....FFFFFW',
            'W..........W',
            'W..........W',
            'WFFFF......W',
            'W..........W',
            'W..........W',
            'W......FFFFW',
            'W..........W',
            'W..........W',
            'WFFF.......W',
            'W..........W',
            'W..........W',
            'W.....FFFFFW',
            'W..........W',
            'W..........W',
            'WFFF.......W',
            'W..........W',
            'W..........W',
            'W......FFFFW',
            'W..........W',
            'W..........W',
            'WFFFF......W',
            'W..........W',
            'W..........W',
            'W..P.......W',
            'WFFFFFFFFFFW',
        ],
        objects: [
            { type: OBJ.FAN_UP, x: 96, y: 432, w: 16, h: 16, duration: 5 },
            { type: OBJ.FAN_UP, x: 32, y: 304, w: 16, h: 16, duration: 5 },
            { type: OBJ.ELEVATOR, x: 72, y: 384, w: 24, h: 6, duration: 8, y1: 384, y2: 120 },
            { type: OBJ.CLOCK_STATION, x: 16, y: 432, refill: true },
            { type: OBJ.CLOCK_STATION, x: 144, y: 208, refill: true },
        ],
        autonomousObstacles: [
            { type: AUTO.GEAR_SPINNER, x: 72, y: 352, radius: 12, teeth: 6, rotationSpeed: Math.PI * 1.2 },
            { type: AUTO.GEAR_SPINNER, x: 120, y: 192, radius: 14, teeth: 8, rotationSpeed: -Math.PI * 0.9 },
            { type: AUTO.BOUNCING_BALL, x: 96, y: 252,
              vx: 80, vy: 55, r: 4,
              boundX: 16, boundY: 240, boundW: 160, boundH: 80 },
        ],
        gearTokens: [
            { x: 96,  y: 432 },
            { x: 48,  y: 360 },
            { x: 144, y: 268 },
            { x: 52,  y: 180 },
            { x: 144, y: 80  },
        ],
        goalTrigger: { x: 96, y: 16, w: 32, h: 32 },
        playerSpawn: { x: 48, y: 432 },
    },

    // ─── LEVEL 5 ─── HEART OF THE MACHINE
    {
        id: 5,
        name: 'HEART OF THE MACHINE',
        tilemap: [
            'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
            'W.................................W',
            'W.................................W',
            'W.................................W',
            'W.................................W',
            'W.................................W',
            'WFFFF.....FFFF......FFFF.....FFFFFW',
            'W.................................W',
            'W.................................W',
            'W.................................W',
            'W..P..............................W',
            'WFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFW',
            'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
            'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
            'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
            'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
            'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
            'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
            'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
            'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
            'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
        ],
        objects: [
            { type: OBJ.LEVER_SEQUENCE, x: 64,  y: 144, seqNum: 3 },
            { type: OBJ.LEVER_SEQUENCE, x: 128, y: 144, seqNum: 1 },
            { type: OBJ.LEVER_SEQUENCE, x: 224, y: 144, seqNum: 5 },
            { type: OBJ.LEVER_SEQUENCE, x: 320, y: 144, seqNum: 2 },
            { type: OBJ.LEVER_SEQUENCE, x: 480, y: 144, seqNum: 4 },
            { type: OBJ.CLOCK_STATION, x: 16, y: 144 },
        ],
        autonomousObstacles: [
            { type: AUTO.GEAR_SPINNER, x: 160, y: 112, radius: 14, teeth: 8, rotationSpeed: Math.PI * 1.3 },
            { type: AUTO.PENDULUM,     x: 280, y: 16,  length: 112, amplitude: Math.PI / 2.6, frequency: 1.6, tipRadius: 5 },
            { type: AUTO.ORBIT_SPHERE, cx: 96,  cy: 88, orbitRadius: 26, orbitSpeed: 2.4, sphereR: 3, startAngle: 0 },
            { type: AUTO.ORBIT_SPHERE, cx: 400, cy: 88, orbitRadius: 30, orbitSpeed: -1.9, sphereR: 3, startAngle: 2 },
            { type: AUTO.BOUNCING_BALL, x: 300, y: 130,
              vx: 80, vy: -60, r: 4,
              boundX: 192, boundY: 112, boundW: 160, boundH: 60 },
            { type: AUTO.PISTON, x: 208, y: 120,
              ax: 208, ay: 120, bx: 208, by: 156,
              w: 10, h: 10, speed: 2.9 },
            { type: AUTO.PISTON, x: 432, y: 156,
              ax: 432, ay: 120, bx: 432, by: 156,
              w: 10, h: 10, speed: 3.2 },
        ],
        gearTokens: [
            { x: 76,  y: 84  },
            { x: 160, y: 88  },
            { x: 240, y: 72  },
            { x: 344, y: 96  },
            { x: 432, y: 96  },
            { x: 512, y: 80  },
        ],
        sequenceCorrect: [1, 2, 3, 4, 5],
        playerSpawn: { x: 48, y: 160 },
        goalTrigger: null,
        winOnSequence: true,
    },
];

export function getLevel(idx) {
    return LEVELS[idx] || LEVELS[0];
}
