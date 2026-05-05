function getSlugFromURL() {
  return new URLSearchParams(window.location.search).get("slug");
}

function normalize(str) {
  return str?.toLowerCase().trim() || "";
}

function formatDate(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString("en-US", { month: "long", year: "numeric" });
}

function starsHTML(rating, size = "1rem") {
  if (!rating) return "";
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  let html = `<span class="stars" style="font-size:${size}">`;
  html += "★".repeat(full);
  if (half) html += `<span class="s-half" style="font-size:0.7em;vertical-align:middle;">½</span>`;
  html += `<span class="s-empty">${"★".repeat(empty)}</span>`;
  html += "</span>";
  return html;
}

function coverImg(book, cls, phCls, phH) {
  return book?.BookCover
    ? `<img src="${book.BookCover}" alt="${book.Title}" class="${cls}" />`
    : `<div class="${phCls}" style="height:${phH}"></div>`;
}

async function loadBook() {
  const slug = getSlugFromURL();
  try {
    const [booksRes, entriesRes] = await Promise.all([
      fetch("/api/books"),
      fetch("/api/entries")
    ]);
    const booksData = await booksRes.json();
    const entriesData = await entriesRes.json();

    let books = booksData.records.map(r => r.fields);
    const entries = entriesData.records.map(r => r.fields);

    books.sort((a, b) => new Date(b["Date Read"] || 0) - new Date(a["Date Read"] || 0));

    const bookIndex = books.findIndex(b =>
      normalize(b.Slug) === normalize(slug) ||
      normalize(b.Title) === normalize(decodeURIComponent(slug))
    );

    const book = books[bookIndex];
    if (!book) {
      document.getElementById("book-container").innerHTML =
        `<p style="padding:2rem;color:var(--ink-3);font-style:italic;">Book not found.</p>`;
      return;
    }

    const bookEntries = entries.filter(e => {
      if (!e.BookSlug) return false;
      const es = normalize(e.BookSlug);
      return es === normalize(book.Slug) || es === normalize(book.Title) || es.includes(normalize(book.Slug));
    });

    const ratings = bookEntries.map(e => Number(e.Rating)).filter(r => !isNaN(r));
    const avg = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

    renderNav(books, bookIndex);
    renderBook(book, avg);
    renderEntries(bookEntries);

  } catch (err) {
    console.error("Error loading book:", err);
  }
}

function renderNav(books, bookIndex) {
  const prev = books[bookIndex + 1];
  const next = books[bookIndex - 1];
  const nav = document.getElementById("book-nav");
  if (!nav) return;

  const prevLink = prev
    ? `<a href="book.html?slug=${prev.Slug || encodeURIComponent(prev.Title)}" class="nav-prev"><span class="nav-arrow">←</span><span class="nav-title">${prev.Title}</span></a>`
    : `<span></span>`;

  const nextLink = next
    ? `<a href="book.html?slug=${next.Slug || encodeURIComponent(next.Title)}" class="nav-next" style="text-align:right"><span class="nav-title">${next.Title}</span><span class="nav-arrow">→</span></a>`
    : `<span></span>`;

  nav.innerHTML = `${prevLink}<a href="books.html" class="nav-center">All books</a>${nextLink}`;
}

function renderBook(book, avg) {
  const container = document.getElementById("book-container");
  if (!container) return;
  document.title = `${book.Title} — Book Club`;
  container.innerHTML = `
    <div class="book-detail">
      ${coverImg(book, "detail-cover", "detail-cover-ph", "178px")}
      <div class="detail-info">
        <span class="detail-tag">book details</span>
        <h1 class="detail-title">${book.Title}</h1>
        <p class="detail-author">${book.Author}</p>
        <div class="detail-meta-row">
          ${book["Date Read"] ? `<div class="detail-meta-item"><span class="meta-label">Read</span><span class="meta-val">${formatDate(book["Date Read"])}</span></div>` : ""}
          ${book["GoodreadsRating"] ? `<div class="detail-meta-item"><span class="meta-label">Goodreads</span><span class="meta-val">${book["GoodreadsRating"]}</span></div>` : ""}
          ${avg ? `<div class="detail-meta-item"><span class="meta-label">Club avg</span><div class="club-rating-block">${starsHTML(avg, "0.875rem")}<span class="avg-num">${avg}</span></div></div>` : ""}
        </div>
      </div>
    </div>
  `;
}

function renderEntries(entries) {
  const container = document.getElementById("entries-container");
  const countEl = document.getElementById("entry-count");
  if (!container) return;
  if (countEl) countEl.textContent = entries.length > 0 ? `${entries.length} review${entries.length !== 1 ? "s" : ""}` : "";
  if (entries.length === 0) {
    container.innerHTML = `<p class="no-entries">No reviews yet — be the first.</p>`;
    return;
  }
  container.innerHTML = entries.map(e => {
    const rating = Number(e.Rating);
    return `
      <div class="entry">
        <div class="entry-header">
          <span class="entry-name">${e.MemberName || "Anonymous"}</span>
          ${!isNaN(rating) ? starsHTML(rating, "0.875rem") : ""}
        </div>
        ${e.Note ? `<p class="entry-note">${e.Note}</p>` : ""}
        ${e.Link ? `<a class="entry-link" href="${e.Link}" target="_blank" rel="noopener">↗ Link</a>` : ""}
      </div>
    `;
  }).join("");
}

function initStarPicker() {
  const picker = document.getElementById("star-picker");
  const input = document.getElementById("rating");
  const label = document.getElementById("star-value-label");
  if (!picker) return;

  const stars = picker.querySelectorAll(".star-pick");
  let currentRating = 0;
  const labels = { 0.5:"½", 1:"1", 1.5:"1½", 2:"2", 2.5:"2½", 3:"3", 3.5:"3½", 4:"4", 4.5:"4½", 5:"5" };

  function getRating(clientX, star) {
    const rect = star.getBoundingClientRect();
    return (clientX - rect.left) < rect.width / 2 ? parseInt(star.dataset.value) - 0.5 : parseInt(star.dataset.value);
  }

  function paintStars(rating) {
    stars.forEach(star => {
      const val = parseInt(star.dataset.value);
      star.classList.remove("full", "half", "hovered");
      if (rating >= val) star.classList.add("full");
      else if (rating >= val - 0.5) star.classList.add("half");
    });
  }

  picker.addEventListener("mousemove", e => {
    const star = e.target.closest(".star-pick");
    if (!star) return;
    paintStars(getRating(e.clientX, star));
    label.textContent = labels[getRating(e.clientX, star)] || "";
    star.classList.add("hovered");
  });

  picker.addEventListener("mouseleave", () => {
    paintStars(currentRating);
    label.textContent = currentRating ? labels[currentRating] : "";
  });

  picker.addEventListener("click", e => {
    const star = e.target.closest(".star-pick");
    if (!star) return;
    currentRating = getRating(e.clientX, star);
    input.value = currentRating;
    paintStars(currentRating);
    label.textContent = labels[currentRating] || "";
  });

  picker.addEventListener("touchend", e => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const star = document.elementFromPoint(touch.clientX, touch.clientY)?.closest(".star-pick");
    if (!star) return;
    currentRating = getRating(touch.clientX, star);
    input.value = currentRating;
    paintStars(currentRating);
    label.textContent = labels[currentRating] || "";
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadBook();
  initStarPicker();

  const form = document.getElementById("entry-form");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const rating = document.getElementById("rating").value;
    if (!rating) { alert("Please select a star rating!"); return; }

    const slug = getSlugFromURL();
    const btn = form.querySelector("button[type='submit']");
    btn.textContent = "Submitting…";
    btn.disabled = true;

    const payload = {
      bookSlug: slug,
      memberName: document.getElementById("name").value,
      rating,
      note: document.getElementById("note").value,
      link: document.getElementById("link").value,
    };

    try {
      const res = await fetch("/api/submit-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        form.innerHTML = `<p class="form-success">Thank you — your thoughts have been saved.</p>`;
        setTimeout(loadBook, 800);
      } else {
        btn.textContent = "Submit";
        btn.disabled = false;
        alert("Something went wrong. Please try again.");
      }
    } catch (err) {
      console.error(err);
      btn.textContent = "Submit";
      btn.disabled = false;
    }
  });
});