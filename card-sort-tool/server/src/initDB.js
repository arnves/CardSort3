const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database', err);
        reject(err);
      } else {
        console.log('Connected to the SQLite database at:', dbPath);
        createTables(db)
          .then(() => createAdminUser(db))
          .then(() => createExampleCardSet(db))
          .then(() => createExampleSession(db))
          .then(() => {
            console.log('Database initialization completed.');
            db.close();
            resolve();
          })
          .catch((error) => {
            console.error('Error during database initialization', error);
            db.close();
            reject(error);
          });
      }
    });
  });
}

function createTables(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        is_admin INTEGER DEFAULT 0
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS card_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS card_set_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_set_id INTEGER,
        title TEXT,
        text TEXT,
        FOREIGN KEY (card_set_id) REFERENCES card_sets (id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        created_by INTEGER,
        created_datetime TEXT,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        session_id INTEGER,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS session_card_lists (
        session_id INTEGER,
        category_id INTEGER,
        card_id INTEGER,
        title TEXT,
        text TEXT,
        PRIMARY KEY (session_id, card_id),
        FOREIGN KEY (session_id) REFERENCES sessions (id),
        FOREIGN KEY (category_id) REFERENCES categories (id)
      )`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

function createAdminUser(db) {
  return new Promise((resolve, reject) => {
    const adminPassword = 'admin';
    bcrypt.hash(adminPassword, 10, (err, hash) => {
      if (err) {
        reject(err);
      } else {
        db.run('INSERT OR IGNORE INTO users (username, password, is_admin) VALUES (?, ?, ?)', 
          ['admin', hash, 1], 
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      }
    });
  });
}

function createExampleCardSet(db) {
  return new Promise((resolve, reject) => {
    db.run('INSERT OR IGNORE INTO card_sets (name) VALUES (?)', ['Example Card Set'], function(err) {
      if (err) {
        reject(err);
      } else {
        const cardSetId = this.lastID;
        const exampleCards = [
          { title: 'Card 1', text: 'This is the first example card' },
          { title: 'Card 2', text: 'This is the second example card' },
          { title: 'Card 3', text: 'This is the third example card' },
        ];
        const insertPromises = exampleCards.map(card => {
          return new Promise((resolve, reject) => {
            db.run('INSERT INTO card_set_items (card_set_id, title, text) VALUES (?, ?, ?)', 
              [cardSetId, card.title, card.text], 
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        });
        Promise.all(insertPromises).then(resolve).catch(reject);
      }
    });
  });
}

function createExampleSession(db) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM users WHERE username = ?', ['admin'], (err, user) => {
      if (err) {
        reject(err);
      } else {
        const sessionName = "Example Session";
        const createdDatetime = new Date().toISOString();
        db.run('INSERT INTO sessions (name, created_by, created_datetime) VALUES (?, ?, ?)',
          [sessionName, user.id, createdDatetime],
          function(err) {
            if (err) {
              reject(err);
            } else {
              const sessionId = this.lastID;
              db.run('INSERT INTO categories (name, session_id) VALUES (?, ?)', ['Unsorted', sessionId], function(err) {
                if (err) {
                  reject(err);
                } else {
                  const categoryId = this.lastID;
                  db.run('INSERT INTO session_card_lists (session_id, category_id, card_id, title, text) VALUES (?, ?, ?, ?, ?)', 
                    [sessionId, categoryId, 1, 'Example Card', 'This is an example card in a session'],
                    (err) => {
                      if (err) reject(err);
                      else resolve();
                    }
                  );
                }
              });
            }
          }
        );
      }
    });
  });
}

if (require.main === module) {
  initializeDatabase()
    .then(() => console.log('Database initialization completed.'))
    .catch((error) => console.error('Database initialization failed:', error));
} else {
  module.exports = { initializeDatabase };
}