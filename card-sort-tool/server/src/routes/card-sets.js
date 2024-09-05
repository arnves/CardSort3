const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const router = express.Router();
const db = new sqlite3.Database(path.resolve(__dirname, '../../database.sqlite'));
const authenticateToken = require('../middleware/auth');

// Fetch all card sets
router.get('/', authenticateToken, (req, res) => {
  db.all('SELECT * FROM card_sets', (err, cardSets) => {
    if (err) {
      console.error('Error fetching card sets:', err);
      res.status(500).json({ error: 'Error fetching card sets' });
    } else {
      res.json(cardSets);
    }
  });
});

// Fetch cards for a specific card set
router.get('/:id/cards', authenticateToken, (req, res) => {
  const cardSetId = req.params.id;
  db.all('SELECT * FROM card_set_items WHERE card_set_id = ?', [cardSetId], (err, cards) => {
    if (err) {
      console.error('Error fetching cards:', err);
      res.status(500).json({ error: 'Error fetching cards' });
    } else {
      res.json(cards);
    }
  });
});

// Create a new card set
router.post('/', authenticateToken, (req, res) => {
  const { name, cards } = req.body;
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.run('INSERT INTO card_sets (name) VALUES (?)', [name], function(err) {
      if (err) {
        db.run('ROLLBACK');
        console.error('Error creating card set:', err);
        return res.status(500).json({ error: 'Error creating card set' });
      }
      
      const cardSetId = this.lastID;
      
      // Insert cards into card_set_items
      const insertCard = db.prepare('INSERT INTO card_set_items (card_set_id, title, text) VALUES (?, ?, ?)');
      
      let insertError = false;
      cards.forEach(card => {
        insertCard.run([cardSetId, card.title, card.text], (err) => {
          if (err) {
            insertError = true;
            console.error('Error inserting card:', err);
          }
        });
      });
      
      insertCard.finalize((err) => {
        if (err || insertError) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Error inserting cards' });
        }

        db.run('COMMIT', (err) => {
          if (err) {
            console.error('Error committing transaction:', err);
            return res.status(500).json({ error: 'Error creating card set' });
          }
          res.status(201).json({ id: cardSetId, name, cards });
        });
      });
    });
  });
});

// Update card set name
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  
  db.run('UPDATE card_sets SET name = ? WHERE id = ?', [name, id], function(err) {
    if (err) {
      console.error('Error updating card set name:', err);
      return res.status(500).json({ error: 'Error updating card set name' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Card set not found' });
    }
    
    res.json({ id, name });
  });
});

// Delete a card set
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.run('DELETE FROM card_set_items WHERE card_set_id = ?', [id], (err) => {
      if (err) {
        db.run('ROLLBACK');
        console.error('Error deleting card set items:', err);
        return res.status(500).json({ error: 'Error deleting card set items' });
      }

      db.run('DELETE FROM card_sets WHERE id = ?', [id], function(err) {
        if (err) {
          db.run('ROLLBACK');
          console.error('Error deleting card set:', err);
          return res.status(500).json({ error: 'Error deleting card set' });
        }

        if (this.changes === 0) {
          db.run('ROLLBACK');
          return res.status(404).json({ error: 'Card set not found' });
        }

        db.run('COMMIT', (err) => {
          if (err) {
            console.error('Error committing transaction:', err);
            return res.status(500).json({ error: 'Error committing delete transaction' });
        }
          res.json({ message: 'Card set deleted successfully' });
        });
      });
    });
  });
});

// Update a card in a card set
router.put('/cards/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { title, text } = req.body;

  db.run('UPDATE card_set_items SET title = ?, text = ? WHERE id = ?', [title, text, id], function(err) {
    if (err) {
      console.error('Error updating card:', err);
      return res.status(500).json({ error: 'Error updating card' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({ id, title, text });
  });
});

// Delete a card from a card set
router.delete('/cards/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM card_set_items WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting card:', err);
      return res.status(500).json({ error: 'Error deleting card' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({ message: 'Card deleted successfully' });
  });
});

module.exports = router;