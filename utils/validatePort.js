/**
 * Validates a port number.
 * @param {number|string} port - The port to validate.
 * @param {string} name - The name of the port (for error messages).
 * @throws {Error} If the port is invalid.
 * @returns {number} The validated port number.
 */
function validatePort(port, name) {
  const portNumber = parseInt(port, 10);
  if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
    throw new Error(`${name} must be a valid number between 1 and 65535. Received: ${port}`);
  }
  return portNumber;
}

module.exports = validatePort;