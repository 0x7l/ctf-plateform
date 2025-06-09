const express = require('express');
const router = express.Router();
const {
  getSolves,
  getSolveById,
  createSolve,
  updateSolve,
  deleteSolve,
  getUserSolves
} = require('../controllers/solve.controller');
const { validateSolveInput } = require('../middleware/validator');
const { authenticate, authorize } = require('../middleware/auth');

// User solve routes
router.get('/user', authenticate, getUserSolves);
router.post('/', authenticate, validateSolveInput, createSolve);

// Admin routes
router.get('/', authenticate, authorize(['admin']), getSolves);
router.get('/:id', authenticate, authorize(['admin']), getSolveById);
router.put('/:id', authenticate, authorize(['admin']), validateSolveInput, updateSolve);
router.delete('/:id', authenticate, authorize(['admin']), deleteSolve);

module.exports = router;
