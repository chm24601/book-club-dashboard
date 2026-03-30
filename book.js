async function loadBookDetails() {
  const container = document.getElementById('book-detail-container');

  try {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');

    if (!slug) {
      container.innerHTML = '<p>No book selected.</p>';
      return;
    }

    const response = await fetch('/api/books');
    const data = await response.json();

    if (!data.records || !Array.isArray(data.records)) {
      container.innerHTML = '<p>No books found.</p>';
      return;
    }

    const record = data.records.find((item) => item.fields.Slug === slug);

    if (!record) {
      container.innerHTML = '<p>Book not found.</p>';
      return;
    }

    const book = record.fields;
    const coverUrl = getCoverUrl(book.BookCover);

    container.innerHTML = `
      <div class="book-detail-card">
        <img class="book-detail-cover" src="${coverUrl}" alt="${book.Title || 'Book cover'}" />

        <div class="book-detail-text">
          <h2>${book.Title || 'Untitled'}</h2>
          <p class="book-author">${book.Author || ''}</p>

          <section class="book-section">
            <h3>Discussion</h3>
            <p>This is where your ratings and running log will go next.</p>
          </section>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading book details:', error);
    container.innerHTML = '<p>There was a problem loading this book.</p>';
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

loadBookDetails();