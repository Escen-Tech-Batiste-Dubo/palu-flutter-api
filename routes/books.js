import { Router } from 'express';
import transformGoogleBook from "../utils/transformGoogleBook.js";

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
    res.json({ books });
  } catch (error) {
    console.error('Error searching books:', error);
    res.status(500).json({ error: 'Failed to search books' });
  }
})

booksRouter.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;

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