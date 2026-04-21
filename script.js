// GET SLUG FROM URL
function getSlugFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('slug');
}

// NORMALIZE STRINGS
function normalize(str) {
  return str?.toLowerCase().trim();
}

// ⭐ STAR FUNCTION
function getStarRating(rating) {
  if (!rating) return "";

  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;

  let stars = "⭐".repeat(fullStars);

  if (halfStar) {
    stars += "✨";
  }

  return stars;
}

// LOAD BOOK + ENTRIES
async function loadBook() {
  const slug = getSlugFromURL();

  try {
    const [booksRes, entriesRes] = await Promise.all([
      fetch('/api/books'),
      fetch('/api/entries')
    ]);

    const booksData = await booksRes.json();
    const entriesData = await entriesRes.json();

    let books = booksData.records.map(r => r.fields);
    const entries = entriesData.records.map(r => r.fields);

    // ✅ SORT BOOKS BY DATE (same as homepage)
    books.sort((a, b) => {
      const dateA = new Date(a["Date Read"] || 0);
      const dateB = new Date(b["Date Read"] || 0);
      return dateB - dateA;
    });

    // ✅ FIND CURRENT BOOK (using slug safely)
    const bookIndex = books.findIndex(b =>
      normalize(b.Slug) === normalize(slug) ||
      normalize(b.Title) === normalize(decodeURIComponent(slug))
    );

    const book = books[bookIndex];

    if (!book) {
      console.error("Book not found:", slug);
      return;
    }

    // ⭐ CALCULATE RATING
    const bookEntries = entries.filter(e =>
      e.BookSlug &&
      (
        normalize(e.BookSlug) === normalize(book.Slug) ||
        normalize(e.BookSlug) === normalize(book.Title)
      )
    );

    const ratings = bookEntries
      .map(e => Number(e.Rating))
      .filter(r => !isNaN(r));

    let avg = null;

    if (ratings.length > 0) {
      avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      avg = Math.round(avg * 10) / 10;
    }

    renderBook(book, avg);

    renderEntries(bookEntries);

    // ✅ FIXED NEXT / PREVIOUS (chronological)
    const prevBook = books[bookIndex + 1]; // older
    const nextBook = books[bookIndex - 1]; // newer

    const navContainer = document.getElementById('book-nav');

    if (navContainer) {
      navContainer.innerHTML = `
        ${prevBook ? `<a href="book.html?slug=${prevBook.Slug}" class="nav-link">← Previous</a>` : ''}
        <a href="books.html" class="nav-link">Back to all books</a>
        ${nextBook ? `<a href="book.html?slug=${nextBook.Slug}" class="nav-link">Next →</a>` : ''}
      `;
    }

  } catch (err) {
    console.error("Error loading book:", err);
  }
}

// RENDER BOOK
function renderBook(book, avgRating) {
  const container = document.getElementById('book-container');

  container.innerHTML = `
    <div class="book-detail">
      <img src="${book.BookCover}" alt="${book.Title}" />

      <div class="book-info">
        <h1>${book.Title}</h1>
        <p class="author">${book.Author}</p>

        ${
          book["Date Read"]
            ? `<p><strong>Book Club Pick:</strong> ${new Date(book["Date Read"]).toLocaleString("en-US", { month: "long", year: "numeric" })}</p>`
            : ''
        }

        ${
          book["GoodreadsRating"]
            ? `<p><strong>Goodreads Rating:</strong> ⭐ ${book["GoodreadsRating"]}</p>`
            : ''
        }

        ${
          avgRating
            ? `<p><strong>Book Club Rating:</strong> ${getStarRating(avgRating)}</p>`
            : ''
        }
      </div>
    </div>
  `;
}

// RENDER ENTRIES
function renderEntries(entries) {
  const container = document.getElementById('entries-container');

  if (!container) return;

  if (entries.length === 0) {
    container.innerHTML = `<p>No entries yet.</p>`;
    return;
  }

  container.innerHTML = entries.map(e => `
    <div class="entry">
      <h4>${e.MemberName}</h4>
      <p>${getStarRating(Number(e.Rating))}</p>
      <p>${e.Note || ''}</p>
    </div>
  `).join('');
}

// INIT
document.addEventListener('DOMContentLoaded', loadBook);