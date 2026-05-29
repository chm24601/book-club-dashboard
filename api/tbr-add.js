export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { title, author } = req.body || {};
  if (!title || !author) return res.status(400).json({ error: 'title and author required' });

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  // Fetch cover from Google Books
  let bookCover = '';
  try {
    const query = encodeURIComponent(`intitle:${title} inauthor:${author}`);
    const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`);
    const gbData = await gbRes.json();
    const item = gbData.items?.[0];
    const thumbnail = item?.volumeInfo?.imageLinks?.thumbnail || item?.volumeInfo?.imageLinks?.smallThumbnail;
    if (thumbnail) {
      bookCover = thumbnail.replace('http://', 'https://').replace('&edge=curl', '').replace('zoom=1', 'zoom=2');
    }
  } catch (e) {
    console.error('Google Books fetch failed:', e);
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
