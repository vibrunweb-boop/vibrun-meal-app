import { AuthError, verifyLineToken } from '../lib/auth.js';
import { loadMemberData, saveMemberData, ensureRegistered, DEFAULT_TARGETS } from '../lib/memberData.js';

export default async function handler(req, res) {
  try {
    const { userId, displayName } = await verifyLineToken(req);
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
      const { id, resetAll } = req.body;
      if (resetAll) {
        // 「このデータをリセット」ボタン用: 記録と目標値をすべて初期状態に戻す
        const fresh = { targets: { ...DEFAULT_TARGETS }, meals: [] };
        await saveMemberData(userId, fresh);
        return res.status(200).json(fresh);
      }
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
