const express = require('express');

const contactsRoutes = require('../modules/contacts/routes');
const conversationsRoutes = require('../modules/conversations/routes');
const messagesRoutes = require('../modules/messages/routes');
const queuesRoutes = require('../modules/queues/routes');
const attendantsRoutes = require('../modules/attendants/routes');

const router = express.Router();

router.use(contactsRoutes);
router.use(conversationsRoutes);
router.use(messagesRoutes);
router.use(queuesRoutes);
router.use(attendantsRoutes);

module.exports = router;
