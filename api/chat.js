export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GROQ_KEY = process.env.Groq_Key;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  if (!GROQ_KEY) {
    return res.status(500).json({ error: 'AI not configured — add GROQ_KEY to environment variables.' });
  }

  const { messages } = req.body || {};
  if (!messages?.length) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Build club reading context from Airtable
  let systemPrompt = '';
  try {
    const [booksRes, entriesRes] = await Promise.all([
      fetch(`https://api.airtable.com/v0/${BASE_ID}/Books`, {
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      }),
      fetch(`https://api.airtable.com/v0/${BASE_ID}/BookEntries`, {
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      }),
    ]);

    const books = (await booksRes.json()).records?.map(r => r.fields) || [];
    const entries = (await entriesRes.json()).records?.map(r => r.fields) || [];

    const normalize = s => s?.toLowerCase().trim() || '';
    const currentBook = books.find(b => b.Current);
    const pastBooks = books
      .filter(b => !b.Current)
      .sort((a, b) => new Date(b['Date Read'] || 0) - new Date(a['Date Read'] || 0));

    const historyLines = pastBooks.map(b => {
      const bookEntries = entries.filter(
        e =>
          normalize(e.BookSlug) === normalize(b.Slug) ||
          normalize(e.BookSlug) === normalize(b.Title)
      );
      const ratings = bookEntries.map(e => Number(e.Rating)).filter(r => r > 0);
      const avg =
        ratings.length > 0
          ? (ratings.reduce((a, c) => a + c, 0) / ratings.length).toFixed(1)
          : null;
      const date = b['Date Read']
        ? new Date(b['Date Read']).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : '';
      const memberRatings = bookEntries
        .filter(e => Number(e.Rating) > 0)
        .map(e => `${e.MemberName}: ${e.Rating}`)
        .join(', ');
      return `- "${b.Title}" by ${b.Author}${avg ? ` — avg ${avg}/5` : ' — unrated'}${memberRatings ? ` (${memberRatings})` : ''}${date ? ` [${date}]` : ''}`;
    });

    systemPrompt = `You are a warm, sharp book advisor for "The Book Club for Difficult Women" — a small book club with 4 members: Courtney, Emily, Alyssa, and Sam.
${currentBook ? `\n**Currently reading:** "${currentBook.Title}" by ${currentBook.Author}\n` : ''}
**Club reading history:**
${historyLines.length > 0 ? historyLines.join('\n') : 'No books read yet — they\'re just getting started!'}

You help the club with:
1. **Book recommendations** — tailored to their taste based on what they've rated highly
2. **"Will we like this?"** — predict how the club might rate a specific book
3. **"Good discussion book?"** — assess a book's potential for rich conversation
4. Any other book questions

When making predictions or recommendations, reference their actual history. Note patterns in what they love vs. what didn't land. Be conversational, warm, and specific. Keep responses concise — 2–4 short paragraphs. Use **bold** sparingly for book titles.`;
  } catch (e) {
    console.error('Failed to build club context:', e);
    systemPrompt = `You are a warm book advisor for "The Book Club for Difficult Women," a small book club with 4 members. Help with recommendations, predicting if they'll enjoy a book, and discussion potential.`;
  }

  // Call Groq (OpenAI-compatible)
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({
            role: m.role === 'model' ? 'assistant' : m.role,
            content: m.content,
          })),
        ],
        max_tokens: 1000,
        temperature: 0.85,
      }),
    });

    const data = await groqRes.json();
    if (!groqRes.ok) {
      const detail = data?.error?.message || JSON.stringify(data);
      return res.status(500).json({ error: `AI error: ${detail}` });
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      return res.status(500).json({ error: 'No response from AI' });
    }

    return res.status(200).json({ response: text });
  } catch (error) {
    console.error('Groq call failed:', error);
    return res.status(500).json({ error: `Failed to reach AI service: ${error.message}` });
  }
}
