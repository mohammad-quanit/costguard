// Import the refactored handler
const { pingHandler } = require('./ping/handler');

// Export the handler for backward compatibility
exports.run = pingHandler;
