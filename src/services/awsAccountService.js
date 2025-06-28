const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const AWS_ACCOUNTS_TABLE = process.env.AWS_ACCOUNTS_TABLE || 'CostGuard-aws-accounts-local';

/**
 * Store validated AWS account information
 * @param {Object} accountData - AWS account data
 * @returns {Object} Stored account data
 */
const storeAWSAccount = async(accountData) => {
  const accountId = randomUUID();
  const timestamp = new Date().toISOString();

  const account = {
    accountId: accountId,
    userId: accountData.userId,
    awsAccountId: accountData.awsAccountId,
    accountAlias: accountData.accountAlias || `Account-${accountData.awsAccountId}`,
    region: accountData.region || 'us-east-1',
    arn: accountData.arn,
    awsUserId: accountData.awsUserId,
    // Store encrypted credentials (in production, use AWS Secrets Manager)
    credentials: {
      accessKeyId: accountData.accessKeyId,
      // Note: In production, encrypt this or use AWS Secrets Manager
      secretAccessKey: accountData.secretAccessKey,
      sessionToken: accountData.sessionToken || null,
    },
    permissions: accountData.permissions || {},
    lastValidated: timestamp,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const command = new PutCommand({
    TableName: AWS_ACCOUNTS_TABLE,
    Item: account,
  });

  await docClient.send(command);

  // Return account data without sensitive credentials
  const { credentials, ...safeAccount } = account;
  return {
    ...safeAccount,
    hasCredentials: true,
  };
};

/**
 * Get AWS account by ID
 * @param {string} userId - User ID
 * @param {string} accountId - Account ID
 * @returns {Object} Account data
 */
const getAWSAccount = async(userId, accountId) => {
  const command = new GetCommand({
    TableName: AWS_ACCOUNTS_TABLE,
    Key: { userId, accountId },
  });

  const result = await docClient.send(command);

  if (result.Item) {
    const { credentials, ...safeAccount } = result.Item;
    return {
      ...safeAccount,
      hasCredentials: !!credentials,
    };
  }

  return null;
};

/**
 * Get all AWS accounts for a user
 * @param {string} userId - User ID
 * @returns {Array} Array of account data
 */
const getUserAWSAccounts = async(userId) => {
  const command = new QueryCommand({
    TableName: AWS_ACCOUNTS_TABLE,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
  });

  const result = await docClient.send(command);

  return result.Items?.map(account => {
    const { credentials, ...safeAccount } = account;
    return {
      ...safeAccount,
      hasCredentials: !!credentials,
    };
  }) || [];
};

/**
 * Get AWS account credentials (for internal use only)
 * @param {string} userId - User ID
 * @param {string} accountId - Account ID
 * @returns {Object} Account with credentials
 */
const getAWSAccountWithCredentials = async(userId, accountId) => {
  const command = new GetCommand({
    TableName: AWS_ACCOUNTS_TABLE,
    Key: { userId, accountId },
  });

  const result = await docClient.send(command);
  return result.Item || null;
};

/**
 * Update AWS account information
 * @param {string} userId - User ID
 * @param {string} accountId - Account ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated account data
 */
const updateAWSAccount = async(userId, accountId, updateData) => {
  const timestamp = new Date().toISOString();

  const updateExpression = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  // Build dynamic update expression
  Object.keys(updateData).forEach((key, index) => {
    if (key !== 'userId' && key !== 'accountId') {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;

      updateExpression.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = updateData[key];
    }
  });

  // Always update the updatedAt timestamp
  updateExpression.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = timestamp;

  const command = new UpdateCommand({
    TableName: AWS_ACCOUNTS_TABLE,
    Key: { userId, accountId },
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  });

  const result = await docClient.send(command);

  if (result.Attributes) {
    const { credentials, ...safeAccount } = result.Attributes;
    return {
      ...safeAccount,
      hasCredentials: !!credentials,
    };
  }

  return null;
};

/**
 * Delete AWS account
 * @param {string} userId - User ID
 * @param {string} accountId - Account ID
 * @returns {boolean} Success status
 */
const deleteAWSAccount = async(userId, accountId) => {
  const command = new DeleteCommand({
    TableName: AWS_ACCOUNTS_TABLE,
    Key: { userId, accountId },
  });

  await docClient.send(command);
  return true;
};

/**
 * Get all active AWS accounts (for scheduled tasks)
 * @returns {Array} Array of all active accounts
 */
const getAllActiveAWSAccounts = async() => {
  const command = new ScanCommand({
    TableName: AWS_ACCOUNTS_TABLE,
    FilterExpression: 'isActive = :isActive',
    ExpressionAttributeValues: {
      ':isActive': true,
    },
  });

  const result = await docClient.send(command);
  return result.Items || [];
};

module.exports = {
  storeAWSAccount,
  getAWSAccount,
  getUserAWSAccounts,
  getAWSAccountWithCredentials,
  updateAWSAccount,
  deleteAWSAccount,
  getAllActiveAWSAccounts,
};
