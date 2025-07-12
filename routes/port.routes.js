const express = require('express');
const { findAvailablePorts } = require('../utils/portUtils');
const router = express.Router();

router.get('/available', async (req, res) => {
  try {
    const availablePorts = await findAvailablePorts(1024, 65535);
    res.json({ availablePorts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch available ports.' });
  }
});

module.exports = router;