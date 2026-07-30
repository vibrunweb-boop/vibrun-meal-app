import { redis } from '../lib/redis.js';

const KEY = 'vibrun:product-db';
const STORE = 'セブンイレブン';

const NEW_ITEMS = [
  { name: '豆腐スイーツバーガトーショコラ', calories: 81, protein: 6.0, fat: 2.2, carbs: 9.9, fiber: 1.3, salt: 0.01 },
  { name: '味しみひじきと枝豆の豆腐バー', calories: 165, protein: 10.9, fat: 10.6, carbs: 7.3, fiber: 1.4, salt: 1 },
  { name: 'したらば プレーン', calories: 56, protein: 6.0, fat: 0.6, carbs: 6.8, fiber: 0.3, salt: 1.2 },
  { name: 'したらば 明太マヨネーズ風味', calories: 84, protein: 5.5, fat: 4.0, carbs: 6.7, fiber: 0.3, salt: 1.2 },
  { name: 'スモークサーモン', calories: 76, protein: 9.5, fat: 3.9, carbs: 0.8, fiber: 0.0, salt: 1.4 },
  { name: 'やわらか焼きいか', calories: 70, protein: 11.6, fat: 1.3, carbs: 3.0, fiber: 0.2, salt: 1.2 },
  { name: 'たこぶつ', calories: 45, protein: 9.1, fat: 0.5, carbs: 1.0, fiber: 0.1, salt: 1.4 },
  { name: 'あかにし貝', calories: 49, protein: 9.7, fat: 0.3, carbs: 2.3, fiber: 0.3, salt: 0.9 },
  { name: 'ほぐしサラダチキン', calories: 92, protein: 20.9, fat: 0.9, carbs: 0.0, fiber: 0.0, salt: 1.2 },
  { name: 'サラダチキン プレーン', calories: 114, protein: 24.1, fat: 1.9, carbs: 0.0, fiber: 0.0, salt: 1.1 }, // ※脂質は推定値。要確認
  { name: 'サラダチキンバー', calories: 60, protein: 12.2, fat: 1.2, carbs: 0.0, fiber: 0.0, salt: 0.8 },
  { name: '国産鶏の炭火焼70g', calories: 103, protein: 17.5, fat: 3.6, carbs: 0.2, fiber: 0.1, salt: 1.3 },
  { name: '砂肝の炭火焼70g', calories: 101, protein: 20.4, fat: 1.7, carbs: 1.3, fiber: 0.4, salt: 2.1 },
  { name: '直火焼きチキンにんにく黒胡椒', calories: 127, protein: 16.7, fat: 6.1, carbs: 1.7, fiber: 0.6, salt: 1.6 },
  { name: '直火焼きチキンてりやき', calories: 130, protein: 17.2, fat: 6.0, carbs: 2.1, fiber: 0.5, salt: 1.4 },
  { name: 'サラダチキン ハーブ', calories: 109, protein: 24.0, fat: 1.4, carbs: 0.0, fiber: 0.0, salt: 1.3 },
  { name: 'サラダチキン スモーク', calories: 117, protein: 26.0, fat: 1.3, carbs: 0.0, fiber: 0.0, salt: 1.9 },
  { name: '緑黄色野菜がとれるほうれん草の胡麻和え', calories: 143, protein: 6.9, fat: 9.5, carbs: 9.2, fiber: 3.7, salt: 1.4 },
  { name: 'ツナたまごコーンのサラダ', calories: 60, protein: 5.2, fat: 2.3, carbs: 5.5, fiber: 2.0, salt: 0.35 },
  { name: 'やわらかほうれん草とベーコンのサラダ', calories: 171, protein: 3.5, fat: 16.3, carbs: 3.6, fiber: 2.0, salt: 0.96 },
  { name: 'ブロッコリーチキンエッグ', calories: 156, protein: 20.6, fat: 6.6, carbs: 4.7, fiber: 2.4, salt: 1.9 },
  { name: '7種具材のお豆腐とひじきの煮物', calories: 110, protein: 8.0, fat: 5.2, carbs: 10.1, fiber: 4.7, salt: 1.3 },
  { name: 'たことブロッコリー手摘みバジルのサラダ', calories: 92, protein: 4.9, fat: 4.7, carbs: 9.0, fiber: 2.9, salt: 1.2 },
  { name: '直火焼きさばのおろしぽん酢', calories: 141, protein: 9.9, fat: 7.4, carbs: 9.8, fiber: 2.4, salt: 2 },
  { name: '国産黄金生姜 ぽかぽか和風スープ', calories: 120, protein: 8.2, fat: 3.5, carbs: 15.3, fiber: 2.9, salt: 2.8 },
  { name: 'コクと旨味の豚汁', calories: 182, protein: 7.9, fat: 11.2, carbs: 14.3, fiber: 3.9, salt: 3.1 },
  { name: 'ツルッとのど越し 冷しぶっかけうどん', calories: 505, protein: 9.3, fat: 12.6, carbs: 90.4, fiber: 3.8, salt: 3.2 },
  { name: '国産鶏むね天ちくわ磯辺天冷しぶっかけうどん', calories: 654, protein: 23.5, fat: 16.4, carbs: 105.2, fiber: 4.0, salt: 4.2 },
  { name: '手巻おにぎり 熟成仕立て紀州南高梅', calories: 166, protein: 2.9, fat: 0.8, carbs: 37.8, fiber: 2.0, salt: 1.6 },
  { name: '手巻おにぎり ツナマヨネーズ', calories: 258, protein: 5.2, fat: 10.6, carbs: 36.5, fiber: 1.9, salt: 1.2 },
  { name: '手巻おにぎり 北海道産昆布', calories: 171, protein: 3.3, fat: 0.8, carbs: 38.7, fiber: 2.3, salt: 1.1 },
  { name: '照焼チキンとたまごサンド', calories: 338, protein: 15.8, fat: 19.1, carbs: 26.5, fiber: 1.4, salt: 2.1 },
  { name: 'ジューシーハムサンド', calories: 348, protein: 12.2, fat: 19.8, carbs: 31.1, fiber: 1.6, salt: 1.8 },
  { name: 'ハムとたまごのサンド', calories: 344, protein: 12.2, fat: 19.3, carbs: 31.1, fiber: 1.7, salt: 1.5 },
  { name: 'シャキシャキレタスサンド', calories: 265, protein: 9.5, fat: 14.0, carbs: 26.3, fiber: 2.3, salt: 1.4 },
  { name: 'ミックスサンド', calories: 302, protein: 10.3, fat: 15.8, carbs: 30.5, fiber: 1.8, salt: 1.3 },
  { name: 'パイナップル', calories: 54, protein: 0.6, fat: 0.1, carbs: 13.7, fiber: 1.2, salt: 0 },
  { name: '皮むきりんご', calories: 46, protein: 0.2, fat: 0.1, carbs: 11.5, fiber: 1.0, salt: 0.1 },
  { name: 'コールスロー', calories: 45, protein: 1.9, fat: 0.3, carbs: 10.1, fiber: 2.7, salt: 0.1 },
];

async function main() {
  const existing = (await redis.get(KEY)) || [];
  const existingNames = new Set(existing.map((p) => p.name));

  let now = Date.now();
  const toAdd = NEW_ITEMS.filter((p) => !existingNames.has(p.name)).map((p) => ({
    id: crypto.randomUUID(),
    name: p.name,
    store: STORE,
    barcode: '',
    calories: p.calories,
    protein: p.protein,
    fat: p.fat,
    carbs: p.carbs,
    fiber: p.fiber,
    salt: p.salt,
    nutrients: '',
    addedBy: 'トレーナー(初期登録)',
    useCount: 0,
    createdAt: now--,
  }));

  if (toAdd.length === 0) {
    console.log('追加対象なし(すべて登録済みでした)');
    return;
  }

  const updated = [...existing, ...toAdd];
  await redis.set(KEY, updated);
  console.log(`${toAdd.length}件を追加しました:`);
  toAdd.forEach((p) => console.log(' -', p.name));
}

main().catch((err) => {
  console.error('エラー:', err);
  process.exit(1);
});