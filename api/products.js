import { redis } from '../lib/redis.js';
import { AuthError, getUserId, requireTrainer } from '../lib/auth.js';

// このRedisデータベースを他アプリと共用しているため、キーに "vibrun:" プレフィックスを付けています。
const KEY = 'vibrun:product-db';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const list = (await redis.get(KEY)) || [];
      return res.status(200).json(list);
    }

    if (req.method === 'POST') {
      // 会員・トレーナーどちらも登録可能(コンビニ・スーパー商品をみんなのデータベースに登録)
      const userId = await getUserId(req);
      const { name, store, barcode, calories, protein, fat, carbs, fiber, salt, nutrients } = req.body;
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: '商品名は必須です' });
      }
      const trimmed = String(name).trim();
      const list = (await redis.get(KEY)) || [];
      const barcodeIdx = barcode ? list.findIndex((p) => p.barcode && p.barcode === barcode) : -1;
      const idx = barcodeIdx >= 0 ? barcodeIdx : list.findIndex((p) => p.name === trimmed);
      const isNew = idx < 0;
      let updated;
      let item;

      if (!isNew) {
        item = {
          ...list[idx],
          name: trimmed,
          store: store || list[idx].store,
          barcode: barcode || list[idx].barcode || '',
          calories: calories ?? list[idx].calories,
          protein: protein ?? list[idx].protein,
          fat: fat ?? list[idx].fat,
          carbs: carbs ?? list[idx].carbs,
          fiber: fiber ?? list[idx].fiber,
          salt: salt ?? list[idx].salt,
          nutrients: nutrients || list[idx].nutrients || '',
          updatedAt: Date.now(),
        };
        updated = [...list];
        updated[idx] = item;
      } else {
        item = {
          id: crypto.randomUUID(),
          name: trimmed,
          store: store || '',
          barcode: barcode || '',
          calories: calories || 0,
          protein: protein || 0,
          fat: fat || 0,
          carbs: carbs || 0,
          fiber: fiber || 0,
          salt: salt || 0,
          nutrients: nutrients || '',
          addedBy: userId,
          useCount: 1,
          createdAt: Date.now(),
        };
        updated = [...list, item];
      }

      await redis.set(KEY, updated);
      return res.status(200).json({ item, isNew });
    }

    if (req.method === 'PATCH') {
      // 食事記録で既存の登録商品を選んだ時の利用回数カウント(人気順の参考値)
      await getUserId(req);
      const { id } = req.body;
      const list = (await redis.get(KEY)) || [];
      const updated = list.map((p) => (p.id === id ? { ...p, useCount: (p.useCount || 1) + 1 } : p));
      await redis.set(KEY, updated);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'PUT') {
      // トレーナー管理画面からの直接編集
      await requireTrainer(req);
      const { id, ...fields } = req.body;
      const list = (await redis.get(KEY)) || [];
      const updated = list.map((p) => (p.id === id ? { ...p, ...fields, updatedAt: Date.now() } : p));
      await redis.set(KEY, updated);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      await requireTrainer(req);
      const { id } = req.body;
      const list = (await redis.get(KEY)) || [];
      const updated = list.filter((p) => p.id !== id);
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
