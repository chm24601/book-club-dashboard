export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const { recordId } = req.body || {};
  if (!recordId) return res.status(400).json({ error: 'recordId required' });

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  try {
    const delRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Books/${recordId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    });
    const data = await delRes.json();
    if (!delRes.ok) return res.status(delRes.status).json(data);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete', details: error.message });
  }
}
