/*
 * trapSystem.js
 * Trap system infrastructure for troll level redesign.
 * Implements 8 trap types: TriggerTile, FakeSafeZone, TrollToken,
 * HiddenKillGear, BaitPath, OneFrameWindow, PhaseShiftObstacle,
 * AlmostMoment, and MirrorCorridor.
 */

import { playTriggerActivate, playFakeExitBuzz } from './audio.js';

// Re-export PhaseShiftObstacle from its own module
export { PhaseShiftObstacle } from './PhaseShiftObstacle.js';

/**
 * TriggerTile - Invisible floor trigger that activates obstacles
 */
export class TriggerTile {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.w = config.w;
    this.h = config.h;
    this.targetObstacleId = config.targetObstacleId;
    this.activated = false;
    this.oneShot = config.oneShot || false;
  }

  checkCollision(playerHitbox) {
    return (
      playerHitbox.x < this.x + this.w &&
      playerHitbox.x + playerHitbox.w > this.x &&
      playerHitbox.y < this.y + this.h &&
      playerHitbox.y + playerHitbox.h > this.y
    );
  }

  activate(game) {
    if (this.oneShot && this.activated) return;
    this.activated = true;
    playTriggerActivate();
    // Obstacle activation will be handled by the game loop
    // which will find the obstacle by targetObstacleId and activate it
  }
}

/**
 * FakeSafeZone - Areas that look safe but become dangerous after delay
 */
export class FakeSafeZone {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.w = config.w;
    this.h = config.h;
    this.delay = config.delay || 1.0;
    this.obstacleIds = config.obstacleIds || [];
    this.timer = 0;
    this.playerInside = false;
    this.triggered = false;
  }

  update(dt, playerPos) {
    const wasInside = this.playerInside;
    this.playerInside = (
      playerPos.x >= this.x &&
      playerPos.x <= this.x + this.w &&
      playerPos.y >= this.y &&
      playerPos.y <= this.y + this.h
    );

    if (this.playerInside && !wasInside) {
      this.timer = this.delay;
      this.triggered = false;
    }

    if (this.playerInside && this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0 && !this.triggered) {
        this.triggered = true;
        return true; // Signal to activate obstacles
      }
    }

    return false;
  }

  reset() {
    this.timer = 0;
    this.playerInside = false;
    this.triggered = false;
  }
}

/**
 * TrollToken - Gear tokens that trap players when collected
 * Subtypes: ONE_WAY_PRISON, RUSH_BAIT, WIND_TRAP
 */
export class TrollToken {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.subtype = config.subtype; // ONE_WAY_PRISON, RUSH_BAIT, WIND_TRAP
    this.collected = false;
    this.trapConfig = config.trapConfig || {};
    this.angle = 0; // For rendering rotation
  }

  onCollect(game) {
    if (this.collected) return null;
    this.collected = true;
    
    // Return trap activation data based on subtype
    switch (this.subtype) {
      case 'ONE_WAY_PRISON':
        // Activate obstacles that block the return path
        return {
          type: 'ONE_WAY_PRISON',
          obstacleIds: this.trapConfig.obstacleIds || [],
        };
      
      case 'RUSH_BAIT':
        // Increase obstacle speed in the area
        return {
          type: 'RUSH_BAIT',
          speedMultiplier: this.trapConfig.speedMultiplier || 1.3,
          affectedObstacleIds: this.trapConfig.affectedObstacleIds || [],
        };
      
      case 'WIND_TRAP':
        // Spawn obstacles near the player
        return {
          type: 'WIND_TRAP',
          spawnConfigs: this.trapConfig.spawnConfigs || [],
          spawnNearPlayer: true,
        };
      
      default:
        return null;
    }
  }

  checkCollision(playerHitbox) {
    // Token hitbox is 6x6 with 1px offset (same as regular tokens)
    const tokenBounds = {
      x: this.x + 1,
      y: this.y + 1,
      w: 6,
      h: 6,
    };
    
    return (
      playerHitbox.x < tokenBounds.x + tokenBounds.w &&
      playerHitbox.x + playerHitbox.w > tokenBounds.x &&
      playerHitbox.y < tokenBounds.y + tokenBounds.h &&
      playerHitbox.y + playerHitbox.h > tokenBounds.y
    );
  }
}

/**
 * HiddenKillGear - Decorative gears where one has a lethal hitbox
 */
export class HiddenKillGear {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.radius = config.radius || 8;
    this.isLethal = config.isLethal !== undefined ? config.isLethal : true;
    this.humRadius = config.humRadius || 40;
  }

  checkCollision(playerHitbox) {
    const centerX = this.x;
    const centerY = this.y;
    const playerCenterX = playerHitbox.x + playerHitbox.w / 2;
    const playerCenterY = playerHitbox.y + playerHitbox.h / 2;

    const dx = playerCenterX - centerX;
    const dy = playerCenterY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < this.radius + Math.min(playerHitbox.w, playerHitbox.h) / 2;
  }

  getHumVolume(playerPos) {
    const dx = playerPos.x - this.x;
    const dy = playerPos.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= this.humRadius) return 0;
    return Math.max(0, 1 - distance / this.humRadius);
  }

  draw(ctx, camX, camY, tick) {
    // Draws identical to safe decorative gears
    // Implementation will be in draw.js
  }
}

/**
 * BaitPath - Wide paths that are more dangerous than narrow paths
 */
export class BaitPath {
  constructor(config) {
    // Support both flat and nested (widePath/narrowPath) config formats
    if (config.widePath) {
      this.x = config.widePath.x;
      this.y = config.widePath.y;
      this.w = config.widePath.w;
      this.h = config.widePath.h;
      this.obstacleIds = config.widePath.obstacleIds || [];
      this.narrowPathObstacleIds = config.narrowPath ? config.narrowPath.obstacleIds || [] : [];
    } else {
      this.x = config.x;
      this.y = config.y;
      this.w = config.w;
      this.h = config.h;
      this.obstacleIds = config.obstacleIds || [];
      this.narrowPathObstacleIds = config.narrowPathObstacleIds || [];
    }
    
    // Validate obstacle density: wide path must have more obstacles than narrow path
    this.validateObstacleDensity();
  }

  validateObstacleDensity() {
    const widePathCount = this.obstacleIds.length;
    const narrowPathCount = this.narrowPathObstacleIds.length;
    
    if (widePathCount <= narrowPathCount) {
      console.warn(
        `BaitPath validation failed: Wide path has ${widePathCount} obstacles, ` +
        `narrow path has ${narrowPathCount} obstacles. Wide path must have MORE obstacles.`
      );
    }
  }

  isPlayerInPath(playerPos) {
    return (
      playerPos.x >= this.x &&
      playerPos.x <= this.x + this.w &&
      playerPos.y >= this.y &&
      playerPos.y <= this.y + this.h
    );
  }
}

/**
 * OneFrameWindow - Tight timing windows between obstacles
 */
export class OneFrameWindow {
  constructor(config) {
    this.obstacleIds = config.obstacleIds || [];
    this.syncConfig = config.syncConfig || {};
    this.gapDuration = config.gapDuration || 0.1; // seconds
    this.targetGap = config.targetGap || 0.1; // Target gap in seconds (default 0.1s)
  }

  /**
   * Synchronizes obstacles to create tight timing windows
   * @param {Array} obstacles - Array of AutonomousObstacle instances
   * @returns {boolean} - True if synchronization was successful
   */
  synchronizeObstacles(obstacles) {
    if (!obstacles || obstacles.length === 0) return false;
    
    // Find obstacles that match our IDs
    const targetObstacles = obstacles.filter(obs => 
      this.obstacleIds.includes(obs.id)
    );
    
    if (targetObstacles.length < 2) {
      console.warn('OneFrameWindow requires at least 2 obstacles to synchronize');
      return false;
    }
    
    // Strategy: Set all obstacles to start at their "safe" position,
    // then offset each subsequent obstacle by targetGap seconds
    
    for (let i = 0; i < targetObstacles.length; i++) {
      const obstacle = targetObstacles[i];
      
      if (obstacle.type === 'PISTON') {
        // For pistons: safe when sin(time * speed) = -1
        // This occurs when time * speed = 3π/2
        // So time = 3π/(2*speed)
        const safeTime = (3 * Math.PI) / (2 * obstacle.speed);
        
        // Offset by targetGap * i to create sequential gaps
        obstacle.time = safeTime + (this.targetGap * i);
        
      } else if (obstacle.type === 'PENDULUM') {
        // For pendulums: safe when sin(time * frequency) = 0
        // This occurs when time * frequency = 0 (or π, 2π, etc.)
        // Use time = 0 as the safe position
        obstacle.time = this.targetGap * i;
        
      } else if (obstacle.type === 'ORBIT_SPHERE') {
        // For orbit spheres: set angle with offset
        obstacle.angle = this.targetGap * i * obstacle.orbitSpeed;
      }
    }
    
    return true;
  }
  
  /**
   * Calculate phase offset for pistons to create target gap
   * Pistons use: t = (sin(time * speed) + 1) / 2
   * Safe passage is when piston is at start position (t=0, sin=-1)
   */
  calculatePistonPhaseOffset(speed1, speed2, targetGap) {
    // Period of piston movement
    const period1 = (2 * Math.PI) / speed1;
    
    // Time offset to create gap
    // We want the second piston to be at safe position targetGap seconds after first
    const timeOffset = targetGap;
    
    // Convert time offset to phase offset in the sine wave
    const phaseOffset = timeOffset * speed2;
    
    return phaseOffset;
  }
  
  /**
   * Calculate phase offset for pendulums to create target gap
   * Pendulums use: angle = sin(time * frequency) * amplitude
   * Safe passage is when pendulum is at center (angle=0)
   */
  calculatePendulumPhaseOffset(freq1, freq2, targetGap) {
    // Similar to piston calculation
    const timeOffset = targetGap;
    const phaseOffset = timeOffset * freq2;
    
    return phaseOffset;
  }
  
  /**
   * Calculate angle offset for orbit spheres to create target gap
   * Orbit spheres use: angle += orbitSpeed * dt
   * Safe passage depends on the specific level geometry
   */
  calculateOrbitPhaseOffset(speed1, speed2, targetGap) {
    // Time offset converted to angle offset
    const angleOffset = targetGap * speed2;
    
    return angleOffset;
  }
  
  /**
   * Calculate the current gap between two obstacles
   * @param {Object} obs1 - First obstacle
   * @param {Object} obs2 - Second obstacle
   * @returns {number} - Gap in seconds between safe passages
   */
  calculateCurrentGap(obs1, obs2) {
    // After synchronization, obstacles should be at or near their safe positions
    // with a time offset equal to the target gap.
    // We calculate the time difference between when they reach safe position.
    
    if (obs1.type === 'PISTON' && obs2.type === 'PISTON') {
      // For pistons: safe when sin(time * speed) = -1
      // This occurs when time * speed = 3π/2 + 2πk
      
      const targetPhase = 3 * Math.PI / 2;
      const period = 2 * Math.PI;
      
      // Calculate phase for each obstacle
      const phase1 = (obs1.time * obs1.speed) % period;
      const phase2 = (obs2.time * obs2.speed) % period;
      
      // Calculate how far each is from the safe phase
      let phaseToSafe1 = targetPhase - phase1;
      if (phaseToSafe1 < -Math.PI) phaseToSafe1 += period;
      if (phaseToSafe1 > Math.PI) phaseToSafe1 -= period;
      
      let phaseToSafe2 = targetPhase - phase2;
      if (phaseToSafe2 < -Math.PI) phaseToSafe2 += period;
      if (phaseToSafe2 > Math.PI) phaseToSafe2 -= period;
      
      // Convert to time
      const timeToSafe1 = phaseToSafe1 / obs1.speed;
      const timeToSafe2 = phaseToSafe2 / obs2.speed;
      
      // The gap is the absolute difference in time to safe position
      return Math.abs(timeToSafe2 - timeToSafe1);
    }
    
    if (obs1.type === 'PENDULUM' && obs2.type === 'PENDULUM') {
      // For pendulums: safe when sin(time * frequency) = 0
      // This occurs when time * frequency = 0 or π
      
      const period = 2 * Math.PI;
      
      const phase1 = (obs1.time * obs1.frequency) % period;
      const phase2 = (obs2.time * obs2.frequency) % period;
      
      // Safe at phase = 0 or π, find closest
      const toZero1 = Math.abs(phase1);
      const toPi1 = Math.abs(phase1 - Math.PI);
      const phaseToSafe1 = Math.min(toZero1, toPi1);
      
      const toZero2 = Math.abs(phase2);
      const toPi2 = Math.abs(phase2 - Math.PI);
      const phaseToSafe2 = Math.min(toZero2, toPi2);
      
      const timeToSafe1 = phaseToSafe1 / obs1.frequency;
      const timeToSafe2 = phaseToSafe2 / obs2.frequency;
      
      return Math.abs(timeToSafe2 - timeToSafe1);
    }
    
    if (obs1.type === 'ORBIT_SPHERE' && obs2.type === 'ORBIT_SPHERE') {
      // For orbit spheres, calculate angle difference and convert to time
      let angleDiff = Math.abs(obs2.angle - obs1.angle);
      if (angleDiff > Math.PI) {
        angleDiff = 2 * Math.PI - angleDiff;
      }
      
      // Use average speed to convert angle to time
      const avgSpeed = (Math.abs(obs1.orbitSpeed) + Math.abs(obs2.orbitSpeed)) / 2;
      if (avgSpeed === 0) return 0;
      return angleDiff / avgSpeed;
    }
    
    // Default: return target gap (assume synchronized)
    return this.targetGap;
  }
  
  /**
   * Verify that obstacles are synchronized within target gap
   * @param {Array} obstacles - Array of AutonomousObstacle instances
   * @returns {boolean} - True if gap is within target
   */
  verifySynchronization(obstacles) {
    const targetObstacles = obstacles.filter(obs => 
      this.obstacleIds.includes(obs.id)
    );
    
    if (targetObstacles.length < 2) return false;
    
    for (let i = 1; i < targetObstacles.length; i++) {
      const gap = this.calculateCurrentGap(
        targetObstacles[i - 1],
        targetObstacles[i]
      );
      
      if (gap > this.targetGap) {
        return false;
      }
    }
    
    return true;
  }
}

/**
 * AlmostMomentTrap - Final token collection triggers exit-blocking obstacles
 */
export class AlmostMomentTrap {
  constructor(config) {
    this.obstacleIds = config.obstacleIds || [];
    this.activated = false;
  }

  checkTrigger(gearsCollected, totalGears) {
    return gearsCollected === totalGears;
  }

  activate(game) {
    if (this.activated) return;
    this.activated = true;
    
    // Activate exit-blocking obstacles
    for (const obstacleId of this.obstacleIds) {
      const obstacle = game.autonomousObstacles.find(a => a.id === obstacleId);
      if (obstacle) {
        // Set activation source for killSource tracking
        obstacle.activationSource = 'almost_moment';
        if (obstacle.activate) {
          obstacle.activate();
        }
      }
    }
    
    // Play fake exit buzz sound
    playFakeExitBuzz();
    
    // Visual feedback
    game.flash = 0.5;
    game.shake = 10;
  }

  reset() {
    this.activated = false;
  }
}

/**
 * ProximityTrigger - Activation mechanism based on player distance
 */
export class ProximityTrigger {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.activationDistance = config.activationDistance || 50;
    this.shape = config.shape || 'circular'; // 'circular' or 'rectangular'
    this.w = config.w || this.activationDistance * 2; // Width for rectangular zones
    this.h = config.h || this.activationDistance * 2; // Height for rectangular zones
    this.targetTrapId = config.targetTrapId; // ID of trap to activate
    this.activated = false;
    this.activationProgress = 0; // 0 to 1, for smooth activation
    this.activationSpeed = config.activationSpeed || 2.0; // Speed of activation (units per second)
  }

  /**
   * Check if player is within proximity range
   * @param {Object} playerPos - Player position {x, y}
   * @returns {boolean} - True if player is within range
   */
  checkProximity(playerPos) {
    if (this.shape === 'circular') {
      // Circular activation zone
      const dx = playerPos.x - this.x;
      const dy = playerPos.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= this.activationDistance;
    } else if (this.shape === 'rectangular') {
      // Rectangular activation zone
      // Zone is centered at (x, y) with width w and height h
      const halfW = this.w / 2;
      const halfH = this.h / 2;
      return (
        playerPos.x >= this.x - halfW &&
        playerPos.x <= this.x + halfW &&
        playerPos.y >= this.y - halfH &&
        playerPos.y <= this.y + halfH
      );
    }
    return false;
  }

  /**
   * Update proximity trigger state
   * @param {number} dt - Delta time in seconds
   * @param {Object} playerPos - Player position {x, y}
   * @returns {boolean} - True if activation just completed
   */
  update(dt, playerPos) {
    const inRange = this.checkProximity(playerPos);
    
    if (inRange && !this.activated) {
      // Player is in range, increase activation progress
      this.activationProgress += this.activationSpeed * dt;
      
      if (this.activationProgress >= 1.0) {
        this.activationProgress = 1.0;
        this.activated = true;
        return true; // Signal that activation just completed
      }
    } else if (!inRange && this.activationProgress > 0 && !this.activated) {
      // Player left range before activation completed, decay progress
      this.activationProgress -= this.activationSpeed * dt * 0.5;
      this.activationProgress = Math.max(0, this.activationProgress);
    }
    
    return false;
  }

  /**
   * Activate the trigger (called by game loop when activation completes)
   * @param {Object} game - Game state object
   */
  activate(game) {
    if (this.activated) return;
    this.activated = true;
    this.activationProgress = 1.0;
    // Activation logic will be handled by the game loop
    // which will find the trap by targetTrapId and activate it
  }

  /**
   * Reset the trigger to its initial state
   */
  reset() {
    this.activated = false;
    this.activationProgress = 0;
  }

  /**
   * Get the current activation progress (0 to 1)
   * @returns {number} - Activation progress
   */
  getActivationProgress() {
    return this.activationProgress;
  }
}

/**
 * MirrorCorridor - Symmetrical obstacles with phase offsets
 */
export class MirrorCorridor {
  constructor(config) {
    this.obstacleA = config.obstacleA;
    this.obstacleB = config.obstacleB;
    this.phaseOffset = config.phaseOffset !== undefined ? config.phaseOffset : Math.PI / 3;
    this.centerLine = config.centerLine; // Optional: x or y coordinate for symmetry axis
    this.symmetryAxis = config.symmetryAxis || 'vertical'; // 'vertical' or 'horizontal'
  }

  /**
   * Creates two visually symmetrical obstacles with phase offset
   * @returns {Object} - { obstacleA, obstacleB } with symmetry and phase offset applied
   */
  createObstacles() {
    // Clone obstacleA as-is
    const obsA = { ...this.obstacleA };
    
    // Clone obstacleB and apply symmetry + phase offset
    const obsB = { ...this.obstacleB };
    
    // Apply symmetry based on obstacle type
    if (obsA.type === 'ORBIT_SPHERE' && obsB.type === 'ORBIT_SPHERE') {
      // For orbit spheres: ensure symmetrical positioning
      if (this.centerLine !== undefined) {
        if (this.symmetryAxis === 'vertical') {
          // Mirror across vertical line (x-axis symmetry)
          const distanceA = obsA.cx - this.centerLine;
          obsB.cx = this.centerLine - distanceA;
          obsB.cy = obsA.cy; // Same y-coordinate for horizontal symmetry
        } else {
          // Mirror across horizontal line (y-axis symmetry)
          const distanceA = obsA.cy - this.centerLine;
          obsB.cy = this.centerLine - distanceA;
          obsB.cx = obsA.cx; // Same x-coordinate for vertical symmetry
        }
      }
      
      // Apply phase offset to startAngle
      obsB.startAngle = (obsB.startAngle || 0) + this.phaseOffset;
      
      // Ensure same orbit radius for visual symmetry
      if (obsA.orbitRadius && !obsB.orbitRadius) {
        obsB.orbitRadius = obsA.orbitRadius;
      }
      
      // Ensure same sphere radius for visual symmetry
      if (obsA.sphereR && !obsB.sphereR) {
        obsB.sphereR = obsA.sphereR;
      }
    } 
    else if (obsA.type === 'PENDULUM' && obsB.type === 'PENDULUM') {
      // For pendulums: ensure symmetrical positioning
      if (this.centerLine !== undefined) {
        if (this.symmetryAxis === 'vertical') {
          const distanceA = obsA.x - this.centerLine;
          obsB.x = this.centerLine - distanceA;
          obsB.y = obsA.y; // Same y-coordinate
        } else {
          const distanceA = obsA.y - this.centerLine;
          obsB.y = this.centerLine - distanceA;
          obsB.x = obsA.x; // Same x-coordinate
        }
      }
      
      // Apply phase offset by adjusting initial time
      // Pendulum uses: angle = sin(time * frequency) * amplitude
      // Phase offset in radians translates to time offset: timeOffset = phaseOffset / frequency
      if (!obsB.initialTime) {
        obsB.initialTime = this.phaseOffset / (obsB.frequency || obsA.frequency || 1);
      }
      
      // Ensure same length and amplitude for visual symmetry
      if (obsA.length && !obsB.length) obsB.length = obsA.length;
      if (obsA.amplitude && !obsB.amplitude) obsB.amplitude = obsA.amplitude;
      if (obsA.tipRadius && !obsB.tipRadius) obsB.tipRadius = obsA.tipRadius;
    }
    else if (obsA.type === 'PISTON' && obsB.type === 'PISTON') {
      // For pistons: ensure symmetrical positioning
      if (this.centerLine !== undefined) {
        if (this.symmetryAxis === 'vertical') {
          const distanceAx = obsA.ax - this.centerLine;
          const distanceBx = obsA.bx - this.centerLine;
          obsB.ax = this.centerLine - distanceAx;
          obsB.bx = this.centerLine - distanceBx;
          obsB.ay = obsA.ay;
          obsB.by = obsA.by;
        } else {
          const distanceAy = obsA.ay - this.centerLine;
          const distanceBy = obsA.by - this.centerLine;
          obsB.ay = this.centerLine - distanceAy;
          obsB.by = this.centerLine - distanceBy;
          obsB.ax = obsA.ax;
          obsB.bx = obsA.bx;
        }
      }
      
      // Apply phase offset by adjusting initial time
      // Piston uses: t = (sin(time * speed) + 1) / 2
      // Phase offset in radians translates to time offset: timeOffset = phaseOffset / speed
      if (!obsB.initialTime) {
        obsB.initialTime = this.phaseOffset / (obsB.speed || obsA.speed || 1);
      }
      
      // Ensure same dimensions for visual symmetry
      if (obsA.w && !obsB.w) obsB.w = obsA.w;
      if (obsA.h && !obsB.h) obsB.h = obsA.h;
    }
    
    return {
      obstacleA: obsA,
      obstacleB: obsB
    };
  }
  
  /**
   * Verifies that two obstacles are symmetrical
   * @param {Object} obsA - First obstacle
   * @param {Object} obsB - Second obstacle
   * @returns {boolean} - True if obstacles are symmetrical
   */
  verifySymmetry(obsA, obsB) {
    if (obsA.type !== obsB.type) return false;
    
    if (this.centerLine === undefined) {
      // No center line specified, can't verify symmetry
      return true;
    }
    
    const tolerance = 0.01; // Allow small floating point errors
    
    if (obsA.type === 'ORBIT_SPHERE') {
      if (this.symmetryAxis === 'vertical') {
        const distanceA = Math.abs(obsA.cx - this.centerLine);
        const distanceB = Math.abs(obsB.cx - this.centerLine);
        const sameY = Math.abs(obsA.cy - obsB.cy) < tolerance;
        return Math.abs(distanceA - distanceB) < tolerance && sameY;
      } else {
        const distanceA = Math.abs(obsA.cy - this.centerLine);
        const distanceB = Math.abs(obsB.cy - this.centerLine);
        const sameX = Math.abs(obsA.cx - obsB.cx) < tolerance;
        return Math.abs(distanceA - distanceB) < tolerance && sameX;
      }
    }
    
    if (obsA.type === 'PENDULUM') {
      if (this.symmetryAxis === 'vertical') {
        const distanceA = Math.abs(obsA.x - this.centerLine);
        const distanceB = Math.abs(obsB.x - this.centerLine);
        const sameY = Math.abs(obsA.y - obsB.y) < tolerance;
        return Math.abs(distanceA - distanceB) < tolerance && sameY;
      } else {
        const distanceA = Math.abs(obsA.y - this.centerLine);
        const distanceB = Math.abs(obsB.y - this.centerLine);
        const sameX = Math.abs(obsA.x - obsB.x) < tolerance;
        return Math.abs(distanceA - distanceB) < tolerance && sameX;
      }
    }
    
    if (obsA.type === 'PISTON') {
      if (this.symmetryAxis === 'vertical') {
        const distanceAax = Math.abs(obsA.ax - this.centerLine);
        const distanceBax = Math.abs(obsB.ax - this.centerLine);
        const distanceAbx = Math.abs(obsA.bx - this.centerLine);
        const distanceBbx = Math.abs(obsB.bx - this.centerLine);
        const sameY = Math.abs(obsA.ay - obsB.ay) < tolerance && 
                      Math.abs(obsA.by - obsB.by) < tolerance;
        return Math.abs(distanceAax - distanceBax) < tolerance && 
               Math.abs(distanceAbx - distanceBbx) < tolerance && 
               sameY;
      } else {
        const distanceAay = Math.abs(obsA.ay - this.centerLine);
        const distanceBay = Math.abs(obsB.ay - this.centerLine);
        const distanceAby = Math.abs(obsA.by - this.centerLine);
        const distanceBby = Math.abs(obsB.by - this.centerLine);
        const sameX = Math.abs(obsA.ax - obsB.ax) < tolerance && 
                      Math.abs(obsA.bx - obsB.bx) < tolerance;
        return Math.abs(distanceAay - distanceBay) < tolerance && 
               Math.abs(distanceAby - distanceBby) < tolerance && 
               sameX;
      }
    }
    
    return true;
  }
  
  /**
   * Calculates the actual phase offset between two obstacles
   * @param {Object} obsA - First obstacle
   * @param {Object} obsB - Second obstacle
   * @returns {number} - Phase offset in radians
   */
  calculatePhaseOffset(obsA, obsB) {
    if (obsA.type !== obsB.type) return 0;
    
    if (obsA.type === 'ORBIT_SPHERE') {
      // Phase offset is the difference in startAngle
      const angleA = obsA.startAngle || 0;
      const angleB = obsB.startAngle || 0;
      let diff = angleB - angleA;
      
      // Normalize to [0, 2π)
      while (diff < 0) diff += 2 * Math.PI;
      while (diff >= 2 * Math.PI) diff -= 2 * Math.PI;
      
      return diff;
    }
    
    if (obsA.type === 'PENDULUM') {
      // Phase offset is the difference in initial time * frequency
      const timeA = obsA.initialTime || 0;
      const timeB = obsB.initialTime || 0;
      const freq = obsB.frequency || obsA.frequency || 1;
      
      return (timeB - timeA) * freq;
    }
    
    if (obsA.type === 'PISTON') {
      // Phase offset is the difference in initial time * speed
      const timeA = obsA.initialTime || 0;
      const timeB = obsB.initialTime || 0;
      const speed = obsB.speed || obsA.speed || 1;
      
      return (timeB - timeA) * speed;
    }
    
    return 0;
  }
}
