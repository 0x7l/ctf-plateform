/**
 * Format the response from the API
 * @param {boolean} success - Whether the request was successful
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Message to send back to client
 * @param {*} data - Data to send back to client
 * @returns {Object} - Formatted response object
 */
const formatResponse = (success, statusCode, message, data = null) => {
  const response = {
    success,
    message
  };

  if (data) {
    response.data = data;
  }

  return { statusCode, response };
};

/**
 * Sanitize input to prevent NoSQL injection
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
const sanitizeInput = (obj) => {
  const sanitized = { ...obj };
  
  // Convert potential query operators to string
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeInput(sanitized[key]);
    } else if (
      typeof sanitized[key] === 'string' &&
      (key.startsWith('$') || sanitized[key].includes('$'))
    ) {
      sanitized[key] = sanitized[key].replace(/\$/g, '');
    }
  }
  
  return sanitized;
};

module.exports = {
  formatResponse,
  sanitizeInput
};
