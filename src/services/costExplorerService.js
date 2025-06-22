const { CostExplorerClient, GetCostAndUsageCommand } = require('@aws-sdk/client-cost-explorer');

class CostExplorerService {
  constructor(region = process.env.AWS_REGION) {
    this.client = new CostExplorerClient({ region });
  }

  /**
   * Get cost and usage data with service breakdown
   * @param {Object} params - Parameters for cost query
   * @param {string} params.start - Start date (YYYY-MM-DD)
   * @param {string} params.end - End date (YYYY-MM-DD)
   * @param {string} params.granularity - DAILY, MONTHLY, or HOURLY
   * @param {Array} params.metrics - Array of metrics to retrieve
   * @param {Array} params.groupBy - Array of grouping dimensions
   * @returns {Promise<Object>} Cost and usage data
   */
  async getCostAndUsage({
    start,
    end,
    granularity = 'DAILY',
    metrics = ['BlendedCost', 'UnblendedCost', 'UsageQuantity'],
    groupBy = [{ Type: 'DIMENSION', Key: 'SERVICE' }]
  }) {
    try {
      const command = new GetCostAndUsageCommand({
        TimePeriod: { Start: start, End: end },
        Granularity: granularity,
        Metrics: metrics,
        GroupBy: groupBy,
      });

      const response = await this.client.send(command);
      return response;
    } catch (error) {
      console.error('Error fetching cost and usage data:', error);
      throw new Error(`Failed to fetch cost data: ${error.message}`);
    }
  }

  /**
   * Get cost data for a specific time period with service breakdown
   * @param {number} monthsBack - Number of months to look back
   * @returns {Promise<Object>} Processed cost data with service breakdown
   */
  async getCostDataWithServiceBreakdown(monthsBack = 6) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    const start = startOfMonth.toISOString().split('T')[0];
    const end = now.toISOString().split('T')[0];

    const response = await this.getCostAndUsage({ start, end });
    
    return {
      rawData: response,
      start,
      end,
      processedData: this.processServiceBreakdown(response, now)
    };
  }

  /**
   * Process service breakdown from raw cost data
   * @param {Object} response - Raw response from Cost Explorer
   * @param {Date} now - Current date
   * @returns {Object} Processed service breakdown data
   */
  processServiceBreakdown(response, now) {
    const results = response.ResultsByTime || [];
    let totalCost = 0;
    const months = new Set();
    const serviceBreakdown = new Map();
    const currentMonthServiceBreakdown = new Map();
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;

    results.forEach(day => {
      const amount = day.Groups?.reduce((sum, group) => 
        sum + parseFloat(group.Metrics.BlendedCost.Amount || '0'), 0) || 0;
      totalCost += amount;

      const date = new Date(day.TimePeriod.Start);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      months.add(monthKey);

      if (day.Groups) {
        day.Groups.forEach(group => {
          if (group.Keys && group.Keys[0]) {
            const serviceName = group.Keys[0];
            const serviceAmount = parseFloat(group.Metrics.BlendedCost.Amount || '0');
            const serviceUsage = parseFloat(group.Metrics.UsageQuantity.Amount || '0');
            const serviceUnit = group.Metrics.UsageQuantity.Unit || '';

            // Aggregate for all periods
            if (!serviceBreakdown.has(serviceName)) {
              serviceBreakdown.set(serviceName, {
                totalCost: 0,
                totalUsage: 0,
                unit: serviceUnit,
                currency: group.Metrics.BlendedCost.Unit || 'USD'
              });
            }
            const serviceData = serviceBreakdown.get(serviceName);
            serviceData.totalCost += serviceAmount;
            serviceData.totalUsage += serviceUsage;

            // Track current month separately
            if (monthKey === currentMonth) {
              if (!currentMonthServiceBreakdown.has(serviceName)) {
                currentMonthServiceBreakdown.set(serviceName, {
                  cost: 0,
                  usage: 0,
                  unit: serviceUnit,
                  currency: group.Metrics.BlendedCost.Unit || 'USD'
                });
              }
              const currentMonthData = currentMonthServiceBreakdown.get(serviceName);
              currentMonthData.cost += serviceAmount;
              currentMonthData.usage += serviceUsage;
            }
          }
        });
      }
    });

    // Convert to arrays and sort by cost
    const allServicesBreakdown = Array.from(serviceBreakdown.entries())
      .map(([serviceName, data]) => ({
        serviceName,
        totalCost: parseFloat(data.totalCost.toFixed(4)),
        totalUsage: parseFloat(data.totalUsage.toFixed(4)),
        unit: data.unit,
        currency: data.currency,
        percentage: totalCost > 0 ? parseFloat(((data.totalCost / totalCost) * 100).toFixed(2)) : 0
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    const currentMonthServicesBreakdown = Array.from(currentMonthServiceBreakdown.entries())
      .map(([serviceName, data]) => ({
        serviceName,
        cost: parseFloat(data.cost.toFixed(4)),
        usage: parseFloat(data.usage.toFixed(4)),
        unit: data.unit,
        currency: data.currency
      }))
      .sort((a, b) => b.cost - a.cost);

    // Calculate current month cost
    let currentMonthCost = 0;
    results.forEach(day => {
      const date = new Date(day.TimePeriod.Start);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (monthKey === currentMonth) {
        const amount = day.Groups?.reduce((sum, group) => 
          sum + parseFloat(group.Metrics.BlendedCost.Amount || '0'), 0) || 0;
        currentMonthCost += amount;
      }
    });

    const numDays = results.length;
    const numMonths = months.size;

    return {
      totalCost,
      currentMonthCost,
      dailyAverage: numDays > 0 ? totalCost / numDays : 0,
      averageMonthlyCost: numMonths > 0 ? totalCost / numMonths : 0,
      serviceCount: currentMonthServiceBreakdown.size,
      currency: results[0]?.Groups?.[0]?.Metrics?.BlendedCost?.Unit || 'USD',
      allServicesBreakdown,
      currentMonthServicesBreakdown,
      months: months.size
    };
  }
}

module.exports = CostExplorerService;
