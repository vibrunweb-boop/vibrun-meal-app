import { redis } from '../lib/redis.js';

const KEY = 'vibrun:ingredient-db';

const NEW_ITEMS = [
  // いも類
  { name: 'じゃがいも(蒸し)', calories: 76, protein: 1.5, fat: 0.1, carbs: 17.6, fiber: 3.5, salt: 0, nutrients: 'ビタミンC, カリウム' },
  { name: 'さつまいも(蒸し)', calories: 131, protein: 1.2, fat: 0.2, carbs: 30.3, fiber: 2.3, salt: 0, nutrients: 'ビタミンC, カリウム' },
  { name: '里芋(ゆで)', calories: 59, protein: 1.5, fat: 0.1, carbs: 13.1, fiber: 2.4, salt: 0, nutrients: 'カリウム' },
  { name: '長芋', calories: 65, protein: 2.2, fat: 0.3, carbs: 13.9, fiber: 1.0, salt: 0, nutrients: 'カリウム' },
  { name: 'こんにゃく', calories: 5, protein: 0.1, fat: 0, carbs: 2.3, fiber: 2.2, salt: 0, nutrients: '' },
  { name: '白滝(しらたき)', calories: 6, protein: 0.2, fat: 0, carbs: 3.0, fiber: 2.9, salt: 0, nutrients: '' },
  { name: '春雨(乾)', calories: 342, protein: 0.2, fat: 0.4, carbs: 84.0, fiber: 4.1, salt: 0, nutrients: '' },
  // 調味料・油脂
  { name: '食塩', calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, salt: 99.5, nutrients: '' },
  { name: '上白糖(砂糖)', calories: 391, protein: 0, fat: 0, carbs: 99.3, fiber: 0, salt: 0, nutrients: '' },
  { name: 'みりん(本みりん)', calories: 241, protein: 0.1, fat: 0, carbs: 43.2, fiber: 0, salt: 0, nutrients: '' },
  { name: '料理酒', calories: 106, protein: 0.2, fat: 0, carbs: 4.9, fiber: 0, salt: 0, nutrients: '' },
  { name: '酢(穀物酢)', calories: 25, protein: 0, fat: 0, carbs: 2.4, fiber: 0, salt: 0, nutrients: '' },
  { name: 'ポン酢しょうゆ', calories: 66, protein: 3.0, fat: 0, carbs: 12.6, fiber: 0.2, salt: 7.8, nutrients: '' },
  { name: 'めんつゆ(3倍濃縮)', calories: 82, protein: 3.9, fat: 0, carbs: 15.6, fiber: 0, salt: 6.7, nutrients: '' },
  { name: 'カレールー', calories: 474, protein: 6.5, fat: 34.1, carbs: 39.3, fiber: 3.5, salt: 10.6, nutrients: '' },
  { name: 'オイスターソース', calories: 107, protein: 3.2, fat: 0.3, carbs: 18.3, fiber: 0.2, salt: 11.4, nutrients: '' },
  // 野菜
  { name: 'トマト', calories: 20, protein: 0.7, fat: 0.1, carbs: 4.7, fiber: 1.0, salt: 0, nutrients: 'ビタミンC, カリウム' },
  { name: 'ミニトマト', calories: 30, protein: 1.1, fat: 0.1, carbs: 7.2, fiber: 1.4, salt: 0, nutrients: 'ビタミンC, βカロテン' },
  { name: 'きゅうり', calories: 14, protein: 1.0, fat: 0.1, carbs: 3.0, fiber: 1.1, salt: 0, nutrients: 'カリウム' },
  { name: 'レタス', calories: 12, protein: 0.6, fat: 0.1, carbs: 2.8, fiber: 1.1, salt: 0, nutrients: 'カリウム' },
  { name: '大根', calories: 18, protein: 0.5, fat: 0.1, carbs: 4.1, fiber: 1.4, salt: 0, nutrients: 'ビタミンC' },
  { name: '長ねぎ', calories: 35, protein: 1.4, fat: 0.1, carbs: 8.3, fiber: 2.5, salt: 0, nutrients: 'ビタミンC, カルシウム' },
  { name: 'パプリカ(赤)', calories: 30, protein: 1.0, fat: 0.2, carbs: 7.2, fiber: 1.6, salt: 0, nutrients: 'ビタミンC, βカロテン' },
  { name: 'ズッキーニ', calories: 14, protein: 1.3, fat: 0.1, carbs: 2.8, fiber: 1.3, salt: 0, nutrients: 'カリウム' },
  { name: 'セロリ', calories: 12, protein: 0.4, fat: 0.1, carbs: 3.6, fiber: 1.5, salt: 0.1, nutrients: 'カリウム' },
  { name: '水菜', calories: 23, protein: 2.2, fat: 0.1, carbs: 4.8, fiber: 3.0, salt: 0.1, nutrients: 'ビタミンC, カルシウム' },
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