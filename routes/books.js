import { Router } from 'express';
import transformGoogleBook from "../utils/transformGoogleBook.js";
import database from '../configuration/database.js';

const API_KEY = process.env.API_KEY;

const booksRouter = Router();

booksRouter.get('/', async (req, res) => {
  try {
    const searchTerm = req.query.q;

    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
    }

    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchTerm)}&key=${API_KEY}`);
    const data = await response.json();

    if (!response.ok) {
      console.error(response)
      throw new Error('Failed to fetch books');
    }

    if (!data.items || data.items.length === 0) {
      return res.json({ books: [] });
    }
    const books = data.items.map(book => transformGoogleBook(book));
    for (const book of books) {
      await database.query(
        'INSERT INTO books (id, title, authors, publisher, published_date, description, isbn13, page_count, categories, language, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title), authors=VALUES(authors), publisher=VALUES(publisher), published_date=VALUES(published_date), description=VALUES(description), isbn13=VALUES(isbn13), page_count=VALUES(page_count), categories=VALUES(categories), language=VALUES(language), images=VALUES(images)',
        [book.id, book.title, JSON.stringify(book.authors), book.publisher, book.publishedDate, book.description, book.isbn13, book.pageCount, JSON.stringify(book.categories), book.language, JSON.stringify(book.images)]
      );
    }

    res.json({ books });
  } catch (error) {
    console.error('Error searching books:', error);
    res.status(500).json({ error: 'Failed to search books' });
  }
})

booksRouter.get('/search', async (req, res) => {
  console.log('search')
  try {
    const searchTerm = decodeURI(req.query.q).replace(/\+/g, ' ');

    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
    }

    const data = await database.query('SELECT * FROM books WHERE title LIKE ?', [`%${searchTerm}%`]);
    const books = data[0].map(book => ({
      ...book,
      authors: book.authors ? JSON.parse(book.authors) : [],
      categories: book.categories ? JSON.parse(book.categories) : [],
      images: book.images ? JSON.parse(book.images) : {},
    }))

    res.json({ books });
  } catch (error) {
    console.error('Error searching books:', error);
    res.status(500).json({ error: 'Failed to search books' });
  }
})

booksRouter.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const localData = await database.query('SELECT * FROM books WHERE id = ?', [id]);
    if (localData[0].length > 0) {
      const book = {
        ...localData[0][0],
        authors: localData[0][0].authors ? JSON.parse(localData[0][0].authors) : [],
        categories: localData[0][0].categories ? JSON.parse(localData[0][0].categories) : [],
        images: localData[0][0].images ? JSON.parse(localData[0][0].images) : {},
      };
      return res.json({ book });
    }

    const response = await fetch(`https://www.googleapis.com/books/v1/volumes/${id}?key=${API_KEY}`);
    if (!response.ok) {
      console.error(response)
      return res.status(404).json({ error: 'Book not found' });
    }
    const data = await response.json();
    const book = transformGoogleBook(data);
    res.json({ book });
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
})

export default booksRouter;