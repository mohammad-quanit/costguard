const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const CLOUD_BUDGET_SETTINGS_TABLE = process.env.CLOUD_BUDGET_SETTINGS_TABLE;

/**
 * Create or update a budget setting for a user
 * @param {Object} budgetData - Budget data to store
 * @returns {Object} Created/updated budget data
 */
const setBudget = async(budgetData) => {
  const budgetId = budgetData.budgetId || randomUUID();
  const timestamp = new Date().toISOString();

  const budget = {
    userId: budgetData.userId,
    budgetId,
    budgetName: budgetData.budgetName || 'Default Budget',
    monthlyLimit: budgetData.monthlyLimit,
    currency: budgetData.currency || 'USD',
    alertThreshold: budgetData.alertThreshold || 80,
    alertFrequency: budgetData.alertFrequency || 'daily',
    isActive: budgetData.isActive !== undefined ? budgetData.isActive : true,
    services: budgetData.services || [], // Specific AWS services to monitor
    tags: budgetData.tags || {}, // Cost allocation tags
    notifications: {
      email: budgetData.notifications?.email || true,
      sns: budgetData.notifications?.sns || false,
      slack: budgetData.notifications?.slack || false,
      webhookUrl: budgetData.notifications?.webhookUrl || null,
    },
    createdAt: budgetData.createdAt || timestamp,
    updatedAt: timestamp,
    lastAlertSent: null,
    totalSpentThisMonth: 0,
    projectedMonthlySpend: 0,
  };

  const command = new PutCommand({
    TableName: CLOUD_BUDGET_SETTINGS_TABLE,
    Item: budget,
  });

  await docClient.send(command);
  return budget;
};

/**
 * Get all budgets for a user
 * @param {string} userId - User ID
 * @returns {Array} Array of budget settings
 */
const getUserBudgets = async(userId) => {
  const command = new QueryCommand({
    TableName: CLOUD_BUDGET_SETTINGS_TABLE,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
  });

  const result = await docClient.send(command);
  return result.Items || [];
};

/**
 * Get a specific budget by userId and budgetId
 * @param {string} userId - User ID
 * @param {string} budgetId - Budget ID
 * @returns {Object|null} Budget data or null if not found
 */
const getBudget = async(userId, budgetId) => {
  const command = new GetCommand({
    TableName: CLOUD_BUDGET_SETTINGS_TABLE,
    Key: { userId, budgetId },
  });

  const result = await docClient.send(command);
  return result.Item || null;
};

/**
 * Get user's primary/default budget
 * @param {string} userId - User ID
 * @returns {Object|null} Primary budget or null if not found
 */
const getPrimaryBudget = async(userId) => {
  const budgets = await getUserBudgets(userId);
  return budgets.find(budget => budget.budgetName === 'Default Budget') || budgets[0] || null;
};

/**
 * Update budget spending data
 * @param {string} userId - User ID
 * @param {string} budgetId - Budget ID
 * @param {Object} spendingData - Current spending information
 * @returns {Object} Updated budget data
 */
const updateBudgetSpending = async(userId, budgetId, spendingData) => {
  const timestamp = new Date().toISOString();

  const command = new UpdateCommand({
    TableName: CLOUD_BUDGET_SETTINGS_TABLE,
    Key: { userId, budgetId },
    UpdateExpression: 'SET totalSpentThisMonth = :spent, projectedMonthlySpend = :projected, updatedAt = :timestamp',
    ExpressionAttributeValues: {
      ':spent': spendingData.totalSpentThisMonth,
      ':projected': spendingData.projectedMonthlySpend,
      ':timestamp': timestamp,
    },
    ReturnValues: 'ALL_NEW',
  });

  const result = await docClient.send(command);
  return result.Attributes;
};

/**
 * Update last alert sent timestamp
 * @param {string} userId - User ID
 * @param {string} budgetId - Budget ID
 * @returns {Object} Updated budget data
 */
const updateLastAlertSent = async(userId, budgetId) => {
  const timestamp = new Date().toISOString();

  const command = new UpdateCommand({
    TableName: CLOUD_BUDGET_SETTINGS_TABLE,
    Key: { userId, budgetId },
    UpdateExpression: 'SET lastAlertSent = :timestamp, updatedAt = :timestamp',
    ExpressionAttributeValues: {
      ':timestamp': timestamp,
    },
    ReturnValues: 'ALL_NEW',
  });

  const result = await docClient.send(command);
  return result.Attributes;
};

/**
 * Delete a budget
 * @param {string} userId - User ID
 * @param {string} budgetId - Budget ID
 * @returns {boolean} True if deleted successfully
 */
const deleteBudget = async(userId, budgetId) => {
  const command = new DeleteCommand({
    TableName: CLOUD_BUDGET_SETTINGS_TABLE,
    Key: { userId, budgetId },
  });

  await docClient.send(command);
  return true;
};

/**
 * Get all active budgets (for scheduled cost checking)
 * @returns {Array} Array of all active budgets
 */
const getAllActiveBudgets = async() => {
  const command = new ScanCommand({
    TableName: CLOUD_BUDGET_SETTINGS_TABLE,
    FilterExpression: 'isActive = :isActive',
    ExpressionAttributeValues: {
      ':isActive': true,
    },
  });

  const result = await docClient.send(command);
  return result.Items || [];
};

/**
 * Calculate budget utilization percentage
 * @param {number} spent - Amount spent
 * @param {number} budget - Budget limit
 * @returns {number} Utilization percentage
 */
const calculateUtilization = (spent, budget) => {
  if (!budget || budget === 0) {
    return 0;
  }
  return Math.round((spent / budget) * 100 * 100) / 100; // Round to 2 decimal places
};

/**
 * Check if budget threshold is exceeded
 * @param {Object} budget - Budget object
 * @returns {boolean} True if threshold is exceeded
 */
const isThresholdExceeded = (budget) => {
  const utilization = calculateUtilization(budget.totalSpentThisMonth, budget.monthlyLimit);
  return utilization >= budget.alertThreshold;
};

/**
 * Get budget status
 * @param {Object} budget - Budget object
 * @returns {string} Budget status: 'on_track', 'warning', 'exceeded'
 */
const getBudgetStatus = (budget) => {
  const utilization = calculateUtilization(budget.totalSpentThisMonth, budget.monthlyLimit);

  if (utilization >= 100) {
    return 'exceeded';
  }
  if (utilization >= budget.alertThreshold) {
    return 'warning';
  }
  return 'on_track';
};

module.exports = {
  setBudget,
  getUserBudgets,
  getBudget,
  getPrimaryBudget,
  updateBudgetSpending,
  updateLastAlertSent,
  deleteBudget,
  getAllActiveBudgets,
  calculateUtilization,
  isThresholdExceeded,
  getBudgetStatus,
};
