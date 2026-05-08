const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

router.post('/register', (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  db.get('SELECT id FROM users WHERE username = ?', [username], (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const hash = bcrypt.hashSync(password, 10);
    const stmt = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?,?,?)');
    stmt.run([username, hash, role || 'user'], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT id, username, role FROM users WHERE id = ?', [this.lastID], (e, row) => {
        if (e) return res.status(500).json({ error: e.message });
        res.status(201).json(row);
      });
    });
    stmt.finalize();
  });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ ok: false, error: 'Credenciais inválidas' });
    const ok = bcrypt.compareSync(password, row.password_hash || '');
    if (!ok) return res.status(401).json({ ok: false, error: 'Credenciais inválidas' });
    const token = jwt.sign({ userId: row.id, username: row.username, role: row.role }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ ok: true, token, user: { id: row.id, username: row.username, role: row.role } });
  });
});

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const parts = (authHeader || '').split(' ');
  const token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : authHeader;
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
}

router.get('/me', authMiddleware, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// attach middleware for external use
router.authMiddleware = authMiddleware;

module.exports = router;
