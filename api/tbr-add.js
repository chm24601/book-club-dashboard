export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { title, author } = req.body || {};
  if (!title || !author) return res.status(400).json({ error: 'title and author required' });

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  // Fetch cover from Open Library (free, no key required)
  let bookCover = '';
  try {
    const t = encodeURIComponent(title);
    const a = encodeURIComponent(author);
    const olRes = await fetch(
      `https://openlibrary.org/search.json?title=${t}&author=${a}&limit=1&fields=cover_i,isbn`
    );
    const olData = await olRes.json();
    const doc = olData.docs?.[0];
    if (doc?.cover_i) {
      bookCover = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
    } else if (doc?.isbn?.[0]) {
      bookCover = `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`;
    }
  } catch (e) {
    console.error('Open Library fetch failed:', e);
  }

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-tbr';
  const fields = { Title: title, Author: author, TBR: true, TBRVotes: 0, Slug: slug };
  if (bookCover) fields.BookCover = bookCover;

  try {
    const createRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Books`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records: [{ fields }] }),
    });
    const data = await createRes.json();
    if (!createRes.ok) return res.status(createRes.status).json(data);
    return res.status(200).json({ success: true, book: data.records[0] });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add book', details: error.message });
  }
}
