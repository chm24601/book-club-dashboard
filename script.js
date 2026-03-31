let allBooks = [];
let allEntries = [];

// FORMAT DATE → "March 2026"
function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  return date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

// LOAD DATA
async function loadData() {
  try {
    const booksRes = await fetch('/api/books');
    const booksData = await booksRes.json();

    allBooks = booksData.records.map(r => r.fields);

    // ✅ SORT BY DATE (NEWEST FIRST)
    allBooks.sort((a, b) => {
      const dateA = new Date(a["Date Read"] || 0);
      const dateB = new Date(b["Date Read"] || 0);
      return dateB - dateA;
    });

    renderBooks(allBooks);

  } catch (error) {
    console.error('Error loading books:', error);
  }
}

// SAFE SLUG
function getSlug(book) {
  return encodeURIComponent(book.Title);
}

// RENDER BOOKS
function renderBooks(books) {
  const container = document.getElementById('books-container');
  container.innerHTML = '';

  // ⭐ FIND CURRENT BOOK
  const currentBook = books.find(b => b.Current);
  const otherBooks = books.filter(b => !b.Current);

  // ⭐ RENDER CURRENT PICK
  if (currentBook) {
    const currentDiv = document.createElement('div');
    currentDiv.className = 'current-book';

    currentDiv.innerHTML = `
      <h2 class="section-header">📖 Current Pick</h2>

      <div class="book-card featured">
        <div class="card-content">
          <img src="${currentBook.BookCover}" alt="${currentBook.Title}" />
          <div class="text">
            <h3>${currentBook.Title}</h3>
            <p>${currentBook.Author}</p>

            ${
              currentBook["Date Read"]
                ? `<p class="date-read">📚 ${formatDate(currentBook["Date Read"])}</p>`
                : ''
            }

          </div>
        </div>
      </div>
    `;

    currentDiv.addEventListener('click', () => {
      window.location.href = `book.html?slug=${getSlug(currentBook)}`;
    });

    container.appendChild(currentDiv);
  }

  // 📚 HEADER FOR REST
  const listHeader = document.createElement('h2');
  listHeader.className = 'section-header';
  listHeader.innerText = 'All Books';
  container.appendChild(listHeader);

  // 📚 RENDER OTHER BOOKS
  otherBooks.forEach(book => {
    const slug = getSlug(book);

    const div = document.createElement('div');
    div.className = 'book-card';

    div.innerHTML = `
      <div class="card-content">
        <img src="${book.BookCover}" alt="${book.Title}" />
        <div class="text">
          <h3>${book.Title}</h3>
          <p>${book.Author}</p>

          ${
            book["Date Read"]
              ? `<p class="date-read">📚 ${formatDate(book["Date Read"])}</p>`
              : ''
          }

        </div>
      </div>
    `;

    div.addEventListener('click', () => {
      window.location.href = `book.html?slug=${slug}`;
    });

    container.appendChild(div);
  });
}

// SEARCH (unchanged, but still works perfectly)
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