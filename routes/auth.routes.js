const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRegisterInput, validateLoginInput } = require('../middleware/validator');

// Public routes
router.post('/register', validateRegisterInput, authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, authController.updateProfile);

// Admin routes
router.get('/users/:id', authenticate, authorize(['admin']), authController.getUserById);
router.put('/users/:id', authenticate, authorize(['admin']), authController.updateUser);

module.exports = router;
