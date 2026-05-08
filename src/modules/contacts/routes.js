const express = require('express');
const service = require('./service');

const router = express.Router();

router.get('/contacts', async (req, res) => {
  try {
    const rows = await service.list();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
