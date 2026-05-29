export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { recordId, pin, month } = req.body || {};
  const VALID_PIN = process.env.ADD_BOOK_PIN || '609';

  if (pin !== VALID_PIN) return res.status(403).json({ error: 'Invalid PIN' });
  if (!recordId) return res.status(400).json({ error: 'recordId required' });

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  try {
    // Unset any existing current book
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
          records: listData.records.map(r => ({ id: r.id, fields: { Current: false } })),
        }),
      });
    }

    // Promote TBR book to current
    const fields = { Current: true, TBR: false };
    if (month) fields['Date Read'] = `${month}-01`;

    const promoteRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Books/${recordId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });
    const promoteData = await promoteRes.json();
    if (!promoteRes.ok) return res.status(promoteRes.status).json(promoteData);
    return res.status(200).json({ success: true, book: promoteData.fields });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to promote book', details: error.message });
  }
}
