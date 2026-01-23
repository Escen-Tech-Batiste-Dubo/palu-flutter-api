import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './routes/auth.js';
import booksRouter from './routes/books.js';
import libraryRouter from './routes/library.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 3000;

dotenv.config();

const app = express();

app.use(express.json());

// Serve static files for profile pictures
app.use('/profile_pictures', express.static(path.join(__dirname, 'profile_pictures')));
app.use(cors())

app.use('/auth', authRouter)
app.use('/books', booksRouter)
app.use('/library', libraryRouter)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})