import { redis } from '../lib/redis.js';

const KEY = 'vibrun:ingredient-db';

const NEW_ITEMS = [
  { name: 'もも', calories: 40, protein: 0.6, fat: 0.1, carbs: 10.2, fiber: 1.3, salt: 0, nutrients: 'カリウム' },
  { name: 'メロン', calories: 40, protein: 1.1, fat: 0.1, carbs: 9.8, fiber: 0.5, salt: 0, nutrients: 'カリウム, ビタミンC' },
  { name: 'すいか', calories: 41, protein: 0.6, fat: 0.1, carbs: 9.5, fiber: 0.3, salt: 0, nutrients: 'カリウム' },
  { name: 'オレンジ', calories: 42, protein: 1.0, fat: 0.1, carbs: 9.8, fiber: 0.8, salt: 0, nutrients: 'ビタミンC' },
  { name: 'レモン(果汁)', calories: 24, protein: 0.4, fat: 0.2, carbs: 8.6, fiber: 0, salt: 0, nutrients: 'ビタミンC' },
  { name: 'なし(梨)', calories: 38, protein: 0.3, fat: 0.1, carbs: 10.4, fiber: 0.9, salt: 0, nutrients: 'カリウム' },
  { name: '柿', calories: 60, protein: 0.4, fat: 0.2, carbs: 15.9, fiber: 1.6, salt: 0, nutrients: 'ビタミンC, βカロテン' },
  { name: 'さくらんぼ', calories: 60, protein: 1.0, fat: 0.2, carbs: 14.0, fiber: 1.2, salt: 0, nutrients: 'カリウム' },
  { name: 'ブルーベリー', calories: 48, protein: 0.5, fat: 0.1, carbs: 9.6, fiber: 3.3, salt: 0, nutrients: 'ビタミンE, ポリフェノール' },
  { name: 'マンゴー', calories: 68, protein: 0.6, fat: 0.1, carbs: 16.9, fiber: 1.3, salt: 0, nutrients: 'ビタミンC, βカロテン' },
];

async function main() {
  const existing = (await redis.get(KEY)) || [];
  const existingNames = new Set(existing.map((i) => i.name));

  const toAdd = NEW_ITEMS.filter((i) => !existingNames.has(i.name)).map((i) => ({
    ...i,
    id: crypto.randomUUID(),
  }));

  if (toAdd.length === 0) {
    console.log('追加対象なし(すべて登録済みでした)');
    return;
  }

  const updated = [...existing, ...toAdd];
  await redis.set(KEY, updated);
  console.log(`${toAdd.length}件を追加しました:`);
  toAdd.forEach((i) => console.log(' -', i.name));
}

main().catch((err) => {
  console.error('エラー:', err);
  process.exit(1);
});