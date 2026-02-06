const transformGoogleBook = (data) => ({
  id: data.id,
  title: data.volumeInfo.title,
  authors: data.volumeInfo.authors || ['Unknown author'],
  publisher: data.volumeInfo.publisher || 'Unknown publisher',
  publishedDate: data.volumeInfo.publishedDate,
  description: data.volumeInfo.description || 'No description available',
  isbn13: data.volumeInfo.industryIdentifiers ? data.volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_13')?.identifier : 'N/A',
  pageCount: data.volumeInfo.pageCount || 0,
  categories: data.volumeInfo.categories || ['Uncategorized'],
  language: data.volumeInfo.language || 'N/A',
  images: {
    smallThumbnail: data.volumeInfo.imageLinks?.smallThumbnail || null,
    thumbnail: data.volumeInfo.imageLinks?.thumbnail || null,
    small: data.volumeInfo.imageLinks?.small || null,
    medium: data.volumeInfo.imageLinks?.medium || null,
    large: data.volumeInfo.imageLinks?.large || null,
    extraLarge: data.volumeInfo.imageLinks?.extraLarge || null,
  },
});

export default transformGoogleBook;