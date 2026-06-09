// ── COVER FETCHING — dual source with queue ──
const coverCache = {};
let fetchQueue = [];
let activeFetches = 0;
const MAX_CONCURRENT = 3;

function fetchCover(title, author) {
  const key = title + '||' + author;
  if (coverCache[key] !== undefined) return Promise.resolve(coverCache[key]);
  return new Promise(resolve => {
    fetchQueue.push({ title, author, key, resolve });
    drainQueue();
  });
}

function drainQueue() {
  while (activeFetches < MAX_CONCURRENT && fetchQueue.length > 0) {
    const job = fetchQueue.shift();
    activeFetches++;
    doFetch(job).finally(() => { activeFetches--; drainQueue(); });
  }
}

async function doFetch({ title, author, key, resolve }) {
  if (coverCache[key] !== undefined) { resolve(coverCache[key]); return; }
  const lastName = author.split(' ').pop();

  // 1) Try Google Books with exact title+author quotes
  try {
    const q = encodeURIComponent(`intitle:"${title}" inauthor:"${lastName}"`);
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&fields=items(volumeInfo/imageLinks)`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    const links = data?.items?.[0]?.volumeInfo?.imageLinks;
    const raw = links?.thumbnail || links?.smallThumbnail || '';
    const url = raw.replace('http://', 'https://').replace('zoom=1', 'zoom=2');
    if (url) { coverCache[key] = url; resolve(url); return; }
  } catch {}

  // 2) Fall back to Open Library
  try {
    const q = encodeURIComponent(title);
    const a = encodeURIComponent(lastName);
    const res = await fetch(
      `https://openlibrary.org/search.json?title=${q}&author=${a}&limit=1&fields=cover_i`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    const coverId = data?.docs?.[0]?.cover_i;
    const url = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null;
    coverCache[key] = url;
    resolve(url);
  } catch {
    coverCache[key] = null;
    resolve(null);
  }
}

function makePlaceholder(book) {
  const div = document.createElement('div');
  div.className = 'book-cover-ph';
  div.innerHTML = `<div class="ph-genre-dot"></div><div class="ph-title">${book.title}</div><div class="ph-author">${book.author}</div>`;
  return div;
}

function coverImgEl(book) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width:100%;height:100%;position:relative;';
  const ph = makePlaceholder(book);
  wrap.appendChild(ph);
  fetchCover(book.title, book.author).then(url => {
    if (!url) return;
    const img = document.createElement('img');
    img.alt = book.title;
    img.src = url;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0;';
    img.onload = () => { if (wrap.contains(ph)) wrap.replaceChild(img, ph); };
  });
  return wrap;
}

// ── STATE ──
const LS_TBR      = 'tbr_nook_added_tbr';
const LS_RNO      = 'tbr_nook_read_not_owned';
const LS_RATINGS  = 'tbr_nook_ratings';
const LS_SELL     = 'tbr_nook_for_sale';
const LS_READ_MOV = 'tbr_nook_moved_to_read'; // TBR books user marked as read

function load(k)    { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } }
function loadObj(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } }
function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

let addedTBR     = load(LS_TBR);
let addedNotOwned= load(LS_RNO);
let ratings      = loadObj(LS_RATINGS);   // { "Title||Author": 1-5 }
let forSaleList  = load(LS_SELL);         // [{ title, author, genre }]
let movedToRead  = load(LS_READ_MOV);     // books moved from TBR to read

// derive lists
function allOwned()       { return [...OWNED_BOOKS, ...addedTBR]; }
function allTBR()         { return allOwned().filter(b => b.status === 'tbr' && !isInSell(b) && !isMovedRead(b)); }
function allReadOwned()   { return [...OWNED_BOOKS.filter(b => b.status === 'read'), ...movedToRead]; }
function allReadNotOwned(){ return addedNotOwned; }
function allLibrary()     { return allOwned().filter(b => !isInSell(b)); }

function bookKey(b) { return b.title + '||' + b.author; }
function isInSell(b)      { return forSaleList.some(s => s.title === b.title && s.author === b.author); }
function isMovedRead(b)   { return movedToRead.some(s => s.title === b.title && s.author === b.author); }

// ── BOOK CARDS ──
function makeBookItem(book, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'book-item';
  if (opts.clickable !== false) {
    wrap.onclick = () => openBookModal(book);
    wrap.style.cursor = 'pointer';
  }
  wrap.appendChild(coverImgEl(book));

  // rating badge
  const r = ratings[bookKey(book)];
  if (r) {
    const badge = document.createElement('div');
    badge.className = 'rating-badge';
    badge.textContent = '★'.repeat(r);
    wrap.appendChild(badge);
  }

  const ov = document.createElement('div');
  ov.className = 'book-overlay';
  ov.innerHTML = `
    <div class="ov-title">${book.title}</div>
    <div class="ov-author">${book.author}</div>
    <div class="ov-genre">${book.genre}</div>
  `;
  wrap.appendChild(ov);

  if (opts.removable) {
    const rm = document.createElement('button');
    rm.className = 'remove-btn';
    rm.textContent = '✕';
    rm.onclick = (e) => { e.stopPropagation(); opts.onRemove(book); };
    wrap.appendChild(rm);
  }
  return wrap;
}

// ── FILTER / SORT ──
function filterSort(books, search, genre, sort, status) {
  let out = books.filter(b => {
    const s = (search || '').toLowerCase();
    return (!s || b.title.toLowerCase().includes(s) || b.author.toLowerCase().includes(s))
        && (!genre || b.genre === genre)
        && (!status || b.status === status);
  });
  if (sort === 'author') out.sort((a,b) => a.author.localeCompare(b.author));
  else if (sort === 'genre') out.sort((a,b) => a.genre.localeCompare(b.genre));
  else out.sort((a,b) => a.title.localeCompare(b.title));
  return out;
}

function renderGrid(gridEl, countEl, books, opts = {}) {
  gridEl.innerHTML = '';
  if (countEl) countEl.textContent = `${books.length} book${books.length !== 1 ? 's' : ''}`;
  if (!books.length) {
    const emp = document.createElement('div');
    emp.className = 'empty-state';
    emp.innerHTML = opts.emptyHTML || `<div class="e-icon">📭</div><h3>Nothing here yet</h3><p>Try adjusting filters or adding a book.</p>`;
    gridEl.appendChild(emp);
    return;
  }
  books.forEach(b => gridEl.appendChild(makeBookItem(b, opts)));
}

// ── RENDER SECTIONS ──
function renderLibrary() {
  renderGrid(
    document.getElementById('libGrid'),
    document.getElementById('libCount'),
    filterSort(allLibrary(), document.getElementById('libSearch').value,
      document.getElementById('libGenre').value, document.getElementById('libSort').value,
      document.getElementById('libStatus').value)
  );
}
function renderTBR() {
  renderGrid(
    document.getElementById('tbrGrid'),
    document.getElementById('tbrCount'),
    filterSort(allTBR(), document.getElementById('tbrSearch').value,
      document.getElementById('tbrGenre').value, document.getElementById('tbrSort').value)
  );
}
function renderReadOwned() {
  renderGrid(
    document.getElementById('readGrid'),
    document.getElementById('readCount'),
    filterSort(allReadOwned(), document.getElementById('readSearch').value,
      document.getElementById('readGenre').value, document.getElementById('readSort').value)
  );
}
function renderNotOwned() {
  const books = filterSort(allReadNotOwned(),
    document.getElementById('notOwnedSearch').value,
    document.getElementById('notOwnedGenre').value, '');
  renderGrid(document.getElementById('notOwnedGrid'), document.getElementById('notOwnedCount'), books, {
    emptyHTML: `<div class="e-icon">📝</div><h3>Nothing here yet!</h3><p>Add books you've read but don't own.</p>`
  });
}
function renderForSale() {
  const el = document.getElementById('saleGrid');
  const badge = document.getElementById('saleCount');
  badge.textContent = `${forSaleList.length} book${forSaleList.length !== 1 ? 's' : ''}`;
  el.innerHTML = '';
  if (!forSaleList.length) {
    el.innerHTML = `<div class="empty-state"><div class="e-icon">🛒</div><h3>Nothing for sale yet!</h3><p>Mark TBR books for sale from the book detail view.</p></div>`;
    return;
  }
  forSaleList.forEach(b => el.appendChild(makeBookItem(b, {
    removable: true,
    onRemove: (book) => {
      forSaleList = forSaleList.filter(s => !(s.title === book.title && s.author === book.author));
      save(LS_SELL, forSaleList);
      updateStats(); renderForSale();
    }
  })));
}

function renderGenres() {
  const container = document.getElementById('genreBreakdown');
  const all = allOwned();
  const map = {};
  all.forEach(b => {
    if (!map[b.genre]) map[b.genre] = { tbr: 0, read: 0, reading: 0 };
    if (b.status === 'tbr')     map[b.genre].tbr++;
    else if (b.status === 'read') map[b.genre].read++;
    else                          map[b.genre].reading++;
  });
  const genres = Object.entries(map).sort((a,b) => (b[1].tbr+b[1].read) - (a[1].tbr+a[1].read));
  const max = Math.max(...genres.map(([,v]) => v.tbr + v.read + v.reading));

  container.innerHTML = genres.map(([genre, counts]) => {
    const total = counts.tbr + counts.read + counts.reading;
    const pct = Math.round((total / max) * 100);
    const readPct = Math.round((counts.read / total) * 100);
    return `
      <div class="genre-row">
        <div class="genre-row-label">
          <span class="genre-name">${genre}</span>
          <span class="genre-total">${total}</span>
        </div>
        <div class="genre-bar-track">
          <div class="genre-bar-fill" style="width:${pct}%">
            <div class="genre-bar-read" style="width:${readPct}%"></div>
          </div>
        </div>
        <div class="genre-row-pills">
          ${counts.read ? `<span class="gpill gpill-read">${counts.read} read</span>` : ''}
          ${counts.tbr ? `<span class="gpill gpill-tbr">${counts.tbr} tbr</span>` : ''}
          ${counts.reading ? `<span class="gpill gpill-reading">${counts.reading} reading</span>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ── GENRE DROPDOWNS ──
function populateGenre(selId, books) {
  const sel = document.getElementById(selId);
  const genres = [...new Set(books.map(b => b.genre))].sort();
  genres.forEach(g => {
    const o = document.createElement('option');
    o.value = g; o.textContent = g;
    sel.appendChild(o);
  });
}

// ── STATS ──
function updateStats() {
  document.getElementById('sTBR').textContent      = allTBR().length;
  document.getElementById('sRead').textContent     = allReadOwned().length;
  document.getElementById('sNotOwned').textContent = allReadNotOwned().length;
  document.getElementById('sTotal').textContent    = allOwned().length;
}

// ── TABS ──
const rendered = new Set(['library']);
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('tab-' + tab).classList.add('active');
    if (!rendered.has(tab)) {
      rendered.add(tab);
      if (tab === 'tbr')          renderTBR();
      if (tab === 'read-owned')   renderReadOwned();
      if (tab === 'read-not-owned') renderNotOwned();
      if (tab === 'for-sale')     renderForSale();
      if (tab === 'genres')       renderGenres();
    }
  });
});

// ── FILTER LISTENERS ──
['libSearch','libGenre','libSort','libStatus'].forEach(id => document.getElementById(id).addEventListener('input', renderLibrary));
['tbrSearch','tbrGenre','tbrSort'].forEach(id => document.getElementById(id).addEventListener('input', renderTBR));
['readSearch','readGenre','readSort'].forEach(id => document.getElementById(id).addEventListener('input', renderReadOwned));
['notOwnedSearch','notOwnedGenre'].forEach(id => document.getElementById(id).addEventListener('input', renderNotOwned));

// ── MODALS ──
function openAddModal()         { document.getElementById('addModal').classList.add('open'); }
function openAddNotOwnedModal() { document.getElementById('addNotOwnedModal').classList.add('open'); }
function closeModal(id)         { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

function submitAddBook() {
  const title  = document.getElementById('addTitle').value.trim();
  const author = document.getElementById('addAuthor').value.trim();
  const genre  = document.getElementById('addGenre').value.trim() || 'Uncategorized';
  if (!title || !author) return;
  addedTBR.push({ title, author, genre, status: 'tbr' });
  save(LS_TBR, addedTBR);
  ['addTitle','addAuthor','addGenre'].forEach(id => document.getElementById(id).value = '');
  closeModal('addModal');
  updateStats(); renderTBR(); renderLibrary();
}
function submitNotOwnedBook() {
  const title  = document.getElementById('notOwnedTitle').value.trim();
  const author = document.getElementById('notOwnedAuthor').value.trim();
  const genre  = document.getElementById('notOwnedGenre2').value.trim() || 'Uncategorized';
  if (!title || !author) return;
  addedNotOwned.push({ title, author, genre });
  save(LS_RNO, addedNotOwned);
  ['notOwnedTitle','notOwnedAuthor','notOwnedGenre2'].forEach(id => document.getElementById(id).value = '');
  closeModal('addNotOwnedModal');
  updateStats(); renderNotOwned();
}

// ── BOOK DETAIL MODAL ──
let detailBook = null;
let detailRating = 0;

function openBookModal(book) {
  detailBook = book;
  detailRating = ratings[bookKey(book)] || 0;

  document.getElementById('detailTitle').textContent  = book.title;
  document.getElementById('detailAuthor').textContent = 'by ' + book.author;
  document.getElementById('detailGenre').textContent  = book.genre;

  // cover
  const img = document.getElementById('detailCover');
  const ph  = document.getElementById('detailCoverPh');
  img.style.display = 'none'; ph.style.display = 'block';
  fetchCover(book.title, book.author).then(url => {
    if (url) { img.src = url; img.style.display = 'block'; ph.style.display = 'none'; }
  });

  renderStars(detailRating);

  // show/hide action buttons based on context
  const isTBR  = book.status === 'tbr';
  document.getElementById('detailReadBtn').style.display = isTBR ? '' : 'none';
  document.getElementById('detailSellBtn').style.display = isTBR ? '' : 'none';

  document.getElementById('bookModal').classList.add('open');
}

function renderStars(val) {
  document.querySelectorAll('.star').forEach(s => {
    s.classList.toggle('filled', parseInt(s.dataset.v) <= val);
  });
}

document.getElementById('starRow').addEventListener('click', e => {
  if (!e.target.classList.contains('star')) return;
  detailRating = parseInt(e.target.dataset.v);
  ratings[bookKey(detailBook)] = detailRating;
  save(LS_RATINGS, ratings);
  renderStars(detailRating);
  // refresh card if visible
  if (rendered.has('tbr')) renderTBR();
  if (rendered.has('library')) renderLibrary();
});

document.getElementById('starRow').addEventListener('mouseover', e => {
  if (!e.target.classList.contains('star')) return;
  const v = parseInt(e.target.dataset.v);
  document.querySelectorAll('.star').forEach(s => s.classList.toggle('hover', parseInt(s.dataset.v) <= v));
});
document.getElementById('starRow').addEventListener('mouseleave', () => {
  document.querySelectorAll('.star').forEach(s => s.classList.remove('hover'));
  renderStars(detailRating);
});

function markDetailRead() {
  if (!detailBook) return;
  movedToRead.push({ ...detailBook, status: 'read' });
  save(LS_READ_MOV, movedToRead);
  closeModal('bookModal');
  updateStats();
  if (rendered.has('tbr')) renderTBR();
  if (rendered.has('read-owned')) renderReadOwned();
  if (rendered.has('library')) renderLibrary();
}
function markDetailSell() {
  if (!detailBook) return;
  if (!isInSell(detailBook)) {
    forSaleList.push({ title: detailBook.title, author: detailBook.author, genre: detailBook.genre });
    save(LS_SELL, forSaleList);
  }
  closeModal('bookModal');
  updateStats();
  if (rendered.has('tbr')) renderTBR();
  if (rendered.has('for-sale')) renderForSale();
  if (rendered.has('library')) renderLibrary();
}

// ── SPIN WHEEL ──
let spinMode = 'chaos';       // 'chaos' | 'genre'
let selectedGenre = null;
let wheelAngle = 0;
let isSpinning = false;
let currentWheelBooks = [];

const WHEEL_COLORS = [
  '#4c1d95','#5b21b6','#6d28d9','#7c3aed','#8b5cf6',
  '#9333ea','#a855f7','#6b21a8','#7e22ce','#4a1d96',
  '#3b0764','#581c87','#6d28d9','#7c3aed',
];

function setSpinMode(mode) {
  spinMode = mode;
  document.getElementById('modeChaos').classList.toggle('active', mode === 'chaos');
  document.getElementById('modeGenre').classList.toggle('active', mode === 'genre');
  document.getElementById('genrePicker').style.display = mode === 'genre' ? 'block' : 'none';
  if (mode === 'chaos') { selectedGenre = null; }
  buildWheel();
}

function buildGenreChips() {
  const tbr = allTBR();
  const genres = [...new Set(tbr.map(b => b.genre))].sort();
  const container = document.getElementById('genreChips');
  container.innerHTML = '';
  genres.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'genre-chip' + (g === selectedGenre ? ' on' : '');
    btn.textContent = g;
    btn.onclick = () => {
      selectedGenre = selectedGenre === g ? null : g;
      buildGenreChips();
      buildWheel();
    };
    container.appendChild(btn);
  });
}

function getWheelBooks() {
  const tbr = allTBR();
  if (spinMode === 'chaos' || !selectedGenre) return tbr;
  const filtered = tbr.filter(b => b.genre === selectedGenre);
  return filtered.length ? filtered : tbr;
}

function buildWheel() {
  currentWheelBooks = getWheelBooks();
  const canvas = document.getElementById('wheelCanvas');
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2, cy = canvas.height / 2;
  const r = cx - 8;
  const n = Math.min(currentWheelBooks.length, 16);
  if (!n) return;
  const arc = (2 * Math.PI) / n;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < n; i++) {
    const start = i * arc + wheelAngle;
    const end   = start + arc;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
    ctx.fill();
    ctx.strokeStyle = 'rgba(16,12,22,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + arc / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 10px Lato, sans-serif';
    const label = currentWheelBooks[i].title.length > 22
      ? currentWheelBooks[i].title.slice(0, 21) + '…'
      : currentWheelBooks[i].title;
    ctx.fillText(label, r - 10, 3.5);
    ctx.restore();
  }
  // center
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
  ctx.fillStyle = '#100c16';
  ctx.fill();
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.font = '18px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🐌', cx, cy);
}

function doSpin() {
  if (isSpinning) return;
  closeModal('resultModal');
  isSpinning = true;
  document.getElementById('spinBtn').disabled = true;

  const books = getWheelBooks();
  if (!books.length) { isSpinning = false; document.getElementById('spinBtn').disabled = false; return; }

  const winnerIdx = Math.floor(Math.random() * Math.min(books.length, 16));
  const n = Math.min(currentWheelBooks.length, 16);
  const arc = (2 * Math.PI) / n;
  const spins = 6 + Math.random() * 5;
  const sliceCenter = -(winnerIdx * arc + arc / 2) + (Math.PI * 1.5);
  const normalizedCurrent = ((wheelAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const diff = ((sliceCenter - normalizedCurrent) + 2 * Math.PI) % (2 * Math.PI);
  const totalSpin = spins * 2 * Math.PI + diff;

  const startAngle = wheelAngle;
  const duration = 4500;
  const startTime = performance.now();

  function ease(t) { return 1 - Math.pow(1 - t, 4); }
  function frame(now) {
    const t = Math.min((now - startTime) / duration, 1);
    wheelAngle = startAngle + totalSpin * ease(t);
    buildWheel();
    if (t < 1) { requestAnimationFrame(frame); }
    else {
      wheelAngle = startAngle + totalSpin;
      isSpinning = false;
      document.getElementById('spinBtn').disabled = false;
      showResult(currentWheelBooks[winnerIdx]);
    }
  }
  requestAnimationFrame(frame);
}

function showResult(book) {
  document.getElementById('resultTitle').textContent  = book.title;
  document.getElementById('resultAuthor').textContent = 'by ' + book.author;
  document.getElementById('resultGenre').textContent  = book.genre;
  const img = document.getElementById('resultCover');
  const ph  = document.getElementById('resultCoverPh');
  img.style.display = 'none'; ph.style.display = 'block';
  fetchCover(book.title, book.author).then(url => {
    if (url) { img.src = url; img.style.display = 'block'; ph.style.display = 'none'; }
  });
  document.getElementById('resultModal').classList.add('open');
  fireConfetti();
}

// ── CONFETTI ──
function fireConfetti() {
  const colors = ['#c084fc','#e9d5ff','#fbbf24','#86efac','#67e8f9','#f9a8d4'];
  const box = document.getElementById('confettiBox');
  for (let i = 0; i < 70; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      const dur = 1.2 + Math.random() * 1.2;
      el.style.cssText = `left:${Math.random()*100}vw;top:-12px;background:${colors[i%colors.length]};width:${5+Math.random()*8}px;height:${5+Math.random()*8}px;border-radius:${Math.random()>.5?'50%':'2px'};animation-duration:${dur}s;animation-delay:${Math.random()*0.4}s;`;
      box.appendChild(el);
      setTimeout(() => el.remove(), (dur + 0.6) * 1000);
    }, i * 18);
  }
}

// ── INIT ──
function init() {
  populateGenre('libGenre',  allOwned());
  populateGenre('tbrGenre',  allTBR());
  populateGenre('readGenre', allReadOwned());
  populateGenre('notOwnedGenre', allReadNotOwned());
  updateStats();
  renderLibrary();
  buildWheel();
  buildGenreChips();
  // genre picker hidden by default
  document.getElementById('genrePicker').style.display = 'none';
}

init();
