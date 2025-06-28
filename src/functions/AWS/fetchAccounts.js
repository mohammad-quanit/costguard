const { getUserAWSAccounts } = require('../../services/awsAccountService');
const { createResponse, handleError, extractTokenFromEvent, verifyToken } = require('../../utils/auth');

/**
 * Fetch AWS Accounts Handler
 * Retrieves all AWS accounts associated with the authenticated user
 */
exports.handler = async(event) => {
  console.log('Fetch AWS Accounts started');

  try {
    // Extract and verify user token
    const token = extractTokenFromEvent(event);
    if (!token) {
      return createResponse(401, {
        error: 'Unauthorized',
        message: 'Authorization token is required',
      });
    }

    const user = verifyToken(token);
    if (!user) {
      return createResponse(401, {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }

    console.log(`Fetching AWS accounts for user: ${user.email}`);

    // Get all AWS accounts for the user
    const accounts = await getUserAWSAccounts(user.userId);

    // Prepare response with account summary
    const response = {
      message: 'AWS accounts retrieved successfully',
      count: accounts.length,
      accounts: accounts.map(account => ({
        accountId: account.accountId,
        awsAccountId: account.awsAccountId,
        alias: account.accountAlias,
        region: account.region,
        arn: account.arn,
        isActive: account.isActive,
        lastValidated: account.lastValidated,
        createdAt: account.createdAt,
        hasCredentials: account.hasCredentials
      }))
    };

    return createResponse(200, response);

  } catch (error) {
    console.error('Fetch AWS Accounts error:', error);
    return handleError(error);
  }
};
