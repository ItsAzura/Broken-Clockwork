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
import { tutorialSystem } from './tutorialSystem.js';

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
            '....................',
            '....................',
            '....................',
            '....................',
        ],
        objects: [
            { type: OBJ.PLATFORM_SLIDE, x: 72, y: 96, w: 24, h: 4, duration: 6, ax: 72, bx: 208 },
            { type: OBJ.CLOCK_STATION, x: 32, y: 80 },
        ],
        autonomousObstacles: [
            { type: AUTO.PISTON, id: 'piston_1', x: 112, y: 32,
              ax: 112, ay: 32, bx: 112, by: 80,
              w: 10, h: 10, speed: Math.PI * 1.5 }, // Increased speed
            { type: AUTO.PISTON, id: 'piston_2', x: 176, y: 80,
              ax: 176, ay: 32, bx: 176, by: 80,
              w: 10, h: 10, speed: Math.PI * 1.5,
              offbeat: true,
              beatCycle: [0.0, 0.6, 1.2, 1.8, 2.4, 3.0],
              safeWindow: [2.4, 2.7] }, // Increased speed
            { type: AUTO.PISTON, id: 'exit_blocker', x: 260, y: 80,
              ax: 260, ay: 32, bx: 260, by: 80,
              w: 10, h: 10, speed: Math.PI * 2, initiallyActive: false },
            // NEW TROLL TRAP: Bouncing ball that covers the whole floor
            { type: AUTO.BOUNCING_BALL, id: 'troll_ball_1', x: 280, y: 80,
              vx: -150, vy: -120, r: 5,
              boundX: 16, boundY: 16, boundW: 288, boundH: 100, initiallyActive: false },
        ],
        gearTokens: [
            { x: 104, y: 56 },
            { x: 200, y: 56 },
        ],
        lethalZones: [
            { x: 0, y: 120, w: 320, h: 100 },
        ],
        goalTrigger: { x: 272, y: 80, w: 16, h: 16 },
        // Trap system data
        triggerTiles: [
            { x: 140, y: 48, w: 16, h: 16, targetObstacleId: 'piston_1', oneShot: true },
            { x: 80, y: 96, w: 32, h: 16, targetObstacleId: 'troll_ball_1', oneShot: true }, // Trigger bouncing ball early
        ],
        fakeSafeZones: [
            { x: 144, y: 48, w: 32, h: 32, delay: 1.5, obstacleIds: ['piston_1'] },
            { x: 200, y: 80, w: 32, h: 32, delay: 0.5, obstacleIds: ['troll_ball_1'] }, // Additional fake safe zone
        ],
        trollTokens: [
            { x: 144, y: 72, subtype: 'RUSH_BAIT', trapConfig: { speedMultiplier: 1.5, affectedObstacleIds: ['piston_1', 'piston_2'] } },
            { x: 250, y: 80, subtype: 'ONE_WAY_PRISON', trapConfig: { obstacleIds: ['exit_blocker'] } }, // Fake token near exit
        ],
        hiddenKillGears: [
            { x: 120, y: 40, radius: 8, humRadius: 40, isLethal: true },
            { x: 100, y: 40, radius: 8, isLethal: false },
            { x: 140, y: 40, radius: 8, isLethal: false },
        ],
        baitPaths: [
            { 
                widePath: { x: 80, y: 96, w: 144, h: 16, obstacleIds: ['piston_1', 'piston_2', 'exit_blocker'] },
                narrowPath: { x: 80, y: 32, w: 144, h: 16, obstacleIds: ['piston_1'] }
            },
        ],
        oneFrameWindows: [],
        phaseShiftObstacles: [],
        almostMomentTrap: {
            obstacleIds: ['exit_blocker'],
            triggerOnFinalToken: true,
        },
        mirrorCorridors: [],
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
            '..............................',
            '..............................',
            '..............................',
            '..............................',
        ],
        objects: [
            { type: OBJ.PLATFORM_SLIDE, x: 80,  y: 112, w: 24, h: 4, duration: 6, ax: 80,  bx: 148 },
            { type: OBJ.PLATFORM_SLIDE, x: 220, y: 112, w: 24, h: 4, duration: 6, ax: 220, bx: 300 },
            { type: OBJ.PLATFORM_SLIDE, x: 340, y: 112, w: 24, h: 4, duration: 6, ax: 340, bx: 410 },
            { type: OBJ.CLOCK_STATION, x: 32, y: 80 },
        ],
        autonomousObstacles: [
            { type: AUTO.ORBIT_SPHERE, id: 'orbit_left', cx: 128, cy: 88, orbitRadius: 32, orbitSpeed: 2.0, sphereR: 4, startAngle: 0 }, // Faster, larger
            { type: AUTO.ORBIT_SPHERE, id: 'orbit_center', cx: 240, cy: 88, orbitRadius: 40, orbitSpeed: 2.5, sphereR: 4, startAngle: 1.2,
              patternBetrayal: true,
              betrayalTime: 4.0,
              betrayalDuration: 3.0,
              speedMultiplier: 1.5 }, // Faster pattern betrayal
            { type: AUTO.ORBIT_SPHERE, id: 'orbit_right', cx: 356, cy: 88, orbitRadius: 32, orbitSpeed: 2.0, sphereR: 4, startAngle: Math.PI / 3 }, 
            { type: AUTO.ORBIT_SPHERE, id: 'exit_blocker', cx: 432, cy: 88, orbitRadius: 24, orbitSpeed: 3.0, sphereR: 3, startAngle: 0, initiallyActive: false },
            // NEW TROLL TRAP: Giant fast gear in the center initially hidden
            { type: AUTO.GEAR_SPINNER, id: 'troll_gear_1', x: 240, y: 88, radius: 28, teeth: 12, rotationSpeed: Math.PI * 3, initiallyActive: false },
        ],
        gearTokens: [
            { x: 92,  y: 48 },
            { x: 240, y: 84 },
        ],
        lethalZones: [
            { x: 80, y: 124, w: 336, h: 80 },
        ],
        goalTrigger: { x: 448, y: 80, w: 16, h: 16 },
        // Trap system data
        triggerTiles: [],
        fakeSafeZones: [
            { x: 240, y: 88, w: 40, h: 40, delay: 1.0, obstacleIds: ['orbit_center', 'troll_gear_1'] },
        ],
        trollTokens: [
            { x: 128, y: 84, subtype: 'ONE_WAY_PRISON', trapConfig: { obstacleIds: ['orbit_left'] } },
        ],
        hiddenKillGears: [
            { x: 180, y: 60, radius: 8, humRadius: 40, isLethal: true },
            { x: 160, y: 60, radius: 8, isLethal: false },
            { x: 200, y: 60, radius: 8, isLethal: false },
        ],
        baitPaths: [
            { 
                widePath: { x: 80, y: 96, w: 336, h: 16, obstacleIds: ['orbit_left', 'orbit_center', 'orbit_right', 'exit_blocker'] },
                narrowPath: { x: 80, y: 32, w: 336, h: 16, obstacleIds: ['orbit_left', 'orbit_right'] }
            },
        ],
        oneFrameWindows: [],
        phaseShiftObstacles: [],
        almostMomentTrap: {
            obstacleIds: ['exit_blocker'],
            triggerOnFinalToken: true,
        },
        mirrorCorridors: [
            {
                obstacleA: { type: 'ORBIT_SPHERE', cx: 128, cy: 88, orbitRadius: 28, orbitSpeed: 1.0, sphereR: 3, startAngle: 0 },
                obstacleB: { type: 'ORBIT_SPHERE', cx: 356, cy: 88, orbitRadius: 28, orbitSpeed: 1.0, sphereR: 3, startAngle: 0 },
                centerLine: 242,
                symmetryAxis: 'vertical',
                phaseOffset: Math.PI / 3,
            },
        ],
        colorBetrayalZones: [
            {
                x: 180, y: 96, w: 32, h: 16,
                color: '#5A6B20',
                triggerObstacleId: 'orbit_center',
                oneShot: true,
            },
        ],
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
            { type: AUTO.PENDULUM, id: 'pendulum_left', x: 140, y: 16, length: 64, amplitude: Math.PI / 2.0, frequency: 1.8, tipRadius: 6,
              patternBetrayal: true,
              betrayalTime: 4.0,
              betrayalDuration: 3.0,
              speedMultiplier: 1.4 },
            { type: AUTO.PENDULUM, id: 'pendulum_right', x: 260, y: 16, length: 68, amplitude: Math.PI / 1.8, frequency: 1.9, tipRadius: 6,
              patternBetrayal: true,
              betrayalTime: 5.0,
              betrayalDuration: 2.5,
              speedMultiplier: 1.4 },
            { type: AUTO.PISTON, id: 'exit_blocker', x: 320, y: 50,
              ax: 320, ay: 50, bx: 320, by: 86,
              w: 12, h: 10, speed: Math.PI * 2.5, initiallyActive: false },
            // NEW TROLL TRAP: A third pendulum that swings insanely fast, activated by color betrayal
            { type: AUTO.PENDULUM, id: 'troll_pendulum_1', x: 200, y: 16, length: 80, amplitude: Math.PI / 1.2, frequency: 3.0, tipRadius: 8, initiallyActive: false },
        ],
        gearTokens: [
            { x: 88,  y: 80 },
            { x: 160, y: 80 },
            { x: 220, y: 80 },
            { x: 288, y: 80 },
            { x: 352, y: 80 },
        ],
        goalTrigger: { x: 376, y: 80, w: 16, h: 16 },
        // Trap system data
        triggerTiles: [],
        fakeSafeZones: [
            { x: 200, y: 80, w: 40, h: 16, delay: 1.5, obstacleIds: ['pendulum_left', 'pendulum_right'] },
        ],
        trollTokens: [
            { x: 220, y: 80, subtype: 'WIND_TRAP', trapConfig: { spawnConfigs: [
                { type: AUTO.BOUNCING_BALL, x: 220, y: 70, vx: 60, vy: -40, r: 4, boundX: 16, boundY: 16, boundW: 368, boundH: 80 }
            ] } },
        ],
        hiddenKillGears: [
            { x: 180, y: 40, radius: 8, humRadius: 40, isLethal: true },
            { x: 160, y: 40, radius: 8, isLethal: false },
            { x: 200, y: 40, radius: 8, isLethal: false },
        ],
        baitPaths: [
            { 
                widePath: { x: 80, y: 80, w: 288, h: 16, obstacleIds: ['pendulum_left', 'pendulum_right', 'exit_blocker'] },
                narrowPath: { x: 80, y: 32, w: 288, h: 16, obstacleIds: ['pendulum_left'] }
            },
        ],
        oneFrameWindows: [],
        phaseShiftObstacles: ['pendulum_right'],
        almostMomentTrap: {
            obstacleIds: ['exit_blocker'],
            triggerOnFinalToken: true,
        },
        mirrorCorridors: [
            {
                obstacleA: { type: 'PENDULUM', x: 140, y: 16, length: 64, amplitude: Math.PI / 2.4, frequency: 1.2, tipRadius: 5 },
                obstacleB: { type: 'PENDULUM', x: 260, y: 16, length: 68, amplitude: Math.PI / 2.2, frequency: 1.2, tipRadius: 5 },
                centerLine: 200,
                symmetryAxis: 'vertical',
                phaseOffset: Math.PI / 3,
            },
        ],
        colorBetrayalZones: [
            {
                x: 140, y: 80, w: 48, h: 16,
                color: '#5A6B20',
                triggerObstacleId: 'pendulum_left',
                oneShot: true,
            },
            {
                x: 240, y: 80, w: 48, h: 16,
                color: '#5A6B20',
                triggerObstacleId: 'pendulum_right',
                oneShot: true,
            },
            {
                x: 190, y: 80, w: 32, h: 16,
                color: '#5A6B20',
                triggerObstacleId: 'troll_pendulum_1',
                oneShot: true,
            },
        ],
        secondWindTrap: {
            obstacleConfig: {
                type: AUTO.BOUNCING_BALL,
                id: 'second_wind_ball',
                x: 200, y: 70,
                vx: 60, vy: -40,
                r: 4,
                boundX: 16, boundY: 16, boundW: 368, boundH: 80
            },
            duration: 8.0,
            fadeInTime: 0.5
        },
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
            { type: AUTO.GEAR_SPINNER, id: 'gear_lower', x: 72, y: 352, radius: 16, teeth: 8, rotationSpeed: Math.PI * 2.5 }, // Faster and larger
            { type: AUTO.GEAR_SPINNER, id: 'gear_upper', x: 120, y: 192, radius: 20, teeth: 10, rotationSpeed: -Math.PI * 3.0 }, // Much faster and larger
            { type: AUTO.BOUNCING_BALL, id: 'bouncing_ball', x: 96, y: 252,
              vx: 150, vy: 120, r: 6, // Much faster
              boundX: 16, boundY: 240, boundW: 160, boundH: 80 },
            { type: AUTO.PISTON, id: 'piston_1', x: 48, y: 240,
              ax: 48, ay: 240, bx: 48, by: 280,
              w: 12, h: 10, speed: Math.PI * 2.5,
              offbeat: true,
              beatCycle: [0.0, 0.4, 0.8, 1.2, 1.6, 2.0],
              safeWindow: [1.6, 1.8] }, // Faster offbeat
            { type: AUTO.PISTON, id: 'piston_2', x: 144, y: 120,
              ax: 144, ay: 120, bx: 144, by: 160,
              w: 12, h: 10, speed: Math.PI * 3.5,
              offbeat: true,
              beatCycle: [0.0, 0.4, 0.8, 1.2, 1.6, 2.0],
              safeWindow: [1.6, 1.8] }, 
            { type: AUTO.GEAR_SPINNER, id: 'exit_blocker', x: 128, y: 80, radius: 20, teeth: 10, rotationSpeed: Math.PI * 4.0, initiallyActive: false }, 
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
        // Checkpoint system
        checkpoints: [
            { x: 80, y: 256 }, // Midpoint checkpoint
        ],
        // Trap system data
        triggerTiles: [],
        fakeSafeZones: [
            { x: 72, y: 304, w: 24, h: 6, delay: 1.0, obstacleIds: ['gear_lower'] },
        ],
        trollTokens: [
            { x: 144, y: 268, subtype: 'RUSH_BAIT', trapConfig: { speedMultiplier: 1.4, affectedObstacleIds: ['gear_lower', 'gear_upper', 'bouncing_ball'] } },
        ],
        hiddenKillGears: [
            { x: 96, y: 320, radius: 8, humRadius: 40, isLethal: true },
            { x: 76, y: 320, radius: 8, isLethal: false },
            { x: 116, y: 320, radius: 8, isLethal: false },
        ],
        baitPaths: [
            { 
                widePath: { x: 72, y: 384, w: 24, h: 120, obstacleIds: ['gear_lower', 'bouncing_ball', 'exit_blocker'] },
                narrowPath: { x: 32, y: 304, w: 16, h: 128, obstacleIds: ['gear_upper'] }
            },
        ],
        oneFrameWindows: [],
        phaseShiftObstacles: ['bouncing_ball'],
        almostMomentTrap: {
            obstacleIds: ['exit_blocker'],
            triggerOnFinalToken: true,
        },
        mirrorCorridors: [
            {
                obstacleA: { type: 'GEAR_SPINNER', x: 72, y: 352, radius: 12, teeth: 6, rotationSpeed: Math.PI * 1.2 },
                obstacleB: { type: 'GEAR_SPINNER', x: 120, y: 192, radius: 14, teeth: 8, rotationSpeed: -Math.PI * 1.5 },
                centerLine: 96,
                symmetryAxis: 'vertical',
                phaseOffset: Math.PI / 4,
            },
        ],
        secondWindTrap: {
            obstacleConfig: {
                type: AUTO.PISTON,
                id: 'second_wind_piston',
                x: 96, y: 80,
                ax: 96, ay: 80, bx: 96, by: 120,
                w: 12, h: 10,
                speed: Math.PI * 2
            },
            duration: 8.0,
            fadeInTime: 0.5
        },
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
            { type: AUTO.GEAR_SPINNER, id: 'gear_center', x: 160, y: 112, radius: 20, teeth: 10, rotationSpeed: Math.PI * 3.0 }, // Much faster
            { type: AUTO.PENDULUM, id: 'pendulum_center', x: 280, y: 16, length: 112, amplitude: Math.PI / 2.0, frequency: 2.2, tipRadius: 8,
              patternBetrayal: true,
              betrayalTime: 4.0,
              betrayalDuration: 3.5,
              speedMultiplier: 1.5 }, 
            { type: AUTO.ORBIT_SPHERE, id: 'orbit_left', cx: 96, cy: 88, orbitRadius: 36, orbitSpeed: 3.0, sphereR: 5, startAngle: 0 }, 
            { type: AUTO.ORBIT_SPHERE, id: 'orbit_right', cx: 400, cy: 88, orbitRadius: 40, orbitSpeed: 3.0, sphereR: 5, startAngle: 2 }, 
            { type: AUTO.BOUNCING_BALL, id: 'bouncing_ball', x: 300, y: 130,
              vx: 200, vy: -150, r: 6, // Insanely fast
              boundX: 192, boundY: 112, boundW: 160, boundH: 60 },
            { type: AUTO.PISTON, id: 'piston_left', x: 208, y: 120,
              ax: 208, ay: 120, bx: 208, by: 156,
              w: 12, h: 10, speed: Math.PI * 3.5,
              offbeat: true,
              beatCycle: [0.0, 0.4, 0.8, 1.2, 1.6, 2.0],
              safeWindow: [1.6, 1.8] }, 
            { type: AUTO.PISTON, id: 'piston_right', x: 432, y: 156,
              ax: 432, ay: 120, bx: 432, by: 156,
              w: 12, h: 10, speed: Math.PI * 3.5 }, 
            { type: AUTO.GEAR_SPINNER, id: 'exit_blocker_1', x: 500, y: 120, radius: 24, teeth: 12, rotationSpeed: Math.PI * 4.0, initiallyActive: false }, 
            { type: AUTO.PENDULUM, id: 'exit_blocker_2', x: 520, y: 16, length: 110, amplitude: Math.PI / 1.8, frequency: 2.5, tipRadius: 8, initiallyActive: false }, 
            // NEW TROLL TRAP: Homing-like or just another bouncing ball that spans the whole room
            { type: AUTO.BOUNCING_BALL, id: 'troll_ball_2', x: 100, y: 130, vx: 250, vy: -100, r: 7, boundX: 64, boundY: 112, boundW: 448, boundH: 60, initiallyActive: false },
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
        // Checkpoint system
        checkpoints: [
            { x: 280, y: 144 }, // Midpoint checkpoint
        ],
        // Trap system data
        triggerTiles: [
            { x: 80, y: 144, w: 32, h: 16, targetObstacleId: 'troll_ball_2', oneShot: true }, // Activate troll ball early
        ],
        fakeSafeZones: [
            { x: 120, y: 144, w: 32, h: 16, delay: 0.5, obstacleIds: ['gear_center'] }, // Faster trigger
            { x: 280, y: 144, w: 32, h: 16, delay: 0.8, obstacleIds: ['pendulum_center'] },
            { x: 440, y: 144, w: 32, h: 16, delay: 1.0, obstacleIds: ['orbit_right', 'troll_ball_2'] },
        ],
        trollTokens: [
            { x: 240, y: 72, subtype: 'ONE_WAY_PRISON', trapConfig: { obstacleIds: ['piston_left', 'orbit_left'] } },
        ],
        hiddenKillGears: [
            { x: 200, y: 100, radius: 8, humRadius: 40, isLethal: true },
            { x: 180, y: 100, radius: 8, isLethal: false },
            { x: 220, y: 100, radius: 8, isLethal: false },
            { x: 360, y: 100, radius: 8, humRadius: 40, isLethal: true },
            { x: 340, y: 100, radius: 8, isLethal: false },
            { x: 380, y: 100, radius: 8, isLethal: false },
        ],
        baitPaths: [
            { 
                widePath: { x: 80, y: 112, w: 432, h: 32, obstacleIds: ['gear_center', 'pendulum_center', 'bouncing_ball', 'piston_left', 'piston_right', 'orbit_left', 'orbit_right', 'troll_ball_2'] },
                narrowPath: { x: 80, y: 32, w: 432, h: 32, obstacleIds: ['pendulum_center', 'bouncing_ball'] }
            },
        ],
        oneFrameWindows: [
            {
                obstacleIds: ['piston_left', 'piston_right'],
                syncConfig: {},
                gapDuration: 0.08,
                targetGap: 0.08,
            },
        ],
        phaseShiftObstacles: ['bouncing_ball', 'pendulum_center', 'orbit_right'],
        almostMomentTrap: {
            obstacleIds: ['exit_blocker_1', 'exit_blocker_2'],
            triggerOnFinalToken: true,
        },
        mirrorCorridors: [
            {
                obstacleA: { type: 'ORBIT_SPHERE', cx: 96, cy: 88, orbitRadius: 26, orbitSpeed: 1.8, sphereR: 3, startAngle: 0 },
                obstacleB: { type: 'ORBIT_SPHERE', cx: 400, cy: 88, orbitRadius: 30, orbitSpeed: 1.8, sphereR: 3, startAngle: 2 },
                centerLine: 248,
                symmetryAxis: 'vertical',
                phaseOffset: Math.PI / 3,
            },
            {
                obstacleA: { type: 'PISTON', x: 208, y: 120, ax: 208, ay: 120, bx: 208, by: 156, w: 10, h: 10, speed: Math.PI * 2 },
                obstacleB: { type: 'PISTON', x: 432, y: 156, ax: 432, ay: 120, bx: 432, by: 156, w: 10, h: 10, speed: Math.PI * 2 },
                centerLine: 320,
                symmetryAxis: 'vertical',
                phaseOffset: Math.PI / 4,
            },
        ],
        colorBetrayalZones: [
            {
                x: 150, y: 112, w: 40, h: 16,
                color: '#5A6B20',
                triggerObstacleId: 'gear_center',
                oneShot: true,
            },
        ],
        secondWindTrap: {
            obstacleConfig: {
                type: AUTO.ORBIT_SPHERE,
                id: 'second_wind_orbit',
                cx: 248, cy: 88,
                orbitRadius: 28,
                orbitSpeed: 2.0,
                sphereR: 3,
                startAngle: 0
            },
            duration: 8.0,
            fadeInTime: 0.5
        },
    },
];

export function getLevel(idx) {
    // Handle tutorial level (Level 0)
    if (idx === 0) {
        return tutorialSystem.createTutorialLevel();
    }
    
    // Regular levels (Level 1-5 are at indices 0-4 in LEVELS array)
    const levelIndex = idx - 1;
    return LEVELS[levelIndex] || LEVELS[0];
}

/**
 * Validates that a level has the required trap types
 * @param {Object} level - Level data object
 * @returns {Object} - { valid: boolean, warnings: string[] }
 */
export function validateLevelTraps(level) {
    const warnings = [];
    
    // Level 1 requirements
    if (level.id === 1) {
        if (!level.fakeSafeZones || level.fakeSafeZones.length === 0) {
            warnings.push('Level 1 missing FAKE_SAFE_ZONE');
        }
        if (!level.trollTokens || level.trollTokens.length === 0) {
            warnings.push('Level 1 missing TROLL_TOKEN');
        }
        if (!level.hiddenKillGears || level.hiddenKillGears.length === 0) {
            warnings.push('Level 1 missing HIDDEN_KILL_GEAR');
        }
        if (!level.baitPaths || level.baitPaths.length === 0) {
            warnings.push('Level 1 missing BAIT_PATH');
        }
        if (!level.almostMomentTrap) {
            warnings.push('Level 1 missing ALMOST_MOMENT trap');
        }
    }
    
    // Level 2 requirements (all Level 1 + MIRROR_CORRIDOR)
    if (level.id === 2) {
        if (!level.fakeSafeZones || level.fakeSafeZones.length === 0) {
            warnings.push('Level 2 missing FAKE_SAFE_ZONE');
        }
        if (!level.trollTokens || level.trollTokens.length === 0) {
            warnings.push('Level 2 missing TROLL_TOKEN');
        }
        if (!level.hiddenKillGears || level.hiddenKillGears.length === 0) {
            warnings.push('Level 2 missing HIDDEN_KILL_GEAR');
        }
        if (!level.baitPaths || level.baitPaths.length === 0) {
            warnings.push('Level 2 missing BAIT_PATH');
        }
        if (!level.almostMomentTrap) {
            warnings.push('Level 2 missing ALMOST_MOMENT trap');
        }
        if (!level.mirrorCorridors || level.mirrorCorridors.length === 0) {
            warnings.push('Level 2 missing MIRROR_CORRIDOR');
        }
    }
    
    // Level 3 requirements (all Level 2 + PHASE_SHIFT_OBSTACLE)
    if (level.id === 3) {
        if (!level.fakeSafeZones || level.fakeSafeZones.length === 0) {
            warnings.push('Level 3 missing FAKE_SAFE_ZONE');
        }
        if (!level.trollTokens || level.trollTokens.length === 0) {
            warnings.push('Level 3 missing TROLL_TOKEN');
        }
        if (!level.hiddenKillGears || level.hiddenKillGears.length === 0) {
            warnings.push('Level 3 missing HIDDEN_KILL_GEAR');
        }
        if (!level.baitPaths || level.baitPaths.length === 0) {
            warnings.push('Level 3 missing BAIT_PATH');
        }
        if (!level.almostMomentTrap) {
            warnings.push('Level 3 missing ALMOST_MOMENT trap');
        }
        if (!level.mirrorCorridors || level.mirrorCorridors.length === 0) {
            warnings.push('Level 3 missing MIRROR_CORRIDOR');
        }
        if (!level.phaseShiftObstacles || level.phaseShiftObstacles.length === 0) {
            warnings.push('Level 3 missing PHASE_SHIFT_OBSTACLE');
        }
    }
    
    // Level 4 requirements (same as Level 3)
    if (level.id === 4) {
        if (!level.fakeSafeZones || level.fakeSafeZones.length === 0) {
            warnings.push('Level 4 missing FAKE_SAFE_ZONE');
        }
        if (!level.trollTokens || level.trollTokens.length === 0) {
            warnings.push('Level 4 missing TROLL_TOKEN');
        }
        if (!level.hiddenKillGears || level.hiddenKillGears.length === 0) {
            warnings.push('Level 4 missing HIDDEN_KILL_GEAR');
        }
        if (!level.baitPaths || level.baitPaths.length === 0) {
            warnings.push('Level 4 missing BAIT_PATH');
        }
        if (!level.almostMomentTrap) {
            warnings.push('Level 4 missing ALMOST_MOMENT trap');
        }
        if (!level.mirrorCorridors || level.mirrorCorridors.length === 0) {
            warnings.push('Level 4 missing MIRROR_CORRIDOR');
        }
        if (!level.phaseShiftObstacles || level.phaseShiftObstacles.length === 0) {
            warnings.push('Level 4 missing PHASE_SHIFT_OBSTACLE');
        }
    }
    
    // Level 5 requirements (all 8 trap types)
    if (level.id === 5) {
        if (!level.fakeSafeZones || level.fakeSafeZones.length === 0) {
            warnings.push('Level 5 missing FAKE_SAFE_ZONE');
        }
        if (!level.trollTokens || level.trollTokens.length === 0) {
            warnings.push('Level 5 missing TROLL_TOKEN');
        }
        if (!level.hiddenKillGears || level.hiddenKillGears.length === 0) {
            warnings.push('Level 5 missing HIDDEN_KILL_GEAR');
        }
        if (!level.baitPaths || level.baitPaths.length === 0) {
            warnings.push('Level 5 missing BAIT_PATH');
        }
        if (!level.almostMomentTrap) {
            warnings.push('Level 5 missing ALMOST_MOMENT trap');
        }
        if (!level.mirrorCorridors || level.mirrorCorridors.length === 0) {
            warnings.push('Level 5 missing MIRROR_CORRIDOR');
        }
        if (!level.phaseShiftObstacles || level.phaseShiftObstacles.length === 0) {
            warnings.push('Level 5 missing PHASE_SHIFT_OBSTACLE');
        }
        if (!level.oneFrameWindows || level.oneFrameWindows.length === 0) {
            warnings.push('Level 5 missing ONE_FRAME_WINDOW');
        }
    }
    
    // Validate trap configurations
    if (level.triggerTiles) {
        for (const trigger of level.triggerTiles) {
            if (!trigger.targetObstacleId) {
                warnings.push(`TriggerTile at (${trigger.x}, ${trigger.y}) missing targetObstacleId`);
            }
        }
    }
    
    if (level.fakeSafeZones) {
        for (const zone of level.fakeSafeZones) {
            if (!zone.obstacleIds || zone.obstacleIds.length === 0) {
                warnings.push(`FakeSafeZone at (${zone.x}, ${zone.y}) missing obstacleIds`);
            }
        }
    }
    
    if (level.trollTokens) {
        for (const token of level.trollTokens) {
            if (!token.subtype) {
                warnings.push(`TrollToken at (${token.x}, ${token.y}) missing subtype`);
            }
            if (!token.trapConfig) {
                warnings.push(`TrollToken at (${token.x}, ${token.y}) missing trapConfig`);
            }
        }
    }
    
    if (level.almostMomentTrap) {
        if (!level.almostMomentTrap.obstacleIds || level.almostMomentTrap.obstacleIds.length === 0) {
            warnings.push('AlmostMomentTrap missing obstacleIds');
        }
    }
    
    return {
        valid: warnings.length === 0,
        warnings
    };
}
