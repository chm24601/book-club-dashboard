let allBooks = [];
let filteredBooks = [];

function normalize(str) {
  return str?.toLowerCase().trim() || "";
}

function formatDate(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString("en-US", { month: "long", year: "numeric" });
}

function getSlug(book) {
  return book?.Slug || encodeURIComponent(book?.Title || "");
}

// Render ★ stars with half-star support
function starsHTML(rating, size = "") {
  if (!rating) return "";
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  const sizeStyle = size ? ` style="font-size:${size}"` : "";
  let html = `<span class="stars"${sizeStyle}>`;
  html += "★".repeat(full);
  if (half) html += `<span class="s-half">½</span>`;
  html += `<span class="s-empty">${"★".repeat(empty)}</span>`;
  html += "</span>";
  return html;
}

function showSkeletons() {
  const container = document.getElementById("books-container");
  if (!container) return;
  const rows = Array(5).fill(0).map(() => `
    <div class="book-row skeleton-row">
      <div class="skeleton row-thumb-ph"></div>
      <div class="row-info" style="gap:0.4rem;display:flex;flex-direction:column;justify-content:center;">
        <div class="skeleton" style="height:13px;width:65%;border-radius:4px;"></div>
        <div class="skeleton" style="height:11px;width:38%;border-radius:4px;margin-top:2px;"></div>
      </div>
    </div>`).join('');
  container.innerHTML = `
    <div class="skeleton-pick"></div>
    <span class="section-label">Past reads</span>
    <div class="books-list">${rows}</div>
  `;
}

async function loadData() {
  showSkeletons();
  try {
    const [booksRes, entriesRes] = await Promise.all([
      fetch('/api/books'),
      fetch('/api/entries')
    ]);

    const booksData = await booksRes.json();
    const entriesData = await entriesRes.json();
    const entries = entriesData.records.map(r => r.fields);

    allBooks = booksData.records.map(r => r.fields).filter(b => !b.TBR);

    // Calculate average rating per book
    allBooks = allBooks.map(book => {
      const bookEntries = entries.filter(e =>
        e?.BookSlug && (
          normalize(e.BookSlug) === normalize(book?.Slug || "") ||
          normalize(e.BookSlug) === normalize(book?.Title || "")
        )
      );
      const ratings = bookEntries.map(e => Number(e?.Rating)).filter(r => !isNaN(r));
      const avg = ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : null;
      return { ...book, AverageRating: avg };
    });

    // Sort newest first
    allBooks.sort((a, b) =>
      new Date(b?.["Date Read"] || 0) - new Date(a?.["Date Read"] || 0)
    );

    filteredBooks = allBooks;
    populateYearFilter(allBooks);
    renderBooks(filteredBooks);

  } catch (err) {
    console.error("Error loading data:", err);
  }
}

function populateYearFilter(books) {
  const el = document.getElementById("yearFilter");
  if (!el) return;
  const years = [...new Set(
    books.map(b => b?.["Date Read"]).filter(Boolean).map(d => new Date(d).getFullYear())
  )].sort((a, b) => b - a);
  years.forEach(year => {
    const opt = document.createElement("option");
    opt.value = year;
    opt.textContent = year;
    el.appendChild(opt);
  });
}

function applyFilters() {
  const search = document.getElementById("search-input")?.value.toLowerCase() || "";
  const year = document.getElementById("yearFilter")?.value || "all";
  filteredBooks = allBooks.filter(book => {
    const matchSearch =
      book?.Title?.toLowerCase().includes(search) ||
      book?.Author?.toLowerCase().includes(search);
    const matchYear =
      year === "all" ||
      (book?.["Date Read"] && new Date(book["Date Read"]).getFullYear() == year);
    return matchSearch && matchYear;
  });
  renderBooks(filteredBooks);
}

function coverImg(book, cls, phCls) {
  return book?.BookCover
    ? `<img src="${book.BookCover}" alt="${book.Title}" class="${cls}" loading="lazy" />`
    : `<div class="${phCls}"></div>`;
}

function renderBooks(books) {
  const container = document.getElementById("books-container");
  if (!container) return;
  container.innerHTML = "";

  const currentBook = books.find(b => b?.Current);
  const rest = books.filter(b => !b?.Current);

  // ── Current Pick ──
  if (currentBook) {
    const slug = getSlug(currentBook);
    const wrap = document.createElement("div");
    wrap.className = "current-pick";
    wrap.setAttribute("role", "link");
    wrap.setAttribute("tabindex", "0");
    wrap.innerHTML = `
      ${coverImg(currentBook, "pick-cover", "pick-cover-ph")}
      <div class="pick-info">
        <div class="pick-badge">Current pick</div>
        <div class="pick-title">${currentBook.Title}</div>
        <div class="pick-author">${currentBook.Author}</div>
        ${currentBook.AverageRating ? starsHTML(currentBook.AverageRating) : ""}
        ${currentBook["GoodreadsRating"] ? `<div class="pick-gr">Goodreads ${currentBook["GoodreadsRating"]}</div>` : ""}
      </div>
    `;
    wrap.addEventListener("click", () => { window.location.href = `book.html?slug=${slug}`; });
    wrap.addEventListener("keydown", e => { if (e.key === "Enter") window.location.href = `book.html?slug=${slug}`; });
    container.appendChild(wrap);
  }

  // ── Past Reads ──
  const label = document.createElement("span");
  label.className = "section-label";
  label.textContent = currentBook ? "Past reads" : "All books";
  container.appendChild(label);

  const list = document.createElement("div");
  list.className = "books-list";

  rest.forEach(book => {
    const slug = getSlug(book);
    const row = document.createElement("div");
    row.className = "book-row";
    row.setAttribute("role", "link");
    row.setAttribute("tabindex", "0");
    row.innerHTML = `
      ${coverImg(book, "row-thumb", "row-thumb-ph")}
      <div class="row-info">
        <div class="row-title">${book.Title}</div>
        <div class="row-author">${book.Author}</div>
        <div class="row-meta">
          ${book.AverageRating ? starsHTML(book.AverageRating) : ""}
          ${book["Date Read"] ? `<span class="row-date">${formatDate(book["Date Read"])}</span>` : ""}
        </div>
      </div>
      <span class="row-chevron">›</span>
    `;
    row.addEventListener("click", () => { window.location.href = `book.html?slug=${slug}`; });
    row.addEventListener("keydown", e => { if (e.key === "Enter") window.location.href = `book.html?slug=${slug}`; });
    list.appendChild(row);
  });

  container.appendChild(list);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("search-input")?.addEventListener("input", applyFilters);
  document.getElementById("yearFilter")?.addEventListener("change", applyFilters);
  loadData();
});