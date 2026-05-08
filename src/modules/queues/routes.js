const express = require('express');
const service = require('./service');

const router = express.Router();

router.get('/queues', async (req, res) => {
  try {
    const rows = req.query.all === 'true' ? await service.listAll() : await service.listActive();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
