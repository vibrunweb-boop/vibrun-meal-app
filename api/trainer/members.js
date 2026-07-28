import { redis } from '../../lib/redis.js';
import { AuthError, requireTrainer } from '../../lib/auth.js';
import { loadMemberData, todayStr } from '../../lib/memberData.js';

export default async function handler(req, res) {
  try {
    await requireTrainer(req);
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const members = (await redis.get('vibrun:members-list')) || [];
    const today = todayStr();

    const summaries = await Promise.all(
      members.map(async (m) => {
        const data = await loadMemberData(m.key);
        const todays = data.meals.filter((x) => x.date === today);
        const totalKcal = todays.reduce((s, x) => s + x.calories, 0);
        const totalSalt = todays.reduce((s, x) => s + x.salt, 0);
        return { ...m, totalKcal, totalSalt, targets: data.targets };
      })
    );

    return res.status(200).json(summaries);
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
