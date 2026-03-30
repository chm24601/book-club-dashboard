let allBooks = [];
let allEntries = [];

// LOAD DATA
async function loadData() {
  try {
    const [booksRes, entriesRes] = await Promise.all([
      fetch('/api/books'),
      fetch('/api/entries')
    ]);

    const booksData = await booksRes.json();
    const entriesData = await entriesRes.json();

    allBooks = booksData.records.map(r => r.fields);
    allEntries = entriesData.records.map(r => r.fields);

    renderBooks(allBooks);

  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// CALCULATE AVERAGE RATING
function getAverageRating(slug) {
  const entries = allEntries.filter(e => e.BookSlug === slug);

  if (entries.length === 0) return null;

  const total = entries.reduce((sum, e) => sum + Number(e.Rating || 0), 0);
  return (total / entries.length).toFixed(1);
}

// SAFE SLUG HELPER 🔥
function getSlug(book) {
  return book.Slug || book.slug || book.BookSlug || encodeURIComponent(book.Title);
}

// RENDER BOOKS
function renderBooks(books) {
  const container = document.getElementById('books-container');
  container.innerHTML = '';

  books.forEach(book => {
    const slug = getSlug(book);
    const avgRating = getAverageRating(slug);

    const div = document.createElement('div');
    div.className = 'book-card';

    div.innerHTML = `
      <div class="card-content">
        <img src="${book.BookCover}" alt="${book.Title}" />
        
        <div class="text">
          <h3>${book.Title}</h3>
          <p>${book.Author}</p>

          <div class="rating">
            ${
              avgRating 
              ? `⭐ ${avgRating}` 
              : `<span class="no-rating">No ratings yet</span>`
            }
          </div>
        </div>
      </div>
    `;

    // CLICK HANDLER (FIXED)
    div.addEventListener('click', () => {
      window.location.href = `book.html?slug=${slug}`;
    });

    container.appendChild(div);
  });
}

// SEARCH
document.getElementById('search-input').addEventListener('input', (e) => {
  const value = e.target.value.toLowerCase();

  const filtered = allBooks.filter(book =>
    book.Title.toLowerCase().includes(value) ||
    book.Author.toLowerCase().includes(value)
  );

  renderBooks(filtered);
});

// SORT
document.getElementById('sort-select').addEventListener('change', (e) => {
  let sorted = [...allBooks];

  if (e.target.value === 'title-asc') {
    sorted.sort((a, b) => a.Title.localeCompare(b.Title));
  }

  if (e.target.value === 'title-desc') {
    sorted.sort((a, b) => b.Title.localeCompare(a.Title));
  }

  if (e.target.value === 'rating-desc') {
    sorted.sort((a, b) => {
      return (getAverageRating(getSlug(b)) || 0) - (getAverageRating(getSlug(a)) || 0);
    });
  }

  renderBooks(sorted);
});

// INIT
loadData();