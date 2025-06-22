// Import the refactored handler
const { costAlertHandler } = require('./handler');

// Export the handler for backward compatibility
module.exports.costAlertHandler = costAlertHandler;
