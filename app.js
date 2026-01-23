import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import booksRouter from './routes/books.js';
import libraryRouter from './routes/library.js';

const port = process.env.PORT || 3000;

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors())

app.use('/auth', authRouter)
app.use('/books', booksRouter)
app.use('/library', libraryRouter)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})