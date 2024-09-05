const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const router = express.Router();
const db = new sqlite3.Database(path.resolve(__dirname, '../../database.sqlite'));
const { v4: uuidv4 } = require('uuid');

// Add this at the beginning of the file
const logRequest = (req, message) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${message}`);
};

// Middleware to check if the shared session is valid
const validateSharedSession = (req, res, next) => {
  const { id } = req.params;
  const now = new Date().toISOString();
  logRequest(req, `Validating shared session ${id}`);

  db.get(
    'SELECT * FROM shared_sessions WHERE id = ? AND valid_from <= ? AND valid_to >= ? AND submitted = FALSE',
    [id, now, now],
    (err, sharedSession) => {
      if (err) {
        console.error(`Error validating shared session ${id}:`, err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!sharedSession) {
        console.log(`Shared session ${id} not found or expired`);
        return res.status(404).json({ error: 'Shared session not found or expired' });
      }
      req.sharedSession = sharedSession;
      logRequest(req, `Shared session ${id} validated successfully`);
      next();
    }
  );
};

// Middleware to validate password if set
const validatePassword = (req, res, next) => {
  const { password } = req.body;
  const { sharedSession } = req;
  logRequest(req, `Validating password for shared session ${sharedSession.id}`);

  if (sharedSession.password && sharedSession.password !== password) {
    console.log(`Invalid password for shared session ${sharedSession.id}`);
    return res.status(401).json({ error: 'Invalid password' });
  }
  logRequest(req, `Password validated successfully for shared session ${sharedSession.id}`);
  next();
};

// Get shared session data
router.get('/:id', validateSharedSession, validatePassword, (req, res) => {
  const { session_id } = req.sharedSession;
  logRequest(req, `Fetching data for shared session ${req.params.id} (session_id: ${session_id})`);

  db.all(
    `SELECT scl.card_id, c.id as category_id, c.name as category_name, scl.title, scl.text
     FROM session_card_lists scl
     LEFT JOIN categories c ON scl.category_id = c.id
     WHERE scl.session_id = ?`,
    [session_id],
    (err, rows) => {
      if (err) {
        console.error(`Error fetching session data for shared session ${req.params.id}:`, err);
        return res.status(500).json({ error: 'Error fetching session data' });
      }

      const session = {
        categories: {},
        unsortedCards: []
      };

      // After line 71, add:
      db.all('SELECT id, name FROM categories WHERE session_id = ?', [session_id], (err, categories) => {
        if (err) {
          console.error(`Error fetching categories for shared session ${req.params.id}:`, err);
          return res.status(500).json({ error: 'Error fetching session data' });
        }

        categories.forEach(category => {
          session.categories[category.id] = {
            id: category.id,
            name: category.name,
            cards: []
          };
        });

        // Continue with the existing code to populate cards
        db.all(
          `SELECT scl.card_id, c.id as category_id, c.name as category_name, scl.title, scl.text
           FROM session_card_lists scl
           LEFT JOIN categories c ON scl.category_id = c.id
           WHERE scl.session_id = ?`,
          [session_id],
          (err, rows) => {
            if (err) {
              console.error(`Error fetching session data for shared session ${req.params.id}:`, err);
              return res.status(500).json({ error: 'Error fetching session data' });
            }

            rows.forEach(row => {
              if (row.category_id === null) {
                session.unsortedCards.push({
                  id: row.card_id,
                  title: row.title,
                  text: row.text
                });
              } else {
                if (!session.categories[row.category_id]) {
                  session.categories[row.category_id] = {
                    id: row.category_id,
                    name: row.category_name,
                    cards: []
                  };
                }
                session.categories[row.category_id].cards.push({
                  id: row.card_id,
                  title: row.title,
                  text: row.text
                });
              }
            });

            logRequest(req, `Data fetched successfully for shared session ${req.params.id}`);
            res.json(session);
          }
        );
      });
    }
  );
});

// Create a new category
router.post('/:id/categories', validateSharedSession, validatePassword, (req, res) => {
  const { session_id } = req.sharedSession;
  const { name } = req.body;
  logRequest(req, `Creating category "${name}" for shared session ${req.params.id} (session_id: ${session_id})`);

  db.run(
    'INSERT INTO categories (name, session_id) VALUES (?, ?)',
    [name, session_id],
    function(err) {
      if (err) {
        console.error(`Error creating category for shared session ${req.params.id}:`, err);
        return res.status(500).json({ error: 'Error creating category' });
      }
      logRequest(req, `Category created successfully for shared session ${req.params.id} with id ${this.lastID}`);
      res.status(201).json({ id: this.lastID, name });
    }
  );
});

// Move a card to a category
router.put('/:id/cards/:cardId', validateSharedSession, validatePassword, (req, res) => {
  const { session_id } = req.sharedSession;
  const { cardId } = req.params;
  const { category_id } = req.body;
  logRequest(req, `Moving card ${cardId} to category ${category_id} for shared session ${req.params.id} (session_id: ${session_id})`);

  db.run(
    'UPDATE session_card_lists SET category_id = ? WHERE session_id = ? AND card_id = ?',
    [category_id, session_id, cardId],
    function(err) {
      if (err) {
        console.error(`Error updating card category for shared session ${req.params.id}:`, err);
        return res.status(500).json({ error: 'Error updating card category' });
      }
      if (this.changes === 0) {
        console.log(`Card ${cardId} not found in shared session ${req.params.id}`);
        return res.status(404).json({ error: 'Card not found' });
      }
      logRequest(req, `Card ${cardId} moved successfully in shared session ${req.params.id}`);
      res.json({ message: 'Card category updated successfully' });
    }
  );
});

// Submit the shared session
router.post('/:id/submit', validateSharedSession, validatePassword, (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();
  logRequest(req, `Submitting shared session ${id}`);

  db.run(
    'UPDATE shared_sessions SET submitted = TRUE, valid_to = ? WHERE id = ?',
    [now, id],
    function(err) {
      if (err) {
        console.error(`Error submitting shared session ${id}:`, err);
        return res.status(500).json({ error: 'Error submitting shared session' });
      }
      logRequest(req, `Shared session ${id} submitted successfully`);
      res.json({ message: 'Shared session submitted successfully' });
    }
  );
});

// Create a new shared session (for admin use)
router.post('/', (req, res) => {
  const { session_id, valid_from, valid_to, password } = req.body;
  const id = uuidv4();

  db.run(
    'INSERT INTO shared_sessions (id, session_id, valid_from, valid_to, password) VALUES (?, ?, ?, ?, ?)',
    [id, session_id, valid_from, valid_to, password],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error creating shared session' });
      }
      res.status(201).json({ id, session_id, valid_from, valid_to });
    }
  );
});

// Add this route after the existing routes
router.delete('/:id/categories/:categoryId', validateSharedSession, validatePassword, (req, res) => {
  const { session_id } = req.sharedSession;
  const { categoryId } = req.params;
  logRequest(req, `Deleting category ${categoryId} for shared session ${req.params.id} (session_id: ${session_id})`);

  db.run('DELETE FROM categories WHERE id = ? AND session_id = ?', [categoryId, session_id], function(err) {
    if (err) {
      console.error(`Error deleting category for shared session ${req.params.id}:`, err);
      return res.status(500).json({ error: 'Error deleting category' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Move cards to unsorted
    db.run('UPDATE session_card_lists SET category_id = NULL WHERE category_id = ? AND session_id = ?', [categoryId, session_id], function(err) {
      if (err) {
        console.error(`Error moving cards to unsorted for shared session ${req.params.id}:`, err);
        return res.status(500).json({ error: 'Error moving cards to unsorted' });
      }
      logRequest(req, `Category ${categoryId} deleted successfully for shared session ${req.params.id}`);
      res.json({ message: 'Category deleted successfully' });
    });
  });
});

// Add this route after the existing routes
router.put('/:id/categories/:categoryId', validateSharedSession, validatePassword, (req, res) => {
  const { session_id } = req.sharedSession;
  const { categoryId } = req.params;
  const { name } = req.body;
  logRequest(req, `Renaming category ${categoryId} to "${name}" for shared session ${req.params.id} (session_id: ${session_id})`);

  db.run('UPDATE categories SET name = ? WHERE id = ? AND session_id = ?', [name, categoryId, session_id], function(err) {
    if (err) {
      console.error(`Error renaming category for shared session ${req.params.id}:`, err);
      return res.status(500).json({ error: 'Error renaming category' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    logRequest(req, `Category ${categoryId} renamed successfully for shared session ${req.params.id}`);
    res.json({ message: 'Category renamed successfully' });
  });
});

module.exports = router;