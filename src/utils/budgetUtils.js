/**
 * Budget calculation utilities
 */

/**
 * Calculate budget utilization percentage
 * @param {number} currentCost - Current month cost
 * @param {number} budget - Monthly budget
 * @returns {number} Utilization percentage
 */
function calculateBudgetUtilization(currentCost, budget) {
  return budget > 0 ? (currentCost / budget) * 100 : 0;
}

/**
 * Calculate remaining budget
 * @param {number} budget - Monthly budget
 * @param {number} currentCost - Current month cost
 * @returns {number} Remaining budget amount
 */
function calculateRemainingBudget(budget, currentCost) {
  return budget - currentCost;
}

/**
 * Determine budget status based on utilization
 * @param {number} utilizationPercent - Budget utilization percentage
 * @returns {string} Budget status: 'over_budget', 'warning', or 'on_track'
 */
function getBudgetStatus(utilizationPercent) {
  if (utilizationPercent > 100) return 'over_budget';
  if (utilizationPercent > 80) return 'warning';
  return 'on_track';
}

/**
 * Calculate projected monthly cost based on current spending
 * @param {number} currentCost - Current month cost so far
 * @param {number} currentDay - Current day of the month
 * @param {number} daysInMonth - Total days in the month
 * @returns {number} Projected monthly cost
 */
function calculateProjectedMonthlyCost(currentCost, currentDay, daysInMonth) {
  return currentDay > 0 ? (currentCost / currentDay) * daysInMonth : 0;
}

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted amount
 */
function formatCurrency(amount, decimals = 2) {
  return parseFloat(amount).toFixed(decimals);
}

/**
 * Calculate percentage of total
 * @param {number} part - Part amount
 * @param {number} total - Total amount
 * @param {number} decimals - Number of decimal places
 * @returns {number} Percentage
 */
function calculatePercentage(part, total, decimals = 2) {
  return total > 0 ? parseFloat(((part / total) * 100).toFixed(decimals)) : 0;
}

/**
 * Create budget metrics object
 * @param {Object} params - Budget calculation parameters
 * @returns {Object} Complete budget metrics
 */
function createBudgetMetrics({
  effectiveBudget,
  currentMonthCost,
  currentDay,
  daysInMonth,
  budgetSource,
  monthlyHistory = []
}) {
  const budgetUtilization = calculateBudgetUtilization(currentMonthCost, effectiveBudget);
  const remainingBudget = calculateRemainingBudget(effectiveBudget, currentMonthCost);
  const budgetStatus = getBudgetStatus(budgetUtilization);
  const projectedMonthlyCost = calculateProjectedMonthlyCost(currentMonthCost, currentDay, daysInMonth);
  const daysRemainingInMonth = daysInMonth - currentDay;

  return {
    monthlyBudget: formatCurrency(effectiveBudget),
    budgetUtilization: formatCurrency(budgetUtilization),
    remainingBudget: formatCurrency(remainingBudget),
    budgetStatus,
    projectedMonthlyCost: formatCurrency(projectedMonthlyCost),
    isOverBudget: budgetUtilization > 100,
    daysRemainingInMonth,
    budgetSource,
    monthlyHistory
  };
}

module.exports = {
  calculateBudgetUtilization,
  calculateRemainingBudget,
  getBudgetStatus,
  calculateProjectedMonthlyCost,
  formatCurrency,
  calculatePercentage,
  createBudgetMetrics
};
