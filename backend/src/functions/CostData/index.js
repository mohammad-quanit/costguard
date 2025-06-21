const { CostExplorerClient, GetCostAndUsageCommand } = require('@aws-sdk/client-cost-explorer');
const { BudgetsClient, DescribeBudgetsCommand } = require('@aws-sdk/client-budgets');

const client = new CostExplorerClient({ region: process.env.AWS_REGION });
const budgetClient = new BudgetsClient({ region: process.env.AWS_REGION });

// const sns = new AWS.SNS();
// const dynamodb = new AWS.DynamoDB.DocumentClient();

// const COST_ALERT_TOPIC_ARN = process.env.COST_ALERT_TOPIC;
// const COST_ALERT_TABLE = process.env.COST_ALERT_TABLE;
// const DAILY_THRESHOLD_PERCENT = parseInt(process.env.DAILY_THRESHOLD_PERCENT, 10);
const MONTHLY_BUDGET = parseFloat(process.env.MONTHLY_BUDGET) || 0;

module.exports.GetCostAndUsageHandler = async(_event) => {
  const now = new Date();
  // Get the first day of the current month
  // Calculate the first day of the month, 6 months ago
  const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const start = startOfMonth.toISOString().split('T')[0];
  // Get today as the end date
  const end = now.toISOString().split('T')[0];

  try {
    const command = new GetCostAndUsageCommand({
      TimePeriod: {
        Start: start,
        End: end,
      },
      Granularity: 'DAILY',
      Metrics: ['BlendedCost', 'UnblendedCost', 'UsageQuantity'],
      GroupBy: [
        {
          Type: 'DIMENSION',
          Key: 'SERVICE',
        },
      ],
    });
    const response = await client.send(command);
    // console.log(response);

    // Get budgets information (optional - will use fallback if fails)
    let budgets = [];
    try {
      const budgetResponse = await getBudgets();
      budgets = budgetResponse.Budgets || [];
      console.log('Budgets retrieved:', budgets);
    } catch (budgetError) {
      console.warn('Could not retrieve budgets:', budgetError.message);
      // Continue without budget data
    }

    // Calculate total and daily average cost for the whole period
    const results = response.ResultsByTime || [];
    let totalCost = 0;
    const months = new Set();
    results.forEach(day => {
      const amount = day.Groups?.reduce((sum, group) => sum + parseFloat(group.Metrics.BlendedCost.Amount || '0'), 0) || 0;
      totalCost += amount;
      // Track unique months
      const date = new Date(day.TimePeriod.Start);
      months.add(`${date.getFullYear()}-${date.getMonth()}`);
    });
    const numDays = results.length;
    const numMonths = months.size;
    const dailyAverage = numDays > 0 ? totalCost / numDays : 0;
    const averageMonthlyCost = numMonths > 0 ? totalCost / numMonths : 0;

    // Service count for the current month
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
    const serviceSet = new Set();
    results.forEach(day => {
      const date = new Date(day.TimePeriod.Start);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (monthKey === currentMonth && day.Groups) {
        day.Groups.forEach(group => {
          if (group.Keys && group.Keys[0]) {
            serviceSet.add(group.Keys[0]);
          }
        });
      }
    });
    const serviceCount = serviceSet.size;

    // Calculate current month's cost
    let currentMonthCost = 0;
    results.forEach(day => {
      const date = new Date(day.TimePeriod.Start);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (monthKey === currentMonth) {
        const amount = day.Groups?.reduce((sum, group) => sum + parseFloat(group.Metrics.BlendedCost.Amount || '0'), 0) || 0;
        currentMonthCost += amount;
      }
    });

    // Use budget from AWS Budgets API if available, otherwise fall back to environment variable
    let effectiveBudget = MONTHLY_BUDGET;
    if (budgets.length > 0) {
      // Use the first budget found, or find one that matches current month
      const currentBudget = budgets.find(budget =>
        budget.TimeUnit === 'MONTHLY' && budget.BudgetType === 'COST',
      ) || budgets[0];

      if (currentBudget && currentBudget.BudgetLimit) {
        effectiveBudget = parseFloat(currentBudget.BudgetLimit.Amount);
      }
    }

    // Calculate budget-related metrics
    const budgetUtilization = effectiveBudget > 0 ? (currentMonthCost / effectiveBudget) * 100 : 0;
    const remainingBudget = effectiveBudget - currentMonthCost;
    const budgetStatus = budgetUtilization > 100 ? 'over_budget' :
      budgetUtilization > 80 ? 'warning' : 'on_track';

    // Calculate projected monthly cost based on current spending
    const currentDate = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projectedMonthlyCost = currentDate > 0 ? (currentMonthCost / currentDate) * daysInMonth : 0;

    console.log(budgetUtilization, remainingBudget, budgetStatus, projectedMonthlyCost);
    return {
      statusCode: 200,
      body: JSON.stringify({
        totalCost: totalCost.toFixed(2),
        dailyAverage: dailyAverage.toFixed(2),
        averageMonthlyCost: averageMonthlyCost.toFixed(2),
        currentMonthCost: currentMonthCost.toFixed(2),
        serviceCount,
        currency: results[0]?.Groups?.[0]?.Metrics?.BlendedCost?.Unit || 'USD',
        start,
        end,
        budget: {
          monthlyBudget: effectiveBudget.toFixed(2),
          budgetUtilization: budgetUtilization.toFixed(2),
          remainingBudget: remainingBudget.toFixed(2),
          budgetStatus,
          projectedMonthlyCost: projectedMonthlyCost.toFixed(2),
          isOverBudget: budgetUtilization > 100,
          daysRemainingInMonth: daysInMonth - currentDate,
          budgetSource: budgets.length > 0 ? 'aws_budgets' : 'environment_variable',
        },
        // budgets: budgets.map(budget => ({
        //   name: budget.BudgetName,
        //   amount: budget.BudgetLimit?.Amount,
        //   unit: budget.BudgetLimit?.Unit,
        //   type: budget.BudgetType,
        //   timeUnit: budget.TimeUnit,
        // })),
      }),
    };
  } catch (error) {
    console.error('Error fetching cost data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch cost data' }),
    };
  }
};

async function getBudgets() {
  const command = new DescribeBudgetsCommand({
    AccountId: process.env.AWS_ACCOUNT_ID || await getAccountId(),
    MaxResults: 100,
  });
  const response = await budgetClient.send(command);
  return response;
}

// Helper function to get AWS Account ID from STS if not provided
async function getAccountId() {
  const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
  const stsClient = new STSClient({ region: process.env.AWS_REGION });
  const command = new GetCallerIdentityCommand({});
  const response = await stsClient.send(command);
  return response.Account;
}
