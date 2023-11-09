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

app.post('/api/borrow-book', async (req, res) => {
  const books = database.collection('books');
  const borrowed = database.collection('borrowed');

  const { uid, returnDate, bookId } = req.body;

  const borrowedCursor = borrowed.find({ uid: uid });
  const borrowedResult = await borrowedCursor.toArray();

  let isAlreadyBorrowed = false;

  borrowedResult.forEach(b => {
    if (b.uid === uid && b.bookId === bookId) {
      isAlreadyBorrowed = true;
      res.status(400).json({ message: 'You already borrowed this book' });
    }
  })

  if (isAlreadyBorrowed) return;

  try {
    await borrowed.insertOne({ uid, bookId, date: new Date(), returnDate });
  } catch (error) {
    res.status(400).json({ message: 'Failed to update' });
  }

  const booksCursor = books.find({ _id: new ObjectId(bookId) });
  const booksResult = await booksCursor.toArray();


  const { quantity } = booksResult[0];
  const newQuantity = quantity - 1;
  const update = await books.updateOne({ _id: new ObjectId(bookId) }, { $set: { quantity: newQuantity } });
  res.json(update);

})
