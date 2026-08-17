# vibrun-meal-app ソースコード一式(自動生成)

書き出し日時: 2026/8/1 21:52:57

## ファイル一覧

- api/consent.js
- api/ingredients.js
- api/meals.js
- api/products.js
- api/recipes.js
- api/targets.js
- api/trainer/check.js
- api/trainer/member-detail.js
- api/trainer/members.js
- api/trainer/membership.js
- index.html
- lib/auth.js
- lib/consentData.js
- lib/defaultIngredients.js
- lib/memberData.js
- lib/membershipData.js
- lib/recipeData.js
- lib/redis.js
- package.json
- postcss.config.js
- src/App.jsx
- src/components/ConsentGate.jsx
- src/components/LiffGate.jsx
- src/components/MemberDashboard.jsx
- src/components/NameGate.jsx
- src/components/TrainerView.jsx
- src/components/Widgets.jsx
- src/index.css
- src/lib/api.js
- src/lib/helpers.js
- src/lib/score.js
- src/main.jsx
- tailwind.config.js
- vite.config.js

---

## api/consent.js

```js
import { AuthError, getUserId } from '../lib/auth.js';
import { getConsent, saveConsent, PRIVACY_POLICY_VERSION } from '../lib/consentData.js';

export default async function handler(req, res) {
  try {
    const userId = await getUserId(req); // await を忘れないこと

    if (req.method === 'GET') {
      const consent = await getConsent(userId);
      const agreed = !!consent && consent.version === PRIVACY_POLICY_VERSION;
      return res.status(200).json({ agreed, currentVersion: PRIVACY_POLICY_VERSION });
    }

    if (req.method === 'POST') {
      const record = await saveConsent(userId, PRIVACY_POLICY_VERSION);
      return res.status(200).json({ agreed: true, currentVersion: PRIVACY_POLICY_VERSION, consent: record });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
```

## api/ingredients.js

```js
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
```

## api/meals.js

```js
import { AuthError, verifyLineToken } from '../lib/auth.js';
import { loadMemberData, saveMemberData, ensureRegistered, DEFAULT_TARGETS } from '../lib/memberData.js';
import { assertActiveMember, WithdrawnError } from '../lib/membershipData.js';


export default async function handler(req, res) {
  try {
    const { userId, displayName } = await verifyLineToken(req);
    await ensureRegistered(userId, displayName);
    await assertActiveMember(userId);

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
    if (err instanceof WithdrawnError) return res.status(403).json({ error: err.message });
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
```

## api/products.js

```js
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
```

## api/recipes.js

```js
import { AuthError, getUserId } from '../lib/auth.js';
import { getRecipes, saveRecipes } from '../lib/recipeData.js';

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default async function handler(req, res) {
  try {
    const userId = await getUserId(req);

    if (req.method === 'GET') {
      const recipes = await getRecipes(userId);
      return res.status(200).json(recipes);
    }

    if (req.method === 'POST') {
      // body: { name, items: [{name, grams}], calories, protein, fat, carbs, fiber, salt }
      const recipes = await getRecipes(userId);
      const newRecipe = { id: uid(), createdAt: new Date().toISOString(), ...req.body };
      await saveRecipes(userId, [...recipes, newRecipe]);
      return res.status(200).json(newRecipe);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      const recipes = await getRecipes(userId);
      await saveRecipes(userId, recipes.filter((r) => r.id !== id));
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof WithdrawnError) return res.status(403).json({ error: err.message });
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
```

## api/targets.js

```js
import { AuthError, getUserId } from '../lib/auth.js';
import { loadMemberData, saveMemberData } from '../lib/memberData.js';
import { assertActiveMember, WithdrawnError } from '../lib/membershipData.js';

export default async function handler(req, res) {
  try {
    const userId = await getUserId(req);
    await assertActiveMember(userId);
    const data = await loadMemberData(userId);

    if (req.method === 'GET') {
      return res.status(200).json(data.targets);
    }

    if (req.method === 'PUT') {
      const updated = { ...data, targets: { ...data.targets, ...req.body } };
      await saveMemberData(userId, updated);
      return res.status(200).json(updated.targets);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof WithdrawnError) return res.status(403).json({ error: err.message });
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
```

## api/trainer/check.js

```js
import { AuthError, getUserId, isTrainer } from '../../lib/auth.js';

// フロントエンドが「トレーナータブを表示するかどうか」を判断するための軽量な確認用エンドポイントです。
// 実際のトレーナー専用操作の権限チェックは、各APIの requireTrainer() が別途行っています
// (このエンドポイントはUI表示の出し分け用で、認可の境界そのものではありません)。
export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const userId = await getUserId(req);
    return res.status(200).json({ isTrainer: isTrainer(userId) });
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
```

## api/trainer/member-detail.js

```js
import { AuthError, requireTrainer } from '../../lib/auth.js';
import { loadMemberData } from '../../lib/memberData.js';

export default async function handler(req, res) {
  try {
    	await requireTrainer(req);
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const data = await loadMemberData(String(userId));
    return res.status(200).json(data);
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
```

## api/trainer/members.js

```js
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
```

## api/trainer/membership.js

```js
import { AuthError, requireTrainer } from '../../lib/auth.js';
import { getWithdrawnUserIds, setWithdrawn } from '../../lib/membershipData.js';

export default async function handler(req, res) {
  try {
    await requireTrainer(req);

    if (req.method === 'GET') {
      const withdrawnUserIds = await getWithdrawnUserIds();
      return res.status(200).json({ withdrawnUserIds });
    }

    if (req.method === 'POST') {
      const { userId, withdrawn } = req.body;
      const withdrawnUserIds = await setWithdrawn(userId, withdrawn);
      return res.status(200).json({ withdrawnUserIds });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
```

## index.html

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>食事ノート | VIBRUN</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

## lib/auth.js

```js
// LINEログイン(LIFF)のIDトークンを検証して、ログイン中のLINEユーザーIDを取得する認証ヘルパーです。
//
// フロントエンド(LIFF)は liff.getIDToken() で取得したIDトークンを
// "Authorization: Bearer <IDトークン>" ヘッダーに載せて送ってきます。
// ここではLINEの「IDトークン検証」エンドポイントにそのトークンを渡し、
// 署名・有効期限・発行者(iss)・宛先(aud = このLIFFチャネルのID)を検証してもらい、
// 検証済みのLINEユーザーID(sub)と表示名(name)を取得します。
// 参考: https://developers.line.biz/en/docs/line-login/verify-id-token/

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

function getBearerToken(req) {
  const header = req.headers['authorization'] || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AuthError('ログインが必要です');
  }
  return token;
}

// IDトークンを検証し、{ userId, displayName, picture } を返します。
// 同じリクエスト内で複数回呼ばれても検証は1回で済むよう、req単位でキャッシュします。
export async function verifyLineToken(req) {
  if (req._lineUser) return req._lineUser;

  const idToken = getBearerToken(req);
  const channelId = process.env.LIFF_CHANNEL_ID;
  if (!channelId) {
    throw new Error('LIFF_CHANNEL_ID が設定されていません');
  }

  const params = new URLSearchParams({ id_token: idToken, client_id: channelId });
  const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!verifyRes.ok) {
    throw new AuthError('ログインが必要です(トークンが無効です)');
  }

  const payload = await verifyRes.json();
  // payload: { iss, sub, aud, exp, iat, name, picture, ... }
  const user = {
    userId: payload.sub,
    displayName: payload.name || payload.sub,
    picture: payload.picture || '',
  };
  console.log('[login]', user.userId, user.displayName);
  req._lineUser = user;
  return user;
}

export async function getUserId(req) {
  const { userId } = await verifyLineToken(req);
  return userId;
}

export function isTrainer(userId) {
  const trainerIds = (process.env.TRAINER_LINE_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return trainerIds.includes(userId);
}

export async function requireTrainer(req) {
  const userId = await getUserId(req);
  if (!isTrainer(userId)) {
    throw new AuthError('トレーナー権限が必要です');
  }
  return userId;
}
```

## lib/consentData.js

```js
import { redis } from './redis.js';

const PREFIX = 'vibrun:';

// プライバシーポリシーの文面を変更したら、このバージョン文字列を必ず更新してください。
// バージョンが変わると、既に同意済みの会員にも自動的に再同意を求めます。
export const PRIVACY_POLICY_VERSION = '2026-08-01';

export async function getConsent(userId) {
  const data = await redis.get(`${PREFIX}consent:${userId}`);
  return data || null; // { version, agreedAt } または null(未同意)
}

export async function saveConsent(userId, version) {
  const record = { version, agreedAt: new Date().toISOString() };
  await redis.set(`${PREFIX}consent:${userId}`, record);
  return record;
}
```

## lib/defaultIngredients.js

```js
// VIBRUNプロトタイプ(アーティファクト)の食材データベースをそのまま移植したものです。
// 100gあたりの参考値。本番運用では正式な食品成分データベースへの置き換えを推奨します。
export const DEFAULT_INGREDIENTS = [
  // 肉類
  { name: '鶏むね肉(皮なし)', calories: 116, protein: 24.4, fat: 1.9, carbs: 0, fiber: 0, salt: 0.1, nutrients: 'ビタミンB6, ナイアシン' },
  { name: '鶏むね肉(皮つき)', calories: 145, protein: 21.3, fat: 5.9, carbs: 0, fiber: 0, salt: 0.1, nutrients: 'ビタミンB6, ナイアシン' },
  { name: '鶏もも肉(皮なし)', calories: 127, protein: 19.0, fat: 5.0, carbs: 0, fiber: 0, salt: 0.2, nutrients: '鉄, 亜鉛' },
  { name: '鶏もも肉(皮つき)', calories: 200, protein: 16.6, fat: 14.2, carbs: 0, fiber: 0, salt: 0.2, nutrients: '鉄, 亜鉛' },
  { name: '鶏ささみ', calories: 105, protein: 23.9, fat: 0.8, carbs: 0, fiber: 0, salt: 0.1, nutrients: 'ビタミンB6, ナイアシン' },
  { name: '鶏レバー', calories: 111, protein: 18.9, fat: 3.1, carbs: 0.6, fiber: 0, salt: 0.2, nutrients: 'ビタミンA, 鉄, 葉酸' },
  { name: '豚ロース(赤身)', calories: 150, protein: 22.0, fat: 5.6, carbs: 0.2, fiber: 0, salt: 0.1, nutrients: 'ビタミンB1' },
  { name: '豚ヒレ肉', calories: 118, protein: 22.2, fat: 1.9, carbs: 0.3, fiber: 0, salt: 0.1, nutrients: 'ビタミンB1' },
  { name: '豚バラ肉', calories: 386, protein: 14.2, fat: 35.4, carbs: 0.1, fiber: 0, salt: 0.1, nutrients: 'ビタミンB1' },
  { name: '豚こま切れ', calories: 221, protein: 18.5, fat: 15.1, carbs: 0.1, fiber: 0, salt: 0.1, nutrients: 'ビタミンB1' },
  { name: '牛もも肉(赤身)', calories: 165, protein: 21.3, fat: 8.6, carbs: 0.5, fiber: 0, salt: 0.1, nutrients: '鉄, 亜鉛, ビタミンB12' },
  { name: '牛ヒレ肉', calories: 133, protein: 20.5, fat: 4.8, carbs: 0.3, fiber: 0, salt: 0.1, nutrients: '鉄, 亜鉛, ビタミンB12' },
  { name: '牛肩ロース', calories: 240, protein: 15.1, fat: 19.8, carbs: 0.2, fiber: 0, salt: 0.1, nutrients: '鉄, 亜鉛' },
  { name: '合いびき肉', calories: 251, protein: 17.2, fat: 19.5, carbs: 0.4, fiber: 0, salt: 0.2, nutrients: '鉄, 亜鉛' },
  { name: 'ラム肉(ロース)', calories: 219, protein: 17.1, fat: 15.7, carbs: 0.2, fiber: 0, salt: 0.2, nutrients: '鉄, ビタミンB12' },
  { name: 'ウインナーソーセージ', calories: 321, protein: 11.5, fat: 30.6, carbs: 3.0, fiber: 0, salt: 1.9, nutrients: '' },
  { name: 'ベーコン', calories: 400, protein: 12.9, fat: 39.1, carbs: 0.3, fiber: 0, salt: 2.0, nutrients: '' },
  { name: 'ハム(ロース)', calories: 196, protein: 16.5, fat: 13.9, carbs: 2.0, fiber: 0, salt: 2.3, nutrients: '' },
  { name: 'サラダチキン(プレーン)', calories: 108, protein: 23.0, fat: 1.5, carbs: 0.5, fiber: 0, salt: 1.2, nutrients: 'ビタミンB6' },
  // 魚介類
  { name: '鮭(生)', calories: 133, protein: 22.3, fat: 4.1, carbs: 0.1, fiber: 0, salt: 0.2, nutrients: 'ビタミンD, ビタミンB12' },
  { name: 'まぐろ赤身', calories: 125, protein: 26.4, fat: 1.4, carbs: 0.1, fiber: 0, salt: 0.1, nutrients: 'ビタミンB12, 鉄' },
  { name: 'まぐろトロ', calories: 344, protein: 20.1, fat: 27.5, carbs: 0.1, fiber: 0, salt: 0.1, nutrients: 'ビタミンD, ビタミンB12' },
  { name: 'かつお', calories: 108, protein: 25.8, fat: 0.5, carbs: 0.1, fiber: 0, salt: 0.1, nutrients: 'ビタミンB12, 鉄, ナイアシン' },
  { name: 'さば', calories: 202, protein: 20.6, fat: 12.1, carbs: 0.3, fiber: 0, salt: 0.3, nutrients: 'ビタミンD, ビタミンB12' },
  { name: 'ぶり', calories: 257, protein: 21.4, fat: 17.6, carbs: 0.3, fiber: 0, salt: 0.1, nutrients: 'ビタミンD, ビタミンB12' },
  { name: 'たら', calories: 77, protein: 17.6, fat: 0.2, carbs: 0.1, fiber: 0, salt: 0.3, nutrients: 'ビタミンB12' },
  { name: 'いわし', calories: 156, protein: 19.8, fat: 9.2, carbs: 0.2, fiber: 0, salt: 0.2, nutrients: 'カルシウム, ビタミンD' },
  { name: 'さんま', calories: 287, protein: 18.1, fat: 24.6, carbs: 0.1, fiber: 0, salt: 0.4, nutrients: 'ビタミンD, ビタミンB12' },
  { name: 'えび(ゆで)', calories: 83, protein: 18.0, fat: 0.6, carbs: 0, fiber: 0, salt: 0.4, nutrients: '亜鉛, ビタミンE' },
  { name: 'いか', calories: 76, protein: 17.9, fat: 0.8, carbs: 0.1, fiber: 0, salt: 0.5, nutrients: '亜鉛' },
  { name: 'たこ(ゆで)', calories: 91, protein: 21.7, fat: 0.7, carbs: 0.1, fiber: 0, salt: 0.6, nutrients: '亜鉛' },
  { name: 'ほたて', calories: 66, protein: 13.5, fat: 0.3, carbs: 1.5, fiber: 0, salt: 0.6, nutrients: '亜鉛, ビタミンB12' },
  { name: 'あさり', calories: 30, protein: 6.0, fat: 0.3, carbs: 0.4, fiber: 0, salt: 2.2, nutrients: '鉄, ビタミンB12' },
  { name: 'ツナ缶(水煮)', calories: 71, protein: 16.0, fat: 0.7, carbs: 0.2, fiber: 0, salt: 0.5, nutrients: 'ビタミンB12' },
  { name: 'ツナ缶(油漬け)', calories: 265, protein: 17.7, fat: 21.3, carbs: 0.1, fiber: 0, salt: 0.4, nutrients: 'ビタミンB12' },
  { name: 'さば缶(水煮)', calories: 174, protein: 20.9, fat: 9.3, carbs: 0.2, fiber: 0, salt: 0.9, nutrients: 'カルシウム, ビタミンD' },
  // 卵・乳製品
  { name: '卵', calories: 151, protein: 12.2, fat: 10.2, carbs: 0.4, fiber: 0, salt: 0.4, nutrients: 'ビタミンB12, ビタミンD' },
  { name: 'ゆで卵', calories: 151, protein: 12.6, fat: 10.6, carbs: 0.3, fiber: 0, salt: 0.3, nutrients: 'ビタミンB12, ビタミンD' },
  { name: '卵白', calories: 47, protein: 10.5, fat: 0, carbs: 0.4, fiber: 0, salt: 0.5, nutrients: '' },
  { name: '牛乳', calories: 67, protein: 3.3, fat: 3.8, carbs: 4.8, fiber: 0, salt: 0.1, nutrients: 'カルシウム, ビタミンB2' },
  { name: '低脂肪牛乳', calories: 46, protein: 3.8, fat: 1.0, carbs: 5.5, fiber: 0, salt: 0.2, nutrients: 'カルシウム' },
  { name: '豆乳(無調整)', calories: 46, protein: 3.6, fat: 2.0, carbs: 3.1, fiber: 0.2, salt: 0, nutrients: 'マグネシウム' },
  { name: 'ヨーグルト(無糖)', calories: 56, protein: 3.6, fat: 3.0, carbs: 4.9, fiber: 0, salt: 0.1, nutrients: 'カルシウム' },
  { name: 'ギリシャヨーグルト', calories: 100, protein: 10.0, fat: 4.0, carbs: 4.0, fiber: 0, salt: 0.1, nutrients: 'カルシウム' },
  { name: 'スライスチーズ', calories: 313, protein: 22.7, fat: 26.0, carbs: 1.3, fiber: 0, salt: 2.8, nutrients: 'カルシウム' },
  { name: 'カッテージチーズ', calories: 99, protein: 13.3, fat: 4.5, carbs: 1.9, fiber: 0, salt: 1.0, nutrients: 'カルシウム' },
  { name: 'モッツァレラチーズ', calories: 269, protein: 18.4, fat: 19.9, carbs: 4.2, fiber: 0, salt: 0.2, nutrients: 'カルシウム' },
  { name: 'バター', calories: 700, protein: 0.6, fat: 74.5, carbs: 4.4, fiber: 0, salt: 1.9, nutrients: 'ビタミンA' },
  // 大豆製品
  { name: '納豆', calories: 190, protein: 16.5, fat: 10.0, carbs: 12.1, fiber: 6.7, salt: 0, nutrients: 'ビタミンK, 鉄' },
  { name: '木綿豆腐', calories: 72, protein: 6.6, fat: 4.2, carbs: 1.6, fiber: 1.1, salt: 0, nutrients: 'カルシウム, 鉄' },
  { name: '絹ごし豆腐', calories: 56, protein: 4.9, fat: 3.0, carbs: 2.0, fiber: 0.9, salt: 0, nutrients: 'カルシウム' },
  { name: '厚揚げ', calories: 143, protein: 10.7, fat: 11.3, carbs: 0.9, fiber: 0.9, salt: 0, nutrients: 'カルシウム, 鉄' },
  { name: '油揚げ', calories: 377, protein: 23.4, fat: 34.4, carbs: 0.4, fiber: 1.1, salt: 0, nutrients: 'カルシウム, 鉄' },
  { name: 'おから', calories: 88, protein: 6.1, fat: 3.6, carbs: 13.8, fiber: 11.5, salt: 0, nutrients: 'カルシウム' },
  { name: '枝豆', calories: 135, protein: 11.7, fat: 6.2, carbs: 8.8, fiber: 5.0, salt: 0, nutrients: '葉酸, ビタミンK' },
  // 穀類
  { name: '白米(ごはん)', calories: 156, protein: 2.5, fat: 0.3, carbs: 37.1, fiber: 1.5, salt: 0, nutrients: '' },
  { name: '玄米(ごはん)', calories: 152, protein: 2.8, fat: 1.0, carbs: 35.6, fiber: 1.4, salt: 0, nutrients: 'ビタミンB1, マグネシウム' },
  { name: 'もち麦ごはん', calories: 165, protein: 3.0, fat: 0.8, carbs: 36.0, fiber: 4.7, salt: 0, nutrients: 'マグネシウム' },
  { name: '食パン', calories: 248, protein: 9.3, fat: 4.4, carbs: 46.7, fiber: 2.3, salt: 1.3, nutrients: '' },
  { name: '全粒粉パン', calories: 252, protein: 10.2, fat: 4.7, carbs: 45.5, fiber: 4.5, salt: 1.2, nutrients: 'マグネシウム' },
  { name: 'うどん(ゆで)', calories: 105, protein: 2.6, fat: 0.4, carbs: 21.6, fiber: 1.3, salt: 0.3, nutrients: '' },
  { name: 'そば(ゆで)', calories: 132, protein: 4.8, fat: 1.0, carbs: 26.0, fiber: 2.9, salt: 0, nutrients: 'ビタミンB1, マグネシウム' },
  { name: 'パスタ(ゆで)', calories: 165, protein: 5.8, fat: 0.9, carbs: 32.2, fiber: 1.5, salt: 0, nutrients: '' },
  { name: 'オートミール', calories: 380, protein: 13.7, fat: 5.7, carbs: 69.1, fiber: 9.4, salt: 0, nutrients: 'マグネシウム, 鉄' },
  { name: 'もち', calories: 235, protein: 4.2, fat: 0.5, carbs: 50.3, fiber: 0.5, salt: 0, nutrients: '' },
  { name: 'コーンフレーク', calories: 381, protein: 7.8, fat: 1.7, carbs: 83.6, fiber: 2.4, salt: 2.1, nutrients: '鉄' },
  // いも類
  { name: 'さつまいも', calories: 134, protein: 1.2, fat: 0.2, carbs: 31.5, fiber: 2.3, salt: 0, nutrients: 'ビタミンC, カリウム' },
  { name: 'じゃがいも', calories: 76, protein: 1.6, fat: 0.1, carbs: 17.6, fiber: 1.3, salt: 0, nutrients: 'ビタミンC, カリウム' },
  { name: '里芋', calories: 58, protein: 1.5, fat: 0.1, carbs: 13.1, fiber: 2.3, salt: 0, nutrients: 'カリウム' },
  { name: '長芋', calories: 65, protein: 2.2, fat: 0.3, carbs: 13.9, fiber: 1.0, salt: 0, nutrients: 'カリウム' },
  // 野菜
  { name: 'ブロッコリー(ゆで)', calories: 27, protein: 3.9, fat: 0.2, carbs: 4.0, fiber: 3.7, salt: 0, nutrients: 'ビタミンC, 葉酸' },
  { name: 'キャベツ', calories: 21, protein: 1.3, fat: 0.2, carbs: 4.5, fiber: 1.8, salt: 0, nutrients: 'ビタミンC, ビタミンK' },
  { name: 'レタス', calories: 12, protein: 0.6, fat: 0.1, carbs: 2.8, fiber: 1.1, salt: 0, nutrients: 'ビタミンK' },
  { name: 'トマト', calories: 19, protein: 0.7, fat: 0.1, carbs: 4.6, fiber: 1.0, salt: 0, nutrients: 'ビタミンC, カリウム' },
  { name: 'きゅうり', calories: 13, protein: 1.0, fat: 0.1, carbs: 3.0, fiber: 1.1, salt: 0, nutrients: 'カリウム' },
  { name: 'にんじん', calories: 35, protein: 0.6, fat: 0.1, carbs: 8.7, fiber: 2.4, salt: 0.1, nutrients: 'ビタミンA(βカロテン)' },
  { name: 'たまねぎ', calories: 33, protein: 1.0, fat: 0.1, carbs: 7.6, fiber: 1.5, salt: 0, nutrients: 'カリウム' },
  { name: 'ほうれん草(ゆで)', calories: 25, protein: 2.6, fat: 0.5, carbs: 3.1, fiber: 3.6, salt: 0, nutrients: '鉄, 葉酸, ビタミンA' },
  { name: 'もやし', calories: 14, protein: 1.7, fat: 0.1, carbs: 2.6, fiber: 1.3, salt: 0, nutrients: 'ビタミンC' },
  { name: 'なす', calories: 18, protein: 0.7, fat: 0.1, carbs: 4.5, fiber: 2.2, salt: 0, nutrients: 'カリウム' },
  { name: 'ピーマン', calories: 20, protein: 0.9, fat: 0.2, carbs: 4.9, fiber: 2.3, salt: 0, nutrients: 'ビタミンC' },
  { name: 'しめじ', calories: 18, protein: 2.5, fat: 0.4, carbs: 4.4, fiber: 3.7, salt: 0, nutrients: 'ビタミンD' },
  { name: 'アボカド', calories: 178, protein: 2.1, fat: 17.5, carbs: 7.9, fiber: 5.6, salt: 0, nutrients: 'ビタミンE, カリウム, 葉酸' },
  { name: 'かぼちゃ', calories: 78, protein: 1.6, fat: 0.1, carbs: 17.1, fiber: 3.5, salt: 0, nutrients: 'ビタミンA, ビタミンC' },
  { name: 'ごぼう', calories: 58, protein: 1.8, fat: 0.1, carbs: 13.7, fiber: 5.7, salt: 0.1, nutrients: 'カリウム' },
  // 果物
  { name: 'バナナ', calories: 86, protein: 1.1, fat: 0.2, carbs: 22.5, fiber: 1.1, salt: 0, nutrients: 'カリウム, ビタミンB6' },
  { name: 'りんご', calories: 54, protein: 0.1, fat: 0.1, carbs: 14.6, fiber: 1.5, salt: 0, nutrients: 'カリウム' },
  { name: 'みかん', calories: 45, protein: 0.6, fat: 0.1, carbs: 11.0, fiber: 1.0, salt: 0, nutrients: 'ビタミンC' },
  { name: 'いちご', calories: 31, protein: 0.9, fat: 0.1, carbs: 7.1, fiber: 1.4, salt: 0, nutrients: 'ビタミンC' },
  { name: 'ぶどう', calories: 58, protein: 0.4, fat: 0.1, carbs: 15.2, fiber: 0.5, salt: 0, nutrients: 'カリウム' },
  { name: 'キウイ', calories: 53, protein: 0.9, fat: 0.1, carbs: 12.9, fiber: 2.6, salt: 0, nutrients: 'ビタミンC, ビタミンE' },
  { name: 'グレープフルーツ', calories: 38, protein: 0.7, fat: 0.1, carbs: 9.0, fiber: 0.6, salt: 0, nutrients: 'ビタミンC' },
  { name: 'パイナップル', calories: 53, protein: 0.6, fat: 0.1, carbs: 12.5, fiber: 1.2, salt: 0, nutrients: 'ビタミンC' },
  // 調味料・油脂
  { name: 'オリーブオイル', calories: 921, protein: 0, fat: 100, carbs: 0, fiber: 0, salt: 0, nutrients: 'ビタミンE' },
  { name: 'サラダ油', calories: 921, protein: 0, fat: 100, carbs: 0, fiber: 0, salt: 0, nutrients: '' },
  { name: 'ごま油', calories: 921, protein: 0, fat: 100, carbs: 0, fiber: 0, salt: 0, nutrients: 'ビタミンE' },
  { name: 'マヨネーズ', calories: 668, protein: 1.4, fat: 72.0, carbs: 3.6, fiber: 0, salt: 1.9, nutrients: '' },
  { name: '醤油', calories: 71, protein: 7.7, fat: 0, carbs: 10.1, fiber: 0, salt: 14.5, nutrients: '' },
  { name: '味噌', calories: 192, protein: 12.5, fat: 6.0, carbs: 21.9, fiber: 4.9, salt: 12.4, nutrients: 'マンガン' },
  { name: 'ケチャップ', calories: 106, protein: 1.6, fat: 0.2, carbs: 25.6, fiber: 0.5, salt: 3.1, nutrients: '' },
  { name: 'ドレッシング(和風)', calories: 83, protein: 1.6, fat: 3.1, carbs: 12.4, fiber: 0, salt: 3.0, nutrients: '' },
  // トレーニング関連食品
  { name: 'プロテインパウダー(ホエイ)', calories: 380, protein: 78.0, fat: 5.0, carbs: 7.0, fiber: 0, salt: 0.6, nutrients: 'カルシウム' },
  { name: 'プロテインバー', calories: 380, protein: 30.0, fat: 10.0, carbs: 40.0, fiber: 3.0, salt: 0.5, nutrients: '' },
];
```

## lib/memberData.js

```js
import { redis } from './redis.js';

// このRedisデータベースを他アプリ(ブログ記事オートライター等)と共用しているため、
// キーの衝突を避けるために全キーへ "vibrun:" プレフィックスを付けています。
const PREFIX = 'vibrun:';

export const DEFAULT_TARGETS = { calories: 2000, protein: 120, fat: 55, carbs: 250, fiber: 18, salt: 7 };

export async function loadMemberData(userId) {
  const data = await redis.get(`${PREFIX}member:${userId}`);
  return data || { targets: { ...DEFAULT_TARGETS }, meals: [] };
}

export async function saveMemberData(userId, data) {
  await redis.set(`${PREFIX}member:${userId}`, data);
}

export async function ensureRegistered(userId, displayName) {
  const list = (await redis.get(`${PREFIX}members-list`)) || [];
  if (!list.find((m) => m.key === userId)) {
    list.push({ key: userId, displayName: displayName || userId });
    await redis.set(`${PREFIX}members-list`, list);
  }
}

export function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
```

## lib/membershipData.js

```js
import { redis } from './redis.js';

const PREFIX = 'vibrun:';

export class WithdrawnError extends Error {}

export async function getWithdrawnUserIds() {
  return (await redis.get(`${PREFIX}withdrawn-members`)) || [];
}

export async function setWithdrawn(userId, withdrawn) {
  const list = await getWithdrawnUserIds();
  const updated = withdrawn
    ? list.includes(userId) ? list : [...list, userId]
    : list.filter((id) => id !== userId);
  await redis.set(`${PREFIX}withdrawn-members`, updated);
  return updated;
}

// 会員本人のAPI(meals / targets / recipes など)の先頭で呼び出し、
// 退会済みなら例外を投げて処理を止めるためのヘルパー
export async function assertActiveMember(userId) {
  const list = await getWithdrawnUserIds();
  if (list.includes(userId)) {
    throw new WithdrawnError('退会済みのため、本アプリはご利用いただけません。');
  }
}
```

## lib/recipeData.js

```js
import { redis } from './redis.js';

const PREFIX = 'vibrun:';

export async function getRecipes(userId) {
  const data = await redis.get(`${PREFIX}recipes:${userId}`);
  return data || [];
}

export async function saveRecipes(userId, list) {
  await redis.set(`${PREFIX}recipes:${userId}`, list);
  return list;
}
```

## lib/redis.js

```js
import { Redis } from '@upstash/redis';

// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN を環境変数から自動で読み込みます
export const redis = Redis.fromEnv();

// @upstash/redis はオブジェクトを自動でJSON化/復元してくれるので、
// プロトタイプの window.storage とほぼ同じ感覚で使えます。
export async function getValue(key, fallback = null) {
  const value = await redis.get(key);
  return value === null || value === undefined ? fallback : value;
}

export async function setValue(key, value) {
  await redis.set(key, value);
}
```

## package.json

```json
{
  "name": "vibrun-meal-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@line/liff": "^2.29.1",
    "@upstash/redis": "^1.34.0",
    "lucide-react": "^1.27.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.15.4"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "vercel": "^37.4.0",
    "vite": "^5.4.8"
  }
}
```

## postcss.config.js

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

## src/App.jsx

```jsx
import { useState, useEffect, useCallback } from 'react';
import { COLORS } from './lib/helpers.js';
import * as api from './lib/api.js';
import LiffGate from './components/LiffGate.jsx';
import ConsentGate from './components/ConsentGate.jsx';
import MemberDashboard from './components/MemberDashboard.jsx';
import TrainerView from './components/TrainerView.jsx';

export default function App() {
  const [mode, setMode] = useState('member');
  const [identity, setIdentity] = useState(null); // { idToken, userId, displayName, pictureUrl }
  const [isTrainer, setIsTrainer] = useState(false);

  const handleReady = useCallback((next) => setIdentity(next), []);

  useEffect(() => {
    if (!identity) {
      setIsTrainer(false);
      return;
    }
    let cancelled = false;
    api
      .checkIsTrainer(identity.idToken)
      .then((res) => {
        if (cancelled) return;
        const trainer = !!res.isTrainer;
        setIsTrainer(trainer);
        if (!trainer) setMode('member');
      })
      .catch(() => {
        if (!cancelled) {
          setIsTrainer(false);
          setMode('member');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [identity]);

  return (
    <div className="min-h-screen" style={{ background: COLORS.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');
        * { font-family: 'Zen Kaku Gothic New', sans-serif; box-sizing: border-box; }
      `}</style>

      <div className="max-w-md mx-auto px-4 pt-6 pb-16">
        <div className="flex items-center justify-between mb-5">
          <h1 style={{ fontFamily: "'Shippori Mincho', serif", color: COLORS.ink }} className="text-2xl">
            食事ノート
          </h1>
          {identity && isTrainer && (
            <div className="flex rounded-full p-0.5" style={{ background: COLORS.border }}>
              <button
                onClick={() => setMode('member')}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition"
                style={{ background: mode === 'member' ? COLORS.terracotta : 'transparent', color: mode === 'member' ? '#fff' : COLORS.inkSoft }}
              >
                会員
              </button>
              <button
                onClick={() => setMode('trainer')}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition"
                style={{ background: mode === 'trainer' ? COLORS.terracotta : 'transparent', color: mode === 'trainer' ? '#fff' : COLORS.inkSoft }}
              >
                トレーナー
              </button>
            </div>
          )}
        </div>

       {!identity ? (
  <LiffGate onReady={handleReady} />
) : (
  <ConsentGate idToken={identity.idToken}>
    {mode === 'trainer' ? (
      <TrainerView trainerId={identity.idToken} />
    ) : (
      <MemberDashboard
        ownerId={identity.idToken}
        viewerId={identity.idToken}
        displayName={identity.displayName}
        readOnly={false}
      />
    )}
  </ConsentGate>
)}
      </div>
    </div>
  );
}
```

## src/components/ConsentGate.jsx

```jsx
import { useState, useEffect } from 'react';
import { COLORS } from '../lib/helpers.js';
import * as api from '../lib/api.js';

const POLICY_TEXT = `プライバシーポリシー(食事ノート)

VIBRUN合同会社(以下「当社」といいます)は、会員向け食事記録アプリ「食事ノート」
(以下「本アプリ」といいます)の提供にあたり、以下のとおり個人情報を取り扱います。

1. 取得する情報
・LINEアカウントの表示名、プロフィール画像、LINEユーザーID
・本アプリに記録された食事内容、カロリー・栄養バランスの目標値
・上記に付随する記録日時等の情報

2. 利用目的
・会員ご本人が、ご自身の食事記録・栄養バランスを確認できるようにするため
・トレーナーが、指導の一環として会員の記録を確認し、アドバイスを行うため
・本アプリの不具合対応、品質改善のため

3. 第三者提供について
法令に基づく場合を除き、ご本人の同意なく第三者に提供することはありません。
当社のトレーナーは、指導目的の範囲内で会員の記録を閲覧できます。

4. 業務委託・外部サービスの利用について
本アプリはデータの保存にVercel Inc.およびUpstash Inc.が提供するクラウド
サービスを利用しています。これらのサービスの管理下でデータが保存されます。

5. データの保管期間
会員登録が有効な期間中、記録を保存します。退会等により保存の必要がなく
なった場合は、合理的な期間内に削除します。

6. 開示・訂正・削除等のご請求
ご自身の記録の確認・訂正・削除をご希望の場合は、トレーナーまたは下記
問い合わせ窓口までご連絡ください。

7. お問い合わせ窓口
VIBRUN合同会社　連絡先: pg.vibrun@gmail.com

8. 本ポリシーの変更
本ポリシーの内容は、必要に応じて変更することがあります。重要な変更が
ある場合は、本アプリ上で再度同意を求めます。

制定日: 2026年8月1日`;

export default function ConsentGate({ idToken, children }) {
  const [status, setStatus] = useState('checking'); // checking | needed | agreeing | agreed | error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .getConsentStatus(idToken)
      .then((res) => {
        if (cancelled) return;
        setStatus(res.agreed ? 'agreed' : 'needed');
      })
      .catch((e) => {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(e?.message || String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [idToken]);

  const handleAgree = async () => {
    setStatus('agreeing');
    try {
      await api.agreeToConsent(idToken);
      setStatus('agreed');
    } catch (e) {
      setStatus('error');
      setErrorMessage(e?.message || String(e));
    }
  };

  if (status === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <p style={{ color: COLORS.inkSoft }} className="text-sm">確認中…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <p style={{ color: COLORS.rose }} className="text-sm mb-2">エラーが発生しました</p>
        <p style={{ color: COLORS.inkSoft }} className="text-xs">{errorMessage}</p>
      </div>
    );
  }

  if (status === 'needed' || status === 'agreeing') {
    return (
      <div className="py-6 px-2">
        <h2 style={{ fontFamily: "'Shippori Mincho', serif", color: COLORS.ink }} className="text-lg mb-3">
          ご利用にあたって
        </h2>
        <div
          className="text-xs leading-relaxed mb-4 p-3 rounded-lg overflow-y-auto"
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.ink,
            maxHeight: '50vh',
            whiteSpace: 'pre-wrap',
          }}
        >
          {POLICY_TEXT}
        </div>
        <button
          onClick={handleAgree}
          disabled={status === 'agreeing'}
          className="w-full py-2.5 rounded-lg text-sm font-medium"
          style={{ background: COLORS.terracotta, color: '#fff', opacity: status === 'agreeing' ? 0.6 : 1 }}
        >
          {status === 'agreeing' ? '処理中…' : '同意して利用を開始する'}
        </button>
      </div>
    );
  }

  return children;
}
```

## src/components/LiffGate.jsx

```jsx
import { useState, useEffect } from 'react';
import liff from '@line/liff';
import { COLORS } from '../lib/helpers.js';

export default function LiffGate({ onReady }) {
  const [status, setStatus] = useState('initializing'); // initializing | error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        await liff.init({ liffId: import.meta.env.VITE_LIFF_ID });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const idToken = liff.getIDToken();
        const profile = await liff.getProfile();
        if (cancelled) return;
        onReady({
          idToken,
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
        });
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setErrorMessage(e?.message || String(e));
        }
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [onReady]);

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <p style={{ color: COLORS.rose }} className="text-sm mb-2">
          LINEログインに失敗しました
        </p>
        <p style={{ color: COLORS.inkSoft }} className="text-xs">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <p style={{ color: COLORS.inkSoft }} className="text-sm">LINEでログイン中…</p>
    </div>
  );
}
```

## src/components/MemberDashboard.jsx

```jsx
import { useState, useEffect, useCallback } from 'react';
import { Settings, ChevronLeft, ChevronRight, User, Store, Check, Camera, BookOpen } from 'lucide-react';
import { COLORS, MEAL_TYPES, DEFAULT_TARGETS, formatDate, formatDateLabel, addDays, num } from '../lib/helpers.js';
import * as api from '../lib/api.js';
import { Gauge, PlateVisual, MealSection, TargetPanel, WeekChart, BarcodeScannerModal, RecipeManager } from './Widgets.jsx';
import { calculateDailyScore } from '../lib/score.js';

function ProductRegisterSection({ productDb, onRegister }) {
  const EMPTY = { name: '', store: '', barcode: '', calories: '', protein: '', fat: '', carbs: '', fiber: '', salt: '', nutrients: '' };
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    if (message) setMessage('');
  };

  const handleScan = (code) => {
    setShowScanner(false);
    const match = productDb.find((p) => p.barcode && p.barcode === code);
    if (match) {
      setForm({
        name: match.name,
        store: match.store || '',
        barcode: code,
        calories: String(match.calories),
        protein: String(match.protein),
        fat: String(match.fat),
        carbs: String(match.carbs),
        fiber: String(match.fiber || 0),
        salt: String(match.salt),
        nutrients: match.nutrients || '',
      });
      setMessage('既に登録済みの商品です。内容を確認・修正して保存してください。');
    } else {
      setForm({ ...form, barcode: code });
      setMessage('新しいバーコードです。商品名と栄養情報を入力してください。');
    }
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    const entry = {
      name: form.name.trim(),
      store: form.store.trim(),
      barcode: form.barcode.trim(),
      calories: num(form.calories),
      protein: num(form.protein),
      fat: num(form.fat),
      carbs: num(form.carbs),
      fiber: num(form.fiber),
      salt: num(form.salt),
      nutrients: form.nutrients.trim(),
    };
    try {
      const isNew = await onRegister(entry);
      setMessage(isNew ? `✓ 「${entry.name}」を登録しました` : `✓ 「${entry.name}」の情報を更新しました`);
      setForm(EMPTY);
    } catch (err) {
      setMessage(`登録に失敗しました: ${err.message}`);
    }
  };

  const recent = [...productDb].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);

  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: COLORS.card, border: `2px solid ${COLORS.terracotta}33` }}>
      <div className="flex items-center gap-2 mb-1">
        <Store size={16} style={{ color: COLORS.terracotta }} />
        <h3 style={{ fontFamily: "'Shippori Mincho', serif", color: COLORS.ink }} className="text-base">
          コンビニ・スーパー商品を登録
        </h3>
      </div>
      <p style={{ color: COLORS.inkSoft }} className="text-[11px] mb-3">
        ここで登録すると、他の会員が同じ商品名を入力したときに食事記録の候補として自動表示されます。今日の食事の記録はここでは行いません。
      </p>

      <input
        value={form.name}
        onChange={set('name')}
        placeholder="商品名(例: セブンプレミアム 鶏むね肉のサラダ)"
        className="w-full mb-2 px-2 py-1.5 rounded text-sm outline-none"
        style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.ink }}
      />
      <input
        value={form.store}
        onChange={set('store')}
        placeholder="購入店(任意) 例: セブンイレブン"
        className="w-full mb-2 px-2 py-1.5 rounded text-sm outline-none"
        style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.ink }}
      />
      <div className="flex gap-1.5 mb-2">
        <input
          value={form.barcode}
          onChange={set('barcode')}
          placeholder="バーコード番号(任意)"
          inputMode="numeric"
          className="flex-1 px-2 py-1.5 rounded text-sm outline-none"
          style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.ink }}
        />

      </div>
      
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {[
          ['calories', 'kcal'],
          ['protein', 'P(g)'],
          ['fat', 'F(g)'],
          ['carbs', 'C(g)'],
          ['fiber', '食物繊維(g)'],
          ['salt', '塩分(g)'],
        ].map(([k, ph]) => (
          <input
            key={k}
            type="number"
            inputMode="decimal"
            value={form[k]}
            onChange={set(k)}
            placeholder={ph}
            className="w-full px-1.5 py-1.5 rounded text-xs outline-none text-center"
            style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.ink }}
          />
        ))}
      </div>
      <input
        value={form.nutrients}
        onChange={set('nutrients')}
        placeholder="豊富な栄養素(任意) 例: ビタミンC, 鉄"
        className="w-full mb-3 px-2 py-1.5 rounded text-sm outline-none"
        style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.ink }}
      />

      <div className="flex items-center justify-between">
        <span style={{ color: COLORS.sage }} className="text-xs">{message}</span>
        <button
          onClick={submit}
          className="text-xs px-4 py-1.5 rounded font-medium flex items-center gap-1"
          style={{ background: COLORS.terracotta, color: '#fff' }}
        >
          <Check size={14} /> 登録する
        </button>
      </div>

      {recent.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px dashed ${COLORS.border}` }}>
          <p style={{ color: COLORS.inkSoft }} className="text-[11px] mb-1.5">
            最近登録された商品(全{productDb.length}件)
          </p>
          <ul className="space-y-1">
            {recent.map((p) => (
              <li key={p.id} className="flex justify-between text-xs">
                <span style={{ color: COLORS.ink }}>{p.name}{p.store ? `(${p.store})` : ''}</span>
                <span style={{ color: COLORS.inkSoft }}>{Math.round(p.calories)}kcal</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
function ScoreBadge({ score }) {
  if (score === null) return null;
  const color = score >= 80 ? COLORS.sage : score >= 50 ? COLORS.gold : COLORS.rose;
  return (
    <div className="flex flex-col items-center justify-center mb-3">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ border: `3px solid ${color}` }}
      >
        <span style={{ color }} className="text-xl font-semibold">{score}</span>
      </div>
      <span style={{ color: COLORS.inkSoft }} className="text-[11px] mt-1">今日の食事スコア</span>
    </div>
  );
}

export default function MemberDashboard({ ownerId, viewerId, displayName, readOnly, onBack }) {
  // ownerId:  表示対象(誰の記録を見せるか)
  // viewerId: 実際にリクエストしているログイン中の人(x-user-id ヘッダーに使う)
  // 会員が自分のページを見るときは ownerId === viewerId。
  // トレーナーが会員の記録を閲覧するときは、ownerId=閲覧対象の会員, viewerId=トレーナー自身。
  const [data, setData] = useState(null);
  const [ingredientDb, setIngredientDb] = useState([]);
  const [productDb, setProductDb] = useState([]);
  const [recipeDb, setRecipeDb] = useState([]);
  const [showRecipes, setShowRecipes] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [showTargets, setShowTargets] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (readOnly) {
        // トレーナーが会員の記録を閲覧する場合(読み取り専用)
        const d = await api.fetchTrainerMemberDetail(viewerId, ownerId);
        setData(d);
      } else {
        const d = await api.fetchMemberData(viewerId);
        setData(d);
        const [ing, prod, rec] = await Promise.all([api.fetchIngredientDb(), api.fetchProductDb(), api.fetchRecipes(viewerId)]);
        setIngredientDb(ing);
        setProductDb(prod);
        setRecipeDb(rec);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ownerId, viewerId, displayName, readOnly]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const incrementProductUse = async (productId) => {
    try {
      await api.incrementProductUseCount(viewerId, productId);
      setProductDb((prev) => prev.map((p) => (p.id === productId ? { ...p, useCount: (p.useCount || 1) + 1 } : p)));
    } catch (err) {
      console.error(err);
    }
  };

  const saveRecipe = async (recipe) => {
    const saved = await api.saveRecipeApi(viewerId, recipe);
    setRecipeDb((prev) => [...prev, saved]);
  };
  
  const deleteRecipeHandler = async (id) => {
    await api.deleteRecipeApi(viewerId, id);
    setRecipeDb((prev) => prev.filter((r) => r.id !== id));
  };  
  
  const registerProduct = async (entry) => {
    const { isNew } = await api.registerOrUpdateProduct(viewerId, entry);
    const fresh = await api.fetchProductDb();
    setProductDb(fresh);
    return isNew;
  };

  if (error) {
    return <div style={{ color: COLORS.rose }} className="text-center py-10 text-sm">読み込みに失敗しました: {error}</div>;
  }
  if (loading || !data) {
    return <div style={{ color: COLORS.inkSoft }} className="text-center py-10 text-sm">読み込み中…</div>;
  }

  const todaysMeals = data.meals.filter((m) => m.date === selectedDate);
  const totals = todaysMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      fat: acc.fat + m.fat,
      carbs: acc.carbs + m.carbs,
      fiber: acc.fiber + (m.fiber || 0),
      salt: acc.salt + m.salt,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, salt: 0 }
  );

const score = calculateDailyScore(totals, data.targets);

  const addMeal = async (mealType, entry) => {
    try {
      const meal = await api.addMealEntry(viewerId, mealType, selectedDate, entry);
      setData((prev) => ({ ...prev, meals: [...prev.meals, meal] }));
    } catch (err) {
      console.error(err);
    }
  };
  const deleteMeal = async (id) => {
    try {
      await api.deleteMealEntry(viewerId, id);
      setData((prev) => ({ ...prev, meals: prev.meals.filter((m) => m.id !== id) }));
    } catch (err) {
      console.error(err);
    }
  };
  const saveTargets = async (targets) => {
    try {
      const updated = await api.updateTargets(viewerId, targets);
      setData((prev) => ({ ...prev, targets: updated }));
      setShowTargets(false);
    } catch (err) {
      console.error(err);
    }
  };
  const resetData = async () => {
    try {
      const fresh = await api.resetMemberData(viewerId);
      setData(fresh);
      setShowTargets(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} style={{ color: COLORS.inkSoft }}>
              <ChevronLeft size={20} />
            </button>
          )}
          <User size={16} style={{ color: COLORS.terracotta }} />
          <span style={{ color: COLORS.ink }} className="font-medium text-sm">{displayName}</span>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-3">
            <button onClick={() => setShowRecipes(true)} style={{ color: COLORS.inkSoft }}>
              <BookOpen size={18} />
            </button>
            <button onClick={() => setShowTargets(true)} style={{ color: COLORS.inkSoft }}>
              <Settings size={18} />
            </button>
          </div>
        )}     
      </div>

      <div className="flex items-center justify-center gap-4 mb-4">
        <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} style={{ color: COLORS.inkSoft }}>
          <ChevronLeft size={18} />
        </button>
        <span style={{ color: COLORS.ink, fontFamily: "'Shippori Mincho', serif" }} className="text-lg">
          {formatDateLabel(selectedDate)}
        </span>
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          disabled={selectedDate >= formatDate(new Date())}
          style={{ color: selectedDate >= formatDate(new Date()) ? COLORS.border : COLORS.inkSoft }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="rounded-xl p-5 mb-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <ScoreBadge score={score} />
        <PlateVisual protein={totals.protein} fat={totals.fat} carbs={totals.carbs} />
        <div className="text-center mt-2 mb-4">
          <span style={{ color: COLORS.ink }} className="text-2xl font-semibold">{Math.round(totals.calories)}</span>
          <span style={{ color: COLORS.inkSoft }} className="text-sm"> / {data.targets.calories} kcal</span>
        </div>
        <Gauge label="たんぱく質" value={totals.protein} target={data.targets.protein} unit="g" color={COLORS.terracotta} />
        <Gauge label="脂質" value={totals.fat} target={data.targets.fat} unit="g" color={COLORS.gold} />
        <Gauge label="炭水化物" value={totals.carbs} target={data.targets.carbs} unit="g" color={COLORS.sage} />
        <Gauge label="食物繊維" value={totals.fiber} target={data.targets.fiber} unit="g" color={COLORS.gold} />
        <Gauge label="塩分" value={totals.salt} target={data.targets.salt} unit="g" color={COLORS.rose} danger />
      </div>

      {MEAL_TYPES.map((mt) => (
        <MealSection
          key={mt.key}
          mealLabel={mt.label}
          entries={todaysMeals.filter((m) => m.mealType === mt.key)}
          onAdd={(entry) => addMeal(mt.key, entry)}
          onDelete={deleteMeal}
          readOnly={readOnly}
          ingredientDb={ingredientDb}
          productDb={productDb}
          recipeDb={recipeDb}
          onUseProduct={incrementProductUse}
        />
      ))}

      {!readOnly && <ProductRegisterSection productDb={productDb} onRegister={registerProduct} />}

      <WeekChart meals={data.meals} selectedDate={selectedDate} />

      {showTargets && (
        <TargetPanel targets={data.targets} onSave={saveTargets} onClose={() => setShowTargets(false)} onReset={resetData} />
      )}
      {showRecipes && (
        <RecipeManager
          recipeDb={recipeDb}
          ingredientDb={ingredientDb}
          onSave={saveRecipe}
          onDelete={deleteRecipeHandler}
          onClose={() => setShowRecipes(false)}
         />
       )}
     </div>
  );
}
```

## src/components/NameGate.jsx

```jsx
import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { COLORS } from '../lib/helpers.js';

export default function NameGate({ onEnter }) {
  const [name, setName] = useState('');
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <UtensilsCrossed size={28} style={{ color: COLORS.terracotta }} className="mb-3" />
      <h2 style={{ fontFamily: "'Shippori Mincho', serif", color: COLORS.ink }} className="text-xl mb-1">
        お名前を入力してください
      </h2>
      <p style={{ color: COLORS.inkSoft }} className="text-xs mb-4 text-center">
        次回からはこの端末で自動的にログインした状態になります
        <br />
        (トレーナー権限が必要な方は、管理者にこの名前を伝えてください)
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="例: 立川 歩"
        className="w-64 px-3 py-2 rounded-lg text-sm outline-none mb-3 text-center"
        style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
        onKeyDown={(e) => e.key === 'Enter' && name.trim() && onEnter(name.trim())}
      />
      <button
        onClick={() => name.trim() && onEnter(name.trim())}
        className="px-6 py-2 rounded-lg text-sm font-medium"
        style={{ background: COLORS.terracotta, color: '#fff' }}
      >
        はじめる
      </button>
    </div>
  );
}
```

## src/components/TrainerView.jsx

```jsx
import { useState, useEffect } from 'react';
import { Users, Plus, Check, Trash2, Wheat, Store } from 'lucide-react';
import { COLORS, DEFAULT_TARGETS, formatDate } from '../lib/helpers.js';
import * as api from '../lib/api.js';
import MemberDashboard from './MemberDashboard.jsx';

const BLANK_EDIT_FORM = { name: '', store: '', barcode: '', calories: '', protein: '', fat: '', carbs: '', fiber: '', salt: '', nutrients: '' };

function NutritionEditForm({ initial, showStore, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(initial);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="rounded-lg p-3 mt-1 mb-2" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
      <input
        value={form.name}
        onChange={set('name')}
        placeholder="名前"
        className="w-full mb-2 px-2 py-1.5 rounded text-sm outline-none"
        style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
      />
      {showStore && (
        <>
          <input
            value={form.store || ''}
            onChange={set('store')}
            placeholder="購入店(任意)"
            className="w-full mb-2 px-2 py-1.5 rounded text-sm outline-none"
            style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
          />
          <input
            value={form.barcode || ''}
            onChange={set('barcode')}
            placeholder="バーコード番号(任意)"
            inputMode="numeric"
            className="w-full mb-2 px-2 py-1.5 rounded text-sm outline-none"
            style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
          />
        </>
      )}
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {[
          ['calories', 'kcal'],
          ['protein', 'P(g)'],
          ['fat', 'F(g)'],
          ['carbs', 'C(g)'],
          ['fiber', '食物繊維(g)'],
          ['salt', '塩分(g)'],
        ].map(([k, ph]) => (
          <input
            key={k}
            type="number"
            inputMode="decimal"
            value={form[k]}
            onChange={set(k)}
            placeholder={ph}
            className="w-full px-1.5 py-1.5 rounded text-xs outline-none text-center"
            style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
          />
        ))}
      </div>
      <input
        value={form.nutrients || ''}
        onChange={set('nutrients')}
        placeholder="豊富な栄養素(任意) 例: ビタミンC, 鉄"
        className="w-full mb-2 px-2 py-1.5 rounded text-sm outline-none"
        style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
      />
      <div className="flex justify-between items-center">
        {onDelete ? (
          <button onClick={onDelete} className="text-xs flex items-center gap-1" style={{ color: COLORS.rose }}>
            <Trash2 size={13} /> 削除
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded" style={{ color: COLORS.inkSoft }}>
            キャンセル
          </button>
          <button
            onClick={() => onSave(form)}
            className="text-xs px-3 py-1.5 rounded font-medium flex items-center gap-1"
            style={{ background: COLORS.terracotta, color: '#fff' }}
          >
            <Check size={14} /> 保存
          </button>
        </div>
      </div>
    </div>
  );
}

function ManagedList({ title, items, showStore, onCreate, onUpdate, onDelete }) {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState(null); // 'new' | item id | null
  const filtered = items.filter((i) => i.name.includes(query.trim()));

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`${title}を検索`}
          className="flex-1 px-2 py-1.5 rounded text-sm outline-none"
          style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
        />
        <button
          onClick={() => setEditingId(editingId === 'new' ? null : 'new')}
          className="p-2 rounded-full"
          style={{ background: COLORS.terracotta, color: '#fff' }}
        >
          <Plus size={16} />
        </button>
      </div>

      {editingId === 'new' && (
        <NutritionEditForm
          initial={BLANK_EDIT_FORM}
          showStore={showStore}
          onSave={async (form) => {
            if (!form.name.trim()) return;
            await onCreate(form);
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
        />
      )}

      <div className="space-y-1.5 max-h-96 overflow-y-auto">
        {filtered.map((item) =>
          editingId === item.id ? (
            <NutritionEditForm
              key={item.id}
              initial={{
                name: item.name,
                store: item.store || '',
                barcode: item.barcode || '',
                calories: String(item.calories),
                protein: String(item.protein),
                fat: String(item.fat),
                carbs: String(item.carbs),
                fiber: String(item.fiber || 0),
                salt: String(item.salt),
                nutrients: item.nutrients || '',
              }}
              showStore={showStore}
              onSave={async (form) => {
                if (!form.name.trim()) return;
                await onUpdate(item.id, form);
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
              onDelete={async () => {
                await onDelete(item.id);
                setEditingId(null);
              }}
            />
          ) : (
            <button
              key={item.id}
              onClick={() => setEditingId(item.id)}
              className="w-full flex justify-between items-center px-2.5 py-2 rounded text-left text-sm"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
            >
              <span style={{ color: COLORS.ink }}>
                {item.name}
                {showStore && item.store ? `(${item.store})` : ''}
              </span>
              <span style={{ color: COLORS.inkSoft }} className="text-xs">{Math.round(item.calories)}kcal</span>
            </button>
          )
        )}
        {filtered.length === 0 && (
          <p style={{ color: COLORS.inkSoft }} className="text-xs text-center py-6">
            該当する項目がありません
          </p>
        )}
      </div>
    </div>
  );
}

function DataManagementView({ trainerId }) {
  const [tab, setTab] = useState('ingredient'); // 'ingredient' | 'product'
  const [ingredientDb, setIngredientDb] = useState([]);
  const [productDb, setProductDb] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ing, prod] = await Promise.all([api.fetchIngredientDb(), api.fetchProductDb()]);
      setIngredientDb(ing);
      setProductDb(prod);
      setLoading(false);
    })();
  }, []);

  const createIngredient = async (form) => {
    await api.createIngredient(trainerId, {
      name: form.name.trim(),
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      fat: Number(form.fat) || 0,
      carbs: Number(form.carbs) || 0,
      fiber: Number(form.fiber) || 0,
      salt: Number(form.salt) || 0,
      nutrients: form.nutrients?.trim() || '',
    });
    setIngredientDb(await api.fetchIngredientDb());
  };
  const updateIngredient = async (id, form) => {
    await api.updateIngredient(trainerId, id, {
      name: form.name.trim(),
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      fat: Number(form.fat) || 0,
      carbs: Number(form.carbs) || 0,
      fiber: Number(form.fiber) || 0,
      salt: Number(form.salt) || 0,
      nutrients: form.nutrients?.trim() || '',
    });
    setIngredientDb(await api.fetchIngredientDb());
  };
  const deleteIngredient = async (id) => {
    await api.deleteIngredient(trainerId, id);
    setIngredientDb(await api.fetchIngredientDb());
  };

  const createProduct = async (form) => {
    await api.registerOrUpdateProduct(trainerId, {
      name: form.name.trim(),
      store: form.store?.trim() || '',
      barcode: form.barcode?.trim() || '',
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      fat: Number(form.fat) || 0,
      carbs: Number(form.carbs) || 0,
      fiber: Number(form.fiber) || 0,
      salt: Number(form.salt) || 0,
      nutrients: form.nutrients?.trim() || '',
    });
    setProductDb(await api.fetchProductDb());
  };
  const updateProduct = async (id, form) => {
    await api.updateProductAdmin(trainerId, id, {
      name: form.name.trim(),
      store: form.store?.trim() || '',
      barcode: form.barcode?.trim() || '',
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      fat: Number(form.fat) || 0,
      carbs: Number(form.carbs) || 0,
      fiber: Number(form.fiber) || 0,
      salt: Number(form.salt) || 0,
      nutrients: form.nutrients?.trim() || '',
    });
    setProductDb(await api.fetchProductDb());
  };
  const deleteProduct = async (id) => {
    await api.deleteProductAdmin(trainerId, id);
    setProductDb(await api.fetchProductDb());
  };

  if (loading) {
    return <div style={{ color: COLORS.inkSoft }} className="text-center py-10 text-sm">読み込み中…</div>;
  }

  return (
    <div>
      <div className="flex rounded-full p-0.5 mb-3 w-fit" style={{ background: COLORS.border }}>
        <button
          onClick={() => setTab('ingredient')}
          className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1"
          style={{ background: tab === 'ingredient' ? COLORS.terracotta : 'transparent', color: tab === 'ingredient' ? '#fff' : COLORS.inkSoft }}
        >
          <Wheat size={12} /> 食材({ingredientDb.length})
        </button>
        <button
          onClick={() => setTab('product')}
          className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1"
          style={{ background: tab === 'product' ? COLORS.terracotta : 'transparent', color: tab === 'product' ? '#fff' : COLORS.inkSoft }}
        >
          <Store size={12} /> 商品({productDb.length})
        </button>
      </div>
      {tab === 'ingredient' ? (
        <ManagedList title="食材" items={ingredientDb} showStore={false} onCreate={createIngredient} onUpdate={updateIngredient} onDelete={deleteIngredient} />
      ) : (
        <ManagedList title="商品" items={productDb} showStore onCreate={createProduct} onUpdate={updateProduct} onDelete={deleteProduct} />
      )}
    </div>
  );
}

export default function TrainerView({ trainerId }) {
  const [subTab, setSubTab] = useState('members'); // 'members' | 'data'
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawnIds, setWithdrawnIds] = useState([]);

  useEffect(() => {
  (async () => {
    setLoading(true);
    setError('');
    try {
      const [list, membership] = await Promise.all([
        api.fetchTrainerMembers(trainerId),
        api.fetchWithdrawnMembers(trainerId),
      ]);
      setMembers(list);
      setWithdrawnIds(membership.withdrawnUserIds);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  })();
}, [trainerId]);
const toggleWithdrawn = async (e, userId) => {
  e.stopPropagation(); // 会員詳細画面に遷移しないようにする
  try {
    const membership = await api.setMemberWithdrawn(trainerId, userId, !withdrawnIds.includes(userId));
    setWithdrawnIds(membership.withdrawnUserIds);
  } catch (err) {
    console.error(err);
  }
};

  if (selected) {
    return (
      <MemberDashboard
        ownerId={selected.key}
        viewerId={trainerId}
        displayName={selected.displayName}
        readOnly
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div>
      <div className="flex rounded-full p-0.5 mb-4 w-fit" style={{ background: COLORS.border }}>
        <button
          onClick={() => setSubTab('members')}
          className="px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ background: subTab === 'members' ? COLORS.terracotta : 'transparent', color: subTab === 'members' ? '#fff' : COLORS.inkSoft }}
        >
          会員一覧
        </button>
        <button
          onClick={() => setSubTab('data')}
          className="px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ background: subTab === 'data' ? COLORS.terracotta : 'transparent', color: subTab === 'data' ? '#fff' : COLORS.inkSoft }}
        >
          食材・商品管理
        </button>
      </div>

      {subTab === 'data' ? (
        <DataManagementView trainerId={trainerId} />
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} style={{ color: COLORS.terracotta }} />
            <span style={{ color: COLORS.ink }} className="font-medium text-sm">会員一覧(本日の記録)</span>
          </div>
          {loading && <div style={{ color: COLORS.inkSoft }} className="text-center py-10 text-sm">読み込み中…</div>}
          {error && (
            <p style={{ color: COLORS.rose }} className="text-sm text-center py-10">
              読み込みに失敗しました: {error}
              <br />
              トレーナー権限が付与されているか(TRAINER_LINE_USER_IDS)を確認してください。
            </p>
          )}
          {!loading && !error && members.length === 0 && (
            <p style={{ color: COLORS.inkSoft }} className="text-sm text-center py-10">
              まだ記録した会員がいません
            </p>
          )}
          <div className="space-y-2">
            {members.map((m) => {
              const targets = m.targets || DEFAULT_TARGETS;
              const saltOver = m.totalSalt > targets.salt;
              const kcalOver = m.totalKcal > targets.calories * 1.15;
              const dotColor = saltOver ? COLORS.rose : kcalOver ? COLORS.gold : COLORS.sage;
             const isWithdrawn = withdrawnIds.includes(m.key);
return (
  <button
    key={m.key}
    onClick={() => setSelected(m)}
    className="w-full flex items-center justify-between rounded-xl p-3.5 text-left"
    style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, opacity: isWithdrawn ? 0.5 : 1 }}
  >
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full" style={{ background: dotColor }} />
      <span style={{ color: COLORS.ink }} className="text-sm font-medium">{m.displayName}</span>
      {isWithdrawn && (
        <span style={{ color: COLORS.rose }} className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" >
          退会済み
        </span>
      )}
    </div>
    <div className="flex flex-col items-end gap-1 shrink-0">
      <span style={{ color: COLORS.inkSoft }} className="text-xs whitespace-nowrap">
        {Math.round(m.totalKcal)} / {targets.calories} kcal
        {saltOver && <span style={{ color: COLORS.rose }}> ・塩分超過</span>}
      </span>
      <span
        onClick={(e) => toggleWithdrawn(e, m.key)}
        className="text-[11px] px-2 py-1 rounded-full whitespace-nowrap"
        style={{ border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft }}
      >
        {isWithdrawn ? '再開' : '退会処理'}
      </span>
    </div>
  </button>
);
            })}
          </div>
        </>
      )}
    </div>
  );
}
```

## src/components/Widgets.jsx

```jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { Plus, Check, Store, Wheat, Camera, Trash2, RotateCcw, BookOpen } from 'lucide-react';
import { COLORS, num, uid, scaleIngredient, addDays, formatDateLabel } from '../lib/helpers.js';
import liff from '@line/liff';

export function Gauge({ label, value, target, unit, color, danger }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const over = target > 0 && value > target;
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span style={{ color: COLORS.inkSoft }} className="text-xs tracking-wide">{label}</span>
        <span style={{ color: over && danger ? COLORS.rose : COLORS.ink }} className="text-sm font-semibold">
          {Math.round(value)}
          <span style={{ color: COLORS.inkSoft }} className="font-normal"> / {target}{unit}</span>
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: COLORS.border }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: over && danger ? COLORS.rose : color }}
        />
      </div>
    </div>
  );
}

export function PlateVisual({ protein, fat, carbs }) {
  const data = [
    { name: 'たんぱく質', value: protein * 4, color: COLORS.terracotta },
    { name: '脂質', value: fat * 9, color: COLORS.gold },
    { name: '炭水化物', value: carbs * 4, color: COLORS.sage },
  ];
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative w-40 h-40 mx-auto">
      <div
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: `inset 0 0 0 6px ${COLORS.card}, inset 0 0 0 7px ${COLORS.border}` }}
      />
      {total > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={0} outerRadius={78} stroke={COLORS.card} strokeWidth={3}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: COLORS.border + '55' }}>
          <span style={{ color: COLORS.inkSoft }} className="text-xs">記録なし</span>
        </div>
      )}
    </div>
  );
}

export function BarcodeScannerModal({ onDetect, onClose }) {
  const [status, setStatus] = useState('starting'); // starting | unsupported | error
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!liff.isInClient()) {
        // LINEアプリ内で開いていない場合(PCブラウザでのテスト等)はスキャン非対応
        if (!cancelled) setStatus('unsupported');
        return;
      }
      try {
        const result = await liff.scanCodeV2();
        if (cancelled) return;
        if (result && result.value) {
          onDetect(result.value);
        } else {
          // キャンセルされた場合
          onClose();
        }
      } catch (e) {
        if (!cancelled) setStatus('error');
      }
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [onDetect, onClose]);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ background: '#00000088' }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:w-96 rounded-2xl p-4" style={{ background: COLORS.card }}>
        <h3 style={{ fontFamily: "'Shippori Mincho', serif", color: COLORS.ink }} className="text-base mb-2">
          バーコードをスキャン
        </h3>

        {status === 'starting' && (
          <p style={{ color: COLORS.inkSoft }} className="text-xs mb-3">
            LINEのスキャン画面を起動しています…
          </p>
        )}

        {(status === 'unsupported' || status === 'error') && (
          <p style={{ color: COLORS.inkSoft }} className="text-xs mb-3">
            {status === 'unsupported'
              ? 'この環境ではカメラスキャンをご利用いただけません。バーコード番号を直接入力してください。'
              : 'スキャンに失敗しました。バーコード番号を直接入力してください。'}
          </p>
        )}

        <div className="flex gap-2 mb-2">
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="バーコード番号を入力"
            inputMode="numeric"
            className="flex-1 px-2 py-1.5 rounded text-sm outline-none"
            style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.ink }}
          />
          <button
            onClick={() => manualCode.trim() && onDetect(manualCode.trim())}
            className="px-3 py-1.5 rounded text-xs font-medium"
            style={{ background: COLORS.terracotta, color: '#fff' }}
          >
            確定
          </button>
        </div>

        <button onClick={onClose} className="w-full text-xs px-3 py-1.5 rounded" style={{ color: COLORS.inkSoft }}>
          閉じる
        </button>
      </div>
    </div>
  );
}

export function AddEntryForm({ onAdd, onCancel, ingredientDb, productDb, recipeDb, onUseProduct }) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState(null); // { source: 'ingredient'|'product', ...data }
  const [grams, setGrams] = useState('100');
  const [vals, setVals] = useState({ calories: '', protein: '', fat: '', carbs: '', fiber: '', salt: '' });
  const [showScanner, setShowScanner] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  const suggestions = useMemo(() => {
    const q = name.trim();
  if (!q || selected) return [];
  const pool = [
    ...ingredientDb.map((i) => ({ ...i, source: 'ingredient' })),
    ...productDb.map((p) => ({ ...p, source: 'product' })),
    ...recipeDb.map((r) => ({ ...r, source: 'recipe' })),
  ];
  const starts = pool.filter((i) => i.name.startsWith(q));
  const includes = pool.filter((i) => !i.name.startsWith(q) && i.name.includes(q));
  return [...starts, ...includes].slice(0, 6);
}, [name, selected, ingredientDb, productDb, recipeDb]);

  const handleNameChange = (e) => {
    const v = e.target.value;
    setName(v);
    if (selected && v !== selected.name) setSelected(null);
  };

  const pickSuggestion = (item) => {
    setName(item.name);
    setSelected(item);
    if (item.source === 'ingredient') {
      setGrams('100');
      setVals(scaleIngredientToStrings(item, '100'));
    } else {
      setVals({
        calories: String(item.calories),
        protein: String(item.protein),
        fat: String(item.fat),
        carbs: String(item.carbs),
        fiber: String(item.fiber || 0),
        salt: String(item.salt),
      });
    }
  };

  function scaleIngredientToStrings(ing, g) {
    const s = scaleIngredient(ing, g);
    return {
      calories: String(s.calories),
      protein: String(s.protein),
      fat: String(s.fat),
      carbs: String(s.carbs),
      fiber: String(s.fiber),
      salt: String(s.salt),
    };
  }

  const handleGramsChange = (e) => {
    const g = e.target.value;
    setGrams(g);
    if (selected?.source === 'ingredient') setVals(scaleIngredientToStrings(selected, g));
  };

  const setField = (k) => (e) => setVals({ ...vals, [k]: e.target.value });

  const handleBarcodeDetect = (code) => {
    setShowScanner(false);
    const match = productDb.find((p) => p.barcode && p.barcode === code);
    if (match) {
      pickSuggestion({ ...match, source: 'product' });
      setScanMessage('');
    } else {
      setScanMessage(`バーコード${code}の商品は未登録です。「コンビニ・スーパー商品を登録」で登録すると次回から使えます。`);
    }
  };

  const reset = () => {
    setName('');
    setSelected(null);
    setGrams('100');
    setVals({ calories: '', protein: '', fat: '', carbs: '', fiber: '', salt: '' });
    setScanMessage('');
  };

  const submit = () => {
    if (!name.trim()) return;
    const finalVals = {
      calories: num(vals.calories),
      protein: num(vals.protein),
      fat: num(vals.fat),
      carbs: num(vals.carbs),
      fiber: num(vals.fiber),
      salt: num(vals.salt),
    };
    const finalName = selected?.source === 'ingredient' ? `${selected.name}(${num(grams) || 0}g)` : name.trim();

    onAdd({ id: uid(), name: finalName, nutrients: selected?.nutrients || '', ...finalVals });

    if (selected?.source === 'product') {
      onUseProduct(selected.id);
    }
    reset();
  };

  return (
    <div className="rounded-lg p-3 mt-2 mb-1" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
      <div className="relative flex gap-1.5">
        <input
          value={name}
          onChange={handleNameChange}
          placeholder="食材名または商品名(例: 鶏むね肉、おにぎり)"
          className="flex-1 mb-1 px-2 py-1.5 rounded text-sm outline-none"
          style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
        />
      
        {suggestions.length > 0 && (
          <div
            className="absolute z-10 left-0 right-0 rounded-lg overflow-hidden shadow-md"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
          >
            {suggestions.map((s, i) => (
              <button
                key={`${s.source}-${s.name}-${i}`}
                onClick={() => pickSuggestion(s)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-left text-xs"
                style={{ borderTop: i > 0 ? `1px solid ${COLORS.border}` : 'none' }}
              >
                <span className="flex items-center gap-1.5" style={{ color: COLORS.ink }}>
                  {s.source === 'ingredient' ? (
                    <Wheat size={12} style={{ color: COLORS.sage }} />
                  ) : s.source === 'recipe' ? (
                    <BookOpen size={12} style={{ color: COLORS.gold }} />
                  ) : (  
                    <Store size={12} style={{ color: COLORS.terracotta }} />
                  )}
                  {s.name}
                </span>
                <span style={{ color: COLORS.inkSoft }}>
                  {s.source === 'ingredient'
                    ? `${s.calories}kcal/100g`
                    : s.source === 'recipe'
                    ? `${s.calories}kcal`
                    : `${s.calories}kcal${s.store ? `(${s.store})` : ''}`}
  
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {scanMessage && (
        <p className="text-[11px] mb-2" style={{ color: COLORS.rose }}>{scanMessage}</p>
      )}


      {selected && (
        <p className="text-[11px] mb-2" style={{ color: selected.source === 'ingredient' ? COLORS.sage : COLORS.terracotta }}>
          {selected.source === 'ingredient' ? '✓ 食材データベースから自動計算(重さを調整できます)' : `✓ みんなの商品データベースから自動入力${selected.store ? '(' + selected.store + ')' : ''}`}
          {selected.nutrients ? `・豊富な栄養素: ${selected.nutrients}` : ''}
        </p>
      )}

      {selected?.source === 'ingredient' && (
        <div className="flex items-center gap-2 mb-2">
          <label style={{ color: COLORS.inkSoft }} className="text-xs">重さ</label>
          <input
            type="number"
            inputMode="decimal"
            value={grams}
            onChange={handleGramsChange}
            className="w-20 px-2 py-1 rounded text-xs text-center outline-none"
            style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
          />
          <span style={{ color: COLORS.inkSoft }} className="text-xs">g</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {[
          ['calories', 'kcal'],
          ['protein', 'P(g)'],
          ['fat', 'F(g)'],
          ['carbs', 'C(g)'],
          ['fiber', '食物繊維(g)'],
          ['salt', '塩分(g)'],
        ].map(([k, ph]) => (
          <input
            key={k}
            type="number"
            inputMode="decimal"
            value={vals[k]}
            onChange={setField(k)}
            placeholder={ph}
            className="w-full px-1.5 py-1.5 rounded text-xs outline-none text-center"
            style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
          />
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded" style={{ color: COLORS.inkSoft }}>
          キャンセル
        </button>
        <button
          onClick={submit}
          className="text-xs px-3 py-1.5 rounded font-medium flex items-center gap-1"
          style={{ background: COLORS.terracotta, color: '#fff' }}
        >
          <Check size={14} /> 追加
        </button>
      </div>
    </div>
  );
}

export function MealSection({ mealLabel, entries, onAdd, onDelete, readOnly, ingredientDb, productDb, recipeDb, onUseProduct }) {
  const [adding, setAdding] = useState(false);
  const subtotal = entries.reduce((s, e) => s + e.calories, 0);
  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
      <div className="flex justify-between items-center">
        <h3 style={{ fontFamily: "'Shippori Mincho', serif", color: COLORS.ink }} className="text-base">
          {mealLabel}
        </h3>
        <div className="flex items-center gap-2">
          <span style={{ color: COLORS.inkSoft }} className="text-xs">{Math.round(subtotal)} kcal</span>
          {!readOnly && (
            <button onClick={() => setAdding(!adding)} style={{ color: COLORS.terracotta }}>
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>
      {entries.length > 0 && (
        <ul className="mt-2 space-y-1">
          {entries.map((e) => (
            <li key={e.id} className="flex justify-between items-start text-sm py-1" style={{ borderTop: `1px dashed ${COLORS.border}` }}>
              <div>
                <span style={{ color: COLORS.ink }}>{e.name}</span>
                {e.nutrients && (
                  <p style={{ color: COLORS.sage }} className="text-[10px] mt-0.5">豊富な栄養素: {e.nutrients}</p>
                )}
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <span style={{ color: COLORS.inkSoft }} className="text-xs">{Math.round(e.calories)}kcal</span>
                {!readOnly && (
                  <button onClick={() => onDelete(e.id)} style={{ color: COLORS.inkSoft }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {adding && !readOnly && (
        <AddEntryForm
          ingredientDb={ingredientDb}
          productDb={productDb}
          recipeDb={recipeDb}
          onUseProduct={onUseProduct}
          onAdd={(entry) => {
            onAdd(entry);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}
      {entries.length === 0 && !adding && (
        <p style={{ color: COLORS.inkSoft }} className="text-xs mt-2">
          まだ記録がありません
        </p>
      )}
    </div>
  );
}

export function RecipeManager({ recipeDb, ingredientDb, onSave, onDelete, onClose }) {
  const [name, setName] = useState('');
  const [items, setItems] = useState([]); // [{ ingredientId, name, grams }]
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');

  const suggestions = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return ingredientDb.filter((i) => i.name.includes(q)).slice(0, 6);
  }, [query, ingredientDb]);

  const addItem = (ing) => {
    setItems((prev) => [...prev, { ingredientId: ing.id, name: ing.name, grams: 100 }]);
    setQuery('');
  };
  const updateGrams = (idx, g) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, grams: g } : it)));
  };
  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const totals = useMemo(() => {
    return items.reduce(
      (acc, it) => {
        const ing = ingredientDb.find((i) => i.id === it.ingredientId);
        if (!ing) return acc;
        const s = scaleIngredient(ing, it.grams);
        return {
          calories: acc.calories + s.calories,
          protein: acc.protein + s.protein,
          fat: acc.fat + s.fat,
          carbs: acc.carbs + s.carbs,
          fiber: acc.fiber + (s.fiber || 0),
          salt: acc.salt + s.salt,
        };
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, salt: 0 }
    );
  }, [items, ingredientDb]);

  const submit = async () => {
    if (!name.trim() || items.length === 0) {
      setMessage('レシピ名と食材を入力してください');
      return;
    }
    try {
      await onSave({
        name: name.trim(),
        items: items.map((it) => ({ name: it.name, grams: it.grams })),
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10,
        carbs: Math.round(totals.carbs * 10) / 10,
        fiber: Math.round(totals.fiber * 10) / 10,
        salt: Math.round(totals.salt * 10) / 10,
      });
      setName('');
      setItems([]);
      setMessage('保存しました');
    } catch (err) {
      setMessage(`保存に失敗しました: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-end sm:items-center justify-center" style={{ background: '#00000055' }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto"
        style={{ background: COLORS.card }}
      >
        <h3 style={{ fontFamily: "'Shippori Mincho', serif", color: COLORS.ink }} className="text-lg mb-3">
          マイレシピ
        </h3>

        <div className="mb-4 pb-4" style={{ borderBottom: `1px dashed ${COLORS.border}` }}>
          <p style={{ color: COLORS.inkSoft }} className="text-xs mb-2">登録済みのレシピ(他の会員には表示されません)</p>
          {recipeDb.length === 0 && <p style={{ color: COLORS.inkSoft }} className="text-xs">まだレシピがありません</p>}
          <ul className="space-y-1">
            {recipeDb.map((r) => (
              <li key={r.id} className="flex justify-between items-center text-xs">
                <span style={{ color: COLORS.ink }}>{r.name}</span>
                <div className="flex items-center gap-2">
                  <span style={{ color: COLORS.inkSoft }}>{Math.round(r.calories)}kcal</span>
                  <button onClick={() => onDelete(r.id)} style={{ color: COLORS.inkSoft }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p style={{ color: COLORS.inkSoft }} className="text-xs mb-2">新しいレシピを作る</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="レシピ名(例: 生姜焼き)"
          className="w-full mb-2 px-2 py-1.5 rounded text-sm outline-none"
          style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.ink }}
        />

        <div className="relative mb-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="食材を検索して追加"
            className="w-full px-2 py-1.5 rounded text-sm outline-none"
            style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.ink }}
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 rounded-lg overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              {suggestions.map((ing) => (
                <button
                  key={ing.id}
                  onClick={() => addItem(ing)}
                  className="w-full text-left px-2.5 py-1.5 text-xs"
                  style={{ color: COLORS.ink }}
                >
                  {ing.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <ul className="space-y-1.5 mb-3">
            {items.map((it, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs">
                <span style={{ color: COLORS.ink }} className="flex-1">{it.name}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={it.grams}
                  onChange={(e) => updateGrams(idx, num(e.target.value))}
                  className="w-16 px-1.5 py-1 rounded text-xs text-center outline-none"
                  style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.ink }}
                />
                <span style={{ color: COLORS.inkSoft }}>g</span>
                <button onClick={() => removeItem(idx)} style={{ color: COLORS.inkSoft }}>
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <p style={{ color: COLORS.inkSoft }} className="text-xs mb-3">
            合計: 約{Math.round(totals.calories)}kcal
          </p>
        )}

        <div className="flex items-center justify-between">
          <span style={{ color: COLORS.sage }} className="text-xs">{message}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded" style={{ color: COLORS.inkSoft }}>
              閉じる
            </button>
            <button
              onClick={submit}
              className="text-xs px-4 py-1.5 rounded font-medium flex items-center gap-1"
              style={{ background: COLORS.terracotta, color: '#fff' }}
            >
              <Check size={14} /> 保存する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TargetPanel({ targets, onSave, onClose, onReset }) {
  const [t, setT] = useState(targets);
  return (
    <div className="fixed inset-0 z-20 flex items-end sm:items-center justify-center" style={{ background: '#00000055' }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-5"
        style={{ background: COLORS.card }}
      >
        <h3 style={{ fontFamily: "'Shippori Mincho', serif", color: COLORS.ink }} className="text-lg mb-3">
          目標値の設定
        </h3>
        {[
          ['calories', 'カロリー (kcal)'],
          ['protein', 'たんぱく質 (g)'],
          ['fat', '脂質 (g)'],
          ['carbs', '炭水化物 (g)'],
          ['fiber', '食物繊維 (g)'],
          ['salt', '塩分 (g)'],
        ].map(([k, label]) => (
          <div key={k} className="flex items-center justify-between mb-2">
            <label style={{ color: COLORS.inkSoft }} className="text-sm">{label}</label>
            <input
              type="number"
              value={t[k]}
              onChange={(e) => setT({ ...t, [k]: num(e.target.value) })}
              className="w-24 px-2 py-1 rounded text-sm text-right outline-none"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
            />
          </div>
        ))}
        <div className="flex justify-between items-center mt-4">
          <button onClick={onReset} className="text-xs flex items-center gap-1" style={{ color: COLORS.rose }}>
            <RotateCcw size={13} /> このデータをリセット
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm px-3 py-1.5 rounded" style={{ color: COLORS.inkSoft }}>
              閉じる
            </button>
            <button
              onClick={() => onSave(t)}
              className="text-sm px-4 py-1.5 rounded font-medium"
              style={{ background: COLORS.terracotta, color: '#fff' }}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WeekChart({ meals, selectedDate }) {
  const days = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) arr.push(addDays(selectedDate, -i));
    return arr;
  }, [selectedDate]);
  const data = days.map((d) => ({
    day: formatDateLabel(d).replace(/\(.*\)/, ''),
    kcal: meals.filter((m) => m.date === d).reduce((s, m) => s + m.calories, 0),
  }));
  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
      <h3 style={{ fontFamily: "'Shippori Mincho', serif", color: COLORS.ink }} className="text-base mb-2">
        直近7日間の推移
      </h3>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: COLORS.inkSoft }} axisLine={{ stroke: COLORS.border }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => [`${Math.round(v)} kcal`, '']} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: COLORS.border }} />
          <Bar dataKey="kcal" fill={COLORS.terracotta} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

## src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## src/lib/api.js

```js
// バックエンドAPI呼び出しをまとめたデータ層。
//
// 認証: LIFFで取得したIDトークンを Authorization: Bearer ヘッダーで送ります。
// サーバー側は lib/auth.js でこのトークンをLINEに照会して検証し、
// 検証済みのLINEユーザーID・表示名を取得します。

async function request(path, { idToken, method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `${method} ${path} failed (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.error) message = errBody.error;
    } catch (e) {}
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

// --- 会員の食事記録・目標値 --------------------------------------------

export function fetchMemberData(idToken) {
  return request('/api/meals', { idToken });
}

export function addMealEntry(idToken, mealType, date, entry) {
  return request('/api/meals', { idToken, method: 'POST', body: { mealType, date, ...entry } });
}

export function deleteMealEntry(idToken, id) {
  return request('/api/meals', { idToken, method: 'DELETE', body: { id } });
}

export function resetMemberData(idToken) {
  return request('/api/meals', { idToken, method: 'DELETE', body: { resetAll: true } });
}

export function updateTargets(idToken, targets) {
  return request('/api/targets', { idToken, method: 'PUT', body: targets });
}

// --- 食材データベース ----------------------------------------------------

export function fetchIngredientDb() {
  return request('/api/ingredients');
}

export function createIngredient(idToken, item) {
  return request('/api/ingredients', { idToken, method: 'POST', body: item });
}

export function updateIngredient(idToken, id, fields) {
  return request('/api/ingredients', { idToken, method: 'PUT', body: { id, ...fields } });
}

export function deleteIngredient(idToken, id) {
  return request('/api/ingredients', { idToken, method: 'DELETE', body: { id } });
}

// --- 商品データベース ----------------------------------------------------

export function fetchProductDb() {
  return request('/api/products');
}

export function registerOrUpdateProduct(idToken, item) {
  return request('/api/products', { idToken, method: 'POST', body: item });
}

export function incrementProductUseCount(idToken, id) {
  return request('/api/products', { idToken, method: 'PATCH', body: { id } });
}

export function updateProductAdmin(idToken, id, fields) {
  return request('/api/products', { idToken, method: 'PUT', body: { id, ...fields } });
}

export function deleteProductAdmin(idToken, id) {
  return request('/api/products', { idToken, method: 'DELETE', body: { id } });
}

// --- トレーナー専用 -------------------------------------------------------

export function fetchTrainerMembers(idToken) {
  return request('/api/trainer/members', { idToken });
}

export function fetchTrainerMemberDetail(idToken, memberUserId) {
  return request(`/api/trainer/member-detail?userId=${encodeURIComponent(memberUserId)}`, { idToken });
}

export function checkIsTrainer(idToken) {
  return request('/api/trainer/check', { idToken });
}

export function getConsentStatus(idToken) {
  return request('/api/consent', { idToken });
}

export function agreeToConsent(idToken) {
  return request('/api/consent', { idToken, method: 'POST' });
}

export function fetchRecipes(idToken) {
  return request('/api/recipes', { idToken });
}
export function saveRecipeApi(idToken, recipe) {
  return request('/api/recipes', { idToken, method: 'POST', body: recipe });
}
export function deleteRecipeApi(idToken, id) {
  return request(`/api/recipes?id=${id}`, { idToken, method: 'DELETE' });
}
export function fetchWithdrawnMembers(idToken) {
  return request('/api/trainer/membership', { idToken });
}
export function setMemberWithdrawn(idToken, userId, withdrawn) {
  return request('/api/trainer/membership', { idToken, method: 'POST', body: { userId, withdrawn } });
}
```

## src/lib/helpers.js

```js
export const COLORS = {
  bg: '#F6F1E9',
  card: '#FFFDF8',
  ink: '#2E2620',
  inkSoft: '#7A6E5E',
  border: '#E5DBC9',
  terracotta: '#C1673F',
  gold: '#D6A24A',
  sage: '#7C9070',
  rose: '#B85C5C',
};

export const MEAL_TYPES = [
  { key: 'breakfast', label: '朝食' },
  { key: 'lunch', label: '昼食' },
  { key: 'dinner', label: '夕食' },
  { key: 'snack', label: '間食' },
];

export const DEFAULT_TARGETS = { calories: 2000, protein: 120, fat: 55, carbs: 250, fiber: 18, salt: 7 };

export function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}

export function addDays(dateStr, delta) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return formatDate(d);
}

export function sanitizeKey(name) {
  return name.trim().replace(/[\s/\\'"]+/g, '_');
}

export function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

export function round1(n) {
  return Math.round(n * 10) / 10;
}

export function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function scaleIngredient(ing, grams) {
  const factor = num(grams) / 100;
  return {
    calories: Math.round(ing.calories * factor),
    protein: round1(ing.protein * factor),
    fat: round1(ing.fat * factor),
    carbs: round1(ing.carbs * factor),
    fiber: round1((ing.fiber || 0) * factor),
    salt: round1(ing.salt * factor),
  };
}
```

## src/lib/score.js

```js
function scoreForMetric(actual, target) {
  if (!target || target <= 0) return null;
  const diffRatio = Math.abs(actual - target) / target;
  const tolerance = 0.1; // 目標の±10%以内は満点
  if (diffRatio <= tolerance) return 100;
  const over = diffRatio - tolerance;
  return Math.max(0, Math.round(100 - over * 150));
}

export function calculateDailyScore(totals, targets) {
  const weights = { calories: 0.4, protein: 0.2, fat: 0.2, carbs: 0.2 };
  let weightedSum = 0;
  let totalWeight = 0;
  for (const key of Object.keys(weights)) {
    const s = scoreForMetric(totals[key], targets[key]);
    if (s !== null) {
      weightedSum += s * weights[key];
      totalWeight += weights[key];
    }
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
}
```

## src/main.jsx

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

## vite.config.js

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
});
```

