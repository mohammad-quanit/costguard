const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const axios = require('axios');

class NotificationService {
  constructor() {
    this.snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
  }

  /**
   * Send alert through all configured notification channels
   */
  async sendAlert(alert) {
    console.log(`Sending alert for budget ${alert.budgetName} (${alert.alertType})`);

    const notifications = [];
    const results = {
      email: { attempted: false, success: false, error: null },
      sns: { attempted: false, success: false, error: null },
      slack: { attempted: false, success: false, error: null },
      console: { attempted: true, success: true, error: null },
    };

    // Always log to console for debugging
    this.logAlertToConsole(alert);

    // Send email notification (simulated for now)
    if (alert.notifications.email) {
      try {
        results.email.attempted = true;
        await this.sendEmailAlert(alert);
        results.email.success = true;
        console.log(`Email alert sent for budget ${alert.budgetName}`);
      } catch (error) {
        results.email.error = error.message;
        console.error(`Failed to send email alert for budget ${alert.budgetName}:`, error);
      }
    }

    // Send SNS notification
    if (alert.notifications.sns && process.env.ALERT_SNS_TOPIC) {
      try {
        results.sns.attempted = true;
        await this.sendSNSAlert(alert);
        results.sns.success = true;
        console.log(`SNS alert sent for budget ${alert.budgetName}`);
      } catch (error) {
        results.sns.error = error.message;
        console.error(`Failed to send SNS alert for budget ${alert.budgetName}:`, error);
      }
    }

    // Send Slack notification
    if (alert.notifications.slack && alert.notifications.webhookUrl) {
      try {
        results.slack.attempted = true;
        await this.sendSlackAlert(alert);
        results.slack.success = true;
        console.log(`Slack alert sent for budget ${alert.budgetName}`);
      } catch (error) {
        results.slack.error = error.message;
        console.error(`Failed to send Slack alert for budget ${alert.budgetName}:`, error);
      }
    }

    return results;
  }

  /**
   * Log alert to console (always executed)
   */
  logAlertToConsole(alert) {
    const alertMessage = `
🚨 BUDGET ALERT 🚨
Budget: ${alert.budgetName}
Type: ${alert.alertType}
Severity: ${alert.severity}
Current Utilization: ${alert.currentUtilization}%
Current Spend: ${alert.currency} ${alert.currentSpend}
Budget Limit: ${alert.currency} ${alert.budgetLimit}
Remaining: ${alert.currency} ${alert.remainingBudget}
Threshold: ${alert.threshold}%
Time: ${new Date(alert.timestamp).toLocaleString()}
Services: ${alert.services.join(', ') || 'All'}
User ID: ${alert.userId}
    `;

    console.log(alertMessage);
  }

  /**
   * Send email alert using AWS SES
   */
  async sendEmailAlert(alert) {
    try {
      const subject = `🚨 Budget Alert: ${alert.budgetName} - ${alert.alertType}`;
      const htmlBody = this.generateEmailTemplate(alert);

      // Determine recipient email - prioritize user's email from the alert
      let recipientEmail;
      if (alert.userEmail) {
        // Use the user's email who owns the budget
        recipientEmail = alert.userEmail;
      } else if (typeof alert.notifications?.email === 'string') {
        // Fallback to notification-specific email if configured
        recipientEmail = alert.notifications.email;
      } else {
        // Final fallback to environment variable or default
        recipientEmail = process.env.DEFAULT_ALERT_EMAIL || 'admin@example.com';
      }

      console.log(`Sending email alert to: ${recipientEmail}`);

      const command = new SendEmailCommand({
        Source: process.env.FROM_EMAIL || 'muhammadquanit@gmail.com',
        Destination: {
          ToAddresses: [recipientEmail],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8',
            },
            Text: {
              Data: this.generateTextTemplate(alert),
              Charset: 'UTF-8',
            },
          },
        },
      });

      const result = await this.sesClient.send(command);
      console.log(`Email sent successfully. MessageId: ${result.MessageId}`);

      return {
        success: true,
        messageId: result.MessageId,
        recipient: recipientEmail,
      };

    } catch (error) {
      console.error('Failed to send email via SES:', error);

      // Fallback to console logging for development/testing
      console.log('EMAIL ALERT (Fallback to Console):');
      console.log(`To: ${alert.notifications.email}`);
      console.log(`Subject: 🚨 Budget Alert: ${alert.budgetName} - ${alert.alertType}`);
      console.log(`Budget: ${alert.budgetName}`);
      console.log(`Current Utilization: ${alert.currentUtilization}%`);
      console.log(`Current Spend: ${alert.currency} ${alert.currentSpend}`);
      console.log(`Budget Limit: ${alert.currency} ${alert.budgetLimit}`);
      console.log(`Threshold: ${alert.threshold}%`);
      console.log(`Severity: ${alert.severity}`);
      console.log(`Time: ${new Date(alert.timestamp).toLocaleString()}`);
      console.log('---');

      return {
        success: false,
        error: error.message,
        fallback: 'console',
      };
    }
  }

  /**
   * Send SNS alert
   */
  async sendSNSAlert(alert) {
    if (!process.env.ALERT_SNS_TOPIC) {
      throw new Error('ALERT_SNS_TOPIC environment variable not configured');
    }

    const message = {
      budgetId: alert.budgetId,
      budgetName: alert.budgetName,
      budgetType: alert.budgetType,
      alertType: alert.alertType,
      utilization: alert.currentUtilization,
      threshold: alert.threshold,
      currentSpend: alert.currentSpend,
      budgetLimit: alert.budgetLimit,
      remainingBudget: alert.remainingBudget,
      currency: alert.currency,
      severity: alert.severity,
      services: alert.services,
      userId: alert.userId,
      timestamp: alert.timestamp,
    };

    const command = new PublishCommand({
      TopicArn: process.env.ALERT_SNS_TOPIC,
      Message: JSON.stringify(message, null, 2),
      Subject: `Budget Alert: ${alert.budgetName} (${alert.currentUtilization}%)`,
      MessageAttributes: {
        alertType: {
          DataType: 'String',
          StringValue: alert.alertType,
        },
        severity: {
          DataType: 'String',
          StringValue: alert.severity,
        },
        budgetId: {
          DataType: 'String',
          StringValue: alert.budgetId,
        },
      },
    });

    await this.snsClient.send(command);
  }

  /**
   * Send Slack alert
   */
  async sendSlackAlert(alert) {
    const slackMessage = {
      text: `🚨 Budget Alert: ${alert.budgetName}`,
      attachments: [
        {
          color: this.getSlackColor(alert.severity),
          fields: [
            {
              title: 'Budget Name',
              value: alert.budgetName,
              short: true,
            },
            {
              title: 'Alert Type',
              value: alert.alertType,
              short: true,
            },
            {
              title: 'Current Utilization',
              value: `${alert.currentUtilization}%`,
              short: true,
            },
            {
              title: 'Threshold',
              value: `${alert.threshold}%`,
              short: true,
            },
            {
              title: 'Current Spend',
              value: `${alert.currency} ${alert.currentSpend}`,
              short: true,
            },
            {
              title: 'Budget Limit',
              value: `${alert.currency} ${alert.budgetLimit}`,
              short: true,
            },
            {
              title: 'Remaining Budget',
              value: `${alert.currency} ${alert.remainingBudget}`,
              short: true,
            },
            {
              title: 'Severity',
              value: alert.severity,
              short: true,
            },
          ],
          footer: 'CostGuard Alert System',
          ts: Math.floor(new Date(alert.timestamp).getTime() / 1000),
        },
      ],
    };

    if (alert.services && alert.services.length > 0) {
      slackMessage.attachments[0].fields.push({
        title: 'Services',
        value: alert.services.join(', '),
        short: false,
      });
    }

    const response = await axios.post(alert.notifications.webhookUrl, slackMessage, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    if (response.status !== 200) {
      throw new Error(`Slack webhook returned status ${response.status}`);
    }
  }

  /**
   * Generate plain text email template
   */
  generateTextTemplate(alert) {
    return `
BUDGET ALERT - ${alert.budgetName}

Alert Type: ${alert.alertType}
Current Utilization: ${alert.currentUtilization}%
Current Spend: ${alert.currency} ${alert.currentSpend}
Budget Limit: ${alert.currency} ${alert.budgetLimit}
Remaining Budget: ${alert.currency} ${alert.remainingBudget}
Alert Threshold: ${alert.threshold}%
Severity: ${alert.severity}
Alert Time: ${new Date(alert.timestamp).toLocaleString()}

${alert.services && alert.services.length > 0 ? `Monitored Services: ${alert.services.join(', ')}` : ''}

This alert was generated by CostGuard Budget Monitoring System.
To manage your budget settings, please log in to your CostGuard dashboard.
    `.trim();
  }

  /**
   * Generate HTML email template
   */
  generateEmailTemplate(alert) {
    const statusColor = alert.severity === 'CRITICAL' ? '#d32f2f' :
      alert.severity === 'HIGH' ? '#f57c00' :
        alert.severity === 'MEDIUM' ? '#fbc02d' : '#388e3c';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Budget Alert</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

            <!-- Header -->
            <div style="background-color: ${statusColor}; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">🚨 Budget Alert</h1>
              <p style="margin: 5px 0 0 0; font-size: 16px; opacity: 0.9;">${alert.alertType}</p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <h2 style="color: #333; margin-top: 0;">${alert.budgetName}</h2>

              <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                  <span style="font-weight: bold;">Current Utilization:</span>
                  <span style="color: ${statusColor}; font-weight: bold; font-size: 18px;">${alert.currentUtilization}%</span>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span>Current Spend:</span>
                  <span>${alert.currency} ${alert.currentSpend}</span>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span>Budget Limit:</span>
                  <span>${alert.currency} ${alert.budgetLimit}</span>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span>Remaining Budget:</span>
                  <span>${alert.currency} ${alert.remainingBudget}</span>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span>Alert Threshold:</span>
                  <span>${alert.threshold}%</span>
                </div>

                <div style="display: flex; justify-content: space-between;">
                  <span>Severity:</span>
                  <span style="color: ${statusColor}; font-weight: bold;">${alert.severity}</span>
                </div>
              </div>

              ${alert.services && alert.services.length > 0 ? `
                <div style="margin: 20px 0;">
                  <strong>Monitored Services:</strong>
                  <div style="margin-top: 5px;">
                    ${alert.services.map(service => `<span style="background: #e3f2fd; padding: 4px 8px; border-radius: 4px; margin-right: 5px; font-size: 12px;">${service}</span>`).join('')}
                  </div>
                </div>
              ` : ''}

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
                <p><strong>Alert Time:</strong> ${new Date(alert.timestamp).toLocaleString()}</p>
                <p><strong>Budget Type:</strong> ${alert.budgetType}</p>
                <p style="margin-bottom: 0;"><strong>Budget ID:</strong> ${alert.budgetId}</p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px;">
              <p style="margin: 0;">This alert was generated by CostGuard Budget Monitoring System</p>
              <p style="margin: 5px 0 0 0;">To manage your budget settings, please log in to your CostGuard dashboard</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get Slack color based on severity
   */
  getSlackColor(severity) {
    switch (severity) {
    case 'CRITICAL': return 'danger';
    case 'HIGH': return 'warning';
    case 'MEDIUM': return 'warning';
    case 'LOW': return 'good';
    default: return 'good';
    }
  }
}

module.exports = { NotificationService };
