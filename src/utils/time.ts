/**
 * Time utility functions for mock time support
 *
 * Set MOCK_TIME_ENABLED to true to simulate a specific time of day
 */

// Enable mock time for development
const MOCK_TIME_ENABLED = false;

/**
 * Get mock time: 9:00 AM today
 */
function getMockTime(): number {
  const today = new Date();
  today.setHours(9, 0, 0, 0);
  return today.getTime();
}

/**
 * Get the current time in milliseconds
 * Returns mock time (9:00 AM) if MOCK_TIME_ENABLED is true
 */
export function getCurrentTime(): number {
  if (MOCK_TIME_ENABLED) {
    return getMockTime();
  }
  return Date.now();
}

/**
 * Get the current Date object
 * Returns mock date (9:00 AM today) if MOCK_TIME_ENABLED is true
 */
export function getCurrentDate(): Date {
  if (MOCK_TIME_ENABLED) {
    return new Date(getMockTime());
  }
  return new Date();
}
