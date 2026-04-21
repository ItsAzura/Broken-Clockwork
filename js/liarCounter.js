/**
 * LiarCounter - UI component that briefly shows wrong gear count
 * 
 * When a troll token is collected, displays an incorrect gear count
 * for 0.5 seconds before showing the correct value.
 */
export class LiarCounter {
  constructor() {
    this.displayCount = 0;
    this.actualCount = 0;
    this.lieTimer = 0;
    this.lieDuration = 0.5; // seconds
  }

  /**
   * Called when a troll token is collected
   * @param {number} actualCount - The actual number of gears collected
   */
  onTrollTokenCollect(actualCount) {
    this.actualCount = actualCount;
    // Randomly +1 or -1 from actual count
    const offset = Math.random() < 0.5 ? 1 : -1;
    this.displayCount = actualCount + offset;
    this.lieTimer = this.lieDuration;
  }

  /**
   * Update the timer countdown
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (this.lieTimer > 0) {
      this.lieTimer -= dt;
      if (this.lieTimer <= 0) {
        this.displayCount = this.actualCount;
      }
    }
  }

  /**
   * Get the count to display in the UI
   * @returns {number} Display count (may be incorrect if timer active)
   */
  getDisplayCount() {
    return this.lieTimer > 0 ? this.displayCount : this.actualCount;
  }

  /**
   * Update the actual count (for normal token collection)
   * @param {number} count - The actual gear count
   */
  setActualCount(count) {
    this.actualCount = count;
    if (this.lieTimer <= 0) {
      this.displayCount = count;
    }
  }

  /**
   * Check if the counter is currently lying
   * @returns {boolean} True if displaying incorrect count
   */
  isLying() {
    return this.lieTimer > 0;
  }

  reset() {
    this.displayCount = 0;
    this.actualCount = 0;
    this.lieTimer = 0;
  }
}
