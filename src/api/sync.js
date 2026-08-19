

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { audioUrl } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': '9e2613920c3740f99abe8dc8afe7ea63', // <-- Put your real key here
        'content-type': 'application/json',
      },
      body: JSON.stringify({ audio_url: audioUrl, utterances: true }),
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}