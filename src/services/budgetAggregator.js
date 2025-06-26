const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { CostExplorerClient, GetCostAndUsageCommand } = require('@aws-sdk/client-cost-explorer');

class BudgetAggregator {
  constructor() {
    this.costExplorerClient = new CostExplorerClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }));
  }

  /**
   * Aggregate all budgets from custom application budgets
   * Note: AWS native budgets integration can be added later
   */
  async aggregateAllBudgets() {
    console.log('Starting budget aggregation...');

    try {
      // For now, we'll focus on custom budgets from the application
      // AWS Budgets API integration can be added in future iterations
      const customBudgets = await this.getCustomBudgets();
      console.log(`Found ${customBudgets.length} custom budgets`);

      // Normalize budget data structure
      const normalizedBudgets = customBudgets.map(budget => this.normalizeCustomBudget(budget));

      // Calculate utilization for each budget
      const budgetsWithUtilization = await Promise.all(
        normalizedBudgets.map(async(budget) => {
          try {
            const utilization = await this.calculateBudgetUtilization(budget);
            return { ...budget, utilization };
          } catch (error) {
            console.error(`Failed to calculate utilization for budget ${budget.name}:`, error);
            // Return budget with zero utilization if calculation fails
            return {
              ...budget,
              utilization: {
                currentSpend: 0,
                limit: budget.limit,
                utilization: 0,
                remainingBudget: budget.limit,
                status: 'ON_TRACK',
              },
            };
          }
        }),
      );

      console.log('Budget aggregation completed successfully');
      return budgetsWithUtilization;

    } catch (error) {
      console.error('Budget aggregation failed:', error);
      throw error;
    }
  }

  /**
   * Get custom budgets from DynamoDB
   */
  async getCustomBudgets() {
    try {
      const command = new ScanCommand({
        TableName: process.env.CLOUD_BUDGET_SETTINGS_TABLE,
        FilterExpression: 'isActive = :isActive',
        ExpressionAttributeValues: {
          ':isActive': true,
        },
      });

      const result = await this.docClient.send(command);
      return result.Items || [];

    } catch (error) {
      console.error('Failed to get custom budgets:', error);
      throw error;
    }
  }

  /**
   * Normalize custom budget data structure
   */
  normalizeCustomBudget(customBudget) {
    return {
      id: customBudget.budgetId,
      name: customBudget.budgetName || 'Unnamed Budget',
      type: 'CUSTOM',
      limit: customBudget.monthlyLimit || 0,
      currency: customBudget.currency || 'USD',
      timeUnit: 'MONTHLY',
      services: customBudget.services || [],
      tags: customBudget.tags || {},
      alertThreshold: customBudget.alertThreshold || 80,
      notifications: customBudget.notifications || { email: true },
      userId: customBudget.userId,
      createdAt: customBudget.createdAt,
      updatedAt: customBudget.updatedAt,
    };
  }

  /**
   * Calculate budget utilization using AWS Cost Explorer
   */
  async calculateBudgetUtilization(budget) {
    try {
      const currentSpend = await this.getCurrentSpend(budget);
      const utilization = budget.limit > 0 ? (currentSpend / budget.limit) * 100 : 0;

      return {
        currentSpend: Math.round(currentSpend * 100) / 100,
        limit: budget.limit,
        utilization: Math.round(utilization * 100) / 100,
        remainingBudget: Math.max(0, budget.limit - currentSpend),
        status: this.getBudgetStatus(utilization, budget.alertThreshold),
      };

    } catch (error) {
      console.error(`Failed to calculate utilization for budget ${budget.name}:`, error);
      throw error;
    }
  }

  /**
   * Get current spend from AWS Cost Explorer
   */
  async getCurrentSpend(budget) {
    try {
      const startDate = this.getStartOfCurrentPeriod(budget.timeUnit);
      const endDate = new Date().toISOString().split('T')[0];

      console.log(`Getting cost data for budget ${budget.name} from ${startDate} to ${endDate}`);

      const command = new GetCostAndUsageCommand({
        TimePeriod: {
          Start: startDate,
          End: endDate,
        },
        Granularity: 'MONTHLY',
        Metrics: ['BlendedCost'],
        ...(this.buildCustomFilters(budget) && {
          Filter: this.buildCustomFilters(budget),
        }),
      });

      const response = await this.costExplorerClient.send(command);

      if (!response.ResultsByTime || response.ResultsByTime.length === 0) {
        console.log(`No cost data found for budget ${budget.name}`);
        return 0;
      }

      const totalCost = response.ResultsByTime[0]?.Total?.BlendedCost?.Amount || '0';
      const cost = parseFloat(totalCost);

      console.log(`Current spend for budget ${budget.name}: ${cost}`);
      return cost;

    } catch (error) {
      console.error(`Failed to get current spend for budget ${budget.name}:`, error);
      // Return 0 if we can't get cost data to avoid blocking the process
      return 0;
    }
  }

  /**
   * Build Cost Explorer filters for custom budgets
   */
  buildCustomFilters(budget) {
    const filters = [];

    // Service filters
    if (budget.services && budget.services.length > 0) {
      // Map service names to Cost Explorer service names
      const serviceMap = {
        'EC2': 'Amazon Elastic Compute Cloud - Compute',
        'S3': 'Amazon Simple Storage Service',
        'Lambda': 'AWS Lambda',
        'RDS': 'Amazon Relational Database Service',
        'DynamoDB': 'Amazon DynamoDB',
        'CloudFront': 'Amazon CloudFront',
        'API Gateway': 'Amazon API Gateway',
      };

      const mappedServices = budget.services.map(service => serviceMap[service] || service);

      filters.push({
        Dimensions: {
          Key: 'SERVICE',
          Values: mappedServices,
        },
      });
    }

    // Tag filters
    if (budget.tags && Object.keys(budget.tags).length > 0) {
      Object.entries(budget.tags).forEach(([key, value]) => {
        filters.push({
          Tags: {
            Key: key,
            Values: Array.isArray(value) ? value : [value],
          },
        });
      });
    }

    // Combine filters with AND logic
    if (filters.length === 0) {
      return undefined;
    }
    if (filters.length === 1) {
      return filters[0];
    }

    return {
      And: filters,
    };
  }

  /**
   * Get budget status based on utilization
   */
  getBudgetStatus(utilization, threshold) {
    if (utilization >= 100) {
      return 'EXCEEDED';
    }
    if (utilization >= threshold) {
      return 'WARNING';
    }
    return 'ON_TRACK';
  }

  /**
   * Get start date of current period
   */
  getStartOfCurrentPeriod(timeUnit) {
    const now = new Date();
    switch (timeUnit) {
    case 'MONTHLY':
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    case 'QUARTERLY':
      const quarter = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
    case 'ANNUALLY':
      return new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }
  }
}

module.exports = { BudgetAggregator };
