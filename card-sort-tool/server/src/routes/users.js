const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const router = express.Router();
const db = new sqlite3.Database(path.resolve(__dirname, '../../database.sqlite'));
const authenticateToken = require('../middleware/auth');

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
      if (err) {
        res.status(400).json({ error: 'Username already exists' });
      } else {
        res.status(201).json({ message: 'User created successfully' });
      }
    });
  } catch {
    res.status(500).json({ error: 'Error creating user' });
  }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }
    try {
      if (await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.is_admin }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
      } else {
        res.status(400).json({ error: 'Invalid username or password' });
      }
    } catch {
      res.status(500).json({ error: 'Error logging in' });
    }
  });
});

router.put('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  db.get('SELECT password FROM users WHERE id = ?', [userId], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    try {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to update password' });
        }
        res.json({ message: 'Password updated successfully' });
      });
    } catch (error) {
      res.status(500).json({ error: 'Error changing password' });
    }
  });
});

module.exports = router;