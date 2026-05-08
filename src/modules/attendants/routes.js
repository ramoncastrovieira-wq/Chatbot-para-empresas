const express = require('express');
const service = require('./service');

const router = express.Router();

router.get('/attendants', async (req, res) => {
  try {
    res.json(await service.list());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/attendants/:id/online', async (req, res) => {
  try {
    res.json(await service.setOnline(req.params.id, req.body.online));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
