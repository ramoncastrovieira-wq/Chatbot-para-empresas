const express = require('express');
const service = require('./service');

const router = express.Router();

router.get('/messages/contact/:jid', async (req, res) => {
  try {
    const rows = await service.listByJid(req.params.jid);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/messages/conversation/:conversationId', async (req, res) => {
  try {
    const rows = await service.listByConversation(req.params.conversationId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
