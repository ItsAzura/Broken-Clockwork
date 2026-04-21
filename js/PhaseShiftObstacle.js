/*
 * PhaseShiftObstacle.js
 * Extends AutonomousObstacle to add phase shift logic.
 * Obstacles that subtly speed up every 3 deaths.
 */

import { AutonomousObstacle } from './AutonomousObstacle.js';

/**
 * PhaseShiftObstacle - Extends AutonomousObstacle with death-based speed scaling
 * 
 * Speed increases by 10% every 3 deaths:
 * - Deaths 0-2: 1.0x speed
 * - Deaths 3-5: 1.1x speed
 * - Deaths 6-8: 1.2x speed
 * - etc.
 */
export class PhaseShiftObstacle extends AutonomousObstacle {
  constructor(config) {
    super(config);
    this.baseSpeed = config.speed;
    this.phaseShiftEnabled = true;
  }

  /**
   * Update phase shift speed based on death count
   * @param {number} deathCount - Current death count
   */
  updatePhaseShift(deathCount) {
    // Every 3 deaths, increase speed by 10%
    // Formula: speed = baseSpeed * (1 + floor(deathCount / 3) * 0.1)
    const multiplier = 1 + Math.floor(deathCount / 3) * 0.1;
    this.speed = this.baseSpeed * multiplier;
  }

  /**
   * Reset speed to base when level reloads
   */
  reset() {
    this.speed = this.baseSpeed;
  }
}
