const express = require('express');
const service = require('./service');
const messagesService = require('../messages/service');

const router = express.Router();

router.get('/conversations', async (req, res) => {
  try {
    const rows = await service.list({ status: req.query.status || null, queue_id: req.query.queue_id || null });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/conversations/:id', async (req, res) => {
  try {
    const conversation = await service.findById(req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversa não encontrada' });
    const messages = await messagesService.listByConversation(req.params.id);
    res.json({ ...conversation, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/conversations/:id/assign', async (req, res) => {
  try {
    const { attendant_id } = req.body;
    if (!attendant_id) return res.status(400).json({ error: 'attendant_id obrigatório' });
    const row = await service.assignAttendant(req.params.id, attendant_id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/conversations/:id/queue', async (req, res) => {
  try {
    const { queue_id } = req.body;
    if (!queue_id) return res.status(400).json({ error: 'queue_id obrigatório' });
    const row = await service.assignQueue(req.params.id, queue_id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/conversations/:id/close', async (req, res) => {
  try {
    const row = await service.close(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
