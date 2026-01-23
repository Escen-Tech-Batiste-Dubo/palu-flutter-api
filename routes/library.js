import {Router} from "express";
import database from '../configuration/database.js';
import jwt from "jsonwebtoken";
import transformGoogleBook from '../utils/transformGoogleBook.js';

const JWT_SECRET = process.env.JWT_SECRET;

const libraryRouter = Router()

libraryRouter.get('/', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const userId = decoded.id;
  const [books] = await database.query('SELECT books.id, books.title, books.authors, books.publisher, books.published_date, books.description, books.isbn13, books.page_count, books.categories, books.language, books.images, users_books.status, users_books.current_page FROM books LEFT JOIN users_books ON books.id = users_books.book_id WHERE users_books.user_id = ?', [userId]);
  res.json({
    books: books.map(book => ({
      ...book,
      authors: book.authors ? JSON.parse(book.authors) : [],
      categories: book.categories ? JSON.parse(book.categories) : [],
      images: book.images ? JSON.parse(book.images) : {},
    }))
  });
})

libraryRouter.post('/:id', async (req, res) => {
  try {
    // 1. Validate token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // 3. Validate request body
    const { status, current_page } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['WISHLIST', 'POSSESSION'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const currentPage = current_page || 0;
    const bookId = req.params.id;
    const userId = decoded.id;

    // 4. Check if book exists in database
    const [existingBooks] = await database.query('SELECT id FROM books WHERE id = ?', [bookId]);

    // 5. If book doesn't exist, fetch from Google Books API and insert
    if (existingBooks.length === 0) {
      try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes/${bookId}`);
        if (!response.ok) {
          return res.status(404).json({ error: 'Book not found in Google Books API' });
        }
        const data = await response.json();
        const book = transformGoogleBook(data);

        await database.query(
          'INSERT INTO books (id, title, authors, publisher, published_date, description, isbn13, page_count, categories, language, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [book.id, book.title, JSON.stringify(book.authors), book.publisher, book.publishedDate, book.description, book.isbn13, book.pageCount, JSON.stringify(book.categories), book.language, JSON.stringify(book.images)]
        );
        console.log(`Book ${bookId} added to database`);
      } catch (error) {
        console.error('Error fetching or inserting book:', error);
        return res.status(500).json({ error: 'Failed to add book from Google Books API' });
      }
    }

    // 6. Add book to user's library
    try {
      const [result] = await database.query(
        'INSERT INTO users_books (user_id, book_id, status, current_page) VALUES (?, ?, ?, ?)',
        [userId, bookId, status, currentPage]
      );

      if (result.affectedRows === 0) {
        return res.status(400).json({ error: 'Failed to add book to library' });
      }

      res.status(201).json({ message: 'Book added to your library', bookId, status });
    } catch (error) {
      // Handle duplicate entry (user already has this book)
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'This book is already in your library' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in POST /books/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
})

libraryRouter.put('/:id', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const bookId = req.params.id;
  const userId = decoded.id;
  let { status, current_page } = req.body;

  if (status === 'WISHLIST' && current_page) {
    current_page = 0
  }

  // check that current_page is a non-negative integer and less than or equal to page_count
  if (current_page !== undefined) {
    if (!Number.isInteger(current_page) || current_page < 0) {
      return res.status(400).json({error: 'Current page must be a non-negative integer'});
    }

    let [book] = await database.query('SELECT page_count FROM books WHERE id = ?', [bookId]);
    if (current_page > book.page_count) {
      return res.status(400).json({error: 'Current page cannot be greater than total page count'});
    }
  }

  database.query('UPDATE users_books SET status = ?, current_page = ? WHERE user_id = ? AND book_id = ?', [status, current_page, userId, bookId])
    .then(([result]) => {
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Book not found in your library' });
      }
      res.json({ message: 'Book updated in your library', bookId, status, current_page });
    })
    .catch((error) => {
      console.error('Error updating book in library:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    })
})

libraryRouter.delete('/:id', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const bookId = req.params.id;
  const userId = decoded.id;

  database.query('DELETE FROM users_books WHERE user_id = ? AND book_id = ?', [userId, bookId])
    .then(([result]) => {
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Book not found in your library' });
      }
      res.json({ message: 'Book removed from your library', bookId });
    })
})

export default libraryRouter;