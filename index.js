const express = require('express');
const app = express();
require('dotenv').config();
const { database } = require('./db_connect');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// use cors
const cors = require('cors');
const { ObjectId } = require('mongodb');
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const verifyToken = ((req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: 'Access Denied (token not found)' });

  try {
    const verified = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).send({ message: 'Invalid Token (token expired / altered)' });
  }
});


app.listen(PORT, () => {
  console.log('Server listening on port 3000');
});

app.post('/api/jwt', (req, res) => {
  const { uid } = req.body;
  const token = jwt.sign({ uid }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

  res
    .cookie('token', token, { httpOnly: true, secure: false, sameSite: `${process.env.NODE_ENV === 'production' ? 'none' : 'lax'}` })
    .send({ success: true })
})

app.get('/api/get-books/:category', async (req, res) => {
  const books = database.collection('books');
  const { category } = req.params;
  if (category === 'all') {
    const cursor = books.find();
    const results = await cursor.toArray();
    return res.json(results);
  }
  const cursor = books.find({ category });
  const results = await cursor.toArray();

  res.json(results);
});

app.get('/api/get-book/:id', verifyToken, async (req, res) => {
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

  const booksCursor = books.find({ _id: new ObjectId(bookId) });
  const booksResult = await booksCursor.toArray();

  const { quantity } = booksResult[0];
  const newQuantity = quantity - 1;

  booksResult[0].quantity = newQuantity;
  booksResult[0].bookId = booksResult[0]._id;
  delete booksResult[0]._id;

  let isAlreadyBorrowed = false;

  borrowedResult.forEach(b => {
    if (b.uid === uid && b.bookId === bookId) {
      isAlreadyBorrowed = true;
      res.status(400).json({ message: 'You already borrowed this book' });
    }
  })

  if (isAlreadyBorrowed) return;

  try {
    await borrowed.insertOne({ uid, ...booksResult[0], date: new Date(), returnDate });
  } catch (error) {
    res.status(400).json({ message: 'Failed to update' });
  }



  const update = await books.updateOne({ _id: new ObjectId(bookId) }, { $set: { quantity: newQuantity } });
  res.json(update);

})

app.get('/api/get-borrowed/:uid', async (req, res) => {
  const borrowed = database.collection('borrowed');
  const { uid } = req.params;

  const cursor = borrowed.find({ uid: uid });
  const results = await cursor.toArray();


  res.json(results);
})

app.post('/api/add-book', verifyToken, async (req, res) => {
  const books = database.collection('books');
  const { category, name, image, author, short_description, rating, quantity, content } = req.body;
  try {
    const result = await books.insertOne({ category, name, image, author, short_description, rating, quantity, content });
    res.json(result);
  } catch (error) {
    res.status(500).send({ message: 'Error adding product' });
  }
})

app.put('/api/update-book/:id', verifyToken, async (req, res) => {
  const books = database.collection('books');
  const { id } = req.params;
  const { category, name, image, author, short_description, rating, quantity, content } = req.body;
  try {
    const result = await books.updateOne({ _id: new ObjectId(id) }, { $set: { category, name, image, author, short_description, rating, quantity, content } });
    res.json(result);
  } catch (error) {
    res.status(500).send({ message: 'Error updating product' });
  }
})

app.get('/api/return-book/:id', async (req, res) => {
  const borrowed = database.collection('borrowed');
  const books = database.collection('books');
  const { id } = req.params;

  const cursor = borrowed.find({ _id: new ObjectId(id) });
  const results = await cursor.toArray();

  const { bookId } = results[0];

  const booksCursor = books.find({ _id: new ObjectId(bookId) });
  const booksResult = await booksCursor.toArray();

  const newQuantity = booksResult[0].quantity + 1;

  try {
    await borrowed.deleteOne({ _id: new ObjectId(id) });
  } catch (error) {
    res.status(400).json({ message: 'Failed to update' });
  }

  const update = await books.updateOne({ _id: new ObjectId(bookId) }, { $set: { quantity: newQuantity } });
  res.json(update);
})
