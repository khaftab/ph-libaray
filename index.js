const express = require('express');
const app = express();
require('dotenv').config();
const { db_client, database } = require('./db_connect');

// use cors
const cors = require('cors');
const { ObjectId } = require('mongodb');
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Server listening on port 3000');
});

app.get('/api/get-books/:category', async (req, res) => {
  const books = database.collection('books');
  const { category } = req.params;

  const cursor = books.find({ category });
  const results = await cursor.toArray();

  res.json(results);
});

app.get('/api/get-book/:id', async (req, res) => {
  const books = database.collection('books');
  const { id } = req.params;

  const cursor = books.find({ _id: new ObjectId(id) });
  const results = await cursor.toArray();

  res.json(results);
});