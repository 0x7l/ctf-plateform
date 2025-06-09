const express = require('express');
const router = express.Router();
const {
  getAllDbInstances,
  getDbInstanceById,
  createDbInstance,
  updateDbInstance,
  deleteDbInstance,
  createDbUser
} = require('../controllers/dbAdmin.controller');
const { validateDbAdminInput } = require('../middleware/validator');
const { authenticate, authorize } = require('../middleware/auth');

// All routes are admin-only
router.get('/', authenticate, authorize(['admin']), getAllDbInstances);
router.post('/', authenticate, authorize(['admin']), validateDbAdminInput, createDbInstance);
router.get('/:id', authenticate, authorize(['admin']), getDbInstanceById);
router.put('/:id', authenticate, authorize(['admin']), validateDbAdminInput, updateDbInstance);
router.delete('/:id', authenticate, authorize(['admin']), deleteDbInstance);

// Route for creating a database user for a challenge
router.post('/:id/users', authenticate, authorize(['admin']), createDbUser);

module.exports = router;
