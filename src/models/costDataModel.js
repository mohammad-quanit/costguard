/**
 * Cost data model and validation
 */

/**
 * Service breakdown item model
 */
class ServiceBreakdownItem {
  constructor({
    serviceName,
    totalCost = 0,
    totalUsage = 0,
    unit = '',
    currency = 'USD',
    percentage = 0,
  }) {
    this.serviceName = serviceName;
    this.totalCost = parseFloat(totalCost.toFixed(4));
    this.totalUsage = parseFloat(totalUsage.toFixed(4));
    this.unit = unit;
    this.currency = currency;
    this.percentage = parseFloat(percentage.toFixed(2));
  }
}

/**
 * Current month service item model
 */
class CurrentMonthServiceItem {
  constructor({
    serviceName,
    cost = 0,
    usage = 0,
    unit = '',
    currency = 'USD',
  }) {
    this.serviceName = serviceName;
    this.cost = parseFloat(cost.toFixed(4));
    this.usage = parseFloat(usage.toFixed(4));
    this.unit = unit;
    this.currency = currency;
  }
}

/**
 * Services summary model
 */
class ServicesSummary {
  constructor({
    totalServices = 0,
    currentMonthServices = 0,
    topServiceAllTime = 'N/A',
    topServiceCurrentMonth = 'N/A',
    topServiceCostAllTime = 0,
    topServiceCostCurrentMonth = 0,
  }) {
    this.totalServices = totalServices;
    this.currentMonthServices = currentMonthServices;
    this.topServiceAllTime = topServiceAllTime;
    this.topServiceCurrentMonth = topServiceCurrentMonth;
    this.topServiceCostAllTime = topServiceCostAllTime;
    this.topServiceCostCurrentMonth = topServiceCostCurrentMonth;
  }
}

/**
 * Budget model
 */
class Budget {
  constructor({
    monthlyBudget = '0.00',
    budgetUtilization = '0.00',
    remainingBudget = '0.00',
    budgetStatus = 'on_track',
    projectedMonthlyCost = '0.00',
    isOverBudget = false,
    daysRemainingInMonth = 0,
    budgetSource = 'environment_variable',
    monthlyHistory = [],
  }) {
    this.monthlyBudget = monthlyBudget;
    this.budgetUtilization = budgetUtilization;
    this.remainingBudget = remainingBudget;
    this.budgetStatus = budgetStatus;
    this.projectedMonthlyCost = projectedMonthlyCost;
    this.isOverBudget = isOverBudget;
    this.daysRemainingInMonth = daysRemainingInMonth;
    this.budgetSource = budgetSource;
    this.monthlyHistory = monthlyHistory;
  }
}

/**
 * Complete cost data response model
 */
class CostDataResponse {
  constructor({
    totalCost = '0.00',
    dailyAverage = '0.00',
    averageMonthlyCost = '0.00',
    currentMonthCost = '0.00',
    serviceCount = 0,
    currency = 'USD',
    start = '',
    end = '',
    services = null,
    budget = null,
  }) {
    this.totalCost = totalCost;
    this.dailyAverage = dailyAverage;
    this.averageMonthlyCost = averageMonthlyCost;
    this.currentMonthCost = currentMonthCost;
    this.serviceCount = serviceCount;
    this.currency = currency;
    this.start = start;
    this.end = end;
    this.services = services;
    this.budget = budget;
  }

  /**
   * Create services object from processed data
   * @param {Array} allServicesBreakdown - All services breakdown
   * @param {Array} currentMonthServicesBreakdown - Current month services breakdown
   * @returns {Object} Services object
   */
  static createServicesObject(allServicesBreakdown, currentMonthServicesBreakdown) {
    const allPeriods = allServicesBreakdown.map(service => new ServiceBreakdownItem(service));
    const currentMonth = currentMonthServicesBreakdown.map(service => new CurrentMonthServiceItem(service));

    const summary = new ServicesSummary({
      totalServices: allPeriods.length,
      currentMonthServices: currentMonth.length,
      topServiceAllTime: allPeriods[0]?.serviceName || 'N/A',
      topServiceCurrentMonth: currentMonth[0]?.serviceName || 'N/A',
      topServiceCostAllTime: allPeriods[0]?.totalCost || 0,
      topServiceCostCurrentMonth: currentMonth[0]?.cost || 0,
    });

    return {
      allPeriods,
      currentMonth,
      summary,
    };
  }

  /**
   * Validate cost data response
   * @param {Object} data - Data to validate
   * @returns {Object} Validation result
   */
  static validate(data) {
    const errors = [];
    const warnings = [];

    // Required fields validation
    if (!data.totalCost && data.totalCost !== '0.00') {
      errors.push('totalCost is required');
    }

    if (!data.currency) {
      warnings.push('currency not specified, defaulting to USD');
    }

    if (!data.start || !data.end) {
      errors.push('start and end dates are required');
    }

    // Services validation
    if (data.services) {
      if (!Array.isArray(data.services.allPeriods)) {
        errors.push('services.allPeriods must be an array');
      }
      if (!Array.isArray(data.services.currentMonth)) {
        errors.push('services.currentMonth must be an array');
      }
    }

    // Budget validation
    if (data.budget) {
      const validStatuses = ['on_track', 'warning', 'over_budget'];
      if (!validStatuses.includes(data.budget.budgetStatus)) {
        errors.push('budget.budgetStatus must be one of: ' + validStatuses.join(', '));
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

module.exports = {
  ServiceBreakdownItem,
  CurrentMonthServiceItem,
  ServicesSummary,
  Budget,
  CostDataResponse,
};
