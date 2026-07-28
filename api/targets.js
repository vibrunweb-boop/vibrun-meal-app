import { AuthError, getUserId } from '../lib/auth.js';
import { loadMemberData, saveMemberData } from '../lib/memberData.js';

export default async function handler(req, res) {
  try {
    const userId = await getUserId(req);
    const data = await loadMemberData(userId);

    if (req.method === 'GET') {
      return res.status(200).json(data.targets);
    }

    if (req.method === 'PUT') {
      const updated = { ...data, targets: { ...data.targets, ...req.body } };
      await saveMemberData(userId, updated);
      return res.status(200).json(updated.targets);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
