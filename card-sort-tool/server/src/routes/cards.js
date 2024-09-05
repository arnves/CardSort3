const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();
const path = require('path');
const db = new sqlite3.Database(path.resolve(__dirname, '../../database.sqlite'));
const authenticateToken = require('../middleware/auth');

router.get('/:sessionId', authenticateToken, (req, res) => {
  db.all('SELECT * FROM cards WHERE session_id = ?', [req.params.sessionId], (err, cards) => {
    if (err) {
      res.status(500).json({ error: 'Error fetching cards' });
    } else {
      res.json(cards);
    }
  });
});

router.post('/', authenticateToken, (req, res) => {
  const { title, text, category, sessionId } = req.body;
  db.run('INSERT INTO cards (title, text, category, session_id) VALUES (?, ?, ?, ?)', 
    [title, text, category, sessionId], 
    function(err) {
      if (err) {
        res.status(500).json({ error: 'Error creating card' });
      } else {
        res.status(201).json({ id: this.lastID, title, text, category, session_id: sessionId });
      }
    }
  );
});

router.put('/:id', authenticateToken, (req, res) => {
  const { title, text, category } = req.body;
  db.run('UPDATE cards SET title = ?, text = ?, category = ? WHERE id = ?', 
    [title, text, category, req.params.id], 
    (err) => {
      if (err) {
        res.status(500).json({ error: 'Error updating card' });
      } else {
        res.json({ message: 'Card updated successfully' });
      }
    }
  );
});

// Add more routes for deleting cards

module.exports = router;