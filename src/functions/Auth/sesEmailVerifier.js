const { SESClient, VerifyEmailIdentityCommand, ListVerifiedEmailAddressesCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Cognito Post-Confirmation Trigger
 * Automatically verifies user email in SES after Cognito confirmation
 */
exports.handler = async(event) => {
  console.log('🔔 Cognito Post-Confirmation Trigger activated:', JSON.stringify(event, null, 2));

  try {
    // Extract email from Cognito event
    const email = event.request?.userAttributes?.email;

    if (!email) {
      console.log('❌ No email found in Cognito user attributes');
      console.log('Available attributes:', Object.keys(event.request?.userAttributes || {}));
      return event;
    }

    console.log(`📧 Processing email verification for: ${email}`);

    // Check if email is already verified in SES
    console.log('🔍 Checking if email is already verified in SES...');
    const listCommand = new ListVerifiedEmailAddressesCommand({});
    const verifiedEmails = await sesClient.send(listCommand);

    console.log('Currently verified emails in SES:', verifiedEmails.VerifiedEmailAddresses);

    if (verifiedEmails.VerifiedEmailAddresses.includes(email)) {
      console.log(`✅ Email ${email} is already verified in SES`);
      return event;
    }

    // Initiate email verification in SES
    console.log(`🚀 Initiating SES verification for: ${email}`);
    const verifyCommand = new VerifyEmailIdentityCommand({
      EmailAddress: email,
    });

    await sesClient.send(verifyCommand);
    console.log(`✅ SES verification email sent successfully to: ${email}`);
    console.log('📬 User should receive AWS SES verification email shortly');

  } catch (error) {
    console.error('❌ Failed to verify email in SES:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.Code,
      statusCode: error.$metadata?.httpStatusCode,
    });

    // Don't fail the Cognito flow - just log the error
    // The user can still use the app, but email notifications might not work until manually verified
  }

  // Always return the event to continue Cognito flow
  console.log('🔄 Returning event to continue Cognito flow');
  return event;
};
