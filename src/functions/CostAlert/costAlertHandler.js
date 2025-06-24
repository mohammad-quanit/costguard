const { CostExplorerClient, GetCostAndUsageCommand } = require('@aws-sdk/client-cost-explorer');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { getAllActiveBudgets, updateBudgetSpending, updateLastAlertSent, isThresholdExceeded, calculateUtilization, getBudgetStatus } = require('../../services/budgetService');
const { getUserById } = require('../../services/userService');
const { createResponse, handleError } = require('../../utils/auth');

const costExplorerClient = new CostExplorerClient({ region: process.env.AWS_REGION || 'us-east-1' });
const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Cost Alert Handler
 * Checks all active budgets against current spending and sends alerts
 */
exports.handler = async(event) => {
  try {
    console.log('Starting cost alert check...');

    // Get all active budgets
    const activeBudgets = await getAllActiveBudgets();
    console.log(`Found ${activeBudgets.length} active budgets to check`);

    if (activeBudgets.length === 0) {
      return createResponse(200, {
        message: 'No active budgets found',
        processedBudgets: 0,
      });
    }

    const results = [];
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Process each budget
    for (const budget of activeBudgets) {
      try {
        console.log(`Processing budget ${budget.budgetId} for user ${budget.userId}`);

        // Get user information
        const user = await getUserById(budget.userId);
        if (!user || !user.isActive) {
          console.log(`Skipping inactive user ${budget.userId}`);
          continue;
        }

        // Get current month's spending from Cost Explorer
        const costParams = {
          TimePeriod: {
            Start: startOfMonth.toISOString().split('T')[0],
            End: endOfMonth.toISOString().split('T')[0],
          },
          Granularity: 'MONTHLY',
          Metrics: ['BlendedCost'],
          GroupBy: [
            {
              Type: 'DIMENSION',
              Key: 'SERVICE',
            },
          ],
        };

        // Add service filter if specified in budget
        if (budget.services && budget.services.length > 0) {
          costParams.Filter = {
            Dimensions: {
              Key: 'SERVICE',
              Values: budget.services,
            },
          };
        }

        const costCommand = new GetCostAndUsageCommand(costParams);
        const costResponse = await costExplorerClient.send(costCommand);

        // Calculate total spending
        let totalSpent = 0;
        if (costResponse.ResultsByTime && costResponse.ResultsByTime.length > 0) {
          const monthData = costResponse.ResultsByTime[0];
          if (monthData.Groups) {
            totalSpent = monthData.Groups.reduce((sum, group) => {
              return sum + parseFloat(group.Metrics.BlendedCost.Amount || 0);
            }, 0);
          } else if (monthData.Total && monthData.Total.BlendedCost) {
            totalSpent = parseFloat(monthData.Total.BlendedCost.Amount || 0);
          }
        }

        // Calculate projected monthly spend
        const daysInMonth = endOfMonth.getDate();
        const currentDay = currentDate.getDate();
        const projectedSpend = currentDay > 0 ? (totalSpent / currentDay) * daysInMonth : 0;

        // Update budget with current spending
        const spendingData = {
          totalSpentThisMonth: totalSpent,
          projectedMonthlySpend: projectedSpend,
        };

        const updatedBudget = await updateBudgetSpending(budget.userId, budget.budgetId, spendingData);

        // Check if alert should be sent
        const shouldAlert = isThresholdExceeded(updatedBudget);
        const utilization = calculateUtilization(totalSpent, budget.monthlyLimit);
        const status = getBudgetStatus(updatedBudget);

        console.log(`Budget ${budget.budgetId}: $${totalSpent.toFixed(2)}/$${budget.monthlyLimit} (${utilization}%) - Status: ${status}`);

        const result = {
          userId: budget.userId,
          budgetId: budget.budgetId,
          budgetName: budget.budgetName,
          monthlyLimit: budget.monthlyLimit,
          totalSpent: totalSpent,
          projectedSpend: projectedSpend,
          utilization: utilization,
          status: status,
          alertSent: false,
          error: null,
        };

        // Send alert if threshold exceeded and notifications enabled
        if (shouldAlert && budget.notifications.email) {
          try {
            await sendCostAlert(user, updatedBudget, {
              totalSpent,
              projectedSpend,
              utilization,
              status,
            });

            // Update last alert sent timestamp
            await updateLastAlertSent(budget.userId, budget.budgetId);
            result.alertSent = true;

            console.log(`Alert sent for budget ${budget.budgetId}`);
          } catch (alertError) {
            console.error(`Failed to send alert for budget ${budget.budgetId}:`, alertError);
            result.error = alertError.message;
          }
        }

        results.push(result);

      } catch (budgetError) {
        console.error(`Error processing budget ${budget.budgetId}:`, budgetError);
        results.push({
          userId: budget.userId,
          budgetId: budget.budgetId,
          error: budgetError.message,
          alertSent: false,
        });
      }
    }

    const alertsSent = results.filter(r => r.alertSent).length;
    const errors = results.filter(r => r.error).length;

    console.log(`Cost alert check completed. Processed: ${results.length}, Alerts sent: ${alertsSent}, Errors: ${errors}`);

    return createResponse(200, {
      message: 'Cost alert check completed',
      processedBudgets: results.length,
      alertsSent: alertsSent,
      errors: errors,
      results: results,
    });

  } catch (error) {
    console.error('Cost alert handler error:', error);
    return handleError(error);
  }
};

/**
 * Send cost alert notification
 * @param {Object} user - User object
 * @param {Object} budget - Budget object
 * @param {Object} spendingInfo - Current spending information
 */
async function sendCostAlert(user, budget, spendingInfo) {
  const { totalSpent, projectedSpend, utilization, status } = spendingInfo;

  // Prepare alert message
  const alertMessage = {
    user: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    budget: {
      budgetName: budget.budgetName,
      monthlyLimit: budget.monthlyLimit,
      currency: budget.currency,
      alertThreshold: budget.alertThreshold,
    },
    spending: {
      totalSpent: totalSpent,
      projectedSpend: projectedSpend,
      utilization: utilization,
      status: status,
      remainingBudget: Math.max(0, budget.monthlyLimit - totalSpent),
    },
    timestamp: new Date().toISOString(),
    alertType: status === 'exceeded' ? 'BUDGET_EXCEEDED' : 'THRESHOLD_REACHED',
  };

  // Send SNS notification if topic ARN is configured
  if (process.env.COST_ALERT_TOPIC) {
    const snsParams = {
      TopicArn: process.env.COST_ALERT_TOPIC,
      Subject: `🚨 CostGuard Alert: ${status === 'exceeded' ? 'Budget Exceeded' : 'Spending Threshold Reached'}`,
      Message: JSON.stringify(alertMessage, null, 2),
    };

    const snsCommand = new PublishCommand(snsParams);
    await snsClient.send(snsCommand);
  }

  // Send Slack notification if webhook URL is configured
  if (budget.notifications.slack && budget.notifications.webhookUrl) {
    await sendSlackAlert(budget.notifications.webhookUrl, user, budget, spendingInfo);
  }

  console.log(`Alert sent for user ${user.email}, budget ${budget.budgetName}`);
}

/**
 * Send Slack alert notification
 * @param {string} webhookUrl - Slack webhook URL
 * @param {Object} user - User object
 * @param {Object} budget - Budget object
 * @param {Object} spendingInfo - Current spending information
 */
async function sendSlackAlert(webhookUrl, user, budget, spendingInfo) {
  const { totalSpent, projectedSpend, utilization, status } = spendingInfo;

  const statusEmoji = {
    'on_track': '✅',
    'warning': '⚠️',
    'exceeded': '🚨',
  };

  const slackMessage = {
    text: `${statusEmoji[status]} CostGuard Budget Alert`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji[status]} Budget Alert: ${budget.budgetName}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*User:* ${user.firstName} ${user.lastName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Email:* ${user.email}`,
          },
          {
            type: 'mrkdwn',
            text: `*Budget:* $${budget.monthlyLimit} ${budget.currency}`,
          },
          {
            type: 'mrkdwn',
            text: `*Spent:* $${totalSpent.toFixed(2)} (${utilization}%)`,
          },
          {
            type: 'mrkdwn',
            text: `*Projected:* $${projectedSpend.toFixed(2)}`,
          },
          {
            type: 'mrkdwn',
            text: `*Status:* ${status.replace('_', ' ').toUpperCase()}`,
          },
        ],
      },
    ],
  };

  // Send to Slack webhook (you would implement HTTP request here)
  console.log('Slack alert prepared:', JSON.stringify(slackMessage, null, 2));
}

module.exports = { handler: exports.handler };
