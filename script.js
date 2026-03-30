async function loadBooks() {
  try {
    const response = await fetch('/api/books');
    const data = await response.json();

    const container = document.getElementById('books-container');
    container.innerHTML = '';

    if (!data.records || !Array.isArray(data.records)) {
      container.innerHTML = '<p>No books found.</p>';
      return;
    }

    data.records.forEach((record) => {
      const book = record.fields;
      const coverUrl = getCoverUrl(book.BookCover);
      const slug = book.Slug || '';

      const card = document.createElement('a');
      card.className = 'book-card';
      card.href = `book.html?slug=${encodeURIComponent(slug)}`;

      card.innerHTML = `
        <div class="card-content">
          <img src="${coverUrl}" alt="${book.Title || 'Book cover'}" />
          <div class="text">
            <h2>${book.Title || 'Untitled'}</h2>
            <p>${book.Author || ''}</p>
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading books:', error);
    const container = document.getElementById('books-container');
    container.innerHTML = '<p>There was a problem loading the books.</p>';
  }
}

function getCoverUrl(bookCoverField) {
  if (!bookCoverField) {
    return 'https://via.placeholder.com/200x300?text=No+Cover';
  }

  if (typeof bookCoverField === 'string') {
    return bookCoverField;
  }

  if (Array.isArray(bookCoverField) && bookCoverField.length > 0) {
    return bookCoverField[0].url;
  }

  return 'https://via.placeholder.com/200x300?text=No+Cover';
}

loadBooks();
