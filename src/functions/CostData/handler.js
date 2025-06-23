const CostExplorerService = require('../../services/costExplorerService');
const BudgetsService = require('../../services/budgetsService');
const { createBudgetMetrics, formatCurrency } = require('../../utils/budgetUtils');
const { getCurrentDayOfMonth, getDaysInCurrentMonth } = require('../../utils/dateUtils');
const { createSafeResponse, createErrorResponse, logResponse } = require('../../utils/responseUtils');
const { CostDataResponse } = require('../../models/costDataModel');
const { withAuth } = require('../../utils/authMiddleware');

const MONTHLY_BUDGET = parseFloat(process.env.MONTHLY_BUDGET) || 0;

/**
 * AWS Lambda handler for getting cost and usage data with service breakdown
 * @param {Object} event - Lambda event object (includes user context from auth middleware)
 * @returns {Object} HTTP response with cost data
 */
const getCostDataHandler = async(event) => {
  console.log('[GetCostAndUsageHandler] Starting cost data retrieval for user:', event.user?.email);

  try {
    // Get user's cost settings
    const userCostSettings = event.user?.costSettings || {};
    const userMonthlyBudget = userCostSettings.monthlyBudget || MONTHLY_BUDGET;

    console.log('[GetCostAndUsageHandler] User budget settings:', {
      monthlyBudget: userMonthlyBudget,
      alertThreshold: userCostSettings.alertThreshold,
      currency: event.user?.preferences?.currency || 'USD',
    });

    // Initialize services
    const costExplorerService = new CostExplorerService();
    const budgetsService = new BudgetsService();

    // Get cost data with service breakdown (6 months back)
    console.log('[GetCostAndUsageHandler] Fetching cost data...');
    const costData = await costExplorerService.getCostDataWithServiceBreakdown(5);
    const { start, end, processedData } = costData;

    // Get budgets information (optional - will use fallback if fails)
    let budgets = [];
    let monthlyBudgetHistory = [];
    try {
      console.log('[GetCostAndUsageHandler] Fetching budgets...');
      const budgetResponse = await budgetsService.getBudgets();
      budgets = budgetResponse.Budgets || [];
      console.log(`[GetCostAndUsageHandler] Retrieved ${budgets.length} budgets`);

      // Get monthly cost history from budgets
      if (budgets.length > 0) {
        monthlyBudgetHistory = await budgetsService.getMonthlyCostHistoryFromBudgets(budgets);
      }
    } catch (budgetError) {
      console.warn('[GetCostAndUsageHandler] Could not retrieve budgets:', budgetError.message);
      // Continue without budget data
    }

    // Calculate budget metrics using user's budget settings
    const effectiveBudget = budgetsService.getEffectiveBudget(budgets, userMonthlyBudget);
    const currentDay = getCurrentDayOfMonth();
    const daysInMonth = getDaysInCurrentMonth();
    const budgetSource = budgets.length > 0 ? 'aws_budgets' : 'user_settings';

    const budgetMetrics = createBudgetMetrics({
      effectiveBudget,
      currentMonthCost: processedData.currentMonthCost,
      currentDay,
      daysInMonth,
      budgetSource,
      monthlyHistory: monthlyBudgetHistory,
      alertThreshold: userCostSettings.alertThreshold || 80,
    });

    // Log key metrics
    console.log(
      '[GetCostAndUsageHandler] Budget Utilization:', budgetMetrics.budgetUtilization + '%',
      '| Remaining Budget:', budgetMetrics.remainingBudget,
      '| Budget Status:', budgetMetrics.budgetStatus,
      '| Projected Monthly Cost:', budgetMetrics.projectedMonthlyCost,
      '| User:', event.user?.email,
    );

    console.log(
      '[GetCostAndUsageHandler] Service Breakdown:',
      '| Total Services (All Periods):', processedData.allServicesBreakdown.length,
      '| Current Month Services:', processedData.currentMonthServicesBreakdown.length,
      '| Top Service (All Time):', processedData.allServicesBreakdown[0]?.serviceName || 'N/A',
      '| Top Service Cost (All Time):', processedData.allServicesBreakdown[0]?.totalCost || 0,
    );

    // Create response data
    const responseData = new CostDataResponse({
      totalCost: formatCurrency(processedData.totalCost),
      dailyAverage: formatCurrency(processedData.dailyAverage),
      averageMonthlyCost: formatCurrency(processedData.averageMonthlyCost),
      currentMonthCost: formatCurrency(processedData.currentMonthCost),
      serviceCount: processedData.serviceCount,
      currency: event.user?.preferences?.currency || processedData.currency,
      start,
      end,
      services: CostDataResponse.createServicesObject(
        processedData.allServicesBreakdown,
        processedData.currentMonthServicesBreakdown,
      ),
      budget: budgetMetrics,
      user: {
        userId: event.user?.userId,
        email: event.user?.email,
        costSettings: userCostSettings,
      },
    });

    // Validate response data
    const validation = CostDataResponse.validate(responseData);
    if (!validation.isValid) {
      console.error('[GetCostAndUsageHandler] Response validation failed:', validation.errors);
      return createErrorResponse('Invalid response data structure', 500, validation.errors);
    }

    if (validation.warnings.length > 0) {
      console.warn('[GetCostAndUsageHandler] Response warnings:', validation.warnings);
    }

    // Log response info
    logResponse('GetCostAndUsageHandler', responseData);

    // Create fallback data in case of serialization issues
    const fallbackData = {
      ...responseData,
      budget: {
        ...budgetMetrics,
        monthlyHistory: [],
        monthlyHistoryError: 'Could not serialize monthly history data',
      },
      services: {
        error: 'Could not serialize services breakdown data',
        summary: responseData.services.summary,
      },
    };

    return createSafeResponse(responseData, fallbackData);

  } catch (error) {
    console.error('[GetCostAndUsageHandler] Error fetching cost data:', error);
    return createErrorResponse(
      'Failed to fetch cost data',
      500,
      {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    );
  }
};

// Export the handler wrapped with authentication middleware
module.exports.GetCostAndUsageHandler = withAuth(getCostDataHandler);
