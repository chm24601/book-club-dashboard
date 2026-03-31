let allBooks = [];
let filteredBooks = [];

// FORMAT DATE → "March 2026"
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

  if (halfStar) {
    stars += "✨";
  }

  return stars;
}

// LOAD DATA
async function loadData() {
  try {
    const booksRes = await fetch('/api/books');
    const booksData = await booksRes.json();

    const entriesRes = await fetch('/api/entries');
    const entriesData = await entriesRes.json();

    const entries = entriesData.records.map(r => r.fields);

    allBooks = booksData.records.map(r => r.fields);

    // ⭐ CALCULATE BOOK CLUB AVERAGE
    allBooks = allBooks.map(book => {
      const bookEntries = entries.filter(e => e.Title === book.Title);

      const ratings = bookEntries
        .map(e => Number(e.Rating))
        .filter(r => !isNaN(r));

      let avg = null;

      if (ratings.length > 0) {
        avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        avg = Math.round(avg * 10) / 10;
      }

      return {
        ...book,
        AverageRating: avg
      };
    });

    // SORT BY DATE
    allBooks.sort((a, b) => {
      const dateA = new Date(a["Date Read"] || 0);
      const dateB = new Date(b["Date Read"] || 0);
      return dateB - dateA;
    });

    filteredBooks = allBooks;

    populateYearFilter(allBooks);
    renderBooks(filteredBooks);

  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// SAFE SLUG
function getSlug(book) {
  return encodeURIComponent(book.Title);
}

// YEAR FILTER
function populateYearFilter(books) {
  const yearFilter = document.getElementById("yearFilter");
  if (!yearFilter) return;

  const years = [...new Set(
    books
      .map(book => book["Date Read"])
      .filter(date => date)
      .map(date => new Date(date).getFullYear())
  )].sort((a, b) => b - a);

  years.forEach(year => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearFilter.appendChild(option);
  });
}

// FILTER
function applyFilters() {
  const searchValue = document.getElementById('search-input')?.value.toLowerCase() || '';
  const selectedYear = document.getElementById('yearFilter')?.value || 'all';

  filteredBooks = allBooks.filter(book => {

    const matchesSearch =
      book.Title.toLowerCase().includes(searchValue) ||
      book.Author.toLowerCase().includes(searchValue);

    const matchesYear =
      selectedYear === 'all' ||
      (book["Date Read"] &&
        new Date(book["Date Read"]).getFullYear() == selectedYear);

    return matchesSearch && matchesYear;
  });

  renderBooks(filteredBooks);
}

// RENDER BOOKS
function renderBooks(books) {
  const container = document.getElementById('books-container');

  container.innerHTML = `
    <div id="current-section"></div>
    <div id="books-section"></div>
  `;

  const currentSection = document.getElementById('current-section');
  const booksSection = document.getElementById('books-section');

  const currentBook = books.find(b => b.Current);
  const otherBooks = books.filter(b => !b.Current);

  // ⭐ CURRENT PICK
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
              currentBook["GoodreadsRating"]
                ? `<p class="goodreads-rating">Goodreads Rating: ${currentBook["GoodreadsRating"]}</p>`
                : ''
            }

            ${
              currentBook.AverageRating
                ? `<p class="club-rating">Book Club Rating: ${getStarRating(currentBook.AverageRating)} (${currentBook.AverageRating})</p>`
                : ''
            }

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

    currentSection.appendChild(currentDiv);
  }

  // HEADER
  const listHeader = document.createElement('h2');
  listHeader.className = 'section-header';
  listHeader.innerText = 'All Books';
  booksSection.appendChild(listHeader);

  const grid = document.createElement('div');
  grid.className = 'books-grid';

  // OTHER BOOKS
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
            book["GoodreadsRating"]
              ? `<p class="goodreads-rating">Goodreads Rating: ${book["GoodreadsRating"]}</p>`
              : ''
          }

          ${
            book.AverageRating
              ? `<p class="club-rating">Book Club Rating: ${getStarRating(book.AverageRating)} (${book.AverageRating})</p>`
              : ''
          }

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

    grid.appendChild(div);
  });

  booksSection.appendChild(grid);
}

// INIT
document.addEventListener('DOMContentLoaded', () => {

  const searchInput = document.getElementById('search-input');
  const yearFilter = document.getElementById('yearFilter');

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  if (yearFilter) {
    yearFilter.addEventListener('change', applyFilters);
  }

  loadData();
});