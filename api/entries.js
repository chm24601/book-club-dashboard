export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ error: 'Missing book slug' });
  }

  try {
    const formula = encodeURIComponent(`{BookSlug}="${slug}"`);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/BookEntries?filterByFormula=${formula}&sort[0][field]=CreatedAt&sort[0][direction]=desc`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
}