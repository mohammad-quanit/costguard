/**
 * Main entry point for the CostGuard backend
 * Exports all handlers and services for easy access
 */

// Handlers
const { GetCostAndUsageHandler } = require('./functions/CostData/handler');
const { costAlertHandler } = require('./functions/CostAlert/handler');
const { pingHandler } = require('./functions/ping/handler');

// Services
const CostExplorerService = require('./services/costExplorerService');
const BudgetsService = require('./services/budgetsService');

// Utils
const dateUtils = require('./utils/dateUtils');
const budgetUtils = require('./utils/budgetUtils');
const responseUtils = require('./utils/responseUtils');

// Models
const costDataModel = require('./models/costDataModel');

module.exports = {
  // Handlers
  handlers: {
    GetCostAndUsageHandler,
    costAlertHandler,
    pingHandler,
  },

  // Services
  services: {
    CostExplorerService,
    BudgetsService,
  },

  // Utilities
  utils: {
    dateUtils,
    budgetUtils,
    responseUtils,
  },

  // Models
  models: {
    costDataModel,
  },
};
