const { getAllActiveBudgets } = require('../../services/budgetService');
const CostExplorerService = require('../../services/costExplorerService');
const { getUserById } = require('../../services/userService');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Budget Threshold Monitor
 * Runs every 12 hours to check app budget thresholds and send email alerts
 */
exports.handler = async(event) => {
  console.log('Budget Threshold Monitor started');

  try {
    // Get current AWS costs
    const costExplorerService = new CostExplorerService();

    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date();

    const costData = await costExplorerService.getCostAndUsage({
      start: startOfMonth.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
      granularity: 'MONTHLY',
    });

    // Extract current month cost from the response
    let currentMonthCost = 0;
    if (costData && costData.ResultsByTime && costData.ResultsByTime.length > 0) {
      const result = costData.ResultsByTime[0];
      if (result.Total && result.Total.BlendedCost) {
        currentMonthCost = parseFloat(result.Total.BlendedCost.Amount) || 0;
      }
    }

    // 🚨 DUMMY VALUES FOR TESTING - REMOVE IN PRODUCTION 🚨
    // Override with dummy cost values to trigger alerts for testing
    // This simulates high AWS spending that crosses budget thresholds

    // SCENARIO 1: Moderate spending - will trigger some alerts
    // currentMonthCost = 25.50; // Dummy cost that will trigger alerts

    // SCENARIO 2: High spending - will trigger most alerts (uncomment to test)
    // currentMonthCost = 85.00; // Will trigger alerts for budgets with limits < $100

    // SCENARIO 3: Very high spending - will trigger all alerts (uncomment to test)
    // currentMonthCost = 150.00; // Will trigger alerts for all budgets

    // SCENARIO 4: Low spending - will trigger no alerts (uncomment to test)
    // currentMonthCost = 5.00; // Will not trigger any alerts

    // console.log('🧪 TESTING MODE: Using dummy currentMonthCost =', currentMonthCost);

    // Expected behavior with currentMonthCost = $25.50:
    // - Budget: "mquanit Budget" ($20 limit, 75% threshold = $15) → ALERT ✅ (25.50 > 15)
    // - Budget: "costguard Budget" ($40 limit, 72% threshold = $28.8) → NO ALERT ❌ (25.50 < 28.8)
    // - Any budget with limit > $32 and threshold 80% → NO ALERT ❌
    // - Any budget with limit < $26 → LIKELY ALERT ✅
    // 🚨 END DUMMY VALUES 🚨

    console.log(`Current month cost: $${currentMonthCost}`);

    // Get all active app budgets
    const budgets = await getAllActiveBudgets();
    console.log(`Checking ${budgets.length} active budgets`);

    const alertsSent = [];

    // Check each budget
    for (const budget of budgets) {
      try {
        const budgetLimit = parseFloat(budget.monthlyLimit) || 0;
        const alertThreshold = budget.alertThreshold || 80;
        const thresholdAmount = (budgetLimit * alertThreshold) / 100;

        console.log(`Budget: ${budget.budgetName}, Limit: $${budgetLimit}, Threshold: ${alertThreshold}%, Threshold Amount: $${thresholdAmount}, Current: $${currentMonthCost}`);

        // Check if threshold is crossed
        if (currentMonthCost >= thresholdAmount) {
          const utilization = budgetLimit > 0 ? (currentMonthCost / budgetLimit) * 100 : 0;

          // Get user details
          const user = await getUserById(budget.userId);
          if (!user || !user.isActive) {
            console.log(`Skipping inactive user: ${budget.userId}`);
            continue;
          }

          console.log(`🚨 THRESHOLD CROSSED! Budget: ${budget.budgetName}, Cost: $${currentMonthCost} >= Threshold: $${thresholdAmount}`);

          // Send email alert
          await sendThresholdAlert(user, budget, currentMonthCost, utilization);

          alertsSent.push({
            userId: user.userId,
            email: user.email,
            budgetName: budget.budgetName,
            utilization: Math.round(utilization * 100) / 100,
            currentCost: currentMonthCost,
            thresholdAmount: thresholdAmount,
          });

          console.log(`📧 Alert sent to ${user.email} for budget: ${budget.budgetName} (${utilization.toFixed(1)}% utilization)`);
        } else {
          console.log(`✅ Budget ${budget.budgetName} is within threshold ($${currentMonthCost} < $${thresholdAmount})`);
        }
      } catch (budgetError) {
        console.error(`Error processing budget ${budget.budgetId}:`, budgetError);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Budget threshold check completed',
        currentMonthCost,
        budgetsChecked: budgets.length,
        alertsSent: alertsSent.length,
        alerts: alertsSent,
        testingMode: true, // Indicates dummy values are being used
      }),
    };

  } catch (error) {
    console.error('Budget threshold monitor error:', error);
    throw error;
  }
};

/**
 * Send threshold alert email
 */
async function sendThresholdAlert(user, budget, currentCost, utilization) {
  const isExceeded = currentCost >= budget.monthlyLimit;
  const severity = isExceeded ? 'CRITICAL' : utilization >= 90 ? 'HIGH' : 'MEDIUM';

  const emailParams = {
    Source: process.env.FROM_EMAIL || 'muhammadquanit@gmail.com',
    Destination: {
      ToAddresses: [user.email],
    },
    Message: {
      Subject: {
        Data: `🚨 CostGuard Alert: ${isExceeded ? 'Budget Exceeded' : 'Threshold Reached'} - ${budget.budgetName}`,
      },
      Body: {
        Html: {
          Data: generateEmailHtml(user, budget, currentCost, utilization, severity),
        },
        Text: {
          Data: generateEmailText(user, budget, currentCost, utilization, severity),
        },
      },
    },
  };

  const command = new SendEmailCommand(emailParams);
  await sesClient.send(command);
}

/**
 * Generate HTML email content
 */
function generateEmailHtml(user, budget, currentCost, utilization, severity) {
  const isExceeded = currentCost >= budget.monthlyLimit;
  const remainingBudget = Math.max(0, budget.monthlyLimit - currentCost);

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${severity === 'CRITICAL' ? '#dc3545' : '#ffc107'}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
            .alert-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${severity === 'CRITICAL' ? '#dc3545' : '#ffc107'}; }
            .progress-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; margin: 10px 0; }
            .progress-fill { height: 100%; background: ${severity === 'CRITICAL' ? '#dc3545' : '#ffc107'}; width: ${Math.min(utilization, 100)}%; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🛡️ CostGuard Budget Alert</h1>
                <h2>${isExceeded ? 'Budget Exceeded!' : 'Threshold Reached!'}</h2>
            </div>
            
            <div class="content">
                <p><strong>Hello ${user.firstName} ${user.lastName},</strong></p>
                
                <div class="alert-box">
                    <h3>${budget.budgetName}</h3>
                    <p><strong>Current Spending:</strong> $${currentCost.toFixed(2)}</p>
                    <p><strong>Budget Limit:</strong> $${budget.monthlyLimit.toFixed(2)}</p>
                    <p><strong>Utilization:</strong> ${utilization.toFixed(1)}%</p>
                    <p><strong>Remaining Budget:</strong> $${remainingBudget.toFixed(2)}</p>
                    
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    
                    <p><strong>Alert Threshold:</strong> ${budget.alertThreshold}%</p>
                </div>
                
                <h4>💡 Recommended Actions:</h4>
                <ul>
                    <li>Review your AWS resource usage immediately</li>
                    <li>Check for any unexpected or unused resources</li>
                    <li>Consider scaling down non-essential services</li>
                    <li>Update your budget if usage patterns have changed</li>
                </ul>
                
                <p><em>This alert was generated on ${new Date().toISOString()}</em></p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text email content
 */
function generateEmailText(user, budget, currentCost, utilization, severity) {
  const isExceeded = currentCost >= budget.monthlyLimit;
  const remainingBudget = Math.max(0, budget.monthlyLimit - currentCost);

  return `
CostGuard Budget Alert - ${isExceeded ? 'Budget Exceeded!' : 'Threshold Reached!'}

Hello ${user.firstName} ${user.lastName},

Your AWS spending has ${isExceeded ? 'exceeded' : 'reached the threshold for'} the following budget:

Budget: ${budget.budgetName}
Current Spending: $${currentCost.toFixed(2)}
Budget Limit: $${budget.monthlyLimit.toFixed(2)}
Utilization: ${utilization.toFixed(1)}%
Remaining Budget: $${remainingBudget.toFixed(2)}
Alert Threshold: ${budget.alertThreshold}%

Recommended Actions:
- Review your AWS resource usage immediately
- Check for any unexpected or unused resources
- Consider scaling down non-essential services
- Update your budget if usage patterns have changed

This alert was generated on ${new Date().toISOString()}

CostGuard - Your AWS Cost Management Assistant
  `;
}
