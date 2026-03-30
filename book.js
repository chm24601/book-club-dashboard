let currentBookSlug = '';

async function loadBookDetails() {
  const container = document.getElementById('book-detail-container');

  try {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');

    if (!slug) {
      container.innerHTML = '<p>No book selected.</p>';
      return;
    }

    currentBookSlug = slug;

    const response = await fetch('/api/books');
    const rawText = await response.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      container.innerHTML = `<p>/api/books returned invalid JSON.</p><pre>${rawText}</pre>`;
      return;
    }

    if (!response.ok) {
      container.innerHTML = `<p>Could not load book details.</p><pre>${JSON.stringify(data, null, 2)}</pre>`;
      return;
    }

    if (!data.records || !Array.isArray(data.records)) {
      container.innerHTML = '<p>No books found.</p>';
      return;
    }

    const record = data.records.find((item) => item.fields.Slug === slug);

    if (!record) {
      container.innerHTML = `<p>Book not found for slug: ${slug}</p>`;
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
            <p>Add your rating and thoughts below, then see the running log underneath.</p>
          </section>
        </div>
      </div>
    `;

    await loadEntries();
  } catch (error) {
    console.error('Error loading book details:', error);
    container.innerHTML = `<p>There was a problem loading this book.</p><pre>${error.message}</pre>`;
  }
}

async function loadEntries() {
  const entriesContainer = document.getElementById('entries-container');

  if (!entriesContainer) return;

  if (!currentBookSlug) {
    entriesContainer.innerHTML = '<p>No book selected.</p>';
    return;
  }

  try {
    const response = await fetch(`/api/entries?slug=${encodeURIComponent(currentBookSlug)}`);
    const rawText = await response.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      entriesContainer.innerHTML = '<p>Entries API returned invalid data.</p>';
      return;
    }

    if (!response.ok) {
      entriesContainer.innerHTML = '<p>Could not load entries.</p>';
      return;
    }

    const records = data.records || [];

    if (records.length === 0) {
      entriesContainer.innerHTML = '<p>No entries yet. Be the first to add one.</p>';
      return;
    }

    entriesContainer.innerHTML = records
      .map((record) => {
        const entry = record.fields;
        const memberName = entry.MemberName || 'Unknown member';
        const rating = entry.Rating || '';
        const note = entry.Note || '';
        const link = entry.Link || '';
        const createdAt = entry.CreatedAt ? formatDate(entry.CreatedAt) : '';

        return `
          <article class="entry-card">
            <div class="entry-header">
              <h4>${memberName}</h4>
              <p class="entry-meta">${rating} ★${createdAt ? ` • ${createdAt}` : ''}</p>
            </div>
            <p class="entry-note">${escapeHtml(note)}</p>
            ${
              link
                ? `<p class="entry-link"><a href="${link}" target="_blank" rel="noopener noreferrer">Open link</a></p>`
                : ''
            }
          </article>
        `;
      })
      .join('');
  } catch (error) {
    console.error('Error loading entries:', error);
    entriesContainer.innerHTML = `<p>There was a problem loading entries.</p><pre>${error.message}</pre>`;
  }
}

async function handleEntrySubmit(event) {
  event.preventDefault();

  const formMessage = document.getElementById('form-message');
  const submitButton = document.getElementById('submit-entry-button');

  const memberName = document.getElementById('memberName').value;
  const rating = document.getElementById('rating').value;
  const note = document.getElementById('note').value.trim();
  const link = document.getElementById('link').value.trim();

  formMessage.textContent = '';
  submitButton.disabled = true;
  submitButton.textContent = 'Submitting...';

  try {
    const response = await fetch('/api/submit-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookSlug: currentBookSlug,
        memberName,
        rating,
        note,
        link,
      }),
    });

    const rawText = await response.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { error: rawText || 'Unknown server response' };
    }

    if (!response.ok) {
      console.error('Submit failed:', data);

      let errorMessage = 'Something went wrong. Please try again.';

      if (typeof data.error === 'string') {
        errorMessage = data.error;
      } else if (data.error && typeof data.error === 'object') {
        errorMessage = JSON.stringify(data.error);
      } else if (typeof data.details === 'string') {
        errorMessage = data.details;
      } else if (typeof data.message === 'string') {
        errorMessage = data.message;
      }

      formMessage.textContent = errorMessage;
      submitButton.disabled = false;
      submitButton.textContent = 'Submit';
      return;
    }

    document.getElementById('entry-form').reset();
    formMessage.textContent = 'Entry added!';
    submitButton.disabled = false;
    submitButton.textContent = 'Submit';

    await loadEntries();
  } catch (error) {
    console.error('Error submitting entry:', error);
    formMessage.textContent = error.message || 'Something went wrong. Please try again.';
    submitButton.disabled = false;
    submitButton.textContent = 'Submit';
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

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

document.getElementById('entry-form').addEventListener('submit', handleEntrySubmit);

loadBookDetails();