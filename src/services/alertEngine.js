const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

class AlertEngine {
  constructor() {
    this.docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }));
  }

  /**
   * Check thresholds for all budgets and determine which alerts to trigger
   */
  async checkThresholds(budgets, forceAlert = false) {
    console.log(`Checking thresholds for ${budgets.length} budgets...`);

    const alertsToTrigger = [];

    for (const budget of budgets) {
      try {
        const alerts = await this.evaluateBudgetAlerts(budget, forceAlert);
        alertsToTrigger.push(...alerts);
      } catch (error) {
        console.error(`Failed to evaluate alerts for budget ${budget.name}:`, error);
      }
    }

    console.log(`${alertsToTrigger.length} alerts will be triggered`);
    return alertsToTrigger;
  }

  /**
   * Evaluate alerts for a specific budget
   */
  async evaluateBudgetAlerts(budget, forceAlert = false) {
    const alerts = [];

    if (!budget.utilization) {
      console.log(`No utilization data for budget ${budget.name}, skipping alert evaluation`);
      return alerts;
    }

    const { utilization } = budget.utilization;
    const threshold = budget.alertThreshold || 80;

    console.log(`Evaluating budget ${budget.name}: ${utilization}% utilization (threshold: ${threshold}%)`);

    // Check if alert should be triggered
    if (utilization >= threshold || forceAlert) {
      const alertType = utilization >= 100 ? 'BUDGET_EXCEEDED' : 'THRESHOLD_REACHED';

      // Check if alert was already sent recently (avoid spam)
      const shouldSendAlert = forceAlert || await this.shouldSendAlert(budget.id, alertType);

      if (shouldSendAlert) {
        const alert = {
          budgetId: budget.id,
          budgetName: budget.name,
          budgetType: budget.type,
          alertType,
          threshold,
          currentUtilization: utilization,
          currentSpend: budget.utilization.currentSpend,
          budgetLimit: budget.limit,
          remainingBudget: budget.utilization.remainingBudget,
          currency: budget.currency,
          notifications: budget.notifications,
          userId: budget.userId,
          timestamp: new Date().toISOString(),
          severity: this.getAlertSeverity(utilization, threshold),
          services: budget.services || [],
          tags: budget.tags || {},
        };

        alerts.push(alert);
        console.log(`Alert created for budget ${budget.name}: ${alertType} (${utilization}%)`);

        // Record that alert was sent (unless it's a forced alert for testing)
        if (!forceAlert) {
          await this.recordAlertSent(budget.id, alertType);
        }
      } else {
        console.log(`Alert for budget ${budget.name} was recently sent, skipping`);
      }
    } else {
      console.log(`Budget ${budget.name} is within threshold (${utilization}% < ${threshold}%)`);
    }

    return alerts;
  }

  /**
   * Check if an alert should be sent (based on frequency settings)
   */
  async shouldSendAlert(budgetId, alertType) {
    try {
      // For now, we'll use a simple approach without a separate alert history table
      // In production, you might want to create a dedicated alert history table

      const command = new GetCommand({
        TableName: process.env.CLOUD_BUDGET_SETTINGS_TABLE,
        Key: {
          budgetId: budgetId,
        },
      });

      const result = await this.docClient.send(command);

      if (!result.Item || !result.Item.lastAlertSent) {
        return true; // First time alert
      }

      const lastSent = new Date(result.Item.lastAlertSent);
      const now = new Date();
      const hoursSinceLastAlert = (now - lastSent) / (1000 * 60 * 60);

      // Don't send same alert more than once per 24 hours
      const shouldSend = hoursSinceLastAlert >= 24;

      console.log(`Last alert for budget ${budgetId} was sent ${Math.round(hoursSinceLastAlert)} hours ago. Should send: ${shouldSend}`);

      return shouldSend;

    } catch (error) {
      console.error(`Failed to check alert history for budget ${budgetId}:`, error);
      // If we can't check history, allow the alert to be sent
      return true;
    }
  }

  /**
   * Record that an alert was sent
   */
  async recordAlertSent(budgetId, alertType) {
    try {
      // Update the budget record with last alert sent timestamp
      const command = new PutCommand({
        TableName: process.env.CLOUD_BUDGET_SETTINGS_TABLE,
        Key: {
          budgetId: budgetId,
        },
        UpdateExpression: 'SET lastAlertSent = :timestamp, lastAlertType = :alertType',
        ExpressionAttributeValues: {
          ':timestamp': new Date().toISOString(),
          ':alertType': alertType,
        },
      });

      await this.docClient.send(command);
      console.log(`Recorded alert sent for budget ${budgetId}: ${alertType}`);

    } catch (error) {
      console.error(`Failed to record alert sent for budget ${budgetId}:`, error);
      // Don't throw error here as it shouldn't block the alert process
    }
  }

  /**
   * Get alert severity based on utilization
   */
  getAlertSeverity(utilization, threshold) {
    if (utilization >= 100) {
      return 'CRITICAL';
    }
    if (utilization >= threshold + 15) {
      return 'HIGH';
    }
    if (utilization >= threshold + 5) {
      return 'MEDIUM';
    }
    if (utilization >= threshold) {
      return 'LOW';
    }
    return 'INFO';
  }

  /**
   * Get alert priority for processing order
   */
  getAlertPriority(severity) {
    const priorities = {
      'CRITICAL': 1,
      'HIGH': 2,
      'MEDIUM': 3,
      'LOW': 4,
      'INFO': 5,
    };
    return priorities[severity] || 5;
  }
}

module.exports = { AlertEngine };
