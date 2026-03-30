let allBooks = [];
let allEntries = [];

// LOAD DATA
async function loadData() {
  try {
    const booksRes = await fetch('/api/books');
    const booksData = await booksRes.json();

    allBooks = booksData.records.map(r => r.fields);

    renderBooks(allBooks);

  } catch (error) {
    console.error('Error loading books:', error);
  }
}

// SAFE SLUG (STANDARDIZED)
function getSlug(book) {
  return encodeURIComponent(book.Title);
}

// RENDER BOOKS
function renderBooks(books) {
  const container = document.getElementById('books-container');
  container.innerHTML = '';

  books.forEach(book => {
    const slug = getSlug(book);

    const div = document.createElement('div');
    div.className = 'book-card';

    div.innerHTML = `
      <div class="card-content">
        <img src="${book.BookCover}" alt="${book.Title}" />
        <div class="text">
          <h3>${book.Title}</h3>
          <p>${book.Author}</p>
        </div>
      </div>
    `;

    div.addEventListener('click', () => {
      window.location.href = `book.html?slug=${slug}`;
    });

    container.appendChild(div);
  });
}

// SEARCH (WORKS 100%)
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const value = e.target.value.toLowerCase();

      const filtered = allBooks.filter(book =>
        book.Title.toLowerCase().includes(value) ||
        book.Author.toLowerCase().includes(value)
      );

      renderBooks(filtered);
    });
  }

  loadData();
});