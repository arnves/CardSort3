const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-password'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Enable pre-flight requests for all routes
app.options('*', cors(corsOptions));

// Apply CORS to all routes
app.use(cors(corsOptions));

app.use(express.json());

// Middleware to set CORS headers for all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-password');
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

// Database setup
const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Card Sorting Tool API' });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const userRoutes = require('./routes/users');
const sessionRoutes = require('./routes/sessions');
const cardRoutes = require('./routes/cards');
const cardSetRoutes = require('./routes/card-sets');

app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/card-sets', cardSetRoutes);

const externalSortingRoutes = require('./routes/externalSorting');

// Add this line after the existing route definitions
app.use('/api/external-sorting', externalSortingRoutes);
