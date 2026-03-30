// GET SLUG FROM URL
function getSlugFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('slug');
}

// NORMALIZE STRINGS (CRITICAL FOR MATCHING)
function normalize(str) {
  return str?.toLowerCase().trim();
}

// LOAD BOOK + ENTRIES
async function loadBook() {
  const slug = getSlugFromURL();

  try {
    const booksRes = await fetch('/api/books');
    const booksData = await booksRes.json();

    const books = booksData.records.map(r => r.fields);

    // FIND BOOK (SAFE MATCH)
    const book = books.find(b =>
      normalize(b.Title) === normalize(decodeURIComponent(slug))
    );

    if (!book) {
      console.error("Book not found:", slug);
      return;
    }

    renderBook(book);

    // LOAD ENTRIES (SAFE)
    try {
      const entriesRes = await fetch('/api/entries');

      if (!entriesRes.ok) throw new Error('Entries failed');

      const entriesData = await entriesRes.json();

      const entries = entriesData.records
        ? entriesData.records.map(r => r.fields)
        : [];

      renderEntries(entries, slug);

    } catch (err) {
      console.warn("Entries failed to load");
      renderEntries([], slug);
    }

  } catch (error) {
    console.error("Error loading book:", error);
  }
}

// ⭐ UPDATED RENDER (GOODREADS LABEL FIXED)
function renderBook(book) {
  const container = document.getElementById('book-container');

  container.innerHTML = `
    <div class="book-detail">
      <img src="${book.BookCover}" alt="${book.Title}" />

      <div class="book-info">
        <h2>${book.Title}</h2>
        <p>${book.Author}</p>

        <p class="goodreads-rating">
          <strong>Goodreads Rating:</strong> ⭐ ${book.GoodreadsRating || 'N/A'}
        </p>
      </div>
    </div>
  `;
}

// RENDER ENTRIES (WITH STARS ⭐)
function renderEntries(entries, slug) {
  const container = document.getElementById('entries-container');

  const decodedSlug = decodeURIComponent(slug);

  const filtered = entries.filter(e => {
    if (!e.BookSlug) return false;
    return normalize(e.BookSlug) === normalize(decodedSlug);
  });

  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = `<p>No thoughts yet — be the first!</p>`;
    return;
  }

  filtered.forEach(entry => {
    const div = document.createElement('div');
    div.className = 'entry';

    const stars = '⭐'.repeat(Number(entry.Rating || 0));

    div.innerHTML = `
      <h4>${entry.MemberName}</h4>
      <p>${stars}</p>
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

// SUBMIT FORM (FIXED FIELD NAMES)
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

    // CLEAR FORM
    document.getElementById('entry-form').reset();

    // RELOAD PAGE DATA
    loadBook();

  } catch (error) {
    console.error("Submit error:", error);
  }
});

// INIT
loadBook();