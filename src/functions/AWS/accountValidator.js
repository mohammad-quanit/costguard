const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const { createResponse, handleError, extractTokenFromEvent, verifyToken } = require('../../utils/auth');
const { storeAWSAccount } = require('../../services/awsAccountService');

/**
 * AWS Account Validator
 * Only validates AWS credentials and stores account info
 * Existing cost/budget functions will handle data retrieval
 */
exports.handler = async(event) => {
  console.log('AWS Account Validator started');

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

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const {
      accessKeyId,
      secretAccessKey,
      sessionToken, // Optional for temporary credentials
      region = 'us-east-1',
      accountAlias, // Optional friendly name
    } = body;

    // Validate required parameters
    if (!accessKeyId || !secretAccessKey) {
      return createResponse(400, {
        error: 'Missing credentials',
        message: 'AWS Access Key ID and Secret Access Key are required',
      });
    }

    console.log(`Validating AWS account credentials for user: ${user.email}`);

    // Validate credentials using STS
    const validationResult = await validateAWSCredentials(accessKeyId, secretAccessKey, sessionToken, region);

    if (!validationResult.isValid) {
      return createResponse(401, {
        error: 'Invalid credentials',
        message: 'The provided AWS credentials are invalid or expired',
        details: validationResult.error,
      });
    }

    console.log(`✅ Valid AWS account: ${validationResult.accountId}`);

    // Store validated account information
    const storedAccount = await storeAWSAccount({
      userId: user.userId,
      awsAccountId: validationResult.accountId,
      accountAlias: accountAlias,
      region: region,
      arn: validationResult.arn,
      awsUserId: validationResult.userId,
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
      sessionToken: sessionToken,
    });

    // Return validation success with instructions
    const response = {
      message: 'AWS account validated and stored successfully',
      account: {
        accountId: storedAccount.accountId,
        awsAccountId: validationResult.accountId,
        arn: validationResult.arn,
        userId: validationResult.userId,
        alias: accountAlias || `Account-${validationResult.accountId}`,
        region: region,
        validatedAt: new Date().toISOString(),
      },
    };

    return createResponse(200, response);

  } catch (error) {
    console.error('AWS Account Validator error:', error);
    return handleError(error);
  }
};

/**
 * Validate AWS credentials using STS GetCallerIdentity
 * This is the core validation - only checks if credentials are valid
 */
async function validateAWSCredentials(accessKeyId, secretAccessKey, sessionToken, region) {
  try {
    const stsClient = new STSClient({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
        ...(sessionToken && { sessionToken: sessionToken }),
      },
    });

    const command = new GetCallerIdentityCommand({});
    const response = await stsClient.send(command);

    console.log('STS Response:', {
      Account: response.Account,
      Arn: response.Arn,
      UserId: response.UserId,
    });

    return {
      isValid: true,
      accountId: response.Account,
      arn: response.Arn,
      userId: response.UserId,
    };

  } catch (error) {
    console.error('Credential validation failed:', error);
    return {
      isValid: false,
      error: error.message,
    };
  }
}
