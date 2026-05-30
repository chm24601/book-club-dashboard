// Store entry data keyed by record id (avoids encoding headaches with data-attrs)
const _entryData = {};

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
    const entries = entriesData.records.map(r => ({ id: r.id, ...r.fields }));

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

  // Blurred cover hero
  const heroEl  = document.getElementById("book-hero");
  const heroBlur = document.getElementById("book-hero-blur");
  if (heroBlur && book.BookCover) {
    heroBlur.style.backgroundImage = `url('${book.BookCover}')`;
    heroEl?.classList.add("has-cover");
  }
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
    ${book.Current ? `
      <div class="discussion-wrap">
        <button class="discussion-btn" id="discussion-btn">✦ Discussion Questions</button>
        <div class="discussion-output" id="discussion-output"></div>
      </div>` : ''}
  `;
  if (book.Current) initDiscussionQuestions(book);
}

function initDiscussionQuestions(book) {
  const btn = document.getElementById("discussion-btn");
  const output = document.getElementById("discussion-output");
  if (!btn || !output) return;
  btn.addEventListener("click", async () => {
    if (btn.dataset.loading) return;
    btn.dataset.loading = "true";
    btn.textContent = "Generating…";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Generate 5 thoughtful book club discussion questions for "${book.Title}" by ${book.Author}. Focus on themes, characters, and what makes it worth discussing. Format as a numbered list.`
          }]
        }),
      });
      const data = await res.json();
      const text = data.text || data.reply || "";
      output.innerHTML = `<div class="discussion-content">${text
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>")}</div>`;
      btn.textContent = "✦ Regenerate";
    } catch {
      output.innerHTML = `<p style="color:var(--ink-3);font-style:italic;font-size:0.85rem;">Couldn't reach Paige — try again.</p>`;
      btn.textContent = "✦ Discussion Questions";
    }
    delete btn.dataset.loading;
  });
}

async function addReaction(btn) {
  if (btn.dataset.reacted) return;
  const entryEl = btn.closest(".entry");
  const id = entryEl?.dataset.recordId;
  if (!id) return;
  const emoji = btn.dataset.emoji;

  btn.dataset.reacted = "true";
  try {
    const res = await fetch("/api/add-reaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId: id, emoji }),
    });
    const data = await res.json();
    if (res.ok && data.reactions) {
      const count = data.reactions[emoji] || "";
      btn.querySelector(".reaction-count").textContent = count;
      btn.classList.add("reacted");
    } else {
      delete btn.dataset.reacted;
    }
  } catch {
    delete btn.dataset.reacted;
  }
}

const REACTION_EMOJIS = ['❤️', '🔥', '💀', '😭'];

function entryHTML(e) {
  const rating = Number(e.Rating);
  let reactions = {};
  try { reactions = JSON.parse(e.Reactions || '{}'); } catch {}
  const reactionsRow = `<div class="reaction-row">${REACTION_EMOJIS.map(emoji =>
    `<button class="reaction-btn" data-emoji="${emoji}">
      ${emoji}<span class="reaction-count">${reactions[emoji] || ''}</span>
    </button>`
  ).join('')}</div>`;
  return `
    <div class="entry-header">
      <span class="entry-name">${e.MemberName || "Anonymous"}</span>
      ${!isNaN(rating) && e.Rating ? starsHTML(rating, "0.875rem") : ""}
      ${e.id ? `<span class="entry-actions"><button class="entry-edit-btn">Edit</button><button class="entry-delete-btn" title="Delete">✕</button></span>` : ""}
    </div>
    ${e.Note ? `<p class="entry-note">${e.Note}</p>` : ""}
    ${e.Link ? `<a class="entry-link" href="${e.Link}" target="_blank" rel="noopener">↗ Link</a>` : ""}
    ${e.id ? reactionsRow : ""}
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
    if (e.id) {
      _entryData[e.id] = { note: e.Note || "", link: e.Link || "", rating: e.Rating || "", name: e.MemberName || "Anonymous" };
    }
    return `<div class="entry" data-record-id="${e.id || ""}">${entryHTML(e)}</div>`;
  }).join("");

  container.querySelectorAll(".entry-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => openEditForm(btn.closest(".entry")));
  });
  container.querySelectorAll(".entry-delete-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteEntry(btn.closest(".entry")));
  });
  container.querySelectorAll(".reaction-btn").forEach(btn => {
    btn.addEventListener("click", () => addReaction(btn));
  });
}

function initStarPickerEl(picker, input, label, initialRating = 0) {
  if (!picker) return;
  const stars = picker.querySelectorAll(".star-pick");
  let currentRating = initialRating;
  const labels = { 0.5:"½", 1:"1", 1.5:"1½", 2:"2", 2.5:"2½", 3:"3", 3.5:"3½", 4:"4", 4.5:"4½", 5:"5" };

  function getRating(clientX, star) {
    const rect = star.getBoundingClientRect();
    return (clientX - rect.left) < rect.width / 2 ? parseInt(star.dataset.value) - 0.5 : parseInt(star.dataset.value);
  }
  function paintStars(rating) {
    stars.forEach(star => {
      const val = parseInt(star.dataset.value);
      star.classList.remove("full", "half");
      if (rating >= val) star.classList.add("full");
      else if (rating >= val - 0.5) star.classList.add("half");
    });
  }
  if (currentRating) paintStars(currentRating);

  picker.addEventListener("mousemove", e => {
    const star = e.target.closest(".star-pick");
    if (!star) return;
    paintStars(getRating(e.clientX, star));
    if (label) label.textContent = labels[getRating(e.clientX, star)] || "";
  });
  picker.addEventListener("mouseleave", () => {
    paintStars(currentRating);
    if (label) label.textContent = currentRating ? labels[currentRating] : "";
  });
  picker.addEventListener("click", e => {
    const star = e.target.closest(".star-pick");
    if (!star) return;
    currentRating = getRating(e.clientX, star);
    input.value = currentRating;
    paintStars(currentRating);
    if (label) label.textContent = labels[currentRating] || "";
  });
  picker.addEventListener("touchend", e => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const star = document.elementFromPoint(touch.clientX, touch.clientY)?.closest(".star-pick");
    if (!star) return;
    currentRating = getRating(touch.clientX, star);
    input.value = currentRating;
    paintStars(currentRating);
    if (label) label.textContent = labels[currentRating] || "";
  });
}

function initStarPicker() {
  const picker = document.getElementById("star-picker");
  const input = document.getElementById("rating");
  const label = document.getElementById("star-value-label");
  if (!picker) return;
  initStarPickerEl(picker, input, label, 0);
}

function openEditForm(entryEl) {
  const id = entryEl.dataset.recordId;
  if (!id || !_entryData[id]) return;
  const { note, link, rating, name } = _entryData[id];

  const starPips = [1,2,3,4,5].map(v => `<span class="star-pick" data-value="${v}">★</span>`).join("");

  entryEl.innerHTML = `
    <div class="entry-edit-wrap">
      <div class="entry-name" style="margin-bottom:0.75rem;">${name}</div>
      <div class="edit-stars-row">
        <div class="star-picker edit-star-picker">${starPips}</div>
        <span class="edit-star-label"></span>
        <input type="hidden" class="edit-rating-input" value="${rating}" />
      </div>
      <textarea class="edit-note-input" rows="3" placeholder="Notes, reactions, a quote…">${note}</textarea>
      <input type="text" class="edit-link-input" placeholder="Link to an article, review, or resource…" value="${link}" />
      <div class="edit-actions">
        <button class="edit-save-btn">Save</button>
        <button class="edit-cancel-btn">Cancel</button>
        <span class="edit-error"></span>
      </div>
    </div>
  `;

  initStarPickerEl(
    entryEl.querySelector(".edit-star-picker"),
    entryEl.querySelector(".edit-rating-input"),
    entryEl.querySelector(".edit-star-label"),
    rating ? Number(rating) : 0
  );

  entryEl.querySelector(".edit-cancel-btn").addEventListener("click", () => {
    const d = _entryData[id];
    entryEl.innerHTML = entryHTML({ id, MemberName: d.name, Note: d.note, Link: d.link, Rating: d.rating });
    entryEl.querySelector(".entry-edit-btn")?.addEventListener("click", () => openEditForm(entryEl));
    entryEl.querySelector(".entry-delete-btn")?.addEventListener("click", () => deleteEntry(entryEl));
  });

  entryEl.querySelector(".edit-save-btn").addEventListener("click", async () => {
    const newNote = entryEl.querySelector(".edit-note-input").value.trim();
    const newLink = entryEl.querySelector(".edit-link-input").value.trim();
    const newRating = entryEl.querySelector(".edit-rating-input").value;
    const errEl = entryEl.querySelector(".edit-error");
    const saveBtn = entryEl.querySelector(".edit-save-btn");

    if (!newNote && !newLink && !newRating) {
      errEl.textContent = "Add a note, link, or rating.";
      return;
    }

    saveBtn.textContent = "Saving…";
    saveBtn.disabled = true;
    errEl.textContent = "";

    try {
      const res = await fetch("/api/edit-entry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: id, note: newNote, link: newLink, rating: newRating || null }),
      });
      if (res.ok) {
        _entryData[id] = { note: newNote, link: newLink, rating: newRating, name };
        entryEl.innerHTML = entryHTML({ id, MemberName: name, Note: newNote, Link: newLink, Rating: newRating });
        entryEl.querySelector(".entry-edit-btn")?.addEventListener("click", () => openEditForm(entryEl));
        entryEl.querySelector(".entry-delete-btn")?.addEventListener("click", () => deleteEntry(entryEl));
      } else {
        errEl.textContent = "Something went wrong — try again.";
        saveBtn.textContent = "Save";
        saveBtn.disabled = false;
      }
    } catch {
      errEl.textContent = "Connection error.";
      saveBtn.textContent = "Save";
      saveBtn.disabled = false;
    }
  });
}

async function deleteEntry(entryEl) {
  const id = entryEl.dataset.recordId;
  if (!id) return;
  const deleteBtn = entryEl.querySelector(".entry-delete-btn");

  // First click: show confirm state
  if (deleteBtn && deleteBtn.dataset.confirming !== "true") {
    deleteBtn.dataset.confirming = "true";
    deleteBtn.textContent = "Delete?";
    deleteBtn.style.color = "#BB858B";
    // Reset after 3s if no second click
    setTimeout(() => {
      if (deleteBtn.dataset.confirming === "true") {
        deleteBtn.dataset.confirming = "";
        deleteBtn.textContent = "✕";
        deleteBtn.style.color = "";
      }
    }, 3000);
    return;
  }

  // Second click: do it
  if (deleteBtn) { deleteBtn.textContent = "…"; deleteBtn.disabled = true; }
  try {
    const res = await fetch("/api/delete-entry", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId: id }),
    });
    if (res.ok) {
      entryEl.style.transition = "opacity 0.25s";
      entryEl.style.opacity = "0";
      setTimeout(() => {
        entryEl.remove();
        // Update count
        const container = document.getElementById("entries-container");
        const remaining = container?.querySelectorAll(".entry").length || 0;
        const countEl = document.getElementById("entry-count");
        if (countEl) countEl.textContent = remaining > 0 ? `${remaining} review${remaining !== 1 ? "s" : ""}` : "";
        if (remaining === 0 && container) container.innerHTML = `<p class="no-entries">No reviews yet — be the first.</p>`;
      }, 250);
    } else {
      if (deleteBtn) { deleteBtn.textContent = "✕"; deleteBtn.disabled = false; deleteBtn.dataset.confirming = ""; }
    }
  } catch {
    if (deleteBtn) { deleteBtn.textContent = "✕"; deleteBtn.disabled = false; deleteBtn.dataset.confirming = ""; }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadBook();
  initStarPicker();

  const nameSelect = document.getElementById("name");
  const guestInput = document.getElementById("guest-name");
  nameSelect?.addEventListener("change", () => {
    const isGuest = nameSelect.value === "__guest__";
    guestInput.style.display = isGuest ? "" : "none";
    guestInput.required = isGuest;
    if (!isGuest) guestInput.value = "";
  });

  const form = document.getElementById("entry-form");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const nameVal = nameSelect.value;
    const memberName = nameVal === "__guest__" ? guestInput.value.trim() : nameVal;
    if (!memberName) { alert("Please enter your name."); return; }

    const slug = getSlugFromURL();
    const btn = form.querySelector("button[type='submit']");
    btn.textContent = "Submitting…";
    btn.disabled = true;

    const rating = document.getElementById("rating").value;
    const note = document.getElementById("note").value.trim();
    const link = document.getElementById("link").value.trim();

    if (!note && !link && !rating) {
      alert("Please add a note, a link, or a rating before submitting.");
      btn.textContent = "Submit";
      btn.disabled = false;
      return;
    }

    const payload = {
      bookSlug: slug,
      memberName,
      rating: rating || null,
      note,
      link,
    };

    try {
      const res = await fetch("/api/submit-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        if (typeof confetti === 'function') {
          confetti({ particleCount: 80, spread: 65, origin: { y: 0.75 }, colors: ['#6b2737', '#BB858B', '#D8A48F', '#6b4a27', '#EFEBCE'] });
        }
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