const { AlertEngine } = require('../../services/alertEngine');
const { BudgetAggregator } = require('../../services/budgetAggregator');
const { NotificationService } = require('../../services/notificationService');
const { createResponse } = require('../../utils/response');
const { verifyToken, extractTokenFromEvent } = require('../../utils/auth');

/**
 * Manual Alert Trigger API
 * Allows users to manually trigger alert checks for their budgets
 */
exports.handler = async(event) => {
  console.log('Manual alert trigger requested:', JSON.stringify(event, null, 2));

  try {
    // Extract and verify authentication token
    const token = extractTokenFromEvent(event);
    if (!token) {
      return createResponse(401, {
        error: 'Unauthorized',
        message: 'Authorization token is required',
      });
    }

    const user = verifyToken(token);
    if (!user) {
      return createResponse(401, {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { budgetId, forceAlert = false, testMode = false } = body;

    console.log(`Manual alert trigger by user ${user.userId}, budgetId: ${budgetId}, forceAlert: ${forceAlert}, testMode: ${testMode}`);

    const alertEngine = new AlertEngine();
    const budgetAggregator = new BudgetAggregator();
    const notificationService = new NotificationService();

    const startTime = Date.now();

    // 1. Get budgets to check
    let budgetsToCheck;

    if (budgetId) {
      // Check specific budget
      console.log(`Checking specific budget: ${budgetId}`);
      const allBudgets = await budgetAggregator.aggregateAllBudgets();
      budgetsToCheck = allBudgets.filter(b =>
        b.id === budgetId && b.userId === user.userId,
      );

      if (budgetsToCheck.length === 0) {
        return createResponse(404, {
          error: 'Budget not found',
          message: 'Budget not found or you do not have permission to access it',
        });
      }
    } else {
      // Check all user budgets
      console.log(`Checking all budgets for user: ${user.userId}`);
      const allBudgets = await budgetAggregator.aggregateAllBudgets();
      budgetsToCheck = allBudgets.filter(b => b.userId === user.userId);
    }

    console.log(`Found ${budgetsToCheck.length} budgets to check`);

    // 2. Check thresholds
    const alertsToTrigger = await alertEngine.checkThresholds(budgetsToCheck, forceAlert);
    console.log(`${alertsToTrigger.length} alerts will be triggered`);

    // 3. Send notifications (unless in test mode)
    const notificationResults = [];

    if (!testMode) {
      for (const alert of alertsToTrigger) {
        try {
          // Add user email to alert for notification purposes
          alert.userEmail = user.email;
          
          const result = await notificationService.sendAlert(alert);
          notificationResults.push({
            budgetId: alert.budgetId,
            budgetName: alert.budgetName,
            alertType: alert.alertType,
            severity: alert.severity,
            utilization: alert.currentUtilization,
            notifications: result,
            status: 'sent',
          });
        } catch (error) {
          console.error(`Failed to send alert for budget ${alert.budgetName}:`, error);
          notificationResults.push({
            budgetId: alert.budgetId,
            budgetName: alert.budgetName,
            status: 'failed',
            error: error.message,
          });
        }
      }
    } else {
      console.log('Test mode enabled - notifications not sent');
    }

    const processingTime = Date.now() - startTime;

    // 4. Prepare response
    const response = {
      message: testMode ? 'Alert check completed (test mode)' : 'Alert check completed',
      summary: {
        userId: user.userId,
        budgetsChecked: budgetsToCheck.length,
        alertsTriggered: alertsToTrigger.length,
        notificationsSent: testMode ? 0 : notificationResults.filter(r => r.status === 'sent').length,
        notificationsFailed: testMode ? 0 : notificationResults.filter(r => r.status === 'failed').length,
        processingTimeMs: processingTime,
        testMode,
        forceAlert,
      },
      budgets: budgetsToCheck.map(budget => ({
        budgetId: budget.id,
        budgetName: budget.name,
        currentUtilization: budget.utilization?.utilization || 0,
        currentSpend: budget.utilization?.currentSpend || 0,
        budgetLimit: budget.limit,
        threshold: budget.alertThreshold,
        status: budget.utilization?.status || 'UNKNOWN',
        alertTriggered: alertsToTrigger.some(alert => alert.budgetId === budget.id),
      })),
      alerts: alertsToTrigger.map(alert => ({
        budgetId: alert.budgetId,
        budgetName: alert.budgetName,
        alertType: alert.alertType,
        severity: alert.severity,
        currentUtilization: alert.currentUtilization,
        threshold: alert.threshold,
        currentSpend: alert.currentSpend,
        budgetLimit: alert.budgetLimit,
        remainingBudget: alert.remainingBudget,
        timestamp: alert.timestamp,
      })),
      ...(testMode ? {} : { notifications: notificationResults }),
    };

    console.log('Manual alert trigger completed:', JSON.stringify(response.summary));

    return createResponse(200, response);

  } catch (error) {
    console.error('Manual alert trigger failed:', error);

    return createResponse(500, {
      error: 'Internal server error',
      message: 'Failed to trigger alert check',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
