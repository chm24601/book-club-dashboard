async function loadBooks() {
  const response = await fetch('/api/books');
  const data = await response.json();

  const container = document.getElementById('books-container');

  data.records.forEach(record => {
    const book = record.fields;

    const div = document.createElement('div');
    div.className = 'book-card';

    div.innerHTML = `
      <h2>${book.Title || 'No Title'}</h2>
      <p><strong>Author:</strong> ${book.Author || 'Unknown'}</p>
      <p><strong>Published Year:</strong> ${book.PublishedYear || 'N/A'}</p>
      <p><strong>GoodReads Rating:</strong> ${book.GoodreadsRating || 'N/A'}</p>
      <p>${book.Notes || ''}</p>
    `;

    container.appendChild(div);
  });
}

loadBooks();
