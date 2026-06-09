// ── COVER FETCHING via Google Books API ──
const coverCache = {};

async function fetchCover(title, author) {
  const key = title + '||' + author;
  if (coverCache[key] !== undefined) return coverCache[key];
  try {
    const q = encodeURIComponent(`intitle:${title} inauthor:${author}`);
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&fields=items(volumeInfo/imageLinks)`);
    const data = await res.json();
    const links = data?.items?.[0]?.volumeInfo?.imageLinks;
    // prefer larger thumbnail, strip http → https
    const url = (links?.thumbnail || links?.smallThumbnail || '').replace('http://', 'https://');
    // upgrade to larger size
    const large = url ? url.replace('zoom=1', 'zoom=2') : '';
    coverCache[key] = large || null;
    return coverCache[key];
  } catch {
    coverCache[key] = null;
    return null;
  }
}

function coverImgEl(book, className) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width:100%;height:100%;';
  // show placeholder immediately, swap in cover when ready
  const ph = makePlaceholder(book);
  wrap.appendChild(ph);

  fetchCover(book.title, book.author).then(url => {
    if (!url) return; // keep placeholder
    const img = document.createElement('img');
    img.className = className;
    img.alt = book.title;
    img.src = url;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    img.onerror = () => {}; // keep placeholder on error
    img.onload = () => { if (wrap.contains(ph)) wrap.replaceChild(img, ph); };
  });

  return wrap;
}

function makePlaceholder(book) {
  const div = document.createElement('div');
  div.className = 'book-cover-ph';
  div.innerHTML = `
    <div class="ph-genre-dot"></div>
    <div class="ph-title">${book.title}</div>
    <div class="ph-author">${book.author}</div>
  `;
  return div;
}

function makeBookItem(book) {
  const wrap = document.createElement('div');
  wrap.className = 'book-item';
  wrap.appendChild(coverImgEl(book, 'book-cover-img'));
  const ov = document.createElement('div');
  ov.className = 'book-overlay';
  ov.innerHTML = `
    <div class="ov-title">${book.title}</div>
    <div class="ov-author">${book.author}</div>
    <div class="ov-genre">${book.genre}</div>
  `;
  wrap.appendChild(ov);
  return wrap;
}

// ── STATE ──
const LS_TBR_KEY  = 'tbr_nook_added_tbr';
const LS_RNO_KEY  = 'tbr_nook_read_not_owned';

function loadLocalTBR()     { try { return JSON.parse(localStorage.getItem(LS_TBR_KEY))  || []; } catch { return []; } }
function loadLocalNotOwned(){ try { return JSON.parse(localStorage.getItem(LS_RNO_KEY)) || []; } catch { return []; } }
function saveLocalTBR(arr)      { localStorage.setItem(LS_TBR_KEY,  JSON.stringify(arr)); }
function saveLocalNotOwned(arr) { localStorage.setItem(LS_RNO_KEY, JSON.stringify(arr)); }

let addedTBR     = loadLocalTBR();
let addedNotOwned = loadLocalNotOwned();

function allTBR() {
  return [...OWNED_BOOKS.filter(b => b.status === 'tbr'), ...addedTBR];
}
function allReadOwned() {
  return OWNED_BOOKS.filter(b => b.status === 'read');
}
function allReadNotOwned() {
  return addedNotOwned;
}

// ── RENDER ──
function filterSort(books, search, genre, sort) {
  let out = books.filter(b => {
    const s = search.toLowerCase();
    return (!s || b.title.toLowerCase().includes(s) || b.author.toLowerCase().includes(s))
        && (!genre || b.genre === genre);
  });
  if (sort === 'author') out.sort((a,b) => a.author.localeCompare(b.author));
  else if (sort === 'genre') out.sort((a,b) => a.genre.localeCompare(b.genre));
  else out.sort((a,b) => a.title.localeCompare(b.title));
  return out;
}

function renderGrid(gridEl, countEl, books) {
  gridEl.innerHTML = '';
  countEl.textContent = `${books.length} book${books.length !== 1 ? 's' : ''}`;
  if (!books.length) {
    const emp = document.createElement('div');
    emp.className = 'empty-state';
    emp.innerHTML = `<div class="e-icon">📭</div><h3>Nothing here yet</h3><p>Try adjusting filters or adding a book.</p>`;
    gridEl.appendChild(emp);
    return;
  }
  books.forEach(b => gridEl.appendChild(makeBookItem(b)));
}

function renderTBR() {
  renderGrid(
    document.getElementById('tbrGrid'),
    document.getElementById('tbrCount'),
    filterSort(allTBR(),
      document.getElementById('tbrSearch').value,
      document.getElementById('tbrGenre').value,
      document.getElementById('tbrSort').value
    )
  );
}

function renderReadOwned() {
  renderGrid(
    document.getElementById('readGrid'),
    document.getElementById('readCount'),
    filterSort(allReadOwned(),
      document.getElementById('readSearch').value,
      document.getElementById('readGenre').value,
      document.getElementById('readSort').value
    )
  );
}

function renderNotOwned() {
  renderGrid(
    document.getElementById('notOwnedGrid'),
    document.getElementById('notOwnedCount'),
    filterSort(allReadNotOwned(),
      document.getElementById('notOwnedSearch').value,
      document.getElementById('notOwnedGenre').value,
      ''
    )
  );
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
  document.getElementById('sTotal').textContent    = OWNED_BOOKS.length + addedTBR.length;
}

// ── TABS ──
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ── FILTER LISTENERS ──
['tbrSearch','tbrGenre','tbrSort'].forEach(id =>
  document.getElementById(id).addEventListener('input', renderTBR));
['readSearch','readGenre','readSort'].forEach(id =>
  document.getElementById(id).addEventListener('input', renderReadOwned));
['notOwnedSearch','notOwnedGenre'].forEach(id =>
  document.getElementById(id).addEventListener('input', renderNotOwned));

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
  saveLocalTBR(addedTBR);
  ['addTitle','addAuthor','addGenre'].forEach(id => document.getElementById(id).value = '');
  closeModal('addModal');
  updateStats();
  renderTBR();
}

function submitNotOwnedBook() {
  const title  = document.getElementById('notOwnedTitle').value.trim();
  const author = document.getElementById('notOwnedAuthor').value.trim();
  const genre  = document.getElementById('notOwnedGenre2').value.trim() || 'Uncategorized';
  if (!title || !author) return;
  addedNotOwned.push({ title, author, genre });
  saveLocalNotOwned(addedNotOwned);
  ['notOwnedTitle','notOwnedAuthor','notOwnedGenre2'].forEach(id => document.getElementById(id).value = '');
  closeModal('addNotOwnedModal');
  updateStats();
  renderNotOwned();
  // Repopulate genre dropdown
  const sel = document.getElementById('notOwnedGenre');
  if (genre && !Array.from(sel.options).find(o => o.value === genre)) {
    const o = document.createElement('option');
    o.value = genre; o.textContent = genre;
    sel.appendChild(o);
  }
}

// ── SPIN WHEEL ──
const PROMPTS = [
  { id: 'any',       label: '🎲 Anything' },
  { id: 'literary',  label: '📜 Literary' },
  { id: 'horror',    label: '👻 Horror' },
  { id: 'fantasy',   label: '🧙 Fantasy' },
  { id: 'historical',label: '🏛️ Historical' },
  { id: 'poetry',    label: '🌿 Poetry' },
  { id: 'classic',   label: '🕰️ Classic' },
  { id: 'thriller',  label: '🔪 Thriller' },
];

const GENRE_MAP = {
  any:        null,
  literary:   'literary',
  horror:     'horror',
  fantasy:    'fantasy',
  historical: 'historical',
  poetry:     'poetry',
  classic:    'classic',
  thriller:   'thriller',
};

const WHEEL_COLORS = [
  '#5b21b6','#6d28d9','#7c3aed','#8b5cf6',
  '#9333ea','#a855f7','#4c1d95','#6b21a8',
  '#7e22ce','#4a1d96','#5b21b6','#3b0764',
];

let currentPrompt = 'any';
let wheelAngle = 0;
let isSpinning = false;
let currentWheelBooks = [];

function renderPrompts() {
  const row = document.getElementById('promptRow');
  row.innerHTML = '';
  PROMPTS.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'prompt-chip' + (p.id === 'any' ? ' on' : '');
    btn.textContent = p.label;
    btn.onclick = () => {
      document.querySelectorAll('.prompt-chip').forEach(c => c.classList.remove('on'));
      btn.classList.add('on');
      currentPrompt = p.id;
      buildWheel();
    };
    row.appendChild(btn);
  });
}

function getWheelBooks() {
  const tbr = allTBR();
  if (currentPrompt === 'any') return tbr;
  const keyword = GENRE_MAP[currentPrompt];
  if (!keyword) return tbr;
  const filtered = tbr.filter(b => b.genre.toLowerCase().includes(keyword));
  return filtered.length ? filtered : tbr;
}

function buildWheel() {
  currentWheelBooks = getWheelBooks();
  const canvas = document.getElementById('wheelCanvas');
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2, cy = canvas.height / 2;
  const r = cx - 8;
  const n = Math.min(currentWheelBooks.length, 14);
  if (!n) return;
  const arc = (2 * Math.PI) / n;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < n; i++) {
    const start = i * arc + wheelAngle;
    const end   = start + arc;
    // slice fill
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
    ctx.fill();
    ctx.strokeStyle = 'rgba(16,12,22,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // label
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + arc / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.font = 'bold 10.5px Lato, sans-serif';
    const label = currentWheelBooks[i].title.length > 20
      ? currentWheelBooks[i].title.slice(0, 19) + '…'
      : currentWheelBooks[i].title;
    ctx.fillText(label, r - 10, 3.5);
    ctx.restore();
  }

  // center circle
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
  ctx.fillStyle = '#100c16';
  ctx.fill();
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // snail emoji center
  ctx.font = '16px serif';
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

  const winnerIdx = Math.floor(Math.random() * Math.min(books.length, 14));
  const n = Math.min(currentWheelBooks.length, 14);
  const arc = (2 * Math.PI) / n;
  const spins = 6 + Math.random() * 4;
  const sliceCenter = -(winnerIdx * arc + arc / 2) + (Math.PI * 1.5);
  const normalizedCurrent = ((wheelAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const diff = ((sliceCenter - normalizedCurrent) + 2 * Math.PI) % (2 * Math.PI);
  const totalSpin = spins * 2 * Math.PI + diff;

  const startAngle = wheelAngle;
  const endAngle   = startAngle + totalSpin;
  const duration   = 4500;
  const startTime  = performance.now();

  function ease(t) { return 1 - Math.pow(1 - t, 4); }

  function frame(now) {
    const t = Math.min((now - startTime) / duration, 1);
    wheelAngle = startAngle + totalSpin * ease(t);
    buildWheel();
    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      wheelAngle = endAngle;
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
  img.style.display = 'none';
  ph.style.display  = 'block';
  fetchCover(book.title, book.author).then(url => {
    if (url) {
      img.src = url;
      img.style.display = 'block';
      ph.style.display  = 'none';
    }
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
      el.style.cssText = `
        left:${Math.random()*100}vw;
        top:-12px;
        background:${colors[i % colors.length]};
        width:${5+Math.random()*8}px;
        height:${5+Math.random()*8}px;
        border-radius:${Math.random()>0.5?'50%':'2px'};
        animation-duration:${dur}s;
        animation-delay:${Math.random()*0.4}s;
      `;
      box.appendChild(el);
      setTimeout(() => el.remove(), (dur + 0.6) * 1000);
    }, i * 18);
  }
}

// ── INIT ──
function init() {
  populateGenre('tbrGenre',   allTBR());
  populateGenre('readGenre',  allReadOwned());
  populateGenre('notOwnedGenre', allReadNotOwned());
  updateStats();
  renderTBR();
  renderReadOwned();
  renderNotOwned();
  renderPrompts();
  buildWheel();
}

init();
