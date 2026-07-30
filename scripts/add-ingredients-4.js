import { redis } from '../lib/redis.js';

const KEY = 'vibrun:ingredient-db';

const NEW_ITEMS = [
  // トレーニング関連食品
  { name: 'プロテインパウダー(ソイ)', calories: 375, protein: 80.0, fat: 3.0, carbs: 6.0, fiber: 2.0, salt: 0.8, nutrients: '' },
  { name: 'プロテインパウダー(カゼイン)', calories: 370, protein: 75.0, fat: 2.0, carbs: 8.0, fiber: 0, salt: 0.6, nutrients: '' },
  { name: 'プロテインドリンク(市販パック)', calories: 62, protein: 4.5, fat: 0.5, carbs: 9.5, fiber: 0.5, salt: 0.1, nutrients: '' },
  { name: 'EAAパウダー', calories: 370, protein: 90.0, fat: 0, carbs: 0, fiber: 0, salt: 0.2, nutrients: '' },
  { name: 'BCAAパウダー', calories: 370, protein: 90.0, fat: 0, carbs: 0, fiber: 0, salt: 0.2, nutrients: '' },
  { name: 'ウェイトゲイナー', calories: 390, protein: 20.0, fat: 3.0, carbs: 70.0, fiber: 2.0, salt: 0.3, nutrients: '' },
  { name: 'カロリーメイト(ブロック)', calories: 422, protein: 8.7, fat: 22.4, carbs: 57.3, fiber: 2.5, salt: 0.8, nutrients: 'ビタミンB群, カルシウム' },
  // 大豆製品
  { name: '高野豆腐(乾)', calories: 496, protein: 50.5, fat: 34.1, carbs: 4.2, fiber: 2.5, salt: 1.1, nutrients: 'カルシウム, 鉄' },
  { name: 'がんもどき', calories: 223, protein: 15.3, fat: 17.8, carbs: 2.0, fiber: 1.4, salt: 0.5, nutrients: 'カルシウム' },
  { name: 'ソイミート(乾燥・大豆ミート)', calories: 316, protein: 50.0, fat: 2.0, carbs: 30.0, fiber: 15.0, salt: 1.5, nutrients: '鉄' },
  { name: '豆腐バー(市販プロテイン)', calories: 137, protein: 15.0, fat: 5.5, carbs: 7.5, fiber: 1.2, salt: 0.6, nutrients: '' },
  { name: 'きな粉', calories: 451, protein: 36.7, fat: 25.7, carbs: 28.5, fiber: 18.1, salt: 0, nutrients: 'カルシウム, 鉄' },
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