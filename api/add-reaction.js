const VALID_EMOJIS = ['❤️', '🔥', '💀', '😭'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { recordId, emoji } = req.body || {};
  if (!recordId || !emoji) return res.status(400).json({ error: 'recordId and emoji required' });
  if (!VALID_EMOJIS.includes(emoji)) return res.status(400).json({ error: 'Invalid emoji' });

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

  try {
    const getRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/BookEntries/${recordId}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const getData = await getRes.json();

    let reactions = {};
    try { reactions = JSON.parse(getData.fields?.Reactions || '{}'); } catch {}
    reactions[emoji] = (reactions[emoji] || 0) + 1;

    const patchRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/BookEntries/${recordId}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { Reactions: JSON.stringify(reactions) } }),
      }
    );
    const patchData = await patchRes.json();
    if (!patchRes.ok) return res.status(patchRes.status).json(patchData);
    return res.status(200).json({ success: true, reactions });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add reaction', details: err.message });
  }
}
