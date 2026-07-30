import { redis } from '../lib/redis.js';

// このRedisデータベースを他アプリと共用しているため、キーに "vibrun:" プレフィックスを付けています。
const KEY = 'vibrun:ingredient-db';

const NEW_ITEMS = [
  // 野菜
  { name: 'ブロッコリー', calories: 33, protein: 4.3, fat: 0.5, carbs: 5.2, fiber: 4.4, salt: 0, nutrients: 'ビタミンC, 葉酸' },
  { name: 'キャベツ', calories: 21, protein: 1.3, fat: 0.2, carbs: 5.2, fiber: 1.8, salt: 0, nutrients: 'ビタミンC, ビタミンK' },
  { name: '白菜', calories: 13, protein: 0.8, fat: 0.1, carbs: 3.2, fiber: 1.3, salt: 0, nutrients: 'ビタミンC' },
  { name: 'カリフラワー', calories: 27, protein: 3.0, fat: 0.1, carbs: 5.2, fiber: 2.9, salt: 0, nutrients: 'ビタミンC' },
  { name: 'オクラ', calories: 26, protein: 2.1, fat: 0.2, carbs: 6.6, fiber: 5.0, salt: 0, nutrients: 'カルシウム, ビタミンK' },
  { name: 'さやいんげん', calories: 23, protein: 1.8, fat: 0.1, carbs: 5.1, fiber: 2.4, salt: 0, nutrients: 'カロテン, ビタミンC' },
  { name: 'アスパラガス', calories: 21, protein: 2.6, fat: 0.2, carbs: 3.9, fiber: 1.8, salt: 0, nutrients: '葉酸, ビタミンK' },
  { name: 'れんこん', calories: 66, protein: 1.9, fat: 0.1, carbs: 15.5, fiber: 2.0, salt: 0.1, nutrients: 'ビタミンC, カリウム' },
  { name: 'たけのこ(ゆで)', calories: 26, protein: 3.6, fat: 0.2, carbs: 4.3, fiber: 2.8, salt: 0, nutrients: 'カリウム' },
  { name: '切り干し大根(乾)', calories: 280, protein: 9.7, fat: 0.8, carbs: 68.6, fiber: 20.7, salt: 0.3, nutrients: 'カルシウム, 鉄, カリウム' },
  // きのこ類
  { name: '生しいたけ', calories: 25, protein: 3.1, fat: 0.3, carbs: 6.4, fiber: 4.9, salt: 0, nutrients: 'ビタミンD' },
  { name: 'えのきたけ', calories: 22, protein: 2.7, fat: 0.2, carbs: 7.6, fiber: 3.9, salt: 0, nutrients: 'ビタミンB1' },
  { name: 'まいたけ', calories: 15, protein: 2.0, fat: 0.5, carbs: 4.4, fiber: 3.5, salt: 0, nutrients: 'ビタミンD' },
  { name: 'えりんぎ', calories: 19, protein: 1.7, fat: 0.4, carbs: 6.0, fiber: 3.4, salt: 0, nutrients: 'ビタミンD' },
  { name: 'なめこ', calories: 15, protein: 1.0, fat: 0.1, carbs: 5.4, fiber: 3.4, salt: 0, nutrients: '' },
  { name: 'マッシュルーム', calories: 11, protein: 2.9, fat: 0.3, carbs: 2.1, fiber: 2.0, salt: 0, nutrients: 'ビタミンB2' },
  // 海藻類
  { name: 'わかめ(生)', calories: 24, protein: 1.9, fat: 0.2, carbs: 5.6, fiber: 3.6, salt: 1.3, nutrients: 'ヨウ素, カルシウム' },
  { name: 'カットわかめ(乾燥)', calories: 138, protein: 13.6, fat: 1.6, carbs: 41.3, fiber: 32.7, salt: 16.8, nutrients: 'ヨウ素, カルシウム' },
  { name: 'もずく(味付け)', calories: 4, protein: 0.2, fat: 0.1, carbs: 1.4, fiber: 1.4, salt: 0.2, nutrients: '' },
  { name: 'めかぶ', calories: 11, protein: 0.9, fat: 0.6, carbs: 3.4, fiber: 3.4, salt: 0.3, nutrients: 'ヨウ素' },
  { name: '焼き海苔', calories: 188, protein: 41.4, fat: 3.7, carbs: 8.3, fiber: 36.0, salt: 1.3, nutrients: 'ビタミンA, 鉄' },
  { name: 'ひじき(乾燥)', calories: 186, protein: 9.2, fat: 3.2, carbs: 58.4, fiber: 51.8, salt: 4.7, nutrients: 'カルシウム, 鉄' },
  { name: '昆布(だし昆布・乾燥)', calories: 170, protein: 5.8, fat: 1.3, carbs: 64.3, fiber: 27.1, salt: 7.2, nutrients: 'ヨウ素, カリウム' },
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