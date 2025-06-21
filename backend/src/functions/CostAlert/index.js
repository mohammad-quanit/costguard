// const AWS = require('aws-sdk');
// const ce = new AWS.CostExplorer({ region: 'us-east-1' });
// const sns = new AWS.SNS();
// const dynamodb = new AWS.DynamoDB.DocumentClient();

// const COST_ALERT_TOPIC_ARN = process.env.COST_ALERT_TOPIC;
// const COST_ALERT_TABLE = process.env.COST_ALERT_TABLE;
// const DAILY_THRESHOLD_PERCENT = parseInt(process.env.DAILY_THRESHOLD_PERCENT, 10);
// const MONTHLY_BUDGET = parseFloat(process.env.MONTHLY_BUDGET);

module.exports.costAlertHandler = async() => {
  // Fetch yesterday's cost using Cost Explorer
  // Store in DynamoDB
  // Compare with 7-day average and monthly budget
  // If anomaly, publish to SNS
};
