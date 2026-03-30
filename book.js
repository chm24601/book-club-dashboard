// GET SLUG FROM URL
function getSlugFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('slug');
}

// LOAD BOOK DATA
async function loadBook() {
  const slug = getSlugFromURL();

  if (!slug) {
    console.error("No slug found in URL");
    return;
  }

  try {
    const [booksRes, entriesRes] = await Promise.all([
      fetch('/api/books'),
      fetch('/api/entries')
    ]);

    const booksData = await booksRes.json();
    const entriesData = await entriesRes.json();

    const books = booksData.records.map(r => r.fields);
    const entries = entriesData.records.map(r => r.fields);

    // 🔥 MATCH BOOK (handles multiple slug formats)
    const book = books.find(b =>
      b.Slug === slug ||
      b.slug === slug ||
      b.BookSlug === slug ||
      encodeURIComponent(b.Title) === slug
    );

    if (!book) {
      console.error("Book not found:", slug);
      return;
    }

    renderBook(book);
    renderEntries(entries, slug);

  } catch (error) {
    console.error("Error loading book:", error);
  }
}

// RENDER BOOK DETAILS
function renderBook(book) {
  const container = document.getElementById('book-container');

  container.innerHTML = `
    <div class="book-detail">
      <img src="${book.BookCover}" alt="${book.Title}" />

      <div class="book-info">
        <h2>${book.Title}</h2>
        <p>${book.Author}</p>
      </div>
    </div>
  `;
}

// RENDER ENTRIES
function renderEntries(entries, slug) {
  const container = document.getElementById('entries-container');

  const filtered = entries.filter(e =>
    e.BookSlug === slug ||
    e.BookSlug === decodeURIComponent(slug)
  );

  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = `<p>No entries yet</p>`;
    return;
  }

  filtered.forEach(entry => {
    const div = document.createElement('div');
    div.className = 'entry';

    div.innerHTML = `
      <h4>${entry.MemberName}</h4>
      <p>⭐ ${entry.Rating}</p>
      <p>${entry.Note || ''}</p>
      ${
        entry.Link
          ? `<a href="${entry.Link}" target="_blank">View Link</a>`
          : ''
      }
    `;

    container.appendChild(div);
  });
}

// HANDLE FORM SUBMIT
document.getElementById('entry-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const slug = getSlugFromURL();

  const data = {
    BookSlug: slug,
    MemberName: document.getElementById('name').value,
    Rating: document.getElementById('rating').value,
    Note: document.getElementById('note').value,
    Link: document.getElementById('link').value
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

    // 🔥 CLEAR FORM
    document.getElementById('entry-form').reset();

    // 🔥 RELOAD PAGE DATA
    loadBook();

  } catch (error) {
    console.error("Submit error:", error);
  }
});

// INIT
loadBook();