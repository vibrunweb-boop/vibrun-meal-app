import { AuthError, requireTrainer } from '../../lib/auth.js';
import { loadMemberData } from '../../lib/memberData.js';

export default async function handler(req, res) {
  try {
    requireTrainer(req);
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const data = await loadMemberData(String(userId));
    return res.status(200).json(data);
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
