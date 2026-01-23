import { Router } from "express";
import database from '../configuration/database.js';
import authenticateToken from '../middleware/authenticateToken.js';
import transformGoogleBook from '../utils/transformGoogleBook.js';



const libraryRouter = Router()

libraryRouter.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [books] = await database.query('SELECT books.id, books.title, books.authors, books.publisher, books.published_date, books.description, books.isbn13, books.page_count, books.categories, books.language, books.images, users_books.status, users_books.current_page FROM books LEFT JOIN users_books ON books.id = users_books.book_id WHERE users_books.user_id = ?', [userId]);
    res.json({
      books: books.map(book => ({
        ...book,
        authors: book.authors ? JSON.parse(book.authors) : [],
        categories: book.categories ? JSON.parse(book.categories) : [],
        images: book.images ? JSON.parse(book.images) : {},
      }))
    });
  } catch (error) {
    console.error('Error fetching user library:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
})

libraryRouter.post('/:id', authenticateToken, async (req, res) => {
  try {
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
    const userId = req.user.id;

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
      console.error('Error adding book to library:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } catch (error) {
    console.error('Error in POST /library/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
})

libraryRouter.put('/:id', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;
    let { status, current_page } = req.body;

    if (status === 'WISHLIST' && current_page) {
      current_page = 0
    }

    // check that current_page is a non-negative integer and less than or equal to page_count
    if (current_page !== undefined) {
      if (!Number.isInteger(current_page) || current_page < 0) {
        return res.status(400).json({ error: 'Current page must be a non-negative integer' });
      }

      const [books] = await database.query('SELECT page_count FROM books WHERE id = ?', [bookId]);
      if (books.length === 0) {
        return res.status(404).json({ error: 'Book not found' });
      }

      if (current_page > books[0].page_count) {
        return res.status(400).json({ error: 'Current page cannot be greater than total page count' });
      }
    }

    const [result] = await database.query('UPDATE users_books SET status = ?, current_page = ? WHERE user_id = ? AND book_id = ?', [status, current_page, userId, bookId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Book not found in your library' });
    }
    res.json({ message: 'Book updated in your library', bookId, status, current_page });
  } catch (error) {
    console.error('Error updating book in library:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
})

libraryRouter.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;

    const [result] = await database.query('DELETE FROM users_books WHERE user_id = ? AND book_id = ?', [userId, bookId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Book not found in your library' });
    }
    res.json({ message: 'Book removed from your library', bookId });
  } catch (error) {
    console.error('Error deleting book from library:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
})

export default libraryRouter;