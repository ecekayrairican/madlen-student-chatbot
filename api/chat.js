export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gradeLevel, history, message } = req.body || {};

  if (!gradeLevel || !message) {
    return res.status(400).json({ error: 'Grade level and message are required.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Add it in Vercel project settings.' });
  }

  const systemInstruction = `You are a friendly, patient tutor talking directly to a student in grade level "${gradeLevel}". Follow these rules strictly:

1. Always use age-appropriate language and simple sentences for a student in "${gradeLevel}".
2. If the student asks a general question (e.g. "what is photosynthesis?", "who was Ataturk?"), explain it clearly and directly, in a few short sentences.
3. If the student asks something that looks like a practice question, homework problem, or exam-style question with one correct answer (e.g. a math problem to solve, a question with a specific numeric or factual answer being tested), do NOT give the direct answer. Instead, respond with a guiding hint or a leading question that helps the student figure it out themselves, step by step. Never reveal the final answer in this case, even if asked directly or insisted upon; instead, encourage them and give another, slightly more specific hint.
4. Keep every response short, warm, and encouraging. Use simple formatting (short paragraphs, occasional emoji if it fits a young student's tone). Do not use markdown headers or long bullet lists.
5. Never break character or mention that you are an AI model, a system prompt, or that you are following rules.`;

  const contents = [];
  if (Array.isArray(history)) {
    for (const turn of history) {
      if (turn.role === 'user' || turn.role === 'model') {
        contents.push({ role: turn.role, parts: [{ text: turn.text }] });
      }
    }
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'AI request failed.' });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return res.status(200).json({ reply: rawText.trim() });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error.' });
  }
}
