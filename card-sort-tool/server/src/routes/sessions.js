const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const router = express.Router();
const db = new sqlite3.Database(path.resolve(__dirname, '../../database.sqlite'));
const authenticateToken = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { shuffle } = require('lodash');

router.get('/', authenticateToken, (req, res) => {
  console.log(`GET /sessions requested by user: ${req.user.id}`);
  
  const query = `
    SELECT s.id, s.name, s.created_by, s.created_datetime, 
           (SELECT COUNT(*) FROM session_card_lists WHERE session_id = s.id) AS card_count,
           (SELECT COUNT(*) FROM session_card_lists WHERE session_id = s.id AND category_id IS NULL) AS unsorted_count
    FROM sessions s
    WHERE s.created_by = ?
  `;
  
  db.all(query, [req.user.id], (err, sessions) => {
    if (err) {
      console.error('Error fetching sessions:', err);
      res.status(500).json({ error: 'Error fetching sessions' });
    } else {
      console.log(`GET /sessions response: ${sessions.length} sessions found`);
      res.json(sessions);
    }
  });
});

router.post('/', authenticateToken, (req, res) => {
  const { name, cardSetIds, randomizeOrder, randomPercentage } = req.body;
  const createdDatetime = new Date().toISOString();
  console.log(`POST /sessions requested by user: ${req.user.id}, name: ${name}, cardSetIds: ${cardSetIds}, randomizeOrder: ${randomizeOrder}, randomPercentage: ${randomPercentage}`);

  if (!Array.isArray(cardSetIds) || cardSetIds.length === 0) {
    console.log('POST /sessions error: cardSetIds must be a non-empty array');
    return res.status(400).json({ error: 'cardSetIds must be a non-empty array' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    db.run('INSERT INTO sessions (name, created_by, created_datetime) VALUES (?, ?, ?)', [name, req.user.id, createdDatetime], function(err) {
      if (err) {
        db.run('ROLLBACK');
        console.error('Error creating session:', err);
        return res.status(500).json({ error: 'Error creating session' });
      }
      const sessionId = this.lastID;
      console.log(`POST /sessions: session created with id: ${sessionId}`);

      // Use a Set to keep track of inserted card IDs
      const insertedCardIds = new Set();

      const insertCardPromises = cardSetIds.map(cardSetId => {
        return new Promise((resolve, reject) => {
          db.all('SELECT * FROM card_set_items WHERE card_set_id = ?', [cardSetId], (err, cards) => {
            if (err) {
              reject(err);
            } else {
              let cardsToInsert = cards;
              if (randomizeOrder) {
                cardsToInsert = shuffle(cards);
                if (randomPercentage < 100) {
                  const cardCount = Math.ceil(cards.length * (randomPercentage / 100));
                  cardsToInsert = cardsToInsert.slice(0, cardCount);
                }
              }
              const insertPromises = cardsToInsert.map(card => {
                return new Promise((resolve, reject) => {
                  // Check if the card has already been inserted
                  if (!insertedCardIds.has(card.id)) {
                    insertedCardIds.add(card.id);
                    db.run('INSERT INTO session_card_lists (session_id, category_id, card_id, title, text) VALUES (?, ?, ?, ?, ?)',
                      [sessionId, null, card.id, card.title, card.text],
                      function(err) {
                        if (err) reject(err);
                        else resolve();
                      }
                    );
                  } else {
                    // Card already inserted, resolve immediately
                    resolve(null);
                  }
                });
              });
              Promise.all(insertPromises).then(resolve).catch(reject);
            }
          });
        });
      });
      
      Promise.all(insertCardPromises)
        .then(() => {
          db.run('COMMIT');
          console.log(`POST /sessions: session ${sessionId} created successfully with ${cardSetIds.length} card sets`);
          res.status(201).json({ id: sessionId, name, created_by: req.user.id, created_datetime: createdDatetime });
        })
        .catch(error => {
          db.run('ROLLBACK');
          console.error('Error importing cards to session:', error);
          res.status(500).json({ error: 'Error importing cards to session' });
        });
    });
  });
});

router.get('/:id', authenticateToken, (req, res) => {
  const sessionId = req.params.id;
  console.log(`GET /sessions/${sessionId} requested by user: ${req.user.id}`);
  
  const query = `
    SELECT s.id, s.name, s.created_by, s.created_datetime,
           c.id as category_id, c.name as category_name,
           scl.card_id, scl.title, scl.text, scl.category_id as card_category_id
    FROM sessions s
    LEFT JOIN categories c ON s.id = c.session_id
    LEFT JOIN session_card_lists scl ON s.id = scl.session_id
    WHERE s.id = ? AND s.created_by = ?
  `;
  
  db.all(query, [sessionId, req.user.id], (err, rows) => {
    if (err) {
      console.error(`Error fetching session ${sessionId}:`, err);
      return res.status(500).json({ error: 'Error fetching session' });
    }
    
    if (rows.length === 0) {
      console.log(`GET /sessions/${sessionId} error: Session not found`);
      return res.status(404).json({ error: 'Session not found' });
    }
    
    //console.log('Raw SQL query result:', JSON.stringify(rows, null, 2));
    
    const session = {
      id: rows[0].id,
      name: rows[0].name,
      created_by: rows[0].created_by,
      created_datetime: rows[0].created_datetime,
      categories: {},
      unsortedCards: []
    };
    
    // First, create all categories
    rows.forEach(row => {
      if (row.category_id !== null && !session.categories[row.category_id]) {
        session.categories[row.category_id] = {
          id: row.category_id,
          name: row.category_name,
          cards: []
        };
      }
    });

    // Then, process all cards
    const processedCards = new Set();
    rows.forEach(row => {
      if (row.card_id && !processedCards.has(row.card_id)) {
        processedCards.add(row.card_id);
        const card = {
          id: row.card_id,
          title: row.title,
          text: row.text,
          category: row.card_category_id && session.categories[row.card_category_id] 
            ? session.categories[row.card_category_id].name 
            : null
        };
        
        if (!row.card_category_id || !session.categories[row.card_category_id]) {
          session.unsortedCards.push(card);
        } else {
          session.categories[row.card_category_id].cards.push(card);
        }
      }
    });
    
    //console.log('Processed session object:', JSON.stringify(session, null, 2));
    console.log(`GET /sessions/${sessionId} response: session with ${Object.keys(session.categories).length} categories and ${session.unsortedCards.length} unsorted cards`);
    res.json(session);
  });
});

router.put('/:sessionId/cards/:cardId', authenticateToken, (req, res) => {
  const { sessionId, cardId } = req.params;
  const { category } = req.body;

  console.log(`PUT /sessions/${sessionId}/cards/${cardId} requested by user: ${req.user.id}, new category: ${category}`);

  db.run(
    'UPDATE session_card_lists SET category_id = ? WHERE session_id = ? AND card_id = ?',
    [category === 'Unsorted' ? null : category, sessionId, cardId],
    function(err) {
      if (err) {
        console.error(`Error updating card ${cardId} in session ${sessionId}:`, err);
        return res.status(500).json({ error: 'Error updating card category' });
      }
      if (this.changes === 0) {
        console.log(`PUT /sessions/${sessionId}/cards/${cardId} error: Card not found`);
        return res.status(404).json({ error: 'Card not found' });
      }
      console.log(`PUT /sessions/${sessionId}/cards/${cardId} response: Card category updated successfully`);
      res.json({ message: 'Card category updated successfully' });
    }
  );
});

router.put('/:sessionId/categories/:categoryId', authenticateToken, (req, res) => {
  const { sessionId, categoryId } = req.params;
  const { name } = req.body;

  console.log(`PUT /sessions/${sessionId}/categories/${categoryId} requested by user: ${req.user.id}, new name: ${name}`);

  db.run('UPDATE categories SET name = ? WHERE id = ? AND session_id = ?', [name, categoryId, sessionId], function(err) {
    if (err) {
      console.error(`Error updating category ${categoryId} in session ${sessionId}:`, err);
      return res.status(500).json({ error: 'Error updating category' });
    }
    console.log(`Changes made: ${this.changes}, Last inserted ID: ${this.lastID}`);
    if (this.changes === 0) {
      console.log(`PUT /sessions/${sessionId}/categories/${categoryId} error: Category not found`);
      return res.status(404).json({ error: 'Category not found' });
    }
    console.log(`PUT /sessions/${sessionId}/categories/${categoryId} response: Category updated successfully`);
    res.json({ message: 'Category updated successfully', categoryId, newName: name });
  });
});

router.delete('/:sessionId/categories/:categoryId', authenticateToken, (req, res) => {
  const { sessionId, categoryId } = req.params;

  console.log(`DELETE /sessions/${sessionId}/categories/${categoryId} requested by user: ${req.user.id}`);

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Update all cards in this category to have null category_id
    db.run('UPDATE session_card_lists SET category_id = NULL WHERE session_id = ? AND category_id = ?', [sessionId, categoryId], (err) => {
      if (err) {
        db.run('ROLLBACK');
        console.error(`Error updating cards for category ${categoryId} in session ${sessionId}:`, err);
        return res.status(500).json({ error: 'Error updating cards' });
      }

      // Delete the category
      db.run('DELETE FROM categories WHERE id = ? AND session_id = ?', [categoryId, sessionId], function(err) {
        if (err) {
          db.run('ROLLBACK');
          console.error(`Error deleting category ${categoryId} from session ${sessionId}:`, err);
          return res.status(500).json({ error: 'Error deleting category' });
        }

        if (this.changes === 0) {
          db.run('ROLLBACK');
          console.log(`DELETE /sessions/${sessionId}/categories/${categoryId} error: Category not found`);
          return res.status(404).json({ error: 'Category not found' });
        }

        db.run('COMMIT');
        console.log(`DELETE /sessions/${sessionId}/categories/${categoryId} response: Category deleted successfully`);
        res.json({ message: 'Category deleted successfully' });
      });
    });
  });
});

router.post('/:sessionId/categories', authenticateToken, (req, res) => {
  console.log('Received request to create category');
  console.log('Request body:', req.body);
  console.log('Session ID:', req.params.sessionId);
  console.log('User ID:', req.user.id);

  const { sessionId } = req.params;
  const { name } = req.body;

  console.log(`POST /sessions/${sessionId}/categories requested by user: ${req.user.id}, name: ${name}`);

  db.run('INSERT INTO categories (name, session_id) VALUES (?, ?)', [name, sessionId], function(err) {
    if (err) {
      console.error(`Error creating category in session ${sessionId}:`, err);
      return res.status(500).json({ error: 'Error creating category' });
    }
    const newCategoryId = this.lastID;
    console.log(`POST /sessions/${sessionId}/categories response: Category created successfully with id ${newCategoryId}`);
    res.status(201).json({ id: newCategoryId, name, sessionId });
  });
});

router.post('/:sessionId/share', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  const { valid_from, valid_to, password } = req.body;
  const id = uuidv4();

  console.log(`POST /sessions/${sessionId}/share requested by user: ${req.user.id}`);

  db.run(
    'INSERT INTO shared_sessions (id, session_id, valid_from, valid_to, password, submitted) VALUES (?, ?, ?, ?, ?, ?)',
    [id, sessionId, valid_from, valid_to, password, false],
    function(err) {
      if (err) {
        console.error(`Error creating shared session for session ${sessionId}:`, err);
        return res.status(500).json({ error: 'Error creating shared session' });
      }
      console.log(`POST /sessions/${sessionId}/share response: Shared session created successfully with id ${id}`);
      res.status(201).json({ id, sessionId, valid_from, valid_to });
    }
  );
});

router.get('/:sessionId/sharing-status', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  const now = new Date().toISOString();

  db.get(
    'SELECT id FROM shared_sessions WHERE session_id = ? AND valid_from <= ? AND valid_to >= ? AND submitted = FALSE',
    [sessionId, now, now],
    (err, row) => {
      if (err) {
        console.error(`Error fetching sharing status for session ${sessionId}:`, err);
        return res.status(500).json({ error: 'Error fetching sharing status' });
      }
      const isSharing = !!row;
      res.json({ isSharing, id: row ? row.id : null });
    }
  );
});

router.delete('/:sessionId', authenticateToken, (req, res) => {
  const { sessionId } = req.params;
  console.log(`DELETE /sessions/${sessionId} requested by user: ${req.user.id}`);

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Delete all shared sessions associated with the session
    db.run('DELETE FROM shared_sessions WHERE session_id = ?', [sessionId], (err) => {
      if (err) {
        db.run('ROLLBACK');
        console.error(`Error deleting shared sessions for session ${sessionId}:`, err);
        return res.status(500).json({ error: 'Error deleting shared sessions' });
      }

      // Delete all categories associated with the session
      db.run('DELETE FROM categories WHERE session_id = ?', [sessionId], (err) => {
        if (err) {
          db.run('ROLLBACK');
          console.error(`Error deleting categories for session ${sessionId}:`, err);
          return res.status(500).json({ error: 'Error deleting categories' });
        }

        // Delete all cards associated with the session
        db.run('DELETE FROM session_card_lists WHERE session_id = ?', [sessionId], (err) => {
          if (err) {
            db.run('ROLLBACK');
            console.error(`Error deleting cards for session ${sessionId}:`, err);
            return res.status(500).json({ error: 'Error deleting session cards' });
          }

          // Delete the session itself
          db.run('DELETE FROM sessions WHERE id = ? AND created_by = ?', [sessionId, req.user.id], function(err) {
            if (err) {
              db.run('ROLLBACK');
              console.error(`Error deleting session ${sessionId}:`, err);
              return res.status(500).json({ error: 'Error deleting session' });
            }

            if (this.changes === 0) {
              db.run('ROLLBACK');
              console.log(`DELETE /sessions/${sessionId} error: Session not found`);
              return res.status(404).json({ error: 'Session not found' });
            }

            db.run('COMMIT');
            console.log(`DELETE /sessions/${sessionId} response: Session deleted successfully`);
            res.json({ message: 'Session deleted successfully' });
          });
        });
      });
    });
  });
});

// Add this new route to handle session copying
router.post('/copy', authenticateToken, (req, res) => {
  const { name, sourceSessionId } = req.body;
  const createdDatetime = new Date().toISOString();
  
  console.log(`POST /sessions/copy requested by user: ${req.user.id}, name: ${name}, sourceSessionId: ${sourceSessionId}`);

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Create new session
    db.run(
      'INSERT INTO sessions (name, created_by, created_datetime) VALUES (?, ?, ?)',
      [name, req.user.id, createdDatetime],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          console.error('Error creating new session:', err);
          return res.status(500).json({ error: 'Error creating session' });
        }

        const newSessionId = this.lastID;

        // Copy cards from source session
        db.run(
          `INSERT INTO session_card_lists (session_id, card_id, title, text)
           SELECT ?, card_id, title, text
           FROM session_card_lists
           WHERE session_id = ?`,
          [newSessionId, sourceSessionId],
          (err) => {
            if (err) {
              db.run('ROLLBACK');
              console.error('Error copying cards:', err);
              return res.status(500).json({ error: 'Error copying cards' });
            }

            // Copy categories from source session
            db.all(
              'SELECT * FROM categories WHERE session_id = ?',
              [sourceSessionId],
              (err, categories) => {
                if (err) {
                  db.run('ROLLBACK');
                  console.error('Error fetching categories:', err);
                  return res.status(500).json({ error: 'Error copying categories' });
                }

                const categoryPromises = categories.map(category => {
                  return new Promise((resolve, reject) => {
                    db.run(
                      'INSERT INTO categories (name, session_id) VALUES (?, ?)',
                      [category.name, newSessionId],
                      function(err) {
                        if (err) reject(err);
                        else {
                          const newCategoryId = this.lastID;
                          // Update cards with the new category ID
                          db.run(
                            `UPDATE session_card_lists 
                             SET category_id = ? 
                             WHERE session_id = ? 
                             AND card_id IN (
                               SELECT card_id 
                               FROM session_card_lists 
                               WHERE session_id = ? 
                               AND category_id = ?
                             )`,
                            [newCategoryId, newSessionId, sourceSessionId, category.id],
                            (err) => {
                              if (err) reject(err);
                              else resolve();
                            }
                          );
                        }
                      }
                    );
                  });
                });

                Promise.all(categoryPromises)
                  .then(() => {
                    db.run('COMMIT');
                    console.log(`Session copied successfully. New session ID: ${newSessionId}`);
                    res.status(201).json({
                      id: newSessionId,
                      name,
                      created_by: req.user.id,
                      created_datetime: createdDatetime
                    });
                  })
                  .catch(err => {
                    db.run('ROLLBACK');
                    console.error('Error copying categories:', err);
                    res.status(500).json({ error: 'Error copying categories' });
                  });
              }
            );
          }
        );
      }
    );
  });
});

module.exports = router;
