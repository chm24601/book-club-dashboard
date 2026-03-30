export default async function handler(req, res) {
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  const TABLE_NAME = "BookEntries";

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data });
    }

    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}