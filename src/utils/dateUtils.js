/**
 * Date utility functions for cost analysis
 */

/**
 * Get the first day of the month, N months ago
 * @param {number} monthsBack - Number of months to go back
 * @returns {string} Date string in YYYY-MM-DD format
 */
function getStartOfMonthNMonthsAgo(monthsBack = 6) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  return startOfMonth.toISOString().split('T')[0];
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} Today's date string
 */
function getTodayDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Get the number of days in the current month
 * @returns {number} Number of days in current month
 */
function getDaysInCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

/**
 * Get the current day of the month
 * @returns {number} Current day of the month
 */
function getCurrentDayOfMonth() {
  const now = new Date();
  return now.getDate();
}

/**
 * Get remaining days in the current month
 * @returns {number} Remaining days in current month
 */
function getRemainingDaysInMonth() {
  return getDaysInCurrentMonth() - getCurrentDayOfMonth();
}

/**
 * Format a date for display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get month key for grouping (YYYY-MM format)
 * @param {Date|string} date - Date to convert
 * @returns {string} Month key
 */
function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

/**
 * Get current month key
 * @returns {string} Current month key
 */
function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}`;
}

module.exports = {
  getStartOfMonthNMonthsAgo,
  getTodayDateString,
  getDaysInCurrentMonth,
  getCurrentDayOfMonth,
  getRemainingDaysInMonth,
  formatDate,
  getMonthKey,
  getCurrentMonthKey,
};
