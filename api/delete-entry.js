export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const { recordId } = req.body || {};
  if (!recordId) return res.status(400).json({ error: 'recordId required' });

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

  try {
    const r = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/BookEntries/${recordId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      }
    );
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete entry', details: err.message });
  }
}
