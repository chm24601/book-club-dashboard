// FORMAT DATE → "March 2026"
function normalize(str) {
  return str?.toLowerCase().trim();
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  return date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

// ⭐ STAR FUNCTION (supports .5)
function getStarRating(rating) {
  if (!rating) return "";

  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;

  let stars = "⭐".repeat(fullStars);
  if (halfStar) stars += "✨";

  return stars;
}

// GET SLUG FROM URL
function getSlugFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('slug');
}

// NORMALIZE STRINGS
function normalize(str) {
  return str?.toLowerCase().trim();
}

// 🔥 UPDATED NAV (PREV + NEXT)
function getBookNavigation(books, currentSlug) {
  const decodedSlug = decodeURIComponent(currentSlug);

  const currentIndex = books.findIndex(b =>
    normalize(b.Title) === normalize(decodedSlug)
  );

  if (currentIndex === -1) return {};

  const prevIndex = (currentIndex - 1 + books.length) % books.length;
  const nextIndex = (currentIndex + 1) % books.length;

  return {
    prev: encodeURIComponent(books[prevIndex].Title),
    next: encodeURIComponent(books[nextIndex].Title)
  };
}

// LOAD BOOK + ENTRIES
async function loadBook() {
  const slug = getSlugFromURL();

  try {
    const booksRes = await fetch('/api/books');
    const booksData = await booksRes.json();

    const books = booksData.records.map(r => r.fields);

    // 🔥 USE NEW NAV
    const { prev, next } = getBookNavigation(books, slug);

    // FIND CURRENT BOOK
    const book = books.find(b =>
      normalize(b.Title) === normalize(decodeURIComponent(slug))
    );

    if (!book) {
      console.error("Book not found:", slug);
      return;
    }

    // LOAD ENTRIES
    let entries = [];

    try {
      const entriesRes = await fetch('/api/entries');

      if (!entriesRes.ok) throw new Error('Entries failed');

      const entriesData = await entriesRes.json();

      entries = entriesData.records
        ? entriesData.records.map(r => r.fields)
        : [];

    } catch (err) {
      console.warn("Entries failed to load");
    }

    // FILTER ENTRIES
    const decodedSlug = decodeURIComponent(slug);

    const bookEntries = entries.filter(e =>
      e.BookSlug &&
      normalize(e.BookSlug) === normalize(decodedSlug)
    );

    // CALCULATE AVERAGE
    const ratings = bookEntries
      .map(e => Number(e.Rating))
      .filter(r => !isNaN(r));

    let avg = null;

    if (ratings.length > 0) {
      avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      avg = Math.round(avg * 10) / 10;
    }

    // 🔥 RENDER FIRST
    renderBook(book, avg);

    // 🔥 SET LINKS AFTER RENDER (THIS FIXES CLICK ISSUE)
    const prevLink = document.getElementById("prev-book-link");
    const nextLink = document.getElementById("next-book-link");

    if (prev && prevLink) {
      prevLink.href = `book.html?slug=${prev}`;
    }

    if (next && nextLink) {
      nextLink.href = `book.html?slug=${next}`;
    }

    renderEntries(bookEntries);

  } catch (error) {
    console.error("Error loading book:", error);
  }
}

// 🔥 UPDATED NAV LAYOUT (OPTION 2)
function renderBook(book, avg) {
  const container = document.getElementById('book-container');

  container.innerHTML = `
    <div class="top-nav">
      <a href="books.html">← Back to all books</a>

      <div class="nav-right">
        <a id="prev-book-link">← Previous</a>
        <a id="next-book-link">Next →</a>
      </div>
    </div>

    <div class="book-detail">
      <img src="${book.BookCover}" alt="${book.Title}" />

      <div class="book-info">
        <h2>${book.Title}</h2>
        <p>${book.Author}</p>

        ${
          book.Current
            ? `<p><strong>📖 Current Pick</strong></p>`
            : ''
        }

        ${
          book["Date Read"]
            ? `<p><strong>Book Club Pick:</strong> ${formatDate(book["Date Read"])}</p>`
            : ''
        }

        ${
          book.GoodreadsRating
            ? `<p><strong>Goodreads Rating:</strong> ⭐ ${book.GoodreadsRating}</p>`
            : ''
        }

        ${
          avg
            ? `<p class="club-rating"><strong>Book Club Rating:</strong> ${getStarRating(avg)}</p>`
            : ''
        }
      </div>
    </div>
  `;
}

// RENDER ENTRIES (UNCHANGED)
function renderEntries(entries) {
  const container = document.getElementById('entries-container');

  container.innerHTML = '';

  if (entries.length === 0) {
    container.innerHTML = `<p>No thoughts yet — be the first!</p>`;
    return;
  }

  entries.forEach(entry => {
    const div = document.createElement('div');
    div.className = 'entry';

    div.innerHTML = `
      <h4>${entry.MemberName}</h4>
      ${
        entry.Rating
          ? `<p>${getStarRating(Number(entry.Rating))}</p>`
          : ''
      }
      <p>${entry.Note || ''}</p>
      ${
        entry.Link
          ? `<p><a href="${entry.Link}" target="_blank">View link</a></p>`
          : ''
      }
    `;

    container.appendChild(div);
  });
}

// SUBMIT FORM (UNCHANGED)
document.getElementById('entry-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const slug = getSlugFromURL();

  const data = {
    bookSlug: slug,
    memberName: document.getElementById('name').value,
    rating: document.getElementById('rating').value,
    note: document.getElementById('note').value,
    link: document.getElementById('link').value
  };

  try {
    const res = await fetch('/api/submit-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (!res.ok) {
      alert(result.error || 'Something went wrong');
      return;
    }

    document.getElementById('entry-form').reset();

    loadBook();

  } catch (error) {
    console.error("Submit error:", error);
  }
});

// INIT
loadBook();