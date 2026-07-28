import { redis } from '../lib/redis.js';
import { AuthError, requireTrainer } from '../lib/auth.js';
import { DEFAULT_INGREDIENTS } from '../lib/defaultIngredients.js';

// このRedisデータベースを他アプリと共用しているため、キーに "vibrun:" プレフィックスを付けています。
const KEY = 'vibrun:ingredient-db';

async function loadOrSeed() {
  const existing = await redis.get(KEY);
  if (existing) return existing;
  const seeded = DEFAULT_INGREDIENTS.map((i) => ({ ...i, id: crypto.randomUUID() }));
  await redis.set(KEY, seeded);
  return seeded;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const list = await loadOrSeed();
      return res.status(200).json(list);
    }

    // 追加・編集・削除はトレーナーのみ
    await requireTrainer(req);
    const list = (await redis.get(KEY)) || [];

    if (req.method === 'POST') {
      const item = { id: crypto.randomUUID(), ...req.body };
      const updated = [...list, item];
      await redis.set(KEY, updated);
      return res.status(201).json(item);
    }

    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      const updated = list.map((i) => (i.id === id ? { ...i, ...fields } : i));
      await redis.set(KEY, updated);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      const updated = list.filter((i) => i.id !== id);
      await redis.set(KEY, updated);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
