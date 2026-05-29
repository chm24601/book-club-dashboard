export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const VALID_PIN = process.env.ADD_BOOK_PIN || '609';

  const { pin, title, author, month } = req.body || {};

  if (pin !== VALID_PIN) {
    return res.status(403).json({ error: 'Invalid PIN' });
  }

  if (!title || !author) {
    return res.status(400).json({ error: 'title and author are required' });
  }

  try {
    // 1. Auto-fetch cover from Google Books API (no key required)
    let bookCover = '';
    try {
      const query = encodeURIComponent(`intitle:${title} inauthor:${author}`);
      const gbRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`
      );
      const gbData = await gbRes.json();
      const item = gbData.items?.[0];
      const thumbnail =
        item?.volumeInfo?.imageLinks?.thumbnail ||
        item?.volumeInfo?.imageLinks?.smallThumbnail;
      if (thumbnail) {
        bookCover = thumbnail
          .replace('http://', 'https://')
          .replace('&edge=curl', '')
          .replace('zoom=1', 'zoom=2');
      }
    } catch (e) {
      console.error('Google Books fetch failed:', e);
    }

    // 2. Find and unset any existing current book
    const listRes = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/Books?filterByFormula=%7BCurrent%7D`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const listData = await listRes.json();

    if (listData.records?.length > 0) {
      await fetch(`https://api.airtable.com/v0/${BASE_ID}/Books`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: listData.records.map(r => ({
            id: r.id,
            fields: { Current: false },
          })),
        }),
      });
    }

    // 3. Create new book record
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const fields = {
      Title: title,
      Author: author,
      Current: true,
      Slug: slug,
    };
    if (bookCover) fields.BookCover = bookCover;
    if (month) fields['Date Read'] = `${month}-01`;

    const createRes = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/Books`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: [{ fields }] }),
      }
    );

    const createData = await createRes.json();
    if (!createRes.ok) {
      console.error('Airtable create error:', createData);
      return res.status(createRes.status).json(createData);
    }

    return res.status(200).json({
      success: true,
      book: createData.records[0]?.fields,
      coverFound: !!bookCover,
    });
  } catch (error) {
    console.error('Error adding book:', error);
    return res.status(500).json({ error: 'Failed to add book', details: error.message });
  }
}
