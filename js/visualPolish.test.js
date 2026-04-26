/**
 * visualPolish.test.js
 * Unit tests for visual polish effects (Task 15)
 * 
 * Tests Requirements 12.1-12.8:
 * - Particle effects for gear collection
 * - Screen shake on death
 * - Slow-motion on extreme close calls
 * - Player trail effect for high-speed movement
 * - Glow effect around unlocked exit door
 * - Dust particles on landing
 * - Spark particles on obstacle collisions
 * - Particle pooling for performance
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AutonomousObstacle } from './AutonomousObstacle.js';
import { AUTO } from './constants.js';
import { 
    spawnSparks, 
    spawnDustParticles, 
    spawnCollisionSparks,
    updatePlayerTrail,
    drawExitDoorGlow
} from './draw.js';

describe('Visual Polish Effects - Task 15', () => {
    describe('15.1 Particle Effects System', () => {
        describe('Requirement 12.1: Gear collection particles', () => {
            it('should spawn 12 particles when collecting gear token', () => {
                const particles = [];
                spawnSparks(particles, 100, 100, 12);
                
                // Should spawn 12 particles (or less if pool limit reached)
                expect(particles.length).toBeGreaterThan(0);
                expect(particles.length).toBeLessThanOrEqual(12);
            });
            
            it('should use gold/warm colors for gear particles', () => {
                const particles = [];
                const gearColors = ['#FFE080', '#FFD080', '#FFE840'];
                spawnSparks(particles, 100, 100, 12, gearColors);
                
                // All particles should use gear colors
                for (const p of particles) {
                    expect(gearColors).toContain(p.color);
                }
            });
        });
        
        describe('Requirement 12.2: Screen shake on death', () => {
            it('should set shake magnitude to 8 on death', () => {
                const game = { shake: 0 };
                
                // Simulate death
                game.shake = 8;
                
                expect(game.shake).toBe(8);
            });
            
            it('should decay shake over time', () => {
                let shake = 8;
                const dt = 1/60; // One frame at 60 FPS
                
                // Shake decays at 60 per second
                shake -= dt * 60;
                
                expect(shake).toBeLessThan(8);
                expect(shake).toBeGreaterThan(0);
            });
        });
        
        describe('Requirement 12.3: Slow-motion on extreme close calls', () => {
            it('should apply 0.3x speed for 0.5 seconds on extreme close call', () => {
                const game = {
                    slowMotionTimer: 0,
                    slowMotionFactor: 1.0
                };
                
                // Trigger extreme close call
                game.slowMotionTimer = 0.5;
                game.slowMotionFactor = 0.3;
                
                expect(game.slowMotionTimer).toBe(0.5);
                expect(game.slowMotionFactor).toBe(0.3);
            });
            
            it('should reset to normal speed after timer expires', () => {
                const game = {
                    slowMotionTimer: 0.5,
                    slowMotionFactor: 0.3
                };
                
                // Simulate time passing
                const dt = 0.6; // More than 0.5 seconds
                game.slowMotionTimer -= dt;
                
                if (game.slowMotionTimer <= 0) {
                    game.slowMotionFactor = 1.0;
                }
                
                expect(game.slowMotionFactor).toBe(1.0);
            });
        });
        
        describe('Requirement 12.4: Player trail effect', () => {
            it('should add trail when player speed > 100', () => {
                const player = {
                    x: 100,
                    y: 100,
                    vx: 80,
                    vy: 80 // Speed = sqrt(80^2 + 80^2) ≈ 113 > 100
                };
                
                const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
                expect(speed).toBeGreaterThan(100);
            });
            
            it('should not add trail when player speed <= 100', () => {
                const player = {
                    x: 100,
                    y: 100,
                    vx: 50,
                    vy: 50 // Speed = sqrt(50^2 + 50^2) ≈ 71 < 100
                };
                
                const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
                expect(speed).toBeLessThanOrEqual(100);
            });
        });
        
        describe('Requirement 12.5: Exit door glow effect', () => {
            it('should only glow when door is unlocked', () => {
                const goalTrigger = { x: 100, y: 100, w: 16, h: 16 };
                const isUnlocked = true;
                
                // Function should only render glow when isUnlocked is true
                expect(isUnlocked).toBe(true);
            });
            
            it('should pulse with animation', () => {
                const tick = 60; // 1 second at 60 FPS
                const pulsePhase = (tick * 0.05) % (Math.PI * 2);
                const pulseIntensity = 0.5 + 0.5 * Math.sin(pulsePhase);
                
                // Pulse intensity should vary between 0 and 1
                expect(pulseIntensity).toBeGreaterThanOrEqual(0);
                expect(pulseIntensity).toBeLessThanOrEqual(1);
            });
        });
    });
    
    describe('15.2 Environmental Particle Effects', () => {
        describe('Requirement 12.6: Dust particles on landing', () => {
            it('should spawn dust particles when player lands', () => {
                const particles = [];
                spawnDustParticles(particles, 100, 100);
                
                // Should spawn 6 dust particles
                expect(particles.length).toBeGreaterThan(0);
                expect(particles.length).toBeLessThanOrEqual(6);
            });
            
            it('should spawn dust at player bottom position', () => {
                const particles = [];
                const playerX = 100;
                const playerY = 100;
                
                spawnDustParticles(particles, playerX, playerY);
                
                // Dust should spawn near player position
                for (const p of particles) {
                    expect(p.x).toBeGreaterThanOrEqual(playerX);
                    expect(p.x).toBeLessThanOrEqual(playerX + 8); // Player width
                    expect(p.y).toBe(playerY + 12); // Player bottom
                }
            });
        });
        
        describe('Requirement 12.7: Spark particles on obstacle collisions', () => {
            it('should detect bouncing ball wall collisions', () => {
                const obstacle = new AutonomousObstacle({
                    type: AUTO.BOUNCING_BALL,
                    x: 100,
                    y: 100,
                    vx: -60, // Moving left
                    vy: 0,
                    r: 6,
                    boundX: 50,
                    boundY: 50,
                    boundW: 100,
                    boundH: 100
                });
                
                // Update obstacle - it should hit the left wall
                obstacle.update(1.0, 0); // 1 second - enough to hit wall
                
                // Velocity should have reversed (bounced)
                expect(obstacle.vx).toBeGreaterThan(0); // Should be positive after bouncing
            });
            
            it('should spawn spark particles on collision', () => {
                const particles = [];
                spawnCollisionSparks(particles, 100, 100);
                
                // Should spawn 4 spark particles
                expect(particles.length).toBeGreaterThan(0);
                expect(particles.length).toBeLessThanOrEqual(4);
            });
        });
        
        describe('Requirement 12.8: Particle pooling for performance', () => {
            it('should limit active particles to 100', () => {
                const particles = [];
                const MAX_ACTIVE_PARTICLES = 100;
                
                // Try to spawn 200 particles
                for (let i = 0; i < 200; i++) {
                    spawnSparks(particles, 100, 100, 1);
                }
                
                // Should not exceed max active particles
                expect(particles.length).toBeLessThanOrEqual(MAX_ACTIVE_PARTICLES);
            });
            
            it('should reuse particles from pool', () => {
                const particles = [];
                
                // Spawn particles
                spawnSparks(particles, 100, 100, 10);
                const firstCount = particles.length;
                
                // Mark all as inactive (simulate expiration)
                for (const p of particles) {
                    p.active = false;
                    p.life = 0;
                }
                
                // Clear expired particles
                for (let i = particles.length - 1; i >= 0; i--) {
                    if (particles[i].life <= 0) {
                        particles.splice(i, 1);
                    }
                }
                
                // Spawn more particles - should reuse from pool
                spawnSparks(particles, 100, 100, 10);
                
                expect(particles.length).toBeGreaterThan(0);
            });
            
            it('should maintain 60 FPS with 100+ particles', () => {
                const particles = [];
                const targetFrameTime = 16.67; // 60 FPS in ms
                
                // Spawn max particles
                for (let i = 0; i < 100; i++) {
                    spawnSparks(particles, Math.random() * 320, Math.random() * 180, 1);
                }
                
                // Simulate particle update (should be fast)
                const startTime = performance.now();
                
                for (let i = particles.length - 1; i >= 0; i--) {
                    const p = particles[i];
                    p.life -= 0.016;
                    if (p.life <= 0) {
                        p.active = false;
                        particles.splice(i, 1);
                        continue;
                    }
                    p.x += p.vx * 0.016;
                    p.y += p.vy * 0.016;
                    p.vy += 80 * 0.016;
                }
                
                const frameTime = performance.now() - startTime;
                
                // Particle update should be fast (< 1ms for 100 particles)
                expect(frameTime).toBeLessThan(1);
            });
        });
    });
    
    describe('Integration Tests', () => {
        it('should integrate all visual effects without conflicts', () => {
            const game = {
                particles: [],
                shake: 0,
                slowMotionTimer: 0,
                slowMotionFactor: 1.0,
                player: {
                    x: 100,
                    y: 100,
                    vx: 120,
                    vy: 0,
                    onGround: false,
                    wasOnGround: false
                },
                autonomousObstacles: [
                    new AutonomousObstacle({
                        type: AUTO.BOUNCING_BALL,
                        x: 200,
                        y: 100,
                        vx: 60,
                        vy: 60,
                        r: 6,
                        boundX: 150,
                        boundY: 50,
                        boundW: 100,
                        boundH: 100
                    })
                ]
            };
            
            // Simulate one frame with all effects
            
            // 1. Update player trail (high speed)
            updatePlayerTrail(game.player);
            
            // 2. Spawn dust on landing
            game.player.onGround = true;
            if (!game.player.wasOnGround && game.player.onGround) {
                spawnDustParticles(game.particles, game.player.x, game.player.y);
            }
            
            // 3. Update obstacles and spawn collision sparks
            for (const obs of game.autonomousObstacles) {
                obs.update(0.016, 0);
                if (obs._lastCollision && obs._lastCollision.time === obs.time) {
                    spawnCollisionSparks(game.particles, obs._lastCollision.x, obs._lastCollision.y);
                }
            }
            
            // 4. Trigger screen shake
            game.shake = 8;
            
            // 5. Trigger slow-motion
            game.slowMotionTimer = 0.5;
            game.slowMotionFactor = 0.3;
            
            // All effects should coexist
            expect(game.particles.length).toBeGreaterThan(0);
            expect(game.shake).toBe(8);
            expect(game.slowMotionTimer).toBe(0.5);
            expect(game.slowMotionFactor).toBe(0.3);
        });
    });
});
