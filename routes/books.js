import { Router } from 'express';
import transformGoogleBook from "../utils/transformGoogleBook.js";

const booksRouter = Router();

booksRouter.get('/', (req, res) => {
  const searchTerm = req.query.q;

  if (!searchTerm) {
    return res.status(400).json({ error: 'Search term is required' });
  }

  fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchTerm)}`)
    .then(response => response.json())
    .then(data => {
      if (!data.items || data.items.length === 0) {
        return res.json({ books: [] });
      }
      const books = data.items.map(book => transformGoogleBook(book));
      res.json({ books });
    })
    .catch(error => {
      console.error('Error searching books:', error);
      res.status(500).json({ error: 'Failed to search books' });
    });
})

booksRouter.get('/:id', (req, res) => {
  const id = req.params.id;

  fetch(`https://www.googleapis.com/books/v1/volumes/${id}`)
    .then(response => {
      if (!response.ok) {
        return res.status(404).json({ error: 'Book not found' });
      }
      return response.json();
    })
    .then(data => {
      const book = transformGoogleBook(data);
      res.json({ book });
    })
    .catch(error => {
      console.error('Error fetching book:', error);
      res.status(500).json({ error: 'Failed to fetch book' });
    });
})

export default booksRouter;