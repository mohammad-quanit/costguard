const CostExplorerService = require('../../services/costExplorerService');
const { createSuccessResponse, createErrorResponse } = require('../../utils/responseUtils');
const { getTodayDateString, getStartOfMonthNMonthsAgo } = require('../../utils/dateUtils');

/**
 * AWS Lambda handler for cost alerts
 * @param {Object} event - Lambda event object
 * @returns {Object} HTTP response
 */
module.exports.costAlertHandler = async (event) => {
  console.log('[CostAlertHandler] Starting cost alert processing');

  try {
    // Initialize cost explorer service
    const costExplorerService = new CostExplorerService();

    // Get yesterday's cost data
    const today = getTodayDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`[CostAlertHandler] Fetching cost data for ${yesterday}`);

    // Get cost data for yesterday
    const yesterdayCostData = await costExplorerService.getCostAndUsage({
      start: yesterday,
      end: today,
      granularity: 'DAILY'
    });

    // Get 7-day average for comparison
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekCostData = await costExplorerService.getCostAndUsage({
      start: sevenDaysAgo,
      end: today,
      granularity: 'DAILY'
    });

    // Calculate metrics
    const yesterdayTotal = calculateDayTotal(yesterdayCostData);
    const weeklyAverage = calculateWeeklyAverage(weekCostData);
    const anomalyThreshold = weeklyAverage * 1.5; // 50% above average

    console.log(`[CostAlertHandler] Yesterday: $${yesterdayTotal.toFixed(2)}, Weekly Avg: $${weeklyAverage.toFixed(2)}, Threshold: $${anomalyThreshold.toFixed(2)}`);

    // Check for anomalies
    const isAnomaly = yesterdayTotal > anomalyThreshold;
    const percentageIncrease = weeklyAverage > 0 ? ((yesterdayTotal - weeklyAverage) / weeklyAverage * 100) : 0;

    const alertData = {
      date: yesterday,
      yesterdayCost: yesterdayTotal.toFixed(2),
      weeklyAverage: weeklyAverage.toFixed(2),
      anomalyThreshold: anomalyThreshold.toFixed(2),
      isAnomaly,
      percentageIncrease: percentageIncrease.toFixed(2),
      currency: 'USD',
      timestamp: new Date().toISOString()
    };

    if (isAnomaly) {
      console.log(`[CostAlertHandler] ANOMALY DETECTED: ${percentageIncrease.toFixed(2)}% increase`);
      // Here you would typically send to SNS, store in DynamoDB, etc.
      // For now, we'll just log and return the alert
    } else {
      console.log('[CostAlertHandler] No anomaly detected');
    }

    return createSuccessResponse(alertData);

  } catch (error) {
    console.error('[CostAlertHandler] Error processing cost alert:', error);
    return createErrorResponse(
      'Failed to process cost alert',
      500,
      {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    );
  }
};

/**
 * Calculate total cost for a single day
 * @param {Object} costData - Cost data from Cost Explorer
 * @returns {number} Total cost for the day
 */
function calculateDayTotal(costData) {
  const results = costData.ResultsByTime || [];
  if (results.length === 0) return 0;

  const dayResult = results[0];
  return dayResult.Groups?.reduce((sum, group) => 
    sum + parseFloat(group.Metrics.BlendedCost.Amount || '0'), 0) || 0;
}

/**
 * Calculate weekly average cost
 * @param {Object} costData - Cost data from Cost Explorer
 * @returns {number} Weekly average cost
 */
function calculateWeeklyAverage(costData) {
  const results = costData.ResultsByTime || [];
  if (results.length === 0) return 0;

  let totalCost = 0;
  let dayCount = 0;

  results.forEach(day => {
    const dayTotal = day.Groups?.reduce((sum, group) => 
      sum + parseFloat(group.Metrics.BlendedCost.Amount || '0'), 0) || 0;
    totalCost += dayTotal;
    dayCount++;
  });

  return dayCount > 0 ? totalCost / dayCount : 0;
}
