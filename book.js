// GET SLUG
function getSlugFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('slug');
}

// NORMALIZE TEXT (KEY FIX 🔥)
function normalize(str) {
  return str.toLowerCase().trim();
}

// LOAD BOOK
async function loadBook() {
  const slug = getSlugFromURL();

  try {
    const res = await fetch('/api/books');
    const data = await res.json();

    const books = data.records.map(r => r.fields);

    // 🔥 MATCH SAFELY
    const book = books.find(b =>
      normalize(b.Title) === normalize(decodeURIComponent(slug))
    );

    if (!book) {
      console.error("Book not found:", slug);
      return;
    }

    renderBook(book);

  } catch (error) {
    console.error("Error loading book:", error);
  }
}

// RENDER
function renderBook(book) {
  const container = document.getElementById('book-container');

  container.innerHTML = `
    <div class="book-detail">
      <img src="${book.BookCover}" alt="${book.Title}" />

      <div class="book-info">
        <h2>${book.Title}</h2>
        <p>${book.Author}</p>
        <p>⭐ ${book.GoodreadsRating || 'N/A'}</p>
      </div>
    </div>
  `;
}

// FORM SUBMIT (SAFE)
document.getElementById('entry-form')?.addEventListener('submit', async (e) => {
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

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Error submitting');
      return;
    }

    document.getElementById('entry-form').reset();
    alert("Submitted!");

  } catch (error) {
    console.error("Submit error:", error);
  }
});

// INIT
loadBook();