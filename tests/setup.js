// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = 5000;

// Increase test timeout for slower operations
jest.setTimeout(30000);
