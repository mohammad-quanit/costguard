const { CostExplorerClient, GetCostAndUsageCommand } = require('@aws-sdk/client-cost-explorer');
const { BudgetsClient, DescribeBudgetsCommand } = require('@aws-sdk/client-budgets');

const client = new CostExplorerClient({ region: process.env.AWS_REGION });
const budgetClient = new BudgetsClient({ region: process.env.AWS_REGION });

// const sns = new AWS.SNS();
// const dynamodb = new AWS.DynamoDB.DocumentClient();

// const COST_ALERT_TOPIC_ARN = process.env.COST_ALERT_TOPIC;
// const COST_ALERT_TABLE = process.env.COST_ALERT_TABLE;
// const DAILY_THRESHOLD_PERCENT = parseInt(process.env.DAILY_THRESHOLD_PERCENT, 10);
// const MONTHLY_BUDGET = parseFloat(process.env.MONTHLY_BUDGET) || 0;

module.exports.GetCostAndUsageHandler = async(_event) => {
  const now = new Date();
  // Get the first day of the current month
  // Calculate the first day of the month, 6 months ago
  const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const start = startOfMonth.toISOString().split('T')[0];
  // Get today as the end date
  const end = now.toISOString().split('T')[0];

  try {
    const response = GetCostAndUsage(start, end);
    // console.log(response);

    const budgetResponse = GetBudgets();
    console.log(budgetResponse);


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


async function GetCostAndUsage(start, end) {
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
  return response;
}


async function GetBudgets() {
  const command = new DescribeBudgetsCommand({
    MaxResults: 100,
  });
  const response = await budgetClient.send(command);
  return response;
}
