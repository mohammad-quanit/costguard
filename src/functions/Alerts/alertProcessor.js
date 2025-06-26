const { AlertEngine } = require('../../services/alertEngine');
const { BudgetAggregator } = require('../../services/budgetAggregator');
const { NotificationService } = require('../../services/notificationService');
const { getUserById } = require('../../services/userService');
const { createResponse } = require('../../utils/response');

/**
 * Scheduled Alert Processor
 * Runs every hour to check budget utilization and trigger alerts
 */
exports.handler = async(event) => {
  console.log('Alert Processor triggered:', JSON.stringify(event, null, 2));

  try {
    const alertEngine = new AlertEngine();
    const budgetAggregator = new BudgetAggregator();
    const notificationService = new NotificationService();

    const startTime = Date.now();

    // 1. Aggregate all budgets (AWS + Custom)
    console.log('Aggregating all budgets...');
    const aggregatedBudgets = await budgetAggregator.aggregateAllBudgets();
    console.log(`Found ${aggregatedBudgets.length} budgets to process`);

    // 2. Check thresholds for each budget
    console.log('Checking budget thresholds...');
    const alertsToTrigger = await alertEngine.checkThresholds(aggregatedBudgets);
    console.log(`${alertsToTrigger.length} alerts need to be triggered`);

    // 3. Process and send notifications
    const notificationResults = [];
    for (const alert of alertsToTrigger) {
      try {
        // Fetch user email for the alert
        if (alert.userId) {
          const user = await getUserById(alert.userId);
          if (user && user.email) {
            alert.userEmail = user.email;
          }
        }
        
        await notificationService.sendAlert(alert);
        notificationResults.push({
          budgetId: alert.budgetId,
          budgetName: alert.budgetName,
          alertType: alert.alertType,
          status: 'sent',
          utilization: alert.currentUtilization,
        });
        console.log(`Alert sent for budget: ${alert.budgetName} (${alert.currentUtilization}%)`);
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

    const processingTime = Date.now() - startTime;

    // 4. Log metrics for monitoring
    await logMetrics({
      alertsTriggered: alertsToTrigger.length,
      budgetsProcessed: aggregatedBudgets.length,
      processingTime,
      successfulNotifications: notificationResults.filter(r => r.status === 'sent').length,
      failedNotifications: notificationResults.filter(r => r.status === 'failed').length,
    });

    const response = {
      message: 'Alert processing completed successfully',
      summary: {
        budgetsProcessed: aggregatedBudgets.length,
        alertsTriggered: alertsToTrigger.length,
        notificationsSent: notificationResults.filter(r => r.status === 'sent').length,
        notificationsFailed: notificationResults.filter(r => r.status === 'failed').length,
        processingTimeMs: processingTime,
      },
      alerts: alertsToTrigger.map(alert => ({
        budgetId: alert.budgetId,
        budgetName: alert.budgetName,
        budgetType: alert.budgetType,
        alertType: alert.alertType,
        currentUtilization: alert.currentUtilization,
        threshold: alert.threshold,
        severity: alert.severity,
        timestamp: alert.timestamp,
      })),
      notifications: notificationResults,
    };

    console.log('Alert processing completed:', JSON.stringify(response.summary));
    return response;

  } catch (error) {
    console.error('Alert processing failed:', error);

    // Log error metrics
    await logMetrics({
      processingErrors: 1,
      errorType: error.name || 'UnknownError',
    });

    throw error;
  }
};

/**
 * Log custom metrics to CloudWatch
 */
async function logMetrics(metrics) {
  try {
    // In a real implementation, you would send these to CloudWatch
    console.log('Metrics:', JSON.stringify(metrics, null, 2));

    // Example CloudWatch metrics implementation:
    // const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
    // const cloudWatch = new CloudWatchClient({ region: process.env.AWS_REGION });
    //
    // const metricData = Object.entries(metrics).map(([name, value]) => ({
    //   MetricName: name,
    //   Value: typeof value === 'number' ? value : 1,
    //   Unit: 'Count',
    //   Timestamp: new Date()
    // }));
    //
    // await cloudWatch.send(new PutMetricDataCommand({
    //   Namespace: 'CostGuard/Alerts',
    //   MetricData: metricData
    // }));

  } catch (error) {
    console.error('Failed to log metrics:', error);
  }
}
