import { AuthError, getUserId } from '../lib/auth.js';
import { loadMemberData, saveMemberData, ensureRegistered } from '../lib/memberData.js';

export default async function handler(req, res) {
  try {
    const userId = getUserId(req);
    const displayName = req.headers['x-user-name'] || userId;
    await ensureRegistered(userId, displayName);

    if (req.method === 'GET') {
      const data = await loadMemberData(userId);
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      // body: { mealType, date, name, calories, protein, fat, carbs, fiber, salt, nutrients }
      const { mealType, date, ...rest } = req.body;
      if (!mealType || !date || !rest.name) {
        return res.status(400).json({ error: 'mealType, date, name は必須です' });
      }
      const meal = { id: crypto.randomUUID(), mealType, date, ...rest };
      const data = await loadMemberData(userId);
      const updated = { ...data, meals: [...data.meals, meal] };
      await saveMemberData(userId, updated);
      return res.status(201).json(meal);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      const data = await loadMemberData(userId);
      const updated = { ...data, meals: data.meals.filter((m) => m.id !== id) };
      await saveMemberData(userId, updated);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
