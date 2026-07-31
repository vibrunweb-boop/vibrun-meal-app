import { AuthError, requireTrainer } from '../../lib/auth.js';
import { getWithdrawnUserIds, setWithdrawn } from '../../lib/membershipData.js';

export default async function handler(req, res) {
  try {
    await requireTrainer(req);

    if (req.method === 'GET') {
      const withdrawnUserIds = await getWithdrawnUserIds();
      return res.status(200).json({ withdrawnUserIds });
    }

    if (req.method === 'POST') {
      const { userId, withdrawn } = req.body;
      const withdrawnUserIds = await setWithdrawn(userId, withdrawn);
      return res.status(200).json({ withdrawnUserIds });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}