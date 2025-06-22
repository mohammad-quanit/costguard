const { BudgetsClient, DescribeBudgetsCommand, DescribeBudgetPerformanceHistoryCommand } = require('@aws-sdk/client-budgets');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

class BudgetsService {
  constructor(region = process.env.AWS_REGION) {
    this.client = new BudgetsClient({ region });
    this.stsClient = new STSClient({ region });
  }

  /**
   * Get AWS Account ID from STS if not provided
   * @returns {Promise<string>} AWS Account ID
   */
  async getAccountId() {
    try {
      const command = new GetCallerIdentityCommand({});
      const response = await this.stsClient.send(command);
      return response.Account;
    } catch (error) {
      console.error('Error getting account ID:', error);
      throw new Error(`Failed to get account ID: ${error.message}`);
    }
  }

  /**
   * Get all budgets for the account
   * @param {string} accountId - AWS Account ID (optional)
   * @returns {Promise<Object>} Budgets data
   */
  async getBudgets(accountId = null) {
    try {
      const effectiveAccountId = accountId || process.env.AWS_ACCOUNT_ID || await this.getAccountId();
      
      const command = new DescribeBudgetsCommand({
        AccountId: effectiveAccountId,
        MaxResults: 100,
      });
      
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      console.error('Error fetching budgets:', error);
      throw new Error(`Failed to fetch budgets: ${error.message}`);
    }
  }

  /**
   * Get monthly cost history from AWS Budgets
   * @param {Array} budgets - Array of budget objects
   * @param {string} accountId - AWS Account ID (optional)
   * @returns {Promise<Array>} Budget performance history
   */
  async getMonthlyCostHistoryFromBudgets(budgets, accountId = null) {
    try {
      const effectiveAccountId = accountId || process.env.AWS_ACCOUNT_ID || await this.getAccountId();
      
      const now = new Date();
      const endDate = new Date(now);
      const startDate = new Date(now.getFullYear(), now.getMonth() - 11, now.getDate());

      console.log(`Budget history date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      const budgetHistories = [];

      for (const budget of budgets) {
        try {
          const command = new DescribeBudgetPerformanceHistoryCommand({
            AccountId: effectiveAccountId,
            BudgetName: budget.BudgetName,
            TimePeriod: {
              Start: startDate,
              End: endDate,
            },
          });
          
          const response = await this.client.send(command);
          const monthlyData = [];
          
          if (response.BudgetPerformanceHistory && response.BudgetPerformanceHistory.BudgetedAndActualAmountsList) {
            response.BudgetPerformanceHistory.BudgetedAndActualAmountsList.forEach(item => {
              monthlyData.push({
                timePeriod: {
                  start: item.TimePeriod?.Start?.toISOString?.() || item.TimePeriod?.Start,
                  end: item.TimePeriod?.End?.toISOString?.() || item.TimePeriod?.End,
                },
                budgetedAmount: {
                  amount: item.BudgetedAmount?.Amount || '0',
                  unit: item.BudgetedAmount?.Unit || 'USD',
                },
                actualAmount: {
                  amount: item.ActualAmount?.Amount || '0',
                  unit: item.ActualAmount?.Unit || 'USD',
                },
                utilization: item.BudgetedAmount?.Amount && item.ActualAmount?.Amount
                  ? ((parseFloat(item.ActualAmount.Amount) / parseFloat(item.BudgetedAmount.Amount)) * 100).toFixed(2)
                  : '0.00',
              });
            });
          }
          
          budgetHistories.push({
            budgetName: budget.BudgetName,
            budgetType: budget.BudgetType,
            timeUnit: budget.TimeUnit,
            budgetLimit: {
              amount: budget.BudgetLimit?.Amount || '0',
              unit: budget.BudgetLimit?.Unit || 'USD',
            },
            monthlyData: monthlyData,
            totalMonths: monthlyData.length,
            summary: this.calculateBudgetSummary(monthlyData),
          });
        } catch (budgetError) {
          console.warn(`Could not retrieve performance history for budget ${budget.BudgetName}:`, budgetError.message);
          budgetHistories.push({
            budgetName: budget.BudgetName,
            budgetType: budget.BudgetType,
            timeUnit: budget.TimeUnit,
            budgetLimit: {
              amount: budget.BudgetLimit?.Amount || '0',
              unit: budget.BudgetLimit?.Unit || 'USD',
            },
            monthlyData: [],
            totalMonths: 0,
            error: budgetError.message,
            summary: null,
          });
        }
      }
      
      console.log(`Returning budget histories for ${budgetHistories.length} budgets`);
      return budgetHistories;
    } catch (error) {
      console.warn('Could not retrieve budget performance history:', error.message);
      return [];
    }
  }

  /**
   * Calculate budget summary statistics
   * @param {Array} monthlyData - Array of monthly budget data
   * @returns {Object|null} Budget summary statistics
   */
  calculateBudgetSummary(monthlyData) {
    if (!monthlyData || monthlyData.length === 0) {
      return null;
    }

    let totalBudgeted = 0;
    let totalActual = 0;
    let monthsOverBudget = 0;
    let maxUtilization = 0;
    let minUtilization = 100;

    monthlyData.forEach(month => {
      const budgeted = parseFloat(month.budgetedAmount.amount || '0');
      const actual = parseFloat(month.actualAmount.amount || '0');
      const utilization = parseFloat(month.utilization || '0');

      totalBudgeted += budgeted;
      totalActual += actual;
      if (utilization > 100) {
        monthsOverBudget++;
      }
      maxUtilization = Math.max(maxUtilization, utilization);
      minUtilization = Math.min(minUtilization, utilization);
    });

    const averageUtilization = monthlyData.length > 0 ? (totalActual / totalBudgeted * 100) : 0;

    return {
      totalBudgeted: totalBudgeted.toFixed(2),
      totalActual: totalActual.toFixed(2),
      averageUtilization: averageUtilization.toFixed(2),
      maxUtilization: maxUtilization.toFixed(2),
      minUtilization: minUtilization.toFixed(2),
      monthsOverBudget,
      totalMonths: monthlyData.length,
      overBudgetPercentage: monthlyData.length > 0 ? ((monthsOverBudget / monthlyData.length) * 100).toFixed(2) : '0.00',
    };
  }

  /**
   * Get effective budget amount from AWS Budgets or environment variable
   * @param {Array} budgets - Array of budget objects
   * @param {number} fallbackBudget - Fallback budget from environment
   * @returns {number} Effective budget amount
   */
  getEffectiveBudget(budgets, fallbackBudget) {
    if (budgets.length > 0) {
      const currentBudget = budgets.find(budget =>
        budget.TimeUnit === 'MONTHLY' && budget.BudgetType === 'COST',
      ) || budgets[0];

      if (currentBudget && currentBudget.BudgetLimit) {
        return parseFloat(currentBudget.BudgetLimit.Amount);
      }
    }
    return fallbackBudget;
  }
}

module.exports = BudgetsService;
