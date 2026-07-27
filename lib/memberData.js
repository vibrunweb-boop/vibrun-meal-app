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
