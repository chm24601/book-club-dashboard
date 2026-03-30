export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

  try {
    const { bookSlug, memberName, rating, note, link } = req.body;

    if (!bookSlug || !memberName || !rating || !note) {
      return res.status(400).json({
        error: 'bookSlug, memberName, rating, and note are required',
      });
    }

    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/BookEntries`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [
            {
              fields: {
                BookSlug: bookSlug,
                MemberName: memberName,
                Rating: Number(rating),
                Note: note,
                Link: link || '',
              },
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Error submitting entry:', error);
    res.status(500).json({ error: 'Failed to submit entry' });
  }
}