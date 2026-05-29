export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { recordId } = req.body || {};
  if (!recordId) return res.status(400).json({ error: 'recordId required' });

  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  try {
    const getRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Books/${recordId}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    });
    const getData = await getRes.json();
    const currentVotes = getData.fields?.TBRVotes || 0;

    const patchRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Books/${recordId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: { TBRVotes: currentVotes + 1 } }),
    });
    const patchData = await patchRes.json();
    if (!patchRes.ok) return res.status(patchRes.status).json(patchData);
    return res.status(200).json({ votes: patchData.fields?.TBRVotes });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to vote', details: error.message });
  }
}
