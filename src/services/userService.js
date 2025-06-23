const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const USERS_TABLE = process.env.USERS_TABLE;

/**
 * Create a new user in DynamoDB
 * @param {Object} userData - User data to store
 * @returns {Object} Created user data
 */
const createUser = async(userData) => {
  const userId = randomUUID();
  const timestamp = new Date().toISOString();

  const user = {
    userId,
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    cognitoUserId: userData.cognitoUserId,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastLoginAt: null,
    preferences: {
      emailNotifications: true,
      smsNotifications: false,
      currency: 'USD',
      timezone: 'UTC',
    },
    costSettings: {
      monthlyBudget: userData.monthlyBudget || null,
      alertThreshold: userData.alertThreshold || 80,
      alertFrequency: 'daily',
    },
  };

  const command = new PutCommand({
    TableName: USERS_TABLE,
    Item: user,
    ConditionExpression: 'attribute_not_exists(userId)',
  });

  await docClient.send(command);
  return user;
};

/**
 * Get user by userId
 * @param {string} userId - User ID
 * @returns {Object|null} User data or null if not found
 */
const getUserById = async(userId) => {
  const command = new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId },
  });

  const result = await docClient.send(command);
  return result.Item || null;
};

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Object|null} User data or null if not found
 */
const getUserByEmail = async(email) => {
  const command = new QueryCommand({
    TableName: USERS_TABLE,
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email,
    },
  });

  const result = await docClient.send(command);
  return result.Items?.[0] || null;
};

/**
 * Update user data
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated user data
 */
const updateUser = async(userId, updates) => {
  const timestamp = new Date().toISOString();

  // Build update expression dynamically
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  // Always update the updatedAt timestamp
  updateExpressions.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = timestamp;

  // Handle nested updates for preferences and costSettings
  Object.keys(updates).forEach((key) => {
    if (key === 'preferences' && typeof updates[key] === 'object') {
      Object.keys(updates[key]).forEach((prefKey) => {
        updateExpressions.push(`#preferences.#${prefKey} = :${prefKey}`);
        expressionAttributeNames['#preferences'] = 'preferences';
        expressionAttributeNames[`#${prefKey}`] = prefKey;
        expressionAttributeValues[`:${prefKey}`] = updates[key][prefKey];
      });
    } else if (key === 'costSettings' && typeof updates[key] === 'object') {
      Object.keys(updates[key]).forEach((costKey) => {
        updateExpressions.push(`#costSettings.#${costKey} = :${costKey}`);
        expressionAttributeNames['#costSettings'] = 'costSettings';
        expressionAttributeNames[`#${costKey}`] = costKey;
        expressionAttributeValues[`:${costKey}`] = updates[key][costKey];
      });
    } else if (key !== 'userId' && key !== 'email' && key !== 'cognitoUserId') {
      // Don't allow updating immutable fields
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = updates[key];
    }
  });

  const command = new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  });

  const result = await docClient.send(command);
  return result.Attributes;
};

/**
 * Update user's last login timestamp
 * @param {string} userId - User ID
 * @returns {Object} Updated user data
 */
const updateLastLogin = async(userId) => {
  const timestamp = new Date().toISOString();

  const command = new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET lastLoginAt = :timestamp, updatedAt = :timestamp',
    ExpressionAttributeValues: {
      ':timestamp': timestamp,
    },
    ReturnValues: 'ALL_NEW',
  });

  const result = await docClient.send(command);
  return result.Attributes;
};

/**
 * Soft delete user (mark as inactive)
 * @param {string} userId - User ID
 * @returns {Object} Updated user data
 */
const deactivateUser = async(userId) => {
  const timestamp = new Date().toISOString();

  const command = new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET isActive = :isActive, updatedAt = :timestamp',
    ExpressionAttributeValues: {
      ':isActive': false,
      ':timestamp': timestamp,
    },
    ReturnValues: 'ALL_NEW',
  });

  const result = await docClient.send(command);
  return result.Attributes;
};

/**
 * Hard delete user from DynamoDB
 * @param {string} userId - User ID
 * @returns {boolean} True if deleted successfully
 */
const deleteUser = async(userId) => {
  const command = new DeleteCommand({
    TableName: USERS_TABLE,
    Key: { userId },
  });

  await docClient.send(command);
  return true;
};

/**
 * Get user's cost settings
 * @param {string} userId - User ID
 * @returns {Object|null} Cost settings or null if user not found
 */
const getUserCostSettings = async(userId) => {
  const user = await getUserById(userId);
  return user?.costSettings || null;
};

/**
 * Update user's cost settings
 * @param {string} userId - User ID
 * @param {Object} costSettings - New cost settings
 * @returns {Object} Updated user data
 */
const updateUserCostSettings = async(userId, costSettings) => {
  return await updateUser(userId, { costSettings });
};

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  updateLastLogin,
  deactivateUser,
  deleteUser,
  getUserCostSettings,
  updateUserCostSettings,
};
